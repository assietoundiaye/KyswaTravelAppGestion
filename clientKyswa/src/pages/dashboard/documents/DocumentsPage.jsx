import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const CATEGORIES = ['Administratif', 'Fiscal', 'Légal', 'RH', 'Opérationnel'];
const STATUTS = ['EN_COURS', 'URGENT', 'EN_ATTENTE', 'TERMINE'];
const STATUT_LABELS = { EN_COURS: 'En cours', URGENT: 'Urgent', EN_ATTENTE: 'En attente', TERMINE: 'Terminé' };
const STATUT_COLORS = {
  EN_COURS: { bg: '#EFF6FF', color: '#2563EB' },
  URGENT: { bg: '#FEF2F2', color: '#DC2626' },
  EN_ATTENTE: { bg: '#FFFBEB', color: '#D97706' },
  TERMINE: { bg: '#F0FDF4', color: '#16A34A' },
};

const TABS = ['Urgences', 'Documents', 'Réunions DG', 'Rapports journaliers', 'Supervision'];

function TabBtn({ label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
      background: active ? 'var(--primary)' : 'transparent',
      color: active ? 'white' : 'var(--text-muted)',
      fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: active ? 700 : 500,
      position: 'relative', transition: 'all 0.15s',
    }}>
      {label}
      {badge > 0 && (
        <span style={{ position: 'absolute', top: 2, right: 2, background: '#DC2626', color: 'white', borderRadius: 10, fontSize: 9, fontWeight: 800, padding: '1px 4px', minWidth: 14, textAlign: 'center' }}>{badge}</span>
      )}
    </button>
  );
}

export default function DocumentsPage() {
  const { role } = useAuth();
  const isSecretaire = ['secretaire', 'SECRETAIRE'].includes(role);
  const [tab, setTab] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [reunions, setReunions] = useState([]);
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showReunionModal, setShowReunionModal] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [expandedRapport, setExpandedRapport] = useState(null);

  const [docForm, setDocForm] = useState({ titre: '', categorie: 'Administratif', statut: 'EN_COURS', echeance: '', description: '' });
  const [reunionForm, setReunionForm] = useState({ titre: '', date: '', lieu: '', ordreJour: '', participants: '' });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, r] = await Promise.all([api.get('/documents'), api.get('/reunions')]);
      setDocuments(d.data.documents || []);
      setReunions(r.data.reunions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchRapports = async () => {
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      const r = await api.get('/rapports', { params });
      setRapports(r.data.rapports || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (tab === 3 || tab === 4) fetchRapports(); }, [tab, filterDate]);

  const urgents = documents.filter(d => {
    if (d.statut === 'URGENT') return true;
    if (d.echeance) {
      const diff = (new Date(d.echeance) - new Date()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }
    return false;
  });

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/documents', docForm);
      toast('Document créé');
      setShowDocModal(false);
      setDocForm({ titre: '', categorie: 'Administratif', statut: 'EN_COURS', echeance: '', description: '' });
      fetchAll();
    } catch (err) { toast(err.response?.data?.message || 'Erreur', 'error'); }
  };

  const handleReunionSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reunions', { ...reunionForm, participants: reunionForm.participants.split(',').map(s => s.trim()).filter(Boolean) });
      toast('Réunion planifiée');
      setShowReunionModal(false);
      setReunionForm({ titre: '', date: '', lieu: '', ordreJour: '', participants: '' });
      fetchAll();
    } catch (err) { toast(err.response?.data?.message || 'Erreur', 'error'); }
  };

  const updateStatut = async (id, statut) => {
    try { await api.patch(`/documents/${id}`, { statut }); fetchAll(); }
    catch (e) { toast('Erreur', 'error'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'white', borderRadius: 10, padding: 4, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {TABS.map((t, i) => (
          <TabBtn key={t} label={t} active={tab === i} onClick={() => setTab(i)}
            badge={i === 0 ? urgents.length : 0} />
        ))}
      </div>

      {/* Tab 0: Urgences */}
      {tab === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {urgents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 32 }}>✅</p>
              <p>Aucune urgence</p>
            </div>
          ) : urgents.map(d => {
            const diff = d.echeance ? Math.floor((new Date(d.echeance) - new Date()) / (1000 * 60 * 60 * 24)) : null;
            const isUrgent = d.statut === 'URGENT';
            return (
              <div key={d._id} style={{
                padding: '14px 16px', borderRadius: 10,
                background: isUrgent ? '#FEF2F2' : '#FFFBEB',
                border: `1px solid ${isUrgent ? 'rgba(220,38,38,0.25)' : 'rgba(217,119,6,0.25)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isUrgent ? <AlertTriangle size={16} color="#DC2626" /> : <Clock size={16} color="#D97706" />}
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{d.titre}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {d.categorie} · {isUrgent ? 'Marqué urgent' : `Échéance dans ${diff} jour(s) — ${fmtDate(d.echeance)}`}
                    </p>
                  </div>
                </div>
                <span style={{ background: isUrgent ? '#FEF2F2' : '#FFFBEB', color: isUrgent ? '#DC2626' : '#D97706', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                  {isUrgent ? 'URGENT' : `J-${diff}`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 1: Documents */}
      {tab === 1 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowDocModal(true)} className="btn-primary">+ Nouveau document</button>
          </div>
          <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr><th>Titre</th><th>Catégorie</th><th>Statut</th><th>Échéance</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Chargement...</td></tr>
                  ) : documents.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucun document</td></tr>
                  ) : documents.map(d => {
                    const s = STATUT_COLORS[d.statut] || { bg: '#F3F4F6', color: '#6B7280' };
                    return (
                      <tr key={d._id}>
                        <td style={{ fontWeight: 600 }}>{d.titre}</td>
                        <td style={{ fontSize: 12 }}>{d.categorie}</td>
                        <td>
                          <select value={d.statut} onChange={e => updateStatut(d._id, e.target.value)}
                            style={{ background: s.bg, color: s.color, border: 'none', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            {STATUTS.map(st => <option key={st} value={st}>{STATUT_LABELS[st]}</option>)}
                          </select>
                        </td>
                        <td style={{ fontSize: 12 }}>{fmtDate(d.echeance)}</td>
                        <td>
                          {d.fichierUrl && (
                            <a href={d.fichierUrl} target="_blank" rel="noreferrer"
                              style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}>PDF ↗</a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Réunions DG */}
      {tab === 2 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowReunionModal(true)} className="btn-primary">+ Planifier réunion</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reunions.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune réunion planifiée</p>
            ) : reunions.map(r => (
              <div key={r._id} className="premium-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{r.titre}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      📅 {fmtDate(r.date)} · 📍 {r.lieu || '—'}
                    </p>
                    {r.ordreJour && <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-main)' }}>{r.ordreJour}</p>}
                    {r.participants?.length > 0 && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        👥 {r.participants.join(', ')}
                      </p>
                    )}
                  </div>
                  <span style={{ background: '#F0FDF4', color: '#16A34A', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                    {r.statut || 'PLANIFIEE'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tab 3: Rapports journaliers */}
      {tab === 3 && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="premium-input" style={{ width: 180 }} />
            {filterDate && <button onClick={() => setFilterDate('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>✕ Effacer</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rapports.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun rapport{filterDate ? ' pour cette date' : ''}</p>
            ) : rapports.map(r => (
              <div key={r._id} style={{ background: 'white', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  onClick={() => setExpandedRapport(expandedRapport === r._id ? null : r._id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800 }}>
                      {r.agentId?.prenom?.[0]}{r.agentId?.nom?.[0]}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 13 }}>{r.agentId?.prenom} {r.agentId?.nom}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.agentId?.role} · {fmtDate(r.date)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Voir détail</span>
                    {expandedRapport === r._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>
                {expandedRapport === r._id && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[['Activités', r.activites], ['Problèmes', r.problemes], ['Objectifs demain', r.objectifsDemain], ['Suivi commercial', r.suiviCommercial], ['Constats', r.constats]].filter(([, v]) => v).map(([l, v]) => (
                        <div key={l}>
                          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{l}</p>
                          <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tab 4: Supervision */}
      {tab === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Rapports des profils informatique et social</p>
          {rapports.filter(r => ['administrateur', 'social'].includes(r.agentId?.role)).length === 0 ? (
            <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucun rapport</p>
          ) : rapports.filter(r => ['administrateur', 'social'].includes(r.agentId?.role)).map(r => (
            <div key={r._id} className="premium-card">
              <p style={{ fontWeight: 700, fontSize: 13 }}>{r.agentId?.prenom} {r.agentId?.nom} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({r.agentId?.role})</span></p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{fmtDate(r.date)}</p>
              <p style={{ fontSize: 13 }}>{r.activites}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal document */}
      <Modal open={showDocModal} onClose={() => setShowDocModal(false)} title="Nouveau document">
        <form onSubmit={handleDocSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Titre *</label>
            <input value={docForm.titre} onChange={e => setDocForm(f => ({ ...f, titre: e.target.value }))} className="premium-input" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Catégorie</label>
              <select value={docForm.categorie} onChange={e => setDocForm(f => ({ ...f, categorie: e.target.value }))} className="premium-input">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Statut</label>
              <select value={docForm.statut} onChange={e => setDocForm(f => ({ ...f, statut: e.target.value }))} className="premium-input">
                {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Date d'échéance</label>
              <input type="date" value={docForm.echeance} onChange={e => setDocForm(f => ({ ...f, echeance: e.target.value }))} className="premium-input" />
            </div>
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea value={docForm.description} onChange={e => setDocForm(f => ({ ...f, description: e.target.value }))} className="premium-input" rows={3} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowDocModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">Créer</button>
          </div>
        </form>
      </Modal>

      {/* Modal réunion */}
      <Modal open={showReunionModal} onClose={() => setShowReunionModal(false)} title="Planifier une réunion DG">
        <form onSubmit={handleReunionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Titre *</label>
            <input value={reunionForm.titre} onChange={e => setReunionForm(f => ({ ...f, titre: e.target.value }))} className="premium-input" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Date / Heure *</label>
              <input type="datetime-local" value={reunionForm.date} onChange={e => setReunionForm(f => ({ ...f, date: e.target.value }))} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Lieu</label>
              <input value={reunionForm.lieu} onChange={e => setReunionForm(f => ({ ...f, lieu: e.target.value }))} className="premium-input" />
            </div>
          </div>
          <div>
            <label className="input-label">Ordre du jour</label>
            <textarea value={reunionForm.ordreJour} onChange={e => setReunionForm(f => ({ ...f, ordreJour: e.target.value }))} className="premium-input" rows={3} />
          </div>
          <div>
            <label className="input-label">Participants (séparés par virgule)</label>
            <input value={reunionForm.participants} onChange={e => setReunionForm(f => ({ ...f, participants: e.target.value }))} className="premium-input" placeholder="Nom 1, Nom 2..." />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowReunionModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">Planifier</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
