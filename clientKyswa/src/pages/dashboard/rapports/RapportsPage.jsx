import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../../core/api/axios';
import Pagination from '../../../components/Pagination';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
const fmtDateLong = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const PLATEFORMES = ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'WhatsApp'];

const EMPTY_FORM = {
  activites: '', problemes: '', objectifsDemain: '', notes: '',
  appelsClients: 0, inscriptionsCreees: 0, paiementsEncaisses: 0,
  suiviCommercial: '', constats: '', appelsDetail: [],
  publications: 0, vues: 0, abonnesGagnes: 0, likes: 0,
  campagnesActives: 0, budgetCampagne: 0, plateformes: [],
  articlesPub: 0, packagesMAJ: 0, etatSite: '', problemesRegles: '',
};

export default function RapportsPage() {
  const { role, user } = useAuth();
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [todayRapport, setTodayRapport] = useState(null);

  // ── Pagination historique ──────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const isCommercial = role === 'commercial';
  const isSocial = role === 'social';
  const isInformatique = role === 'administrateur';
  const isAdmin = ['secretaire', 'dg'].includes(role);
  const canSubmit = !isAdmin;

  const today = new Date().toISOString().split('T')[0];

  const fetchRapports = async () => {
    setLoading(true);
    try {
      const r = await api.get('/rapports');
      const list = r.data.rapports || [];
      setRapports(list);

      const mine = list.find(r => {
        const agentId = r.agentId?._id || r.agentId?.id || r.agentId;
        const sameAgent = agentId?.toString() === user?.id?.toString();
        const sameDay = new Date(r.date).toISOString().split('T')[0] === today;
        return sameAgent && sameDay;
      });

      setTodayRapport(mine || null);

      if (mine) {
        setEditId(mine._id);
        loadRapport(mine);
      } else {
        setForm(EMPTY_FORM);
        setEditId(null);
      }
    } catch (err) {
      console.error('Erreur fetch rapports:', err);
      toast('Erreur lors du chargement des rapports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRapports(); }, [user?.id]);

  const canEdit = (rapport) => {
    const agentId = rapport.agentId?._id || rapport.agentId?.id || rapport.agentId;
    if (agentId?.toString() !== user?.id?.toString()) return false;
    const diff = (new Date() - new Date(rapport.dateCreation)) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  };

  const loadRapport = (r) => {
    setEditId(r._id);
    setForm({
      activites: r.activites || '', problemes: r.problemes || '',
      objectifsDemain: r.objectifsDemain || '', notes: r.notes || '',
      appelsClients: r.appelsClients || 0, inscriptionsCreees: r.inscriptionsCreees || 0,
      paiementsEncaisses: r.paiementsEncaisses || 0, suiviCommercial: r.suiviCommercial || '',
      constats: r.constats || '', appelsDetail: r.appelsDetail || [],
      publications: r.publications || 0, vues: r.vues || 0,
      abonnesGagnes: r.abonnesGagnes || 0, likes: r.likes || 0,
      campagnesActives: r.campagnesActives || 0, budgetCampagne: r.budgetCampagne || 0,
      plateformes: r.plateformes || [],
      articlesPub: r.articlesPub || 0, packagesMAJ: r.packagesMAJ || 0,
      etatSite: r.etatSite || '', problemesRegles: r.problemesRegles || '',
    });
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setNum = (k) => (e) => setForm(f => ({ ...f, [k]: Number(e.target.value) }));
  const addAppel = () => setForm(f => ({ ...f, appelsDetail: [...f.appelsDetail, { nom: '', telephone: '', motif: '', type: 'SORTANT', commentaire: '' }] }));
  const removeAppel = (i) => setForm(f => ({ ...f, appelsDetail: f.appelsDetail.filter((_, idx) => idx !== i) }));
  const updateAppel = (i, k, v) => setForm(f => ({ ...f, appelsDetail: f.appelsDetail.map((a, idx) => idx === i ? { ...a, [k]: v } : a) }));
  const togglePlateforme = (p) => setForm(f => ({ ...f, plateformes: f.plateformes.includes(p) ? f.plateformes.filter(x => x !== p) : [...f.plateformes, p] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const submitData = {
        ...form,
        date: today
      };

      const response = await api.post('/rapports', submitData);
      const { action, message, rapport } = response.data;

      if (action === 'UPDATE') {
        toast(message || 'Rapport mis à jour avec succès');
        setTodayRapport(rapport);
        setEditId(rapport._id);
      } else {
        toast(message || 'Rapport soumis avec succès');
        setTodayRapport(rapport);
        setEditId(rapport._id);
      }

      await fetchRapports();
    } catch (err) {
      console.error('Erreur soumission rapport:', err);
      toast(err.response?.data?.message || 'Erreur lors de la soumission', 'error');
    } finally {
      setSaving(false);
    }
  };

  const paginatedRapports = useMemo(() => {
    const start = (page - 1) * limit;
    return rapports.slice(start, start + limit);
  }, [rapports, page, limit]);

  const totalPages = Math.ceil(rapports.length / limit) || 1;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }} className="grid-responsive-2">

      {/* Colonne gauche : formulaire */}
      <div>
        {/* Bannière statut */}
        {canSubmit && todayRapport && (
          <div style={{
            background: '#F0FDF4', border: '1px solid #16A34A', borderRadius: 10,
            padding: '12px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 20, height: 20, borderRadius: '50%', background: '#16A34A', color: 'white',
              fontSize: 12, fontWeight: 700
            }}>✓</span>
            <div>
              <div style={{ color: '#166534', marginBottom: 2 }}>
                Rapport soumis avec succès le {new Date(todayRapport.dateCreation || todayRapport.date).toLocaleDateString('fr-FR')}
              </div>
              <div style={{ color: '#16A34A', fontSize: 11 }}>
                Vous pouvez modifier ce rapport pendant {Math.max(0, 7 - Math.floor((new Date() - new Date(todayRapport.dateCreation || todayRapport.date)) / (1000 * 60 * 60 * 24)))} jour(s) restant(s)
              </div>
            </div>
          </div>
        )}

        {canSubmit && !todayRapport && (
          <div style={{
            background: '#FFF7ED', border: '1px solid #FB923C', borderRadius: 10,
            padding: '12px 16px', marginBottom: 16, fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span style={{ color: '#9A3412' }}>
              Aucun rapport soumis aujourd'hui — Veuillez remplir le formulaire ci-dessous
            </span>
          </div>
        )}

        <div className="premium-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <div style={{ width: 4, height: 20, borderRadius: 4, background: 'var(--primary)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>
              Rapport du {fmtDateLong(new Date())}
            </h2>
          </div>

          {isAdmin ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sélectionnez un rapport dans l'historique pour le consulter.</p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="input-label">Activités du jour *</label>
                <textarea value={form.activites} onChange={set('activites')} className="premium-input" rows={4} required />
              </div>
              <div>
                <label className="input-label">Problèmes rencontrés</label>
                <textarea value={form.problemes} onChange={set('problemes')} className="premium-input" rows={3} />
              </div>
              <div>
                <label className="input-label">Objectifs de demain</label>
                <textarea value={form.objectifsDemain} onChange={set('objectifsDemain')} className="premium-input" rows={3} />
              </div>
              <div>
                <label className="input-label">Notes supplémentaires</label>
                <textarea value={form.notes} onChange={set('notes')} className="premium-input" rows={3} />
              </div>

              {/* Commercial */}
              {isCommercial && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 4, height: 16, borderRadius: 4, background: '#2563EB' }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>Indicateurs commerciaux</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[['appelsClients', 'Appels clients'], ['inscriptionsCreees', 'Inscriptions'], ['paiementsEncaisses', 'Paiements (FCFA)']].map(([k, l]) => (
                      <div key={k}>
                        <label className="input-label">{l}</label>
                        <input type="number" min="0" value={form[k]} onChange={setNum(k)} className="premium-input" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Informatique */}
              {isInformatique && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 4, height: 16, borderRadius: 4, background: '#EA580C' }} />
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>Indicateurs informatiques</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label className="input-label">Articles publiés</label>
                      <input type="number" min="0" value={form.articlesPub} onChange={setNum('articlesPub')} className="premium-input" />
                    </div>
                    <div>
                      <label className="input-label">Packages mis à jour</label>
                      <input type="number" min="0" value={form.packagesMAJ} onChange={setNum('packagesMAJ')} className="premium-input" />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Enregistrement...' : (todayRapport ? 'Mettre à jour le rapport' : 'Soumettre le rapport')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Colonne droite : historique avec pagination */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 4, height: 16, borderRadius: 4, background: 'var(--primary)' }} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>
            Historique des rapports ({rapports.length})
          </h2>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</p>
        ) : rapports.length === 0 ? (
          <div className="premium-card" style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 13 }}>Aucun rapport pour le moment.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {paginatedRapports.map(r => {
              const agentId = r.agentId?._id || r.agentId?.id || r.agentId;
              const isMine = agentId?.toString() === user?.id?.toString();
              const editable = canEdit(r);
              const isSelected = editId === r._id;

              return (
                <div
                  key={r._id}
                  onClick={() => canSubmit && editable && loadRapport(r)}
                  style={{
                    background: isSelected ? 'rgba(0,103,79,0.04)' : 'white',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '12px 14px',
                    cursor: canSubmit && editable ? 'pointer' : 'default',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>
                        {fmtDate(r.date)}
                      </span>
                      {isAdmin && r.agentId && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          — {r.agentId.prenom} {r.agentId.nom}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtTime(r.date)}</span>
                      {isMine && editable && (
                        <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, background: 'rgba(0,103,79,0.08)', borderRadius: 4, padding: '1px 6px' }}>
                          Modifier
                        </span>
                      )}
                    </div>
                  </div>
                  <p style={{
                    fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
                    overflow: 'hidden', display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    « {r.activites} »
                  </p>
                </div>
              );
            })}

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={rapports.length}
              itemsPerPage={limit}
              onPageChange={setPage}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
              limitOptions={[10, 20, 50]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
