import { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import api from '../../../api/axios';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const PLATEFORMES = ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'WhatsApp'];

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{title}</p>
      {children}
    </div>
  );
}

function RapportCard({ rapport, canEdit, onEdit, isCommercial, isSocial, isAdmin }) {
  const [expanded, setExpanded] = useState(false);
  const locked = !canEdit(rapport);

  return (
    <div style={{
      background: 'white', borderRadius: 10, border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)', marginBottom: 10, overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAdmin && (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800 }}>
              {rapport.agentId?.prenom?.[0]}{rapport.agentId?.nom?.[0]}
            </div>
          )}
          <div>
            {isAdmin && <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>{rapport.agentId?.prenom} {rapport.agentId?.nom} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11 }}>({rapport.agentId?.role})</span></p>}
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(rapport.date)}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {locked && <Lock size={12} style={{ color: 'var(--text-muted)' }} />}
          {!locked && canEdit(rapport) && (
            <button onClick={e => { e.stopPropagation(); onEdit(rapport); }}
              style={{ background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6, padding: '4px 10px', color: 'var(--primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              Modifier
            </button>
          )}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Section title="Activités du jour">
              <p style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{rapport.activites}</p>
            </Section>
            {rapport.problemes && <Section title="Problèmes rencontrés">
              <p style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{rapport.problemes}</p>
            </Section>}
            {rapport.objectifsDemain && <Section title="Objectifs de demain">
              <p style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{rapport.objectifsDemain}</p>
            </Section>}
            {isCommercial && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Section title="Statistiques">
                  <div style={{ display: 'flex', gap: 20 }}>
                    {[['Appels', rapport.appelsClients], ['Inscriptions', rapport.inscriptionsCreees], ['Paiements enc.', rapport.paiementsEncaisses]].map(([l, v]) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>{v || 0}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{l}</p>
                      </div>
                    ))}
                  </div>
                </Section>
                {rapport.appelsDetail?.length > 0 && (
                  <Section title="Détail appels">
                    {rapport.appelsDetail.map((a, i) => (
                      <div key={i} style={{ fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 600 }}>{a.nom}</span> — {a.telephone} — {a.motif} ({a.type})
                        {a.commentaire && <span style={{ color: 'var(--text-muted)' }}> · {a.commentaire}</span>}
                      </div>
                    ))}
                  </Section>
                )}
              </div>
            )}
            {isSocial && rapport.plateformes?.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <Section title="Plateformes">
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {rapport.plateformes.map(p => (
                      <span key={p} style={{ background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>{p}</span>
                    ))}
                  </div>
                </Section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RapportsPage() {
  const { role, user } = useAuth();
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filterDate, setFilterDate] = useState('');

  const isCommercial = ['commercial', 'COMMERCIAL'].includes(role);
  const isSocial = role === 'social';
  const isAdmin = ['secretaire', 'dg', 'administrateur', 'ADMIN', 'DG', 'SECRETAIRE', 'INFORMATIQUE', 'GESTIONNAIRE'].includes(role);

  // Form state
  const [form, setForm] = useState({
    activites: '', problemes: '', objectifsDemain: '',
    // Commercial
    appelsClients: 0, inscriptionsCreees: 0, paiementsEncaisses: 0,
    suiviCommercial: '', constats: '',
    appelsDetail: [],
    // Social
    publications: 0, vues: 0, abonnesGagnes: 0, likes: 0,
    campagnesActives: 0, budgetCampagne: 0,
    plateformes: [],
    // Informatique
    articlesPub: 0, packagesMAJ: 0, etatSite: '', problemesRegles: '',
  });

  const fetchRapports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      const r = await api.get('/rapports', { params });
      setRapports(r.data.rapports || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRapports(); }, [filterDate]);

  const canEdit = (rapport) => {
    const agentId = rapport.agentId?._id || rapport.agentId?.id || rapport.agentId;
    if (agentId?.toString() !== user?.id?.toString()) return false;
    const diff = (new Date() - new Date(rapport.dateCreation)) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  };

  const openEdit = (r) => {
    setEditId(r._id);
    setForm({
      activites: r.activites || '', problemes: r.problemes || '', objectifsDemain: r.objectifsDemain || '',
      appelsClients: r.appelsClients || 0, inscriptionsCreees: r.inscriptionsCreees || 0, paiementsEncaisses: r.paiementsEncaisses || 0,
      suiviCommercial: r.suiviCommercial || '', constats: r.constats || '',
      appelsDetail: r.appelsDetail || [],
      publications: r.publications || 0, vues: r.vues || 0, abonnesGagnes: r.abonnesGagnes || 0,
      likes: r.likes || 0, campagnesActives: r.campagnesActives || 0, budgetCampagne: r.budgetCampagne || 0,
      plateformes: r.plateformes || [],
      articlesPub: r.articlesPub || 0, packagesMAJ: r.packagesMAJ || 0, etatSite: r.etatSite || '', problemesRegles: r.problemesRegles || '',
    });
    setShowForm(true);
  };

  const addAppel = () => setForm(f => ({ ...f, appelsDetail: [...f.appelsDetail, { nom: '', telephone: '', motif: '', type: 'SORTANT', commentaire: '' }] }));
  const removeAppel = (i) => setForm(f => ({ ...f, appelsDetail: f.appelsDetail.filter((_, idx) => idx !== i) }));
  const updateAppel = (i, key, val) => setForm(f => ({ ...f, appelsDetail: f.appelsDetail.map((a, idx) => idx === i ? { ...a, [key]: val } : a) }));

  const togglePlateforme = (p) => setForm(f => ({
    ...f, plateformes: f.plateformes.includes(p) ? f.plateformes.filter(x => x !== p) : [...f.plateformes, p],
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.patch(`/rapports/${editId}`, form);
      else await api.post('/rapports', form);
      toast(editId ? 'Rapport mis à jour' : 'Rapport soumis');
      setShowForm(false); setEditId(null);
      setForm({ activites: '', problemes: '', objectifsDemain: '', appelsClients: 0, inscriptionsCreees: 0, paiementsEncaisses: 0, suiviCommercial: '', constats: '', appelsDetail: [], publications: 0, vues: 0, abonnesGagnes: 0, likes: 0, campagnesActives: 0, budgetCampagne: 0, plateformes: [], articlesPub: 0, packagesMAJ: 0, etatSite: '', problemesRegles: '' });
      fetchRapports();
    } catch (err) { toast(err.response?.data?.message || 'Erreur', 'error'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{rapports.length} rapport(s)</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isAdmin && (
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="premium-input" style={{ width: 160 }} />
          )}
          {!isAdmin && (
            <button onClick={() => { setEditId(null); setShowForm(true); }} className="btn-primary">
              + Soumettre mon rapport
            </button>
          )}
        </div>
      </div>

      {/* Two-column layout: form left, history right */}
      <div style={{ display: 'grid', gridTemplateColumns: showForm ? '1fr 1fr' : '1fr', gap: 20 }}>
        {showForm && (
          <div className="premium-card">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
              {editId ? 'Modifier le rapport' : 'Rapport du jour'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="input-label">Activités du jour *</label>
                <textarea value={form.activites} onChange={e => setForm(f => ({ ...f, activites: e.target.value }))}
                  className="premium-input" rows={4} required />
              </div>
              <div>
                <label className="input-label">Problèmes rencontrés</label>
                <textarea value={form.problemes} onChange={e => setForm(f => ({ ...f, problemes: e.target.value }))}
                  className="premium-input" rows={2} />
              </div>
              <div>
                <label className="input-label">Objectifs de demain</label>
                <textarea value={form.objectifsDemain} onChange={e => setForm(f => ({ ...f, objectifsDemain: e.target.value }))}
                  className="premium-input" rows={2} />
              </div>

              {/* Commercial sections */}
              {isCommercial && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[['appelsClients', 'Appels clients'], ['inscriptionsCreees', 'Inscriptions créées'], ['paiementsEncaisses', 'Paiements (FCFA)']].map(([k, l]) => (
                      <div key={k}>
                        <label className="input-label">{l}</label>
                        <input type="number" min="0" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} className="premium-input" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="input-label">Suivi commercial</label>
                    <textarea value={form.suiviCommercial} onChange={e => setForm(f => ({ ...f, suiviCommercial: e.target.value }))} className="premium-input" rows={2} />
                  </div>
                  <div>
                    <label className="input-label">Constats / Suggestions</label>
                    <textarea value={form.constats} onChange={e => setForm(f => ({ ...f, constats: e.target.value }))} className="premium-input" rows={2} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <label className="input-label" style={{ margin: 0 }}>Appels clients ({form.appelsDetail.length})</label>
                      <button type="button" onClick={addAppel}
                        style={{ background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6, padding: '4px 10px', color: 'var(--primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Plus size={12} /> Ajouter
                      </button>
                    </div>
                    {form.appelsDetail.map((a, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6, marginBottom: 6, alignItems: 'end' }}>
                        <input placeholder="Nom" value={a.nom} onChange={e => updateAppel(i, 'nom', e.target.value)} className="premium-input" style={{ fontSize: 12 }} />
                        <input placeholder="Téléphone" value={a.telephone} onChange={e => updateAppel(i, 'telephone', e.target.value)} className="premium-input" style={{ fontSize: 12 }} />
                        <input placeholder="Motif" value={a.motif} onChange={e => updateAppel(i, 'motif', e.target.value)} className="premium-input" style={{ fontSize: 12 }} />
                        <button type="button" onClick={() => removeAppel(i)}
                          style={{ background: 'rgba(220,38,38,0.08)', border: 'none', borderRadius: 6, padding: '6px 8px', color: '#DC2626', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Social sections */}
              {isSocial && (
                <>
                  <div>
                    <label className="input-label">Plateformes utilisées</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {PLATEFORMES.map(p => (
                        <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                          <input type="checkbox" checked={form.plateformes.includes(p)} onChange={() => togglePlateforme(p)} />
                          {p}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[['publications', 'Publications'], ['vues', 'Vues'], ['abonnesGagnes', 'Abonnés gagnés'], ['likes', 'Likes'], ['campagnesActives', 'Campagnes actives'], ['budgetCampagne', 'Budget (FCFA)']].map(([k, l]) => (
                      <div key={k}>
                        <label className="input-label">{l}</label>
                        <input type="number" min="0" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} className="premium-input" />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Informatique sections */}
              {['administrateur', 'INFORMATIQUE'].includes(role) && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[['articlesPub', 'Articles publiés'], ['packagesMAJ', 'Packages mis à jour']].map(([k, l]) => (
                      <div key={k}>
                        <label className="input-label">{l}</label>
                        <input type="number" min="0" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} className="premium-input" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="input-label">État du site</label>
                    <input value={form.etatSite} onChange={e => setForm(f => ({ ...f, etatSite: e.target.value }))} className="premium-input" placeholder="Opérationnel, maintenance..." />
                  </div>
                  <div>
                    <label className="input-label">Problèmes réglés</label>
                    <textarea value={form.problemesRegles} onChange={e => setForm(f => ({ ...f, problemesRegles: e.target.value }))} className="premium-input" rows={2} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">Annuler</button>
                <button type="submit" className="btn-primary">{editId ? 'Mettre à jour' : 'Soumettre'}</button>
              </div>
            </form>
          </div>
        )}

        <div>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', padding: 20 }}>Chargement...</p>
          ) : rapports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>📋</p>
              <p>Aucun rapport{filterDate ? ' pour cette date' : ''}</p>
            </div>
          ) : rapports.map(r => (
            <RapportCard
              key={r._id}
              rapport={r}
              canEdit={canEdit}
              onEdit={openEdit}
              isCommercial={isCommercial}
              isSocial={isSocial}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
