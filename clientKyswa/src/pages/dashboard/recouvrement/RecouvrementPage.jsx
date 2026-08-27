import { useEffect, useState, useMemo } from 'react';
import { Search, AlertTriangle, Clock, TrendingDown, Phone, ChevronDown, ChevronUp, History } from 'lucide-react';
import api from '../../../core/api/axios';
import { toast } from '../../../components/Toast';
import Modal from '../../../components/Modal';
import { useAuth } from '../../../context/AuthContext';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

function urgenceStyle(jours) {
  if (jours === null || jours === undefined) return { bg: '#F3F4F6', color: '#6B7280', border: 'rgba(107,114,128,0.2)', label: 'Sans date' };
  if (jours < 0)   return { bg: '#FEF2F2', color: '#DC2626', border: 'rgba(220,38,38,0.25)', label: 'Départ passé' };
  if (jours <= 7)  return { bg: '#FEF2F2', color: '#DC2626', border: 'rgba(220,38,38,0.25)', label: `${jours}j — URGENT` };
  if (jours <= 30) return { bg: '#FFFBEB', color: '#D97706', border: 'rgba(217,119,6,0.2)',  label: `${jours}j — Proche` };
  return { bg: '#EFF6FF', color: '#2563EB', border: 'rgba(37,99,235,0.15)', label: `${jours}j` };
}

const RESULTAT_COLORS = {
  JOINT:             { bg: '#F0FDF4', color: '#16A34A' },
  NON_JOINT:         { bg: '#F3F4F6', color: '#6B7280' },
  PROMESSE_PAIEMENT: { bg: '#EFF6FF', color: '#2563EB' },
  REFUSE:            { bg: '#FEF2F2', color: '#DC2626' },
};

// ── Ligne impayé réutilisable ─────────────────────────────────────────────────
function LigneImpaye({ r, expandedId, toggleExpand, openRelance, relancesHisto, loadingRelances }) {
  const u = urgenceStyle(r.joursAvantDepart);
  const isExpanded = expandedId === r._id;
  const relances = relancesHisto[r._id] || [];
  const dernRelance = relances[0];

  return (
    <div style={{ borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ padding: '14px 20px', background: u.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, color: 'var(--primary)' }}>
              {r.numero || `#${r.idReservation}`}
            </span>
            <span style={{ background: u.bg, color: u.color, border: `1px solid ${u.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              {u.label}
            </span>
            {r.packageKId?.nomReference && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'white', borderRadius: 6, padding: '2px 8px', border: '1px solid var(--border)' }}>
                {r.packageKId.nomReference}
              </span>
            )}
          </div>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', marginBottom: 2 }}>
            {r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ') || '—'}
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>
              Départ : {fmtDate(r.dateDepart)}
              {r.packageKId?.dateRetour && (
                <span style={{ marginLeft: 4 }}>→ Retour : {fmtDate(r.packageKId.dateRetour)}</span>
              )}
            </span>
            {r.clients?.[0]?.telephone && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Phone size={11} /> {r.clients[0].telephone}
              </span>
            )}
            <span>Payé : <strong style={{ color: '#16A34A' }}>{fmt(r.totalPaye)}</strong></span>
            <span>Total dû : <strong>{fmt(r.montantTotalDu)}</strong></span>
            {dernRelance && (
              <span style={{ color: '#7C3AED' }}>
                Dernière relance : {fmtDate(dernRelance.dateRelance)} — {dernRelance.resultat}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: u.color, fontWeight: 700, textTransform: 'uppercase' }}>Reste à payer</p>
            <p style={{ fontWeight: 800, fontSize: 20, color: u.color }}>{fmt(r.resteAPayer)}</p>
          </div>
          <button onClick={() => openRelance(r)} className="btn-primary" style={{ fontSize: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Phone size={13} /> Relancer
          </button>
          <button onClick={() => toggleExpand(r._id)}
            style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
            <History size={13} />
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: '12px 20px 16px', background: '#FAFAFA', borderTop: '1px solid var(--border-light)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
            Historique des relances
          </p>
          {loadingRelances[r._id] ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement...</p>
          ) : relances.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune relance enregistrée</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {relances.map(rel => {
                const rc = RESULTAT_COLORS[rel.resultat] || { bg: '#F3F4F6', color: '#6B7280' };
                return (
                  <div key={rel._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                    <span style={{ background: rc.bg, color: rc.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {rel.resultat}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)', marginBottom: 2, flexWrap: 'wrap' }}>
                        <span>{fmtDate(rel.dateRelance)}</span>
                        {rel.agentId && <span>par {rel.agentId.prenom} {rel.agentId.nom}</span>}
                        {rel.dateProchaineRelance && (
                          <span style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={11} /> Prochaine : {fmtDate(rel.dateProchaineRelance)}
                          </span>
                        )}
                      </div>
                      {rel.notes && <p style={{ fontSize: 13, color: 'var(--text-main)' }}>{rel.notes}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecouvrementPage() {
  const { role } = useAuth();
  const [data, setData] = useState({ impayés: [], impayésAutres: [], remboursements: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [showRelance, setShowRelance] = useState(false);
  const [selectedResa, setSelectedResa] = useState(null);
  const [relanceForm, setRelanceForm] = useState({ resultat: 'JOINT', notes: '', dateProchaineRelance: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterUrgence, setFilterUrgence] = useState('tous');
  const [expandedId, setExpandedId] = useState(null);
  const [relancesHisto, setRelancesHisto] = useState({});
  const [loadingRelances, setLoadingRelances] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/recouvrement');
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const fetchRelances = async (reservationId) => {
    if (relancesHisto[reservationId]) return;
    setLoadingRelances(p => ({ ...p, [reservationId]: true }));
    try {
      const res = await api.get(`/recouvrement/relances/${reservationId}`);
      setRelancesHisto(p => ({ ...p, [reservationId]: res.data.relances || [] }));
    } catch { /* silencieux */ }
    finally { setLoadingRelances(p => ({ ...p, [reservationId]: false })); }
  };

  const toggleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    fetchRelances(id);
  };

  const openRelance = (resa) => { setSelectedResa(resa); setShowRelance(true); };

  const handleRelance = async (e) => {
    e.preventDefault();
    if (!selectedResa) return;
    setSaving(true);
    try {
      await api.post('/recouvrement/relancer', {
        reservationId: selectedResa._id,
        clientId: selectedResa.clients?.[0]?._id,
        ...relanceForm,
      });
      toast('Relance enregistrée');
      setShowRelance(false);
      setRelanceForm({ resultat: 'JOINT', notes: '', dateProchaineRelance: '' });
      setRelancesHisto(p => { const n = { ...p }; delete n[selectedResa._id]; return n; });
      fetchData();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const filterTexte = (list) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(r =>
      (r.numero || String(r.idReservation) || '').toLowerCase().includes(q) ||
      (r.clients || []).some(c => `${c.nom} ${c.prenom}`.toLowerCase().includes(q)) ||
      (r.clients?.[0]?.telephone || '').includes(q) ||
      (r.packageKId?.nomReference || '').toLowerCase().includes(q)
    );
  };

  const impayesFiltres = useMemo(() => {
    let result = data.impayés || [];
    if (filterUrgence === 'urgent') result = result.filter(r => r.joursAvantDepart !== null && r.joursAvantDepart <= 7);
    else if (filterUrgence === 'proche') result = result.filter(r => r.joursAvantDepart !== null && r.joursAvantDepart > 7 && r.joursAvantDepart <= 30);
    return filterTexte(result);
  }, [data.impayés, search, filterUrgence]);

  const impayésAutresFiltres = useMemo(() => filterTexte(data.impayésAutres || []), [data.impayésAutres, search]);

  const remboursementsFiltres = useMemo(() => {
    if (!search.trim()) return data.remboursements || [];
    const q = search.toLowerCase();
    return (data.remboursements || []).filter(d =>
      `${d.clientId?.nom || ''} ${d.clientId?.prenom || ''}`.toLowerCase().includes(q) ||
      (d.reservationId?.numero || String(d.reservationId?.idReservation) || '').toLowerCase().includes(q)
    );
  }, [data.remboursements, search]);

  const stats = data.stats || {};
  const totalRemboursements = (data.remboursements || []).reduce((s, d) => s + (d.montantRembourse || 0), 0);

  const sharedProps = { expandedId, toggleExpand, openRelance, relancesHisto, loadingRelances };

  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
          Recouvrement
        </h1>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Client, N° réservation, départ..."
            className="premium-input"
            style={{ paddingLeft: 36, width: 300 }}
          />
        </div>
      </div>

      {/* Cartes stats */}
      {!loading && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Total impayé',   value: fmt(stats.totalImpaye || 0), color: '#DC2626', border: '#FECACA', big: false },
            { label: 'Urgents (≤ 7j)', value: stats.urgents || 0,          color: '#DC2626', border: '#FECACA', big: true  },
            { label: 'Proches (8–30j)',value: stats.prochains || 0,         color: '#D97706', border: '#FDE68A', big: true  },
            { label: 'Total dossiers', value: stats.total || 0,             color: 'var(--primary)', border: 'var(--border)', big: true },
          ].map(({ label, value, color, border }) => (
            <div key={label} style={{ flex: '1 1 180px', background: 'white', border: `1.5px solid ${border}`, borderRadius: 'var(--radius-lg)', padding: '28px 24px', borderLeft: `4px solid ${color}`, boxShadow: 'var(--shadow-sm)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres urgence */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { key: 'tous',   label: 'Tous',          color: 'var(--text-muted)' },
          { key: 'urgent', label: 'Urgents ≤ 7j',  color: '#DC2626' },
          { key: 'proche', label: 'Proches 8–30j', color: '#D97706' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterUrgence(f.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
              borderColor: filterUrgence === f.key ? f.color : 'var(--border)',
              background: filterUrgence === f.key ? `${f.color}12` : 'white',
              color: filterUrgence === f.key ? f.color : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Impayés — départ dans les 30 prochains jours */}
      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="#DC2626" />
            Impayés — départ dans les 30 jours ({impayesFiltres.length})
          </h2>
          {impayesFiltres.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: '#DC2626' }}>
              {fmt(impayesFiltres.reduce((s, r) => s + r.resteAPayer, 0))}
            </span>
          )}
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>
        ) : impayesFiltres.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            {search || filterUrgence !== 'tous' ? 'Aucun résultat pour ce filtre' : 'Aucun impayé dans les 30 prochains jours'}
          </div>
        ) : (
          impayesFiltres.map(r => <LigneImpaye key={r._id} r={r} {...sharedProps} />)
        )}
      </div>

      {/* Autres impayés — départ > 30j ou sans date */}
      {impayésAutresFiltres.length > 0 && (
        <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="#2563EB" />
              Autres impayés — départ &gt; 30j ou sans date ({impayésAutresFiltres.length})
            </h2>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>
              {fmt(impayésAutresFiltres.reduce((s, r) => s + r.resteAPayer, 0))}
            </span>
          </div>
          {impayésAutresFiltres.map(r => <LigneImpaye key={r._id} r={r} {...sharedProps} />)}
        </div>
      )}

      {/* Remboursements en attente */}
      {!['commercial'].includes(role) && (
        <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingDown size={16} color="#2563EB" />
              Remboursements en attente ({remboursementsFiltres.length})
            </h2>
            {remboursementsFiltres.length > 0 && (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB' }}>{fmt(totalRemboursements)}</span>
            )}
          </div>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>
          ) : remboursementsFiltres.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              {search ? 'Aucun résultat' : 'Aucun remboursement en attente'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#EFF6FF' }}>
                    {['Client', 'Réservation', 'Taux', 'Montant payé', 'À rembourser', 'Date annulation'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#1D4ED8', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {remboursementsFiltres.map((d, i) => (
                    <tr key={d._id} style={{ borderBottom: '1px solid #DBEAFE', background: i % 2 === 0 ? 'white' : '#F8FAFF' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>{d.clientId?.nom} {d.clientId?.prenom}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--primary)', fontWeight: 600 }}>
                        {d.reservationId?.numero || `#${d.reservationId?.idReservation}`}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                          {d.tauxRemboursement}%
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#16A34A', fontWeight: 600 }}>{fmt(d.montantPaye)}</td>
                      <td style={{ padding: '10px 16px', color: '#2563EB', fontWeight: 800 }}>{fmt(d.montantRembourse)}</td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>{fmtDate(d.dateAnnulation)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal relance */}
      <Modal open={showRelance} onClose={() => setShowRelance(false)} title="Enregistrer une relance" size="sm">
        {selectedResa && (
          <div style={{ background: 'rgba(0,103,79,0.06)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 13 }}>{selectedResa.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {selectedResa.numero || `#${selectedResa.idReservation}`}
              {selectedResa.clients?.[0]?.telephone && ` · ${selectedResa.clients[0].telephone}`}
              {' · Reste : '}<strong style={{ color: '#DC2626' }}>{fmt(selectedResa.resteAPayer)}</strong>
            </p>
          </div>
        )}
        <form onSubmit={handleRelance} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Résultat *</label>
            <select value={relanceForm.resultat} onChange={e => setRelanceForm(f => ({...f, resultat: e.target.value}))} className="premium-input">
              <option value="JOINT">Joint</option>
              <option value="NON_JOINT">Non joint</option>
              <option value="PROMESSE_PAIEMENT">Promesse de paiement</option>
              <option value="REFUSE">Refus de payer</option>
            </select>
          </div>
          <div>
            <label className="input-label">Notes</label>
            <textarea value={relanceForm.notes} onChange={e => setRelanceForm(f => ({...f, notes: e.target.value}))}
              className="premium-input" rows={3} placeholder="Résumé de l'échange..." />
          </div>
          <div>
            <label className="input-label">Date prochaine relance</label>
            <input type="date" value={relanceForm.dateProchaineRelance}
              onChange={e => setRelanceForm(f => ({...f, dateProchaineRelance: e.target.value}))}
              className="premium-input" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowRelance(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Enregistrer la relance'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
