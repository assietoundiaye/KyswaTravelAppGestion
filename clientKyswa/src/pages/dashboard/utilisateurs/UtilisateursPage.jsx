import { useEffect, useState } from 'react';
import { Eye, EyeOff, UserPlus, Edit2, Power, Trash2 } from 'lucide-react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';
import { ROLE_LABELS, ROLE_COLORS, ROLES } from '../../../utils/roles';

const EMPTY = { nom: '', prenom: '', email: '', telephone: '', password: '', role: 'commercial' };

function Avatar({ nom, prenom, role }) {
  const initials = `${nom?.[0] || ''}${prenom?.[0] || ''}`.toUpperCase();
  const color = ROLE_COLORS[role] || '#6B7280';
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white',
    }}>{initials}</div>
  );
}

export default function UtilisateursPage() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try { const r = await api.get('/users'); setUtilisateurs(r.data.utilisateurs || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditId(null); setForm(EMPTY); setShowPwd(false); setShowModal(true);
  };

  const openEdit = (u) => {
    setEditId(u._id || u.id);
    setForm({ nom: u.nom, prenom: u.prenom, email: u.email, telephone: u.telephone || '', password: '', role: u.role });
    setShowPwd(false); setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone || undefined, role: form.role };
      if (!editId) payload.password = form.password;
      if (editId) await api.patch(`/users/${editId}`, payload);
      else await api.post('/users', { ...payload, password: form.password });
      setShowModal(false); setEditId(null);
      fetchUsers();
      toast(editId ? 'Utilisateur mis à jour' : 'Utilisateur créé');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    try { await api.patch(`/users/${id}/toggle-status`); fetchUsers(); toast('Statut mis à jour'); }
    catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/users/${deleteId}`); fetchUsers(); toast('Utilisateur supprimé'); }
    catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
    finally { setDeleteId(null); }
  };

  // New roles only for creation
  const newRoles = ['administrateur', 'dg', 'comptable', 'oumra', 'commercial', 'secretaire', 'billets', 'ziara', 'social'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{utilisateurs.length} compte(s)</p>
        <button onClick={openCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserPlus size={15} /> Créer un compte
        </button>
      </div>

      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Employé</th>
                <th>Email</th>
                <th>Téléphone</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</td></tr>
              ) : utilisateurs.map(u => {
                const uid = u._id || u.id;
                const roleColor = ROLE_COLORS[u.role] || '#6B7280';
                return (
                  <tr key={uid}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar nom={u.nom} prenom={u.prenom} role={u.role} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{u.nom} {u.prenom}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                    <td style={{ fontSize: 12 }}>{u.telephone || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                        background: `${roleColor}18`, color: roleColor,
                        fontSize: 11, fontWeight: 700, border: `1px solid ${roleColor}30`,
                      }}>{ROLE_LABELS[u.role] || u.role}</span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                        background: u.etat === 'ACTIF' ? '#F0FDF4' : '#FEF2F2',
                        color: u.etat === 'ACTIF' ? '#16A34A' : '#DC2626',
                        fontSize: 11, fontWeight: 700,
                      }}>{u.etat}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(u)} title="Modifier"
                          style={{ background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6, padding: '5px 8px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleToggle(uid)} title={u.etat === 'ACTIF' ? 'Désactiver' : 'Activer'}
                          style={{ background: u.etat === 'ACTIF' ? 'rgba(234,88,12,0.08)' : 'rgba(22,163,74,0.08)', border: 'none', borderRadius: 6, padding: '5px 8px', color: u.etat === 'ACTIF' ? '#EA580C' : '#16A34A', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Power size={13} />
                        </button>
                        <button onClick={() => setDeleteId(uid)} title="Supprimer"
                          style={{ background: 'rgba(220,38,38,0.08)', border: 'none', borderRadius: 6, padding: '5px 8px', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal create/edit */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Modifier le compte' : 'Nouveau compte'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="input-label">Nom *</label>
              <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Prénom *</label>
              <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Téléphone</label>
              <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} className="premium-input" />
            </div>
            {!editId && (
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Mot de passe *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="premium-input"
                    style={{ paddingRight: 40 }}
                    required
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Rôle *</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="premium-input">
                {newRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '...' : (editId ? 'Mettre à jour' : 'Créer le compte')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="Supprimer définitivement cet utilisateur ?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
