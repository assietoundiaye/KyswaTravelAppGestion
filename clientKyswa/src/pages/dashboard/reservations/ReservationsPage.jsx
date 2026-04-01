import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import { toast } from '../../../components/Toast';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const STATUT_CLIENT = {
  INSCRIT: { bg: '#EFF6FF', color: '#2563EB' },
  CONFIRME: { bg: '#F0FDF4', color: '#16A34A' },
  DESISTE: { bg: '#FEF2F2', color: '#DC2626' },
  PARTI: { bg: '#F5F3FF', color: '#7C3AED' },
  RENTRE: { bg: '#F0FDF4', color: '#059669' },
  ANNULE: { bg: '#F3F4F6', color: '#6B7280' },
};

const STATUT_PAIEMENT = {
  EN_ATTENTE: { bg: '#FEF2F2', color: '#DC2626' },
  PARTIEL: { bg: '#FFFBEB', color: '#D97706' },
  SOLDE: { bg: '#F0FDF4', color: '#16A34A' },
};

function Badge({ val, map }) {
  const s = map[val] || { bg: '#F3F4F6', color: '#6B7280' };
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>{val}</span>;
}

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  packageKId: '', typeChambre: 'DOUBLE', formule: '', niveauConfort: '',
  dateDepart: '', dateRetour: '', montantTotalDu: '', notes: '',
  statutClient: 'INSCRIT', clients: [],
};

export default function ReservationsPage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [clientSearch, setClientSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, p, c] = await Promise.all([
        api.get('/reservations'),
        api.get('/packages'),
        api.get('/clients'),
      ]);
      setReservations(r.data.reservations || []);
      setPackages(p.data.packages || []);
      setClients(c.data.clients || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // Auto-fill dates AND prix when package is selected
  const handlePackageChange = (pkgId) => {
    const pkg = packages.find(p => p._id === pkgId);
    // Auto-suggest price based on current typeChambre
    const prixMap = {
      SINGLE: pkg?.prixSingle,
      DOUBLE: pkg?.prixDouble,
      TRIPLE: pkg?.prixTriple,
      QUADRUPLE: pkg?.prixQuadruple,
    };
    const suggestedPrice = prixMap[form.typeChambre] || pkg?.prixDouble || '';
    setForm(f => ({
      ...f,
      packageKId: pkgId,
      dateDepart: pkg?.dateDepart ? pkg.dateDepart.slice(0, 10) : f.dateDepart,
      dateRetour: pkg?.dateRetour ? pkg.dateRetour.slice(0, 10) : f.dateRetour,
      montantTotalDu: suggestedPrice ? String(Math.round(Number(suggestedPrice))) : f.montantTotalDu,
    }));
  };

  // Recalculate price when chambre type changes
  const handleChambreChange = (typeChambre) => {
    const pkg = packages.find(p => p._id === form.packageKId);
    if (pkg) {
      const prixMap = {
        SINGLE: pkg.prixSingle,
        DOUBLE: pkg.prixDouble,
        TRIPLE: pkg.prixTriple,
        QUADRUPLE: pkg.prixQuadruple,
      };
      const prix = prixMap[typeChambre];
      setForm(f => ({
        ...f,
        typeChambre,
        montantTotalDu: prix ? String(Math.round(Number(prix))) : f.montantTotalDu,
      }));
    } else {
      setForm(f => ({ ...f, typeChambre }));
    }
  };

  const filtered = useMemo(() => {
    if (!search) return reservations;
    const q = search.toLowerCase();
    return reservations.filter(r =>
      r.numero?.toLowerCase().includes(q) ||
      r.clients?.some(c => `${c.nom} ${c.prenom}`.toLowerCase().includes(q) || c.telephone?.includes(q))
    );
  }, [reservations, search]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleClient = (id) => {
    setForm(f => ({
      ...f,
      clients: f.clients.includes(id) ? f.clients.filter(c => c !== id) : [...f.clients, id],
    }));
  };

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      `${c.nom} ${c.prenom}`.toLowerCase().includes(q) ||
      c.telephone?.includes(q) ||
      c.numeroPasseport?.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clients.length) { toast('Sélectionnez au moins un client', 'error'); return; }
    if (!form.packageKId) { toast('Sélectionnez un départ', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/reservations', {
        ...form,
        montantTotalDu: Number(form.montantTotalDu),
        nombrePlaces: form.clients.length,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setClientSearch('');
      fetchAll();
      toast('Inscription créée');
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} inscription(s)</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="🔍 N°, client, téléphone..."
            className="premium-input"
            style={{ width: 240 }}
          />
          <button onClick={() => setShowForm(true)} className="btn-primary">+ Nouvelle inscription</button>
        </div>
      </div>

      {/* Table */}
      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Client(s)</th>
                <th>Téléphone</th>
                <th>Départ</th>
                <th>Chambre</th>
                <th>Prix total</th>
                <th>Reçu</th>
                <th>Restant</th>
                <th>Statut client</th>
                <th>Paiement</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune inscription</td></tr>
              ) : paginated.map(r => {
                const recu = (r.montantTotalDu || 0) - (r.resteAPayer || 0);
                return (
                  <tr key={r._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/reservations/${r._id}`)}>
                    <td><span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--primary)' }}>{r.numero || r.idReservation}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ') || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.clients?.[0]?.telephone || '—'}</td>
                    <td style={{ fontSize: 12 }}>{fmtDate(r.dateDepart)}</td>
                    <td style={{ fontSize: 12 }}>{r.typeChambre || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{fmt(r.montantTotalDu)}</td>
                    <td style={{ color: '#16A34A', fontWeight: 600 }}>{fmt(recu)}</td>
                    <td style={{ color: r.resteAPayer > 0 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>{fmt(r.resteAPayer)}</td>
                    <td onClick={e => e.stopPropagation()}><Badge val={r.statutClient || 'INSCRIT'} map={STATUT_CLIENT} /></td>
                    <td onClick={e => e.stopPropagation()}><Badge val={r.statutPaiement || 'EN_ATTENTE'} map={STATUT_PAIEMENT} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      <button onClick={() => navigate(`/dashboard/reservations/${r._id}`)}
                        style={{ background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6, padding: '4px 12px', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Voir →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: 13 }}>←</button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: 13 }}>→</button>
          </div>
        )}
      </div>

      {/* Modal inscription */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle inscription">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Départ */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Départ</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Package / Départ *</label>
              <select value={form.packageKId} onChange={e => handlePackageChange(e.target.value)} className="premium-input" required>
                <option value="">Sélectionner un départ...</option>
                {packages.filter(p => p.statut === 'OUVERT').map(p => (
                  <option key={p._id} value={p._id}>
                    {p.nomReference} — {p.type} — {fmtDate(p.dateDepart)}
                    {p.quotaMax && ` (${p.placesReservees || 0}/${p.quotaMax} places)`}
                  </option>
                ))}
              </select>
              {/* Prix du package sélectionné */}
              {form.packageKId && (() => {
                const pkg = packages.find(p => p._id === form.packageKId);
                if (!pkg) return null;
                const prix = [
                  ['Single', pkg.prixSingle], ['Double', pkg.prixDouble],
                  ['Triple', pkg.prixTriple], ['Quadruple', pkg.prixQuadruple],
                ].filter(([, v]) => v);
                if (!prix.length) return null;
                return (
                  <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {prix.map(([l, v]) => (
                      <span key={l} style={{ background: 'rgba(0,103,79,0.06)', borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{l}: </span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{Number(v).toLocaleString('fr-FR')} FCFA</span>
                      </span>
                    ))}
                    {pkg.compagnieAerienne && (
                      <span style={{ background: '#EFF6FF', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#2563EB', fontWeight: 600 }}>
                        ✈ {pkg.compagnieAerienne} {pkg.villeDepart && `· ${pkg.villeDepart} → ${pkg.villeArrivee}`}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="input-label">Date départ *</label>
              <input type="date" value={form.dateDepart} onChange={set('dateDepart')} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Date retour *</label>
              <input type="date" value={form.dateRetour} onChange={set('dateRetour')} className="premium-input" required />
            </div>
          </div>

          {/* Hébergement */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Hébergement</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Type de chambre</label>
              <select value={form.typeChambre} onChange={e => handleChambreChange(e.target.value)} className="premium-input">
                {['SINGLE', 'DOUBLE', 'TRIPLE', 'QUADRUPLE', 'SUITE'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Formule</label>
              <select value={form.formule} onChange={set('formule')} className="premium-input">
                <option value="">—</option>
                {['LOGEMENT_SEUL', 'LOGEMENT_PETIT_DEJEUNER', 'DEMI_PENSION', 'PENSION_COMPLETE', 'ALL_INCLUSIVE', 'ALL_INCLUSIVE_PREMIUM'].map(f => (
                  <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">Niveau confort</label>
              <select value={form.niveauConfort} onChange={set('niveauConfort')} className="premium-input">
                <option value="">—</option>
                {['ECO', 'CONFORT', 'VIP'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Financier */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Financier & Statut</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Montant total dû (FCFA) *</label>
              <input type="number" min="0" value={form.montantTotalDu} onChange={set('montantTotalDu')} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Statut client</label>
              <select value={form.statutClient} onChange={set('statutClient')} className="premium-input">
                {['INSCRIT', 'CONFIRME', 'DESISTE', 'PARTI', 'RENTRE', 'ANNULE'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Notes internes</label>
              <textarea value={form.notes} onChange={set('notes')} className="premium-input" rows={2} placeholder="Remarques, besoins spéciaux..." />
            </div>
          </div>

          {/* Clients */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
            Clients * — {form.clients.length} sélectionné(s)
          </p>
          <input
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            placeholder="🔍 Filtrer les clients..."
            className="premium-input"
            style={{ marginBottom: 4 }}
          />
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
            {filteredClients.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>Aucun client trouvé</p>
            ) : filteredClients.map(c => (
              <label key={c._id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px',
                borderRadius: 6, cursor: 'pointer', fontSize: 13,
                background: form.clients.includes(c._id) ? 'rgba(0,103,79,0.06)' : 'transparent',
              }}
                onMouseEnter={e => { if (!form.clients.includes(c._id)) e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={e => { if (!form.clients.includes(c._id)) e.currentTarget.style.background = 'transparent'; }}>
                <input type="checkbox" checked={form.clients.includes(c._id)} onChange={() => toggleClient(c._id)} />
                <div>
                  <span style={{ fontWeight: 600 }}>{c.nom} {c.prenom}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>
                    {c.telephone || ''} {c.numeroPasseport ? `· ${c.numeroPasseport}` : ''}
                  </span>
                </div>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Créer l\'inscription'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
