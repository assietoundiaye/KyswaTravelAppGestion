import { useEffect, useState, useMemo } from 'react';
import { Search, Tag, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../../../core/api/axios';
import Pagination from '../../../components/Pagination';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';
import NumberInput from '../../../components/NumberInput';

const fmt = (n) => {
  if (!n) return '0 FCFA';
  const val = typeof n === 'object' && n.$numberDecimal ? n.$numberDecimal : n;
  return Number(val).toLocaleString('fr-FR') + ' FCFA';
};

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom: '', prix: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [search, setSearch] = useState('');
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

  const openCreate = () => { setEditId(null); setForm({ nom: '', prix: '' }); setShowModal(true); };

  const openEdit = (s) => {
    setEditId(s._id || s.id);
    const prixVal = s.prix && typeof s.prix === 'object' && s.prix.$numberDecimal ? s.prix.$numberDecimal : (s.prix || '');
    setForm({ nom: s.nom, prix: prixVal });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await api.patch(`/supplements/${editId}`, { nom: form.nom, prix: Number(form.prix) });
      else await api.post('/supplements', { nom: form.nom, prix: Number(form.prix) });
      setShowModal(false); setEditId(null);
      setForm({ nom: '', prix: '' });
      fetchSupplements();
      toast(editId ? 'Supplément mis à jour ✓' : 'Supplément créé ✓');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/supplements/${confirmId}`); fetchSupplements(); toast('Supplément supprimé ✓'); }
    catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
    finally { setConfirmId(null); }
  };

  // Prix total du catalogue
  const prixTotal = useMemo(() => {
    return supplements.reduce((sum, s) => {
      const val = typeof s.prix === 'object' && s.prix.$numberDecimal ? Number(s.prix.$numberDecimal) : Number(s.prix || 0);
      return sum + val;
    }, 0);
  }, [supplements]);

  const prixMax = useMemo(() => {
    if (!supplements.length) return 0;
    return Math.max(...supplements.map(s => {
      const val = typeof s.prix === 'object' && s.prix.$numberDecimal ? Number(s.prix.$numberDecimal) : Number(s.prix || 0);
      return val;
    }));
  }, [supplements]);

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Suppléments</h1>
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
          <Plus size={16} /> Nouveau supplément
        </button>
      </div>

      {/* ── Carte principale ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        {/* Titre section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#DCFCE7', borderRadius: 8, padding: 8 }}>
              <Tag size={18} color="#059669" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Catalogue des Suppléments</h2>
          </div>
          <span style={{ fontSize: 12, color: '#6B7280', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px' }}>
            {supplements.length} option{supplements.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* KPI Cards */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '0 24px 20px' }}>
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}><Tag size={22} color="#059669" /></div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>TOTAL OPTIONS</p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{supplements.length}</div>
              </div>
            </div>
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}><Tag size={22} color="#059669" /></div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>PRIX MAXIMUM</p>
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{prixMax.toLocaleString('fr-FR')}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280' }}>FCFA</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px 20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher un supplément..."
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 38, border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }}
            />
          </div>
          <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>
            {supplementsFiltres.length} résultat{supplementsFiltres.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tableau */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
                {['NOM DU SUPPLÉMENT', 'PRIX', 'ACTIONS'].map(col => (
                  <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Chargement...</td></tr>
              ) : supplementsFiltres.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Aucun supplément trouvé</td></tr>
              ) : paginatedSupplements.map((s, i) => {
                const prixVal = typeof s.prix === 'object' && s.prix.$numberDecimal ? Number(s.prix.$numberDecimal) : Number(s.prix || 0);
                return (
                  <tr
                    key={s._id || s.id || i}
                    style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Tag size={14} color="#059669" />
                        </div>
                        <span style={{ fontWeight: 700, color: '#111827' }}>{s.nom}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#059669' }}>{prixVal.toLocaleString('fr-FR')}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>FCFA</div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <ActionBtn onClick={() => openEdit(s)} title="Modifier" hoverBg="#F0FDF4" hoverColor="#059669" hoverBorder="#A7F3D0">
                          <Pencil size={13} />
                        </ActionBtn>
                        <ActionBtn onClick={() => setConfirmId(s._id || s.id)} title="Supprimer" hoverBg="#FEF2F2" hoverColor="#DC2626" hoverBorder="#FECACA">
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
            totalItems={supplementsFiltres.length}
            itemsPerPage={limit}
            onPageChange={setPage}
            onLimitChange={l => { setLimit(l); setPage(1); }}
          />
        </div>
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Modifier le supplément' : 'Nouveau supplément'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Nom du supplément *">
                <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={inputSt} required placeholder="Ex: Chambre individuelle, Visa express..." />
              </FormField>
            </div>
            <FormField label="Prix (FCFA) *">
              <NumberInput value={form.prix} onChange={v => setForm(f => ({ ...f, prix: v }))} className="premium-input" min={0} required />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
            <button type="button" onClick={() => setShowModal(false)}
              style={{ border: '1.5px solid #E5E7EB', background: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving}
              style={{ background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Enregistrement...' : (editId ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        message="Supprimer ce supplément définitivement ?"
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
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
