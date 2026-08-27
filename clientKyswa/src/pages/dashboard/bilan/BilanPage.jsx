import { useEffect, useState, useRef } from 'react';
import { Calendar, Clock, Users, TrendingUp, Plus, FileText, MessageSquare } from 'lucide-react';
import api from '../../../core/api/axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from '../../../components/Toast';
import ConfirmDialog from '../../../components/ConfirmDialog';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

// ── Countdown temps réel ──────────────────────────────────────────────────────
function Countdown({ dateDepart }) {
  const [tick, setTick] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(ref.current);
  }, []);

  if (!dateDepart) return null;

  const diff = new Date(dateDepart) - new Date();

  if (diff <= 0) {
    return (
      <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
        Départ passé
      </span>
    );
  }

  const totalSec = Math.floor(diff / 1000);
  const jours   = Math.floor(totalSec / 86400);
  const heures  = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const secondes = totalSec % 60;

  const urgColor = jours <= 7 ? '#DC2626' : jours <= 30 ? '#D97706' : '#16A34A';
  const urgBg    = jours <= 7 ? '#FEF2F2' : jours <= 30 ? '#FFFBEB' : '#F0FDF4';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <Clock size={13} color={urgColor} />
      <span style={{ background: urgBg, color: urgColor, borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
        {jours > 0 && `${jours}j `}
        {String(heures).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(secondes).padStart(2, '0')}
      </span>
      {jours <= 7 && (
        <span style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
          URGENT
        </span>
      )}
    </div>
  );
}

export default function BilanPage() {
  const [bilans, setBilans] = useState([]);
  const [bilansPersonnalises, setBilansPersonnalises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState({
    commentaires: '',
    observations: '',
    actionsSuivi: ['']
  });
  const [saving, setSaving] = useState(false);
  const [editingBilan, setEditingBilan] = useState(null);
  const { user } = useAuth();

  // Vérifier si l'utilisateur peut créer/modifier des bilans (seulement comptable)
  const canCreateBilan = ['comptable', 'dg', 'administrateur'].includes(user?.role);
  // Tout le monde peut visualiser
  const canViewBilan = ['commercial', 'oumra', 'comptable', 'dg', 'administrateur'].includes(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bilanRes, packagesRes, bilansPersoRes] = await Promise.all([
        api.get('/bilan'),
        api.get('/packages'),
        api.get('/bilan/personnalises')
      ]);
      setBilans(bilanRes.data.bilans || []);
      setPackages(packagesRes.data.packages || []);
      setBilansPersonnalises(bilansPersoRes.data.bilans || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBilan = async (e) => {
    e.preventDefault();
    if (!selectedPackage && !editingBilan) {
      toast('Veuillez sélectionner un départ', 'error');
      return;
    }

    setSaving(true);
    try {
      const filteredActions = form.actionsSuivi.filter(action => action.trim() !== '');
      
      if (editingBilan) {
        // Modification
        await api.put(`/bilan/${editingBilan._id}`, {
          commentaires: form.commentaires,
          observations: form.observations,
          actionsSuivi: filteredActions
        });
        toast('Bilan modifié avec succès');
      } else {
        // Création
        await api.post('/bilan', {
          packageId: selectedPackage,
          commentaires: form.commentaires,
          observations: form.observations,
          actionsSuivi: filteredActions
        });
        toast('Bilan de départ créé avec succès');
      }

      setShowForm(false);
      setEditingBilan(null);
      setForm({ commentaires: '', observations: '', actionsSuivi: [''] });
      setSelectedPackage('');
      fetchData();
    } catch (error) {
      toast(error.response?.data?.message || 'Erreur lors de l\'opération', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditBilan = (bilan) => {
    setEditingBilan(bilan);
    setForm({
      commentaires: bilan.commentaires || '',
      observations: bilan.observations || '',
      actionsSuivi: bilan.actionsSuivi.length > 0 ? bilan.actionsSuivi : ['']
    });
    setShowForm(true);
  };

  const handleDeleteBilan = async (id) => {
    try {
      await api.delete(`/bilan/${id}`);
      toast('Bilan supprimé avec succès');
      fetchData();
    } catch (error) {
      toast(error.response?.data?.message || 'Erreur lors de la suppression', 'error');
    }
  };

  const addAction = () => {
    setForm(prev => ({
      ...prev,
      actionsSuivi: [...prev.actionsSuivi, '']
    }));
  };

  const updateAction = (index, value) => {
    setForm(prev => ({
      ...prev,
      actionsSuivi: prev.actionsSuivi.map((action, i) => i === index ? value : action)
    }));
  };

  const removeAction = (index) => {
    if (form.actionsSuivi.length > 1) {
      setForm(prev => ({
        ...prev,
        actionsSuivi: prev.actionsSuivi.filter((_, i) => i !== index)
      }));
    }
  };

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: 32 }}>Chargement...</p>;

  return (
    <div className="animate-fade-in space-y-5">
      {/* En-tête avec bouton d'ajout */}
      <div className="flex items-center justify-between">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
          Bilan Départs
        </h1>
        {canCreateBilan && (
          <button 
            onClick={() => setShowForm(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={16} />
            Nouveau bilan
          </button>
        )}
      </div>

      {/* Message informatif pour les rôles en lecture seule */}
      {!canCreateBilan && canViewBilan && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 flex items-center gap-2">
            <FileText size={16} />
            <strong>Mode consultation :</strong> Les bilans sont créés et gérés par le service comptabilité.
            Vous pouvez consulter tous les bilans de départ ici.
          </p>
        </div>
      )}

      {/* Formulaire de création de bilan */}
      {showForm && (
        <div className="premium-card">
          <form onSubmit={handleSubmitBilan} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText size={18} />
                Nouveau bilan de départ
              </h2>
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>

            {/* Sélection du départ - seulement si on ne modifie pas */}
            {!editingBilan && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner un départ *
                </label>
                <select 
                  value={selectedPackage}
                  onChange={(e) => setSelectedPackage(e.target.value)}
                  className="premium-input"
                  required
                >
                  <option value="">Choisir un départ...</option>
                  {packages.map(pkg => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.nomReference} - {fmtDate(pkg.dateDepart)} ({pkg.statut})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Info du départ en modification */}
            {editingBilan && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Modification du bilan :</strong> {editingBilan.nomReference}
                </p>
                <p className="text-xs text-blue-600">
                  Créé le {fmtDate(editingBilan.dateCreation)} par {editingBilan.createdBy}
                </p>
              </div>
            )}

            {/* Commentaires */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <MessageSquare size={14} />
                Commentaires
              </label>
              <textarea 
                value={form.commentaires}
                onChange={(e) => setForm(prev => ({ ...prev, commentaires: e.target.value }))}
                className="premium-input"
                rows="3"
                placeholder="Commentaires généraux sur ce départ..."
              />
            </div>

            {/* Observations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observations
              </label>
              <textarea 
                value={form.observations}
                onChange={(e) => setForm(prev => ({ ...prev, observations: e.target.value }))}
                className="premium-input"
                rows="3"
                placeholder="Observations particulières, problèmes rencontrés..."
              />
            </div>

            {/* Actions de suivi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Actions de suivi
              </label>
              {form.actionsSuivi.map((action, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input 
                    type="text"
                    value={action}
                    onChange={(e) => updateAction(index, e.target.value)}
                    className="premium-input flex-1"
                    placeholder="Action à effectuer..."
                  />
                  {form.actionsSuivi.length > 1 && (
                    <button 
                      type="button"
                      onClick={() => removeAction(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg border"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button 
                type="button"
                onClick={addAction}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus size={14} />
                Ajouter une action
              </button>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 pt-4">
              <button 
                type="submit" 
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (editingBilan ? 'Modification...' : 'Création...') : (editingBilan ? 'Modifier le bilan' : 'Créer le bilan')}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowForm(false);
                  setEditingBilan(null);
                  setForm({ commentaires: '', observations: '', actionsSuivi: [''] });
                }}
                className="btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Section des bilans personnalisés */}
      {canViewBilan && bilansPersonnalises.length > 0 && (
        <div className="premium-card">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText size={18} />
            Bilans personnalisés
            {canCreateBilan && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full ml-2">
                Créés par le service comptabilité
              </span>
            )}
          </h2>
          <div className="space-y-4">
            {bilansPersonnalises.map((bilan) => (
              <div key={bilan._id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{bilan.nomReference}</h3>
                    <p className="text-sm text-gray-600">
                      Créé le {fmtDate(bilan.dateCreation)} par {bilan.createdBy}
                      {bilan.modifiePar && (
                        <span className="ml-2 text-gray-500">
                          • Modifié par {bilan.modifiePar}
                        </span>
                      )}
                    </p>
                  </div>
                  {canCreateBilan && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditBilan(bilan)}
                        className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteBilan(bilan._id)}
                        className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
                
                {bilan.commentaires && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Commentaires:</p>
                    <p className="text-sm text-gray-600 bg-white rounded p-2 border">{bilan.commentaires}</p>
                  </div>
                )}
                
                {bilan.observations && (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Observations:</p>
                    <p className="text-sm text-gray-600 bg-white rounded p-2 border">{bilan.observations}</p>
                  </div>
                )}
                
                {bilan.actionsSuivi && bilan.actionsSuivi.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700 mb-2">Actions de suivi:</p>
                    <ul className="space-y-1">
                      {bilan.actionsSuivi.map((action, index) => (
                        <li key={index} className="text-sm text-gray-600 bg-white rounded p-2 border flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Liste des bilans automatiques existants */}

      {/* Liste des bilans automatiques existants */}
      {canViewBilan && bilans.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} />
            Bilans automatiques des départs
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full ml-2">
              Données calculées automatiquement
            </span>
          </h2>
        </div>
      )}

      {bilans.length === 0 && bilansPersonnalises.length === 0 && canViewBilan && (
        <div className="premium-card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          Aucun bilan disponible pour le moment
        </div>
      )}

      {!canViewBilan && (
        <div className="premium-card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          Vous n'avez pas accès à cette section
        </div>
      )}

      {bilans.map(({ package: pkg, nbInscrits, quotaMax, tauxRemplissage, totalDu, totalEncaisse, resteTotal, parStatut }) => {
        const statutStyle = {
          OUVERT:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
          COMPLET: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
          TERMINE: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
          ANNULE:  { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
        }[pkg.statut] || { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };

        const barColor = tauxRemplissage >= 90 ? '#DC2626' : tauxRemplissage >= 70 ? '#D97706' : '#16A34A';

        return (
          <div key={pkg._id} className="premium-card">
            {/* En-tête du départ */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    {pkg.nomReference}
                  </h2>
                  <span style={{ background: statutStyle.bg, color: statutStyle.color, border: `1px solid ${statutStyle.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                    {pkg.statut}
                  </span>
                  <span style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                    {pkg.type}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <Calendar size={12} />
                  <span>{fmtDate(pkg.dateDepart)} — {fmtDate(pkg.dateRetour)}</span>
                </div>
              </div>

              {/* Countdown temps réel */}
              <Countdown dateDepart={pkg.dateDepart} />
            </div>

            {/* Taux de remplissage */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users size={12} /> Taux de remplissage
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
                  {nbInscrits}/{quotaMax} places ({tauxRemplissage}%)
                </span>
              </div>
              <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.min(tauxRemplissage, 100)}%`,
                  background: barColor, borderRadius: 4, transition: 'width 0.5s',
                }} />
              </div>
            </div>

            {/* Financier */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Total dû',  value: fmt(totalDu),       color: 'var(--text-main)', icon: TrendingUp },
                { label: 'Encaissé', value: fmt(totalEncaisse),  color: '#16A34A',           icon: TrendingUp },
                { label: 'Reste',    value: fmt(resteTotal),     color: resteTotal > 0 ? '#DC2626' : '#16A34A', icon: TrendingUp },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center', padding: '12px 10px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontWeight: 800, fontSize: 15, color, fontFamily: 'var(--font-display)' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Répartition par statut client */}
            {Object.keys(parStatut).length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(parStatut).map(([s, n]) => {
                  const colors = {
                    INSCRIT:  { bg: '#EFF6FF', color: '#2563EB' },
                    CONFIRME: { bg: '#F0FDF4', color: '#16A34A' },
                    PARTI:    { bg: '#F5F3FF', color: '#7C3AED' },
                    RENTRE:   { bg: '#F0FDF4', color: '#059669' },
                    DESISTE:  { bg: '#FEF2F2', color: '#DC2626' },
                    ANNULE:   { bg: '#F3F4F6', color: '#6B7280' },
                  }[s] || { bg: '#F3F4F6', color: '#6B7280' };
                  return (
                    <span key={s} style={{ background: colors.bg, color: colors.color, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>
                      {s} · {n}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
