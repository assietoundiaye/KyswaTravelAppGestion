import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import Modal from '../../../components/Modal';

export default function ProfilPage() {
  const { role } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '' });
  const [saving, setSaving] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [pwForm, setPwForm] = useState({ ancienPassword: '', nouveauPassword: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);

  const fetchProfil = async () => {
    try {
      const res = await api.get('/profile/me');
      setUser(res.data.user);
      setForm({
        nom: res.data.user.nom || '',
        prenom: res.data.user.prenom || '',
        email: res.data.user.email || '',
        telephone: res.data.user.telephone || '',
      });
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
      setEditing(false);
      toast('Profil mis à jour avec succès');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pwForm.nouveauPassword !== pwForm.confirm) {
      return toast('Les mots de passe ne correspondent pas', 'error');
    }
    setSavingPw(true);
    try {
      await api.patch('/profile/me/password', {
        ancienPassword: pwForm.ancienPassword,
        nouveauPassword: pwForm.nouveauPassword,
      });
      setShowPwModal(false);
      setPwForm({ ancienPassword: '', nouveauPassword: '', confirm: '' });
      toast('Mot de passe modifié avec succès');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSavingPw(false); }
  };

  const roleColors = {
    ADMIN: { bg: '#7C3AED', label: 'Admin' },
    GESTIONNAIRE: { bg: '#2563EB', label: 'Gestionnaire' },
    COMMERCIAL: { bg: '#059669', label: 'Commercial' },
    COMPTABLE: { bg: '#EA580C', label: 'Comptable' },
  };
  const roleInfo = roleColors[role] || { bg: '#6B7280', label: role };

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: 32 }}>Chargement...</p>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 24 }}>
        Mon profil
      </h1>

      {/* Card avatar */}
      <div className="premium-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: `linear-gradient(135deg, ${roleInfo.bg}, ${roleInfo.bg}cc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'white',
            flexShrink: 0, boxShadow: `0 4px 16px ${roleInfo.bg}40`,
          }}>
            {user?.prenom?.[0]?.toUpperCase()}{user?.nom?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>
              {user?.prenom} {user?.nom}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{user?.email}</p>
            <span style={{
              display: 'inline-block', marginTop: 8,
              padding: '3px 12px', borderRadius: 20,
              background: `${roleInfo.bg}18`, color: roleInfo.bg,
              border: `1px solid ${roleInfo.bg}30`,
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{roleInfo.label}</span>
          </div>
        </div>
      </div>

      {/* Infos / Formulaire */}
      <div className="premium-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>
            Informations personnelles
          </h3>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
              ✏️ Modifier
            </button>
          )}
        </div>

        {!editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              ['Prénom', user?.prenom],
              ['Nom', user?.nom],
              ['Email', user?.email],
              ['Téléphone', user?.telephone || '—'],
              ['Rôle', roleInfo.label],
              ['Statut', user?.etat],
            ].map(([label, value]) => (
              <div key={label}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-main)' }}>{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="input-label">Prénom</label>
                <input value={form.prenom} onChange={e => setForm(f => ({...f, prenom: e.target.value}))} className="premium-input" />
              </div>
              <div>
                <label className="input-label">Nom</label>
                <input value={form.nom} onChange={e => setForm(f => ({...f, nom: e.target.value}))} className="premium-input" />
              </div>
              <div>
                <label className="input-label">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="premium-input" />
              </div>
              <div>
                <label className="input-label">Téléphone</label>
                <input value={form.telephone} onChange={e => setForm(f => ({...f, telephone: e.target.value}))} className="premium-input" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Sécurité */}
      <div className="premium-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>Sécurité</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Modifier votre mot de passe</p>
          </div>
          <button onClick={() => setShowPwModal(true)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
            🔒 Changer le mot de passe
          </button>
        </div>
      </div>

      {/* Modal mot de passe */}
      <Modal open={showPwModal} onClose={() => setShowPwModal(false)} title="Changer le mot de passe" size="sm">
        <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="input-label">Ancien mot de passe *</label>
            <input type="password" value={pwForm.ancienPassword}
              onChange={e => setPwForm(f => ({...f, ancienPassword: e.target.value}))}
              className="premium-input" placeholder="••••••••" />
          </div>
          <div>
            <label className="input-label">Nouveau mot de passe *</label>
            <input type="password" value={pwForm.nouveauPassword}
              onChange={e => setPwForm(f => ({...f, nouveauPassword: e.target.value}))}
              className="premium-input" placeholder="Min. 6 caractères" />
          </div>
          <div>
            <label className="input-label">Confirmer le nouveau mot de passe *</label>
            <input type="password" value={pwForm.confirm}
              onChange={e => setPwForm(f => ({...f, confirm: e.target.value}))}
              className="premium-input" placeholder="••••••••" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowPwModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={savingPw} className="btn-primary">
              {savingPw ? 'Modification...' : 'Confirmer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
