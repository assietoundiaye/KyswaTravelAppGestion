import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import api from '../../../core/api/axios';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { ROLE_LABELS, ROLE_COLORS } from '../../../utils/roles';

const ROLE_BG = {
  administrateur: '#7C3AED', dg: '#7C3AED',
  commercial: '#059669', oumra: '#059669',
  comptable: '#EA580C',
  secretaire: '#2563EB',
  gestionnaire: '#0891B2',
};

export default function ProfilPage() {
  const { role } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Édition infos
  const [editingInfo, setEditingInfo] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '' });
  const [saving, setSaving] = useState(false);

  // Changement mot de passe
  const [editingPw, setEditingPw] = useState(false);
  const [pwForm, setPwForm] = useState({ ancienPassword: '', nouveauPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [showPw, setShowPw] = useState({ ancien: false, nouveau: false, confirm: false });

  const fetchProfil = async () => {
    try {
      const res = await api.get('/profile/me');
      setUser(res.data.user);
      const u = res.data.user;
      setForm({ nom: u.nom || '', prenom: u.prenom || '', email: u.email || '', telephone: u.telephone || '' });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfil(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/profile/me', form);
      await fetchProfil();
      setEditingInfo(false);
      toast('Profil mis à jour');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.nouveauPassword !== pwForm.confirm) {
      return toast('Les mots de passe ne correspondent pas', 'error');
    }
    if (pwForm.nouveauPassword.length < 6) {
      return toast('Le mot de passe doit contenir au moins 6 caractères', 'error');
    }
    setSavingPw(true);
    try {
      await api.patch('/profile/me/password', {
        ancienPassword: pwForm.ancienPassword,
        nouveauPassword: pwForm.nouveauPassword,
      });
      setEditingPw(false);
      setPwForm({ ancienPassword: '', nouveauPassword: '', confirm: '' });
      toast('Mot de passe modifié');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSavingPw(false); }
  };

  const roleColor = ROLE_BG[role?.toLowerCase()] || '#6B7280';
  const roleLabel = ROLE_LABELS?.[role] || role || '—';
  const initiales = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: 32 }}>Chargement...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>

      {/* Header */}
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
        Mon profil
      </h1>

      {/* Carte identité */}
      <div className="premium-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${roleColor}, ${roleColor}bb)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 30, color: 'white',
            boxShadow: `0 4px 20px ${roleColor}40`,
          }}>
            {initiales || '?'}
          </div>

          {/* Infos principales */}
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-main)', marginBottom: 4 }}>
              {user?.prenom} {user?.nom}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                background: `${roleColor}18`, color: roleColor,
                border: `1px solid ${roleColor}30`,
                borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              }}>
                {roleLabel}
              </span>
              <span style={{
                background: user?.etat === 'ACTIF' ? '#F0FDF4' : '#FEF2F2',
                color: user?.etat === 'ACTIF' ? '#16A34A' : '#DC2626',
                borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700,
              }}>
                {user?.etat || 'ACTIF'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Informations personnelles */}
      <div className="premium-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>Informations personnelles</h3>
          {!editingInfo && (
            <button onClick={() => setEditingInfo(true)} className="btn-secondary" style={{ fontSize: 13 }}>
              Modifier
            </button>
          )}
        </div>

        {!editingInfo ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {[
              ['Prénom', user?.prenom || '—'],
              ['Nom', user?.nom || '—'],
              ['Email', user?.email || '—'],
              ['Téléphone', user?.telephone || '—'],
              ['Rôle', roleLabel],
              ['Membre depuis', user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR') : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="input-label">Prénom *</label>
                <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                  className="premium-input" required />
              </div>
              <div>
                <label className="input-label">Nom *</label>
                <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  className="premium-input" required />
              </div>
              <div>
                <label className="input-label">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="premium-input" required />
              </div>
              <div>
                <label className="input-label">Téléphone</label>
                <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                  className="premium-input" placeholder="+221 7X XXX XX XX" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setEditingInfo(false); }} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sécurité — changement mot de passe */}
      <div className="premium-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editingPw ? 18 : 0 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>Sécurité</h3>
            {!editingPw && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Modifier votre mot de passe de connexion
              </p>
            )}
          </div>
          {!editingPw && (
            <button onClick={() => setEditingPw(true)} className="btn-secondary" style={{ fontSize: 13 }}>
              Changer le mot de passe
            </button>
          )}
        </div>

        {editingPw && (
          <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['ancienPassword', 'Ancien mot de passe *', 'ancien'],
              ['nouveauPassword', 'Nouveau mot de passe *', 'nouveau'],
              ['confirm', 'Confirmer le nouveau mot de passe *', 'confirm'],
            ].map(([key, label, showKey]) => (
              <div key={key}>
                <label className="input-label">{label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw[showKey] ? 'text' : 'password'}
                    value={pwForm[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                    className="premium-input"
                    placeholder="••••••••"
                    style={{ paddingRight: 40 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => ({ ...s, [showKey]: !s[showKey] }))}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center' }}
                  >
                    {showPw[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            ))}

            {/* Indicateur de force */}
            {pwForm.nouveauPassword && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Force du mot de passe</p>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4].map(i => {
                    const score = [
                      pwForm.nouveauPassword.length >= 6,
                      pwForm.nouveauPassword.length >= 10,
                      /[A-Z]/.test(pwForm.nouveauPassword) && /[0-9]/.test(pwForm.nouveauPassword),
                      /[^A-Za-z0-9]/.test(pwForm.nouveauPassword),
                    ].filter(Boolean).length;
                    const colors = ['#DC2626', '#D97706', '#2563EB', '#16A34A'];
                    return (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i <= score ? colors[score - 1] : '#E5E7EB',
                        transition: 'background 0.2s',
                      }} />
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setEditingPw(false); setPwForm({ ancienPassword: '', nouveauPassword: '', confirm: '' }); }} className="btn-secondary">
                Annuler
              </button>
              <button type="submit" disabled={savingPw} className="btn-primary">
                {savingPw ? 'Modification...' : 'Confirmer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
