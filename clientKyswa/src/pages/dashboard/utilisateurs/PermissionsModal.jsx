import { useEffect, useState } from 'react';
import { Shield, Check, X, Loader } from 'lucide-react';
import api from '../../../core/api/axios';
import Modal from '../../../components/Modal';
import { toast } from '../../../components/Toast';

const MODULES = [
  { key: 'clients', label: '👤 Clients' },
  { key: 'reservations', label: '📋 Inscriptions' },
  { key: 'paiements', label: '💳 Paiements' },
  { key: 'visas', label: '🛂 Visas' },
  { key: 'billets', label: '  Billets' },
  { key: 'billets-groupe', label: '  Billets Groupe' },
  { key: 'comptabilite', label: '📊 Comptabilité' },
  { key: 'desistements', label: '⚠️ Désistements' },
  { key: 'recouvrement', label: '💰 Recouvrement' },
  { key: 'packages', label: '🧳 Départs' },
  { key: 'rapports', label: '📝 Rapports' },
  { key: 'documents', label: '📁 Secrétariat' },
  { key: 'reunions', label: '🤝 Réunions' },
  { key: 'statistiques', label: '📈 Statistiques' },
  { key: 'shop', label: '🛍️ Kyswa Shop' },
  { key: 'simulateur', label: '🧮 Simulateur' },
  { key: 'ziarra', label: '🕌 Ziarra' },
  { key: 'utilisateurs', label: '👥 Utilisateurs' },
  { key: 'audit', label: '🔍 Journal Audit' },
];

const ACTIONS = [
  { key: 'canView', label: 'Voir', color: '#2563EB' },
  { key: 'canCreate', label: 'Créer', color: '#059669' },
  { key: 'canEdit', label: 'Modifier', color: '#D97706' },
  { key: 'canDelete', label: 'Supprimer', color: '#DC2626' },
];

const EMPTY_PERMS = () => MODULES.reduce((acc, { key }) => {
  acc[key] = { canView: false, canCreate: false, canEdit: false, canDelete: false };
  return acc;
}, {});

export default function PermissionsModal({ open, onClose, utilisateur }) {
  const [permissions, setPermissions] = useState(EMPTY_PERMS());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const uid = utilisateur?._id || utilisateur?.id;

  useEffect(() => {
    if (!open || !uid) return;
    setLoading(true);
    api.get(`/permissions/${uid}`)
      .then(res => {
        setPermissions({ ...EMPTY_PERMS(), ...(res.data.permissions || {}) });
        setIsSuperAdmin(res.data.isSuperAdmin || false);
      })
      .catch(() => toast('Erreur lors du chargement des permissions', 'error'))
      .finally(() => setLoading(false));
  }, [open, uid]);

  const toggle = (module, action) => {
    setPermissions(prev => ({
      ...prev,
      [module]: { ...prev[module], [action]: !prev[module][action] },
    }));
  };

  // Cocher/décocher toute une ligne (module)
  const toggleRow = (module) => {
    const current = permissions[module];
    const allOn = ACTIONS.every(a => current[a.key]);
    setPermissions(prev => ({
      ...prev,
      [module]: ACTIONS.reduce((acc, a) => { acc[a.key] = !allOn; return acc; }, {}),
    }));
  };

  // Cocher/décocher toute une colonne (action)
  const toggleCol = (actionKey) => {
    const allOn = MODULES.every(m => permissions[m.key][actionKey]);
    setPermissions(prev => {
      const next = { ...prev };
      MODULES.forEach(({ key }) => {
        next[key] = { ...next[key], [actionKey]: !allOn };
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/permissions/${uid}`, { permissions });
      toast('Permissions mises à jour avec succès');
      onClose();
    } catch {
      toast('Erreur lors de la sauvegarde', 'error');
    } finally { setSaving(false); }
  };

  const fullName = utilisateur ? `${utilisateur.prenom || ''} ${utilisateur.nom || ''}`.trim() : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={18} color="var(--primary)" />
          <span>Permissions — <strong>{fullName}</strong></span>
        </div>
      }
    >
      <div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ marginTop: 12 }}>Chargement des permissions…</p>
          </div>
        ) : isSuperAdmin ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🛡️</div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>Super Administrateur</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Cet utilisateur a accès complet à tous les modules et ne peut pas être restreint.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Cochez les droits accordés à <strong>{fullName}</strong> pour chaque module de l'application.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-main)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>
                      Module
                    </th>
                    {ACTIONS.map(a => (
                      <th key={a.key} style={{ padding: '10px 10px', textAlign: 'center', borderBottom: '2px solid var(--border)', cursor: 'pointer', userSelect: 'none' }}
                        onClick={() => toggleCol(a.key)}
                        title={`Basculer toute la colonne "${a.label}"`}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: a.color, textTransform: 'uppercase' }}>{a.label}</span>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>↕ tout</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map(({ key, label }, i) => {
                    const perms = permissions[key] || {};
                    const allOn = ACTIONS.every(a => perms[a.key]);
                    return (
                      <tr key={key} style={{ background: i % 2 === 0 ? 'white' : 'var(--bg-main)', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light, #EFF6FF)'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : 'var(--bg-main)'}>
                        <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={allOn}
                            onChange={() => toggleRow(key)}
                            title="Tout cocher/décocher"
                            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                          />
                          <span style={{ fontWeight: 600 }}>{label}</span>
                        </td>
                        {ACTIONS.map(a => (
                          <td key={a.key} style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                            <button
                              type="button"
                              onClick={() => toggle(key, a.key)}
                              style={{
                                width: 28, height: 28, borderRadius: 6, border: 'none',
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                background: perms[a.key] ? `${a.color}18` : 'var(--bg-main)',
                                color: perms[a.key] ? a.color : 'var(--text-muted)',
                                transition: 'all 0.15s',
                                outline: perms[a.key] ? `1.5px solid ${a.color}40` : '1.5px solid transparent',
                              }}
                              title={perms[a.key] ? `Retirer "${a.label}"` : `Accorder "${a.label}"`}
                            >
                              {perms[a.key] ? <Check size={13} /> : <X size={13} />}
                            </button>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Légende */}
            <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
              {ACTIONS.map(a => (
                <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: a.color }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: a.color }} />
                  {a.label}
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                Cliquez sur l'en-tête d'une colonne pour basculer toute la colonne
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Réinitialiser toutes les exceptions et revenir aux permissions par défaut du rôle ?')) return;
                  setSaving(true);
                  try {
                    await api.delete(`/permissions/${uid}`);
                    toast('Permissions réinitialisées aux défauts du rôle');
                    onClose();
                  } catch {
                    toast('Erreur lors de la réinitialisation', 'error');
                  } finally { setSaving(false); }
                }}
                disabled={saving}
                style={{ background: 'none', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                🔄 Réinitialiser aux défauts du rôle
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
                <button type="button" onClick={handleSave} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={14} />
                  {saving ? 'Enregistrement…' : 'Enregistrer les permissions'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
