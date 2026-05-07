import { useEffect, useState, useMemo } from 'react';
import api from '../../../api/axios';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const CATEGORIES = ['LOYER','SALAIRES','FOURNITURES','TRANSPORT','COMMUNICATION','MARKETING','TAXES','AUTRE'];

const CAT_COLORS = {
  LOYER:         { bg: '#EFF6FF', color: '#2563EB' },
  SALAIRES:      { bg: '#F0FDF4', color: '#16A34A' },
  FOURNITURES:   { bg: '#FFFBEB', color: '#D97706' },
  TRANSPORT:     { bg: '#F5F3FF', color: '#7C3AED' },
  COMMUNICATION: { bg: '#FFF1F2', color: '#E11D48' },
  MARKETING:     { bg: '#FEF3C7', color: '#92400E' },
  TAXES:         { bg: '#FEF2F2', color: '#DC2626' },
  AUTRE:         { bg: '#F3F4F6', color: '#6B7280' },
};

export default function ComptabilitePage() {
  const [depenses, setDepenses] = useState([]);
  const [solde, setSolde] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    categorie: 'AUTRE',
    montant: '',
    description: '',
    dateDepense: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        api.get('/comptabilite/depenses'),
        api.get('/comptabilite/solde'),
      ]);
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
      setForm({ categorie: 'AUTRE', montant: '', description: '', dateDepense: new Date().toISOString().slice(0, 10) });
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/comptabilite/depenses/${confirmDeleteId}`);
      toast('Dépense supprimée');
      setConfirmDeleteId(null);
      fetchAll();
    } catch (e) {
      toast(e.response?.data?.message || 'Erreur', 'error');
    }
  };

  // Filtrage local
  const depensesFiltrees = useMemo(() => {
    if (!search.trim()) return depenses;
    const q = search.toLowerCase();
    return depenses.filter(d =>
      (d.description || '').toLowerCase().includes(q) ||
      (d.categorie || '').toLowerCase().includes(q)
    );
  }, [depenses, search]);

  // Totaux par catégorie
  const parCategorie = useMemo(() => {
    const map = {};
    depenses.forEach(d => {
      map[d.categorie] = (map[d.categorie] || 0) + Number(d.montant || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [depenses]);

  const cols = useMemo(() => [
    { header: 'Date', accessorFn: (d) => fmtDate(d.dateDepense) },
    {
      header: 'Catégorie', accessorKey: 'categorie',
      cell: ({ getValue }) => {
        const v = getValue();
        const s = CAT_COLORS[v] || CAT_COLORS.AUTRE;
        return <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>{v}</span>;
      }
    },
    { header: 'Description', accessorFn: (d) => d.description || '—' },
    {
      header: 'Montant', accessorKey: 'montant',
      cell: ({ getValue }) => <span style={{ fontWeight: 700, color: '#DC2626' }}>{fmt(getValue())}</span>
    },
    {
      header: 'Actions', id: 'actions',
      cell: ({ row }) => (
        <button
          onClick={() => setConfirmDeleteId(row.original._id)}
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 12px', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
        >
          Supprimer
        </button>
      ),
    },
  ], []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
          Comptabilité
        </h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nouvelle dépense</button>
      </div>

      {/* Cartes résumé */}
      {solde && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div style={{ background: 'rgba(22,163,74,0.07)', borderRadius: 12, padding: '14px 18px', borderLeft: '4px solid #16A34A' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', marginBottom: 4 }}>Total encaissé</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#16A34A' }}>{fmt(solde.totalEncaisse)}</p>
          </div>
          <div style={{ background: 'rgba(220,38,38,0.07)', borderRadius: 12, padding: '14px 18px', borderLeft: '4px solid #DC2626' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', marginBottom: 4 }}>Total dépenses</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>{fmt(solde.totalDepenses)}</p>
          </div>
          <div style={{
            background: solde.solde >= 0 ? 'rgba(29,78,216,0.07)' : 'rgba(220,38,38,0.07)',
            borderRadius: 12, padding: '14px 18px',
            borderLeft: `4px solid ${solde.solde >= 0 ? '#1D4ED8' : '#DC2626'}`,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: solde.solde >= 0 ? '#1D4ED8' : '#DC2626', textTransform: 'uppercase', marginBottom: 4 }}>Solde général</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: solde.solde >= 0 ? '#1D4ED8' : '#DC2626' }}>{fmt(solde.solde)}</p>
          </div>
        </div>
      )}

      {/* Répartition par catégorie */}
      {parCategorie.length > 0 && (
        <div className="premium-card">
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>Répartition par catégorie</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {parCategorie.map(([cat, total]) => {
              const s = CAT_COLORS[cat] || CAT_COLORS.AUTRE;
              return (
                <div key={cat} style={{ background: s.bg, borderRadius: 10, padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 120 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase' }}>{cat}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{fmt(total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tableau des dépenses */}
      <div className="premium-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Dépenses ({depensesFiltrees.length})
          </h2>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filtrer par catégorie, description..."
            className="premium-input"
            style={{ width: 260 }}
          />
        </div>
        <DataTable columns={cols} data={depensesFiltrees} loading={loading} />
      </div>

      {/* Modal nouvelle dépense */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle dépense">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Catégorie *</label>
              <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} className="premium-input">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Montant (FCFA) *</label>
              <input type="number" min="0" value={form.montant}
                onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Date *</label>
              <input type="date" value={form.dateDepense}
                onChange={e => setForm(f => ({ ...f, dateDepense: e.target.value }))}
                className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Description</label>
              <input value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="premium-input" placeholder="Détail de la dépense..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Supprimer cette dépense ? Cette action est irréversible."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
