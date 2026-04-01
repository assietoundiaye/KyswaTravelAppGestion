import { useEffect, useState, useMemo } from 'react';
import api from '../../../api/axios';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import StatCard from '../../../components/StatCard';
import { toast } from '../../../components/Toast';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const CATEGORIES = ['LOYER','SALAIRES','FOURNITURES','TRANSPORT','COMMUNICATION','MARKETING','TAXES','AUTRE'];

export default function ComptabilitePage() {
  const [depenses, setDepenses] = useState([]);
  const [solde, setSolde] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ categorie: 'AUTRE', montant: '', description: '', dateDepense: new Date().toISOString().slice(0,10) });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([api.get('/comptabilite/depenses'), api.get('/comptabilite/solde')]);
      setDepenses(d.data.depenses || []);
      setSolde(s.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/comptabilite/depenses', { ...form, montant: Number(form.montant) });
      toast('Dépense enregistrée');
      setShowForm(false);
      setForm({ categorie: 'AUTRE', montant: '', description: '', dateDepense: new Date().toISOString().slice(0,10) });
      fetchAll();
    } catch (err) { toast(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/comptabilite/depenses/${id}`); toast('Supprimée'); fetchAll(); }
    catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
  };

  const cols = useMemo(() => [
    { header: 'Date', accessorFn: (d) => fmtDate(d.dateDepense) },
    { header: 'Catégorie', accessorKey: 'categorie', cell: ({ getValue }) => <span className="badge badge-primary">{getValue()}</span> },
    { header: 'Description', accessorFn: (d) => d.description || '-' },
    { header: 'Montant', accessorFn: (d) => fmt(d.montant), cell: ({ getValue }) => <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{getValue()}</span> },
    {
      header: 'Action', id: 'actions',
      cell: ({ row }) => (
        <button onClick={() => handleDelete(row.original._id)}
          style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Supprimer
        </button>
      ),
    },
  ], []);

  return (
    <div className="animate-fade-in space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>Comptabilité</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nouvelle dépense</button>
      </div>

      {solde && (
        <div className="stats-grid">
          <StatCard label="Total encaissé" value={fmt(solde.totalEncaisse)} colorClass="grad-card-green" icon="💰" />
          <StatCard label="Total dépenses" value={fmt(solde.totalDepenses)} colorClass="grad-card-rose" icon="📉" />
          <StatCard label="Solde général" value={fmt(solde.solde)} colorClass={solde.solde >= 0 ? 'grad-card-green' : 'grad-card-rose'} icon="⚖️" />
        </div>
      )}

      <div className="premium-card"><DataTable columns={cols} data={depenses} loading={loading} /></div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle dépense" size="sm">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Catégorie *</label>
            <select value={form.categorie} onChange={e => setForm(f => ({...f, categorie: e.target.value}))} className="premium-input">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Montant (FCFA) *</label>
            <input type="number" min="0" value={form.montant} onChange={e => setForm(f => ({...f, montant: e.target.value}))} className="premium-input" />
          </div>
          <div>
            <label className="input-label">Date *</label>
            <input type="date" value={form.dateDepense} onChange={e => setForm(f => ({...f, dateDepense: e.target.value}))} className="premium-input" />
          </div>
          <div>
            <label className="input-label">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="premium-input" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : 'Enregistrer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
