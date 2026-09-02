import { useEffect, useState } from 'react';
import { 
  User, Mail, Phone, Shield, KeyRound, Lock, Eye, EyeOff, 
  CheckCircle2, AlertCircle, Calendar, ShieldCheck, 
  Sparkles, Layers, Activity, Clock
} from 'lucide-react';
import api from '../../../core/api/axios';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { ROLE_LABELS, ROLE_COLORS, ALL_MENU_ITEMS, MENU_BY_ROLE } from '../../../utils/roles';

export default function ProfilPage() {
  const { role: authRole } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('infos'); // 'infos' | 'security' | 'permissions'

  // Édition informations
  const [editingInfo, setEditingInfo] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '' });
  const [savingInfo, setSavingInfo] = useState(false);

  // Modification mot de passe
  const [pwForm, setPwForm] = useState({ ancienPassword: '', nouveauPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [showPw, setShowPw] = useState({ ancien: false, nouveau: false, confirm: false });

  const fetchProfil = async () => {
    try {
      const res = await api.get('/users/me').catch(() => api.get('/profile/me'));
      const u = res.data.user || res.data.data;
      setUser(u);
      setForm({
        nom: u?.nom || '',
        prenom: u?.prenom || '',
        email: u?.email || '',
        telephone: u?.telephone || '',
      });
    } catch (e) {
      console.error('Erreur chargement profil:', e);
      toast('Impossible de charger le profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfil();
  }, []);

  const handleUpdateInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      await api.patch('/users/me', form).catch(() => api.patch('/profile/me', form));
      await fetchProfil();
      setEditingInfo(false);
      toast('Informations mises à jour avec succès', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.nouveauPassword !== pwForm.confirm) {
      return toast('Les mots de passe ne correspondent pas', 'error');
    }
    if (pwForm.nouveauPassword.length < 6) {
      return toast('Le mot de passe doit contenir au moins 6 caractères', 'error');
    }
    setSavingPw(true);
    try {
      await api.patch('/users/me/password', {
        ancienPassword: pwForm.ancienPassword,
        nouveauPassword: pwForm.nouveauPassword,
      }).catch(() => api.patch('/profile/me/password', {
        ancienPassword: pwForm.ancienPassword,
        nouveauPassword: pwForm.nouveauPassword,
      }));
      setPwForm({ ancienPassword: '', nouveauPassword: '', confirm: '' });
      toast('Mot de passe modifié avec succès', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors du changement de mot de passe', 'error');
    } finally {
      setSavingPw(false);
    }
  };

  const userRole = (user?.role || authRole || '').toLowerCase();
  const roleColor = ROLE_COLORS[userRole] || '#00674F';
  const roleLabel = ROLE_LABELS[userRole] || user?.role || 'Utilisateur';
  const initiales = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase() || 'U';

  // Calcul score force mot de passe
  const calculatePasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const pwStrength = calculatePasswordStrength(pwForm.nouveauPassword);
  const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Excellent'];
  const strengthColors = ['#E5E7EB', '#DC2626', '#D97706', '#2563EB', '#16A34A'];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto' }}>
      
      {/* ── BANNIÈRE HERO PROFIL ────────────────────────────────────────────── */}
      <div className="premium-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {/* Fond dégradé */}
        <div style={{
          height: 120,
          background: 'linear-gradient(135deg, #00674F 0%, #0A4D3C 50%, #042E25 100%)',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', right: 24, top: 20, opacity: 0.15, color: 'white' }}>
            <Sparkles size={80} />
          </div>
        </div>

        {/* Contenu principal Hero */}
        <div style={{ padding: '0 28px 24px 28px', marginTop: -48, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20 }}>
            {/* Avatar stylisé */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${roleColor}, #00674F)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 34,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                border: '4px solid white',
              }}>
                {initiales}
              </div>
              {/* Badge En ligne */}
              <div style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#16A34A',
                border: '3px solid white',
              }} title="Session active" />
            </div>

            {/* Infos texte */}
            <div style={{ paddingBottom: 4 }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
                {user?.prenom} {user?.nom}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={13} /> {user?.email}
              </p>
            </div>
          </div>

          {/* Badges de rôle et statut */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 4 }}>
            <span style={{
              background: `${roleColor}15`,
              color: roleColor,
              border: `1px solid ${roleColor}30`,
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Shield size={13} /> {roleLabel}
            </span>
            <span style={{
              background: user?.actif !== false ? '#F0FDF4' : '#FEF2F2',
              color: user?.actif !== false ? '#16A34A' : '#DC2626',
              border: `1px solid ${user?.actif !== false ? '#BBF7D0' : '#FECACA'}`,
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <CheckCircle2 size={13} /> {user?.actif !== false ? 'Compte Actif' : 'Compte Inactif'}
            </span>
          </div>
        </div>

        {/* ── BARRE D'ONGLETS ──────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderTop: '1px solid var(--border)', background: '#FAFAFA' }}>
          {[
            { id: 'infos', label: 'Informations personnelles', icon: User },
            { id: 'security', label: 'Sécurité & Mot de passe', icon: KeyRound },
            { id: 'permissions', label: 'Droits & Permissions', icon: Layers },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: `3px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                  padding: '14px 18px',
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENU EN 2 COLONNES ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start' }}>
        
        {/* ── COLONNE GAUCHE : APERÇU RAPIDE ───────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Carte récapitulatif */}
          <div className="premium-card">
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
              Aperçu du compte
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,103,79,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <User size={16} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nom complet</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{user?.prenom} {user?.nom}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,103,79,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Mail size={16} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Adresse e-mail</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{user?.email}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,103,79,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Phone size={16} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Téléphone</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{user?.telephone || 'Non renseigné'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,103,79,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Calendar size={16} />
                </div>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Membre depuis</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                    {user?.created_at || user?.createdAt ? new Date(user.created_at || user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLONNE DROITE : CONTENU DES ONGLETS ─────────────────────────── */}
        <div>
          {/* ONGLET 1 : INFORMATIONS PERSONNELLES */}
          {activeTab === 'infos' && (
            <div className="premium-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>Informations personnelles</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Gérez vos informations de contact et d'identité
                  </p>
                </div>
                {!editingInfo && (
                  <button
                    onClick={() => setEditingInfo(true)}
                    className="btn-primary"
                    style={{ fontSize: 13, padding: '6px 16px' }}
                  >
                    Modifier mes infos
                  </button>
                )}
              </div>

              {!editingInfo ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ background: 'var(--bg-main)', padding: '14px 16px', borderRadius: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Prénom</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>{user?.prenom || '—'}</p>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '14px 16px', borderRadius: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Nom</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>{user?.nom || '—'}</p>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '14px 16px', borderRadius: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Adresse e-mail</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>{user?.email || '—'}</p>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '14px 16px', borderRadius: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Numéro de téléphone</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>{user?.telephone || '—'}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateInfo} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label className="input-label">Prénom *</label>
                      <input
                        value={form.prenom}
                        onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                        className="premium-input"
                        placeholder="Votre prénom"
                        required
                      />
                    </div>
                    <div>
                      <label className="input-label">Nom *</label>
                      <input
                        value={form.nom}
                        onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                        className="premium-input"
                        placeholder="Votre nom"
                        required
                      />
                    </div>
                    <div>
                      <label className="input-label">Adresse e-mail *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="premium-input"
                        placeholder="exemple@kyswatravel.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="input-label">Téléphone</label>
                      <input
                        value={form.telephone}
                        onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                        className="premium-input"
                        placeholder="+221 77 123 45 67"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => setEditingInfo(false)}
                      className="btn-secondary"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={savingInfo}
                      className="btn-primary"
                    >
                      {savingInfo ? 'Enregistrement...' : 'Enregistrer les modifications'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ONGLET 2 : SÉCURITÉ & MOT DE PASSE */}
          {activeTab === 'security' && (
            <div className="premium-card">
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>Changer le mot de passe</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Pour garantir la sécurité de votre compte, choisissez un mot de passe robuste
                </p>
              </div>

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="input-label">Ancien mot de passe *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw.ancien ? 'text' : 'password'}
                      value={pwForm.ancienPassword}
                      onChange={e => setPwForm(f => ({ ...f, ancienPassword: e.target.value }))}
                      className="premium-input"
                      placeholder="••••••••"
                      style={{ paddingRight: 40 }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => ({ ...s, ancien: !s.ancien }))}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                      {showPw.ancien ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="input-label">Nouveau mot de passe *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPw.nouveau ? 'text' : 'password'}
                        value={pwForm.nouveauPassword}
                        onChange={e => setPwForm(f => ({ ...f, nouveauPassword: e.target.value }))}
                        className="premium-input"
                        placeholder="••••••••"
                        style={{ paddingRight: 40 }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(s => ({ ...s, nouveau: !s.nouveau }))}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        {showPw.nouveau ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Confirmer le nouveau mot de passe *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPw.confirm ? 'text' : 'password'}
                        value={pwForm.confirm}
                        onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                        className="premium-input"
                        placeholder="••••••••"
                        style={{ paddingRight: 40 }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                      >
                        {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Indicateur visuel de force */}
                {pwForm.nouveauPassword && (
                  <div style={{ background: 'var(--bg-main)', padding: 12, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Force du mot de passe :</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: strengthColors[pwStrength] }}>
                        {strengthLabels[pwStrength]}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2, 3, 4].map(level => (
                        <div
                          key={level}
                          style={{
                            flex: 1,
                            height: 6,
                            borderRadius: 3,
                            background: level <= pwStrength ? strengthColors[pwStrength] : '#E5E7EB',
                            transition: 'all 0.25s ease',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button
                    type="submit"
                    disabled={savingPw}
                    className="btn-primary"
                    style={{ padding: '8px 24px' }}
                  >
                    {savingPw ? 'Modification en cours...' : 'Mettre à jour le mot de passe'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ONGLET 3 : DROITS & PERMISSIONS */}
          {activeTab === 'permissions' && (() => {
            const isSuper = ['dg', 'administrateur', 'informatique', 'admin'].includes(userRole);
            const userAllowedMenus = MENU_BY_ROLE[userRole] || [];
            
            const isAllowed = (item) => {
              if (isSuper) return true;
              if (!item.module) return true; // Dashboard accessible à tous
              return userAllowedMenus.some(m => m.to === item.to || (m.module && m.module === item.module));
            };

            const allowedItems = ALL_MENU_ITEMS.filter(isAllowed);

            return (
              <div className="premium-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={18} color="#16A34A" /> Modules & Droits d'accès ({allowedItems.length})
                    </h2>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Fonctionnalités et espaces accessibles avec votre profil <strong style={{ color: roleColor }}>{roleLabel}</strong>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {allowedItems.map((item, idx) => {
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: '1px solid #BBF7D0',
                          background: '#F0FDF4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(22,163,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A' }}>
                            <ItemIcon size={18} />
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>{item.label}</span>
                        </div>
                        <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 12, border: '1px solid #86EFAC' }}>
                          ✓ Autorisé
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
