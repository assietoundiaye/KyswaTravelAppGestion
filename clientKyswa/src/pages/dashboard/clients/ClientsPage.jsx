import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import { toast } from '../../../components/Toast';

const EMPTY = {
  nom: '', prenom: '', telephone: '', email: '',
  numeroPasseport: '', dateExpirationPasseport: '',
  numeroCNI: '', dateNaissance: '', lieuNaissance: '',
  adresse: '', niveauFidelite: 'BRONZE',
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const fetchClients = async (q = '') => {
    setLoading(true);
    try {
      const res = await api.get('/clients', { params: q ? { search: q } : {} });
      setClients(res.data.clients || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchClients(e.target.value);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      // Nettoyer les champs vides optionnels
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
      await api.post('/clients', payload);
      setShowModal(false);
      setForm(EMPTY);
      fetchClients();
      toast('Client créé avec succès');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{clients.length} client(s)</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={search} onChange={handleSearch} placeholder="🔍 Nom, téléphone, passeport..."
            className="premium-input" style={{ width: 260 }} />
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Nouveau client</button>
        </div>
      </div>

      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Nom complet</th>
                <th>Passeport</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Fidélité</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Chargement...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucun client</td></tr>
              ) : clients.map(c => (
                <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/clients/${c._id}`)}>
                  <td style={{ fontWeight: 600 }}>{c.nom} {c.prenom}</td>
                  <td><span style={{ background: 'rgba(0,103,79,0.08)', color: 'var(--primary)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{c.numeroPasseport}</span></td>
                  <td style={{ fontSize: 12 }}>{c.telephone || '—'}</td>
                  <td style={{ fontSize: 12 }}>{c.email || '—'}</td>
                  <td>
                    <span style={{
                      background: { BRONZE: '#FEF3C7', ARGENT: '#F1F5F9', OR: '#FEF9C3', PLATINE: '#F0F9FF' }[c.niveauFidelite] || '#F3F4F6',
                      color: { BRONZE: '#92400E', ARGENT: '#475569', OR: '#854D0E', PLATINE: '#0369A1' }[c.niveauFidelite] || '#6B7280',
                      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                    }}>{c.niveauFidelite || 'BRONZE'}</span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/dashboard/clients/${c._id}`)}
                      style={{ background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6, padding: '4px 12px', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      Voir →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau client">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Identité */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Identité</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Nom *</label>
              <input value={form.nom} onChange={set('nom')} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Prénom *</label>
              <input value={form.prenom} onChange={set('prenom')} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Date de naissance</label>
              <input type="date" value={form.dateNaissance} onChange={set('dateNaissance')} className="premium-input" />
            </div>
            <div>
              <label className="input-label">Lieu de naissance</label>
              <input value={form.lieuNaissance} onChange={set('lieuNaissance')} className="premium-input" />
            </div>
          </div>

          {/* Contact */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Contact</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Téléphone</label>
              <input value={form.telephone} onChange={set('telephone')} className="premium-input" placeholder="+221 7X XXX XX XX" />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input type="email" value={form.email} onChange={set('email')} className="premium-input" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Adresse</label>
              <input value={form.adresse} onChange={set('adresse')} className="premium-input" />
            </div>
          </div>

          {/* Documents */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Documents</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">N° Passeport *</label>
              <input value={form.numeroPasseport} onChange={set('numeroPasseport')} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Expiration passeport</label>
              <input type="date" value={form.dateExpirationPasseport} onChange={set('dateExpirationPasseport')} className="premium-input" />
            </div>
            <div>
              <label className="input-label">N° CNI</label>
              <input value={form.numeroCNI} onChange={set('numeroCNI')} className="premium-input" />
            </div>
            <div>
              <label className="input-label">Niveau fidélité</label>
              <select value={form.niveauFidelite} onChange={set('niveauFidelite')} className="premium-input">
                {['BRONZE', 'ARGENT', 'OR', 'PLATINE'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Créer le client'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
