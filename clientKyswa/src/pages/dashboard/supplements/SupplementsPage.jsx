import { useEffect, useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import api from '../../../core/api/axios';
import DataTable from '../../../components/DataTable';
import Pagination from '../../../components/Pagination';
import NumberInput from '../../../components/NumberInput';

const fmt = (n) => {
  if (!n) return '0 FCFA';
  // Gérer Decimal128 MongoDB qui arrive comme { $numberDecimal: "..." }
  const val = typeof n === 'object' && n.$numberDecimal ? n.$numberDecimal : n;
  return Number(val).toLocaleString('fr-FR') + ' FCFA';
};

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom: '', prix: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const supplementsFiltres = useMemo(() => {
    if (!search.trim()) return supplements;
    const q = search.toLowerCase();
    return supplements.filter(s => (s.nom || '').toLowerCase().includes(q));
  }, [supplements, search]);

  const paginatedSupplements = useMemo(() => {
    const start = (page - 1) * limit;
    return supplementsFiltres.slice(start, start + limit);
  }, [supplementsFiltres, page, limit]);

  const totalPages = Math.ceil(supplementsFiltres.length / limit) || 1;

  const fetchSupplements = async () => {
    setLoading(true);
    try { const r = await api.get('/supplements'); setSupplements(r.data.supplements || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSupplements(); }, []);

  const openEdit = (s) => {
    setEditId(s._id);
    const prixVal = s.prix && typeof s.prix === 'object' && s.prix.$numberDecimal
      ? s.prix.$numberDecimal
      : (s.prix || '');
    setForm({ nom: s.nom, prix: prixVal });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editId) await api.patch(`/supplements/${editId}`, { nom: form.nom, prix: Number(form.prix) });
      else await api.post('/supplements', { nom: form.nom, prix: Number(form.prix) });
      setShowForm(false); setEditId(null);
      setForm({ nom: '', prix: '' });
      fetchSupplements();
    } catch (err) { setError(err.response?.data?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce supplément ?')) return;
    try { await api.delete(`/supplements/${id}`); fetchSupplements(); }
    catch (e) { alert(e.response?.data?.message || 'Erreur'); }
  };

  const cols = useMemo(() => [
    { header: 'Nom', accessorKey: 'nom' },
    { header: 'Prix', accessorFn: (s) => fmt(s.prix) },
    {
      header: 'Actions', id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-3">
          <button onClick={() => openEdit(row.original)} className="text-xs text-primary hover:underline">Modifier</button>
          <button onClick={() => handleDelete(row.original._id)} className="text-xs text-red-500 hover:underline">Supprimer</button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Suppléments</h1>
        <button onClick={() => { setEditId(null); setForm({ nom: '', prix: '' }); setShowForm(true); }}
          className="btn-primary">
          + Nouveau supplément
        </button>
      </div>

      {/* Barre de recherche */}
      <div style={{ position: 'relative', maxWidth: 320 }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un supplément..."
          className="premium-input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-800">{editId ? 'Modifier' : 'Nouveau supplément'}</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
              <input value={form.nom} onChange={e => setForm(f => ({...f, nom: e.target.value}))}
                className="premium-input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prix (FCFA) *</label>
              <NumberInput value={form.prix} onChange={v => setForm(f => ({...f, prix: v}))}
                className="premium-input" min={0} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
              {saving ? '...' : (editId ? 'Mettre à jour' : 'Créer')}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
              className="btn-secondary">
              Annuler
            </button>
          </div>
        </form>
      )}

      <div className="premium-card">
        <DataTable columns={cols} data={paginatedSupplements} loading={loading} />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={supplementsFiltres.length}
          itemsPerPage={limit}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
      </div>
    </div>
  );
}
