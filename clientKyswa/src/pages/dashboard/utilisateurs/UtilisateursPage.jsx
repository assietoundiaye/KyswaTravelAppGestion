import { useEffect, useState, useMemo } from 'react';
import { Eye, EyeOff, UserPlus, Pencil, Power, Trash2, Search, Shield, Users } from 'lucide-react';
import api from '../../../core/api/axios';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Pagination from '../../../components/Pagination';
import { toast } from '../../../components/Toast';
import { ROLE_LABELS, ROLE_COLORS } from '../../../utils/roles';
import PermissionsModal from './PermissionsModal';

const EMPTY = { nom: '', prenom: '', email: '', telephone: '', password: '', role: 'commercial', poste: '' };

function Avatar({ nom, prenom, role }) {
  const initials = `${nom?.[0] || ''}${prenom?.[0] || ''}`.toUpperCase();
  const color = ROLE_COLORS[role] || '#6B7280';
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white',
    }}>
      {initials}
    </div>
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
  const [search, setSearch] = useState('');
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const utilisateursFiltres = useMemo(() => {
    if (!search.trim()) return utilisateurs;
    const q = search.toLowerCase();
    return utilisateurs.filter(u =>
      `${u.nom || ''} ${u.prenom || ''}`.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (ROLE_LABELS[u.role] || '').toLowerCase().includes(q)
    );
  }, [utilisateurs, search]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * limit;
    return utilisateursFiltres.slice(start, start + limit);
  }, [utilisateursFiltres, page, limit]);

  const totalPages = Math.ceil(utilisateursFiltres.length / limit) || 1;

  const fetchUsers = async () => {
    setLoading(true);
    try { const r = await api.get('/users'); setUtilisateurs(r.data.utilisateurs || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => { setEditId(null); setForm(EMPTY); setShowPwd(false); setShowModal(true); };

  const openEdit = (u) => {
    setEditId(u._id || u.id);
    setForm({ nom: u.nom, prenom: u.prenom, email: u.email, telephone: u.telephone || '', password: '', role: u.role, poste: u.poste || '' });
    setShowPwd(false); setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { nom: form.nom, prenom: form.prenom, email: form.email, telephone: form.telephone || undefined, role: form.role, poste: form.poste || form.role };
      if (!editId) payload.password = form.password;
      if (editId) await api.patch(`/users/${editId}`, payload);
      else await api.post('/users', { ...payload, password: form.password });
      setShowModal(false); setEditId(null);
      fetchUsers();
      toast(editId ? 'Compte mis à jour ✓' : 'Compte créé ✓');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    try { await api.patch(`/users/${id}/toggle-status`); fetchUsers(); toast('Statut mis à jour ✓'); }
    catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/users/${deleteId}`); fetchUsers(); toast('Utilisateur supprimé ✓'); }
    catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
    finally { setDeleteId(null); }
  };

  const newRoles = ['administrateur', 'dg', 'comptable', 'oumra', 'commercial', 'secretaire', 'billets', 'ziara', 'social'];

  // KPIs
  const totalActifs   = utilisateurs.filter(u => u.etat === 'ACTIF').length;
  const totalInactifs = utilisateurs.filter(u => u.etat !== 'ACTIF').length;

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── En-tête Page ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Utilisateurs</h1>
        <button
          onClick={openCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #059669, #047857)',
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(5,150,105,0.35)', transition: 'transform 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <UserPlus size={16} /> Créer un compte
        </button>
      </div>

      {/* ── Carte principale ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        {/* Titre section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#DCFCE7', borderRadius: 8, padding: 8 }}>
              <Users size={18} color="#059669" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Équipe Kyswa Travel</h2>
          </div>
          <span style={{ fontSize: 12, color: '#6B7280', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px' }}>
            {utilisateurs.length} compte{utilisateurs.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* KPI Cards */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '0 24px 20px' }}>
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <Users size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>TOTAL COMPTES</p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{utilisateurs.length}</div>
              </div>
            </div>

            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <Power size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>ACTIFS</p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#059669' }}>{totalActifs}</div>
              </div>
            </div>

            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <Shield size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>INACTIFS</p>
                <div style={{ fontSize: 26, fontWeight: 800, color: totalInactifs > 0 ? '#DC2626' : '#111827' }}>{totalInactifs}</div>
              </div>
            </div>
          </div>
        )}

        {/* Filtres */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px 20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher par nom, email, rôle..."
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 38, border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }}
            />
          </div>
          <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>
            {utilisateursFiltres.length} résultat{utilisateursFiltres.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tableau */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
                {['EMPLOYÉ', 'EMAIL', 'TÉLÉPHONE', 'RÔLE', 'STATUT', 'ACTIONS'].map(col => (
                  <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Chargement des utilisateurs...</td></tr>
              ) : paginatedUsers.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Aucun utilisateur trouvé</td></tr>
              ) : paginatedUsers.map((u, i) => {
                const uid = u._id || u.id;
                const roleColor = ROLE_COLORS[u.role] || '#6B7280';
                return (
                  <tr
                    key={uid}
                    style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}
                  >
                    {/* Employé */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar nom={u.nom} prenom={u.prenom} role={u.role} />
                        <div>
                          <div style={{ fontWeight: 700, color: '#111827' }}>{u.nom} {u.prenom}</div>
                          {u.poste && <div style={{ fontSize: 11, color: '#6B7280' }}>{u.poste}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#6B7280' }}>{u.email}</td>

                    {/* Téléphone */}
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#374151' }}>{u.telephone || '—'}</td>

                    {/* Rôle */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                        background: `${roleColor}18`, color: roleColor,
                        fontSize: 11, fontWeight: 700, border: `1px solid ${roleColor}30`,
                      }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>

                    {/* Statut */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 6,
                        background: u.etat === 'ACTIF' ? '#DCFCE7' : '#FEF2F2',
                        color: u.etat === 'ACTIF' ? '#166534' : '#DC2626',
                        fontSize: 11, fontWeight: 700,
                      }}>
                        {u.etat}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <ActionBtn onClick={() => openEdit(u)} title="Modifier" hoverBg="#F0FDF4" hoverColor="#059669" hoverBorder="#A7F3D0">
                          <Pencil size={13} />
                        </ActionBtn>
                        <ActionBtn onClick={() => setPermissionsUser(u)} title="Gérer les permissions" hoverBg="#F5F3FF" hoverColor="#7C3AED" hoverBorder="#DDD6FE">
                          <Shield size={13} />
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => handleToggle(uid)}
                          title={u.etat === 'ACTIF' ? 'Désactiver' : 'Activer'}
                          hoverBg={u.etat === 'ACTIF' ? '#FFF7ED' : '#F0FDF4'}
                          hoverColor={u.etat === 'ACTIF' ? '#EA580C' : '#16A34A'}
                          hoverBorder={u.etat === 'ACTIF' ? '#FED7AA' : '#A7F3D0'}
                        >
                          <Power size={13} />
                        </ActionBtn>
                        <ActionBtn onClick={() => setDeleteId(uid)} title="Supprimer" hoverBg="#FEF2F2" hoverColor="#DC2626" hoverBorder="#FECACA">
                          <Trash2 size={13} />
                        </ActionBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ borderTop: '1px solid #F3F4F6' }}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={utilisateursFiltres.length}
            itemsPerPage={limit}
            onPageChange={setPage}
            onLimitChange={l => { setLimit(l); setPage(1); }}
          />
        </div>
      </div>

      {/* Modal créer / modifier */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Modifier le compte' : 'Nouveau compte'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Nom *">
              <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={inputSt} required placeholder="NOM" />
            </FormField>
            <FormField label="Prénom *">
              <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} style={inputSt} required placeholder="Prénom" />
            </FormField>
            <FormField label="Email *">
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputSt} required placeholder="email@example.com" />
            </FormField>
            <FormField label="Téléphone">
              <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} style={inputSt} placeholder="+221 7X XXX XX XX" />
            </FormField>
            {!editId && (
              <div style={{ gridColumn: '1 / -1' }}>
                <FormField label="Mot de passe *">
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      style={{ ...inputSt, paddingRight: 40 }}
                      required
                      placeholder="Mot de passe sécurisé"
                    />
                    <button type="button" onClick={() => setShowPwd(p => !p)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </FormField>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Poste / Fonction">
                <input value={form.poste} onChange={e => setForm(f => ({ ...f, poste: e.target.value }))} style={inputSt} placeholder="Agent Commercial, Comptable, Responsable Oumra…" />
              </FormField>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Rôle *">
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputSt}>
                  {newRoles.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
                </select>
              </FormField>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
            <button type="button" onClick={() => setShowModal(false)}
              style={{ border: '1.5px solid #E5E7EB', background: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving}
              style={{ background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Enregistrement...' : (editId ? 'Mettre à jour' : 'Créer le compte')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="Supprimer définitivement cet utilisateur ? Cette action est irréversible."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <PermissionsModal
        open={!!permissionsUser}
        onClose={() => setPermissionsUser(null)}
        utilisateur={permissionsUser}
      />
    </div>
  );
}

function ActionBtn({ onClick, title, hoverBg, hoverColor, hoverBorder, children }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: h ? hoverBg : 'none',
        border: `1px solid ${h ? hoverBorder : '#E5E7EB'}`,
        color: h ? hoverColor : '#9CA3AF',
        borderRadius: 6, padding: '5px 7px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function FormField({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputSt = {
  width: '100%', height: 38, border: '1.5px solid #E5E7EB',
  borderRadius: 8, padding: '0 12px', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', background: '#fff',
};
