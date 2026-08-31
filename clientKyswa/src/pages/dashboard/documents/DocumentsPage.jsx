import { useEffect, useState, useMemo } from 'react';
import { AlertTriangle, Clock, ChevronDown, ChevronUp, Download, X } from 'lucide-react';
import api from '../../../core/api/axios';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Pagination from '../../../components/Pagination';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
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
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expandedRapport, setExpandedRapport] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [editDocForm, setEditDocForm] = useState({ titre: '', categorie: '', statut: '', echeance: '', description: '' });
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState(null);

  // ── Pagination pour Documents & Réunions ───────────────────────────────────
  const [pageDocs, setPageDocs] = useState(1);
  const [limitDocs, setLimitDocs] = useState(25);
  const [pageReunions, setPageReunions] = useState(1);
  const [limitReunions, setLimitReunions] = useState(25);

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

  const handleEditDoc = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/documents/${editDoc._id}`, editDocForm);
      toast('Document modifié');
      setEditDoc(null);
      fetchAll();
    } catch (err) { toast(err.response?.data?.message || 'Erreur', 'error'); }
  };

  const handleDeleteDoc = async () => {
    try {
      await api.delete(`/documents/${confirmDeleteDocId}`);
      toast('Document supprimé');
      setConfirmDeleteDocId(null);
      fetchAll();
    } catch (err) { toast(err.response?.data?.message || 'Erreur', 'error'); }
  };

  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
          Secrétariat & Direction Générale
        </h1>
        {isSecretaire && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowDocModal(true)} className="btn-primary">+ Document</button>
            <button onClick={() => setShowReunionModal(true)} className="btn-secondary">+ Réunion</button>
          </div>
        )}
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 8, flexWrap: 'wrap' }}>
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
              <p style={{ fontSize: 32 }}></p>
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
                  ) : paginatedDocs.map(d => {
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
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {d.fichierUrl && (
                              <>
                                <a href={d.fichierUrl} target="_blank" rel="noreferrer"
                                  style={{ background: 'rgba(0,103,79,0.08)', borderRadius: 6, padding: '3px 10px', color: 'var(--primary)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                                  Voir
                                </a>
                                <a href={d.fichierUrl} download
                                  style={{ background: 'rgba(37,99,235,0.08)', borderRadius: 6, padding: '3px 10px', color: '#2563EB', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                  <Download size={12} /> Télécharger
                                </a>
                              </>
                            )}
                            <button onClick={() => { setEditDoc(d); setEditDocForm({ titre: d.titre || '', categorie: d.categorie || 'Administratif', statut: d.statut || 'EN_COURS', echeance: d.echeance ? d.echeance.substring(0, 10) : '', description: d.description || '' }); }}
                              style={{ background: 'rgba(217,119,6,0.08)', border: 'none', borderRadius: 6, padding: '3px 10px', color: '#D97706', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              Modifier
                            </button>
                            <button onClick={() => setConfirmDeleteDocId(d._id)}
                              style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '3px 10px', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={pageDocs}
              totalPages={totalPagesDocs}
              totalItems={documents.length}
              itemsPerPage={limitDocs}
              onPageChange={setPageDocs}
              onLimitChange={(l) => { setLimitDocs(l); setPageDocs(1); }}
            />
          </div>
        </>
      )}

      {/* Tab 2: Réunions DG */}
      {tab === 2 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowReunionModal(true)} className="btn-primary">+ Planifier réunion</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reunions.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune réunion planifiée</p>
            ) : (
              <>
                {paginatedReunions.map(r => (
                  <div key={r._id} className="premium-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15 }}>{r.titre}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          {fmtDate(r.date)} · {r.lieu || '—'}
                        </p>
                        {r.ordreJour && <p style={{ fontSize: 13, marginTop: 8, color: 'var(--text-main)' }}>{r.ordreJour}</p>}
                        {r.participants?.length > 0 && (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                            Participants : {Array.isArray(r.participants) ? r.participants.join(', ') : r.participants}
                          </p>
                        )}
                      </div>
                      <span style={{ background: '#F0FDF4', color: '#16A34A', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        {r.statut || 'PLANIFIEE'}
                      </span>
                    </div>
                  </div>
                ))}
                <Pagination
                  currentPage={pageReunions}
                  totalPages={totalPagesReunions}
                  totalItems={reunions.length}
                  itemsPerPage={limitReunions}
                  onPageChange={setPageReunions}
                  onLimitChange={(l) => { setLimitReunions(l); setPageReunions(1); }}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* Tab 3: Rapports journaliers */}
      {tab === 3 && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="premium-input" style={{ width: 180 }} />
            {filterDate && <button onClick={() => setFilterDate('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 3 }}><X size={12} /> Effacer la date</button>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rapports.length === 0 ? (
              <div className="premium-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>Aucun rapport journalier{filterDate ? ' pour cette date' : ''}</p>
              </div>
            ) : rapports.map(r => {
              const roleLabel = (r.agentId?.role || 'agent').toUpperCase();
              const ROLE_COLORS = {
                COMMERCIAL: { bg: '#EFF6FF', color: '#2563EB' },
                SOCIAL: { bg: '#F5F3FF', color: '#7C3AED' },
                ADMINISTRATEUR: { bg: '#FEF2F2', color: '#DC2626' },
                DG: { bg: '#FEF3C7', color: '#B45309' },
                SECRETAIRE: { bg: '#FCE7F3', color: '#DB2777' },
                COMPTABLE: { bg: '#F0FDF4', color: '#16A34A' },
              };
              const roleStyle = ROLE_COLORS[roleLabel] || { bg: '#F3F4F6', color: '#6B7280' };

              return (
                <div key={r._id} style={{ background: 'white', borderRadius: 12, border: '1.5px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: expandedRapport === r._id ? 'var(--bg-main)' : 'white' }}
                    onClick={() => setExpandedRapport(expandedRapport === r._id ? null : r._id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 800 }}>
                        {(r.agentId?.prenom?.[0] || '?')}{(r.agentId?.nom?.[0] || '?')}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>
                            {r.agentId?.prenom || 'Agent'} {r.agentId?.nom || ''}
                          </p>
                          <span style={{ background: roleStyle.bg, color: roleStyle.color, borderRadius: 12, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
                            {roleLabel}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Rapport du {fmtDate(r.date)} {r.dateCreation ? `à ${fmtTime(r.dateCreation)}` : ''}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>
                        {expandedRapport === r._id ? 'Réduire' : 'Déplier'}
                      </span>
                      {expandedRapport === r._id ? <ChevronUp size={16} color="var(--primary)" /> : <ChevronDown size={16} color="var(--primary)" />}
                    </div>
                  </div>

                  {/* Vue repliée : résumé rapide des activités */}
                  {expandedRapport !== r._id && (
                    <div style={{ padding: '0 18px 14px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      « {r.activites} »
                    </div>
                  )}

                  {/* Vue dépliée complète */}
                  {expandedRapport === r._id && (
                    <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Section texte principal */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {[['Activités réalisées', r.activites], ['Problèmes rencontrés', r.problemes], ['Objectifs pour demain', r.objectifsDemain], ['Suivi commercial', r.suiviCommercial], ['Constats & suggestions', r.constats], ['Notes', r.notes]].filter(([, v]) => v).map(([l, v]) => (
                          <div key={l} style={{ background: 'var(--bg-main)', borderRadius: 8, padding: 12 }}>
                            <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{l}</p>
                            <p style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{v}</p>
                          </div>
                        ))}
                      </div>

                      {/* Indicateurs chiffrés si présents */}
                      {(r.appelsClients > 0 || r.inscriptionsCreees > 0 || r.paiementsEncaisses > 0 || r.publications > 0 || r.vues > 0 || r.articlesPub > 0) && (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                            📊 Indicateurs de la journée
                          </p>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {r.appelsClients > 0 && <span className="badge badge-info" style={{ fontSize: 11 }}>📞 Appels: {r.appelsClients}</span>}
                            {r.inscriptionsCreees > 0 && <span className="badge badge-success" style={{ fontSize: 11 }}>📝 Inscriptions: {r.inscriptionsCreees}</span>}
                            {r.paiementsEncaisses > 0 && <span className="badge badge-primary" style={{ fontSize: 11 }}>💳 Recettes: {r.paiementsEncaisses.toLocaleString('fr-FR')} FCFA</span>}
                            {r.publications > 0 && <span className="badge badge-warning" style={{ fontSize: 11 }}>📱 Publications: {r.publications}</span>}
                            {r.vues > 0 && <span className="badge badge-neutral" style={{ fontSize: 11 }}>👁 Vues: {r.vues}</span>}
                            {r.articlesPub > 0 && <span className="badge badge-info" style={{ fontSize: 11 }}>🌐 Articles: {r.articlesPub}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Tab 4: Supervision */}
      {tab === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            Suivi spécialisé des rapports des profils Informatique et Community Management / Social Media
          </p>

          {rapports.filter(r => {
            const role = (r.agentId?.role || '').toLowerCase();
            return ['administrateur', 'social', 'informatique'].includes(role);
          }).length === 0 ? (
            <div className="premium-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💻</div>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Aucun rapport informatique ou social média</p>
            </div>
          ) : (
            rapports.filter(r => {
              const role = (r.agentId?.role || '').toLowerCase();
              return ['administrateur', 'social', 'informatique'].includes(role);
            }).map(r => (
              <div key={r._id} className="premium-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-main)' }}>
                      {r.agentId?.prenom} {r.agentId?.nom}
                    </p>
                    <span className="badge badge-primary" style={{ fontSize: 10 }}>{r.agentId?.role}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(r.date)}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{r.activites}</p>
                {r.problemes && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8, fontWeight: 600 }}>
                    ⚠️ Problème : {r.problemes}
                  </p>
                )}
              </div>
            ))
          )}
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

      {/* Modal modification document */}
      <Modal open={!!editDoc} onClose={() => setEditDoc(null)} title="Modifier le document">
        <form onSubmit={handleEditDoc} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Titre *</label>
            <input value={editDocForm.titre} onChange={e => setEditDocForm(f => ({ ...f, titre: e.target.value }))} className="premium-input" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Catégorie</label>
              <select value={editDocForm.categorie} onChange={e => setEditDocForm(f => ({ ...f, categorie: e.target.value }))} className="premium-input">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Statut</label>
              <select value={editDocForm.statut} onChange={e => setEditDocForm(f => ({ ...f, statut: e.target.value }))} className="premium-input">
                {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Date d'échéance</label>
              <input type="date" value={editDocForm.echeance} onChange={e => setEditDocForm(f => ({ ...f, echeance: e.target.value }))} className="premium-input" />
            </div>
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea value={editDocForm.description} onChange={e => setEditDocForm(f => ({ ...f, description: e.target.value }))} className="premium-input" rows={3} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditDoc(null)} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary">Sauvegarder</button>
          </div>
        </form>
      </Modal>

      {/* Confirmation suppression document */}
      <ConfirmDialog
        open={!!confirmDeleteDocId}
        message="Supprimer ce document ? Le fichier sera aussi supprimé définitivement."
        onConfirm={handleDeleteDoc}
        onCancel={() => setConfirmDeleteDocId(null)}
      />
    </div>
  );
}
