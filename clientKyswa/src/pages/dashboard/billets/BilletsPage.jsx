import { useEffect, useState, useMemo } from 'react';
import { Search, Ticket, Plus, Eye, Trash2, Plane } from 'lucide-react';
import api from '../../../core/api/axios';
import Pagination from '../../../components/Pagination';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';
import Modal from '../../../components/Modal';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

const STATUT_COLORS = {
  ACTIF:  { bg: '#DCFCE7', color: '#166534' },
  ANNULE: { bg: '#FEF2F2', color: '#DC2626' },
  UTILISE:{ bg: '#EFF6FF', color: '#1D4ED8' },
};

const TYPE_COLORS = {
  aller_simple: { bg: '#F0FDF4', color: '#059669' },
  aller_retour: { bg: '#EFF6FF', color: '#1D4ED8' },
};

export default function BilletsPage() {
  const [billets, setBillets] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ compagnie: '', classe: '', destination: '', typeBillet: 'aller_simple', dateDepart: '', dateArrivee: '', prix: '', clientId: '' });
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const billetsFiltres = useMemo(() => {
    if (!search.trim()) return billets;
    const q = search.toLowerCase();
    return billets.filter(b =>
      (b.numeroBillet || '').toLowerCase().includes(q) ||
      `${b.clientId?.nom || ''} ${b.clientId?.prenom || ''}`.toLowerCase().includes(q) ||
      (b.destination || '').toLowerCase().includes(q) ||
      (b.compagnie || '').toLowerCase().includes(q) ||
      (b.classe || '').toLowerCase().includes(q)
    );
  }, [billets, search]);

  const fetchAll = async (p = page, l = limit) => {
    setLoading(true);
    try {
      const [b, c] = await Promise.allSettled([
        api.get('/billets', { params: { page: p, limit: l } }),
        api.get('/clients', { params: { limit: 500 } }),
      ]);
      if (b.status === 'fulfilled') {
        const data = b.value.data.billets || b.value.data.data || [];
        setBillets(data);
        if (b.value.data.pagination) {
          setTotal(b.value.data.pagination.total || 0);
          setTotalPages(b.value.data.pagination.totalPages || 1);
          setPage(b.value.data.pagination.page || p);
        } else {
          setTotal(b.value.data.total || data.length);
          setTotalPages(Math.ceil((b.value.data.total || data.length) / l) || 1);
        }
      }
      if (c.status === 'fulfilled') {
        setClients(c.value.data.clients || c.value.data.data || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(1, limit); }, []);

  const handlePageChange = (newPage) => { setPage(newPage); fetchAll(newPage, limit); };
  const handleLimitChange = (newLimit) => { setLimit(newLimit); setPage(1); fetchAll(1, newLimit); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/billets', { ...form, prix: Number(form.prix) });
      setShowModal(false);
      setForm({ compagnie: '', classe: '', destination: '', typeBillet: 'aller_simple', dateDepart: '', dateArrivee: '', prix: '', clientId: '' });
      fetchAll();
      toast('Billet créé avec succès ✓');
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erreur lors de la création', 'error');
    } finally { setSaving(false); }
  };

  const handleAnnuler = async (id) => {
    try { await api.delete(`/billets/${id}`); fetchAll(); toast('Billet annulé ✓'); setConfirmId(null); }
    catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
  };

  // KPIs
  const totalActifs  = billets.filter(b => b.statut !== 'ANNULE').length;
  const totalAnnules = billets.filter(b => b.statut === 'ANNULE').length;

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Billets</h1>
        <button
          onClick={() => setShowModal(true)}
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
          <Plus size={16} /> Nouveau billet
        </button>
      </div>

      {/* ── Carte principale ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        {/* Titre section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#DCFCE7', borderRadius: 8, padding: 8 }}>
              <Ticket size={18} color="#059669" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Registre des Billets</h2>
          </div>
          <span style={{ fontSize: 12, color: '#6B7280', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px' }}>
            {total} billet{total > 1 ? 's' : ''}
          </span>
        </div>

        {/* KPI Cards */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '0 24px 20px' }}>
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}><Ticket size={22} color="#059669" /></div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>TOTAL BILLETS</p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{total}</div>
              </div>
            </div>
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}><Plane size={22} color="#059669" /></div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>ACTIFS</p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#059669' }}>{totalActifs}</div>
              </div>
            </div>
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}><Trash2 size={22} color="#DC2626" /></div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>ANNULÉS</p>
                <div style={{ fontSize: 26, fontWeight: 800, color: totalAnnules > 0 ? '#DC2626' : '#111827' }}>{totalAnnules}</div>
              </div>
            </div>
          </div>
        )}

        {/* Filtre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px 20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher par N° billet, client, destination..."
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 38, border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }}
            />
          </div>
          <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>
            {billetsFiltres.length} résultat{billetsFiltres.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tableau */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
                {['N° BILLET', 'CLIENT', 'COMPAGNIE', 'CLASSE', 'DESTINATION', 'TYPE', 'DÉPART', 'PRIX', 'RESTE', 'STATUT', 'ACT.'].map(col => (
                  <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Chargement des billets...</td></tr>
              ) : billetsFiltres.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Aucun billet trouvé</td></tr>
              ) : billetsFiltres.map((b, i) => {
                const s = STATUT_COLORS[b.statut] || STATUT_COLORS.ACTIF;
                const t = TYPE_COLORS[b.typeBillet] || TYPE_COLORS.aller_simple;
                return (
                  <tr
                    key={b._id || b.id || i}
                    style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 800, fontSize: 12, color: '#059669' }}>{b.numeroBillet || '—'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827' }}>
                      {b.clientId ? `${b.clientId.nom} ${b.clientId.prenom}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151', fontSize: 12, fontWeight: 500 }}>
                      {b.compagnie || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 12 }}>
                      {b.classe || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151', fontSize: 12, fontWeight: 500 }}>
                      {b.destination || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: t.bg, color: t.color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                        {b.typeBillet === 'aller_simple' ? 'Aller simple' : 'Aller retour'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#374151', fontSize: 12 }}>
                      {fmtDateTime(b.dateDepart)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: '#111827' }}>{Number(b.prix || 0).toLocaleString('fr-FR')}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280' }}>FCFA</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ lineHeight: 1.2 }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: b.resteAPayer > 0 ? '#DC2626' : '#059669' }}>
                          {Number(b.resteAPayer || 0).toLocaleString('fr-FR')}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: b.resteAPayer > 0 ? '#DC2626' : '#059669' }}>FCFA</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        {b.statut || 'ACTIF'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <ActionBtn
                          onClick={() => window.open(`/api/factures/billet/${b._id}`, '_blank')}
                          title="Voir la facture"
                          hoverBg="#EFF6FF" hoverColor="#1D4ED8" hoverBorder="#BFDBFE"
                        >
                          <Eye size={13} />
                        </ActionBtn>
                        {b.statut !== 'ANNULE' && (
                          <ActionBtn
                            onClick={() => setConfirmId(b._id || b.id)}
                            title="Annuler ce billet"
                            hoverBg="#FEF2F2" hoverColor="#DC2626" hoverBorder="#FECACA"
                          >
                            <Trash2 size={13} />
                          </ActionBtn>
                        )}
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
            totalItems={total}
            itemsPerPage={limit}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </div>
      </div>

      {/* Modal Nouveau Billet */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau billet">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Compagnie *">
              <input value={form.compagnie} onChange={e => setForm(f => ({ ...f, compagnie: e.target.value }))} style={inputSt} placeholder="Air Sénégal, Royal Air Maroc..." required />
            </FormField>
            <FormField label="Destination *">
              <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} style={inputSt} placeholder="Djeddah, Casablanca..." required />
            </FormField>
            <FormField label="Classe *">
              <select value={form.classe} onChange={e => setForm(f => ({ ...f, classe: e.target.value }))} style={inputSt} required>
                <option value="">Sélectionner une classe...</option>
                {['Économique', 'Premium Economy', 'Affaires', 'Première'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Type *">
              <select value={form.typeBillet} onChange={e => setForm(f => ({ ...f, typeBillet: e.target.value }))} style={inputSt}>
                <option value="aller_simple">Aller simple</option>
                <option value="aller_retour">Aller retour</option>
              </select>
            </FormField>
            <FormField label="Prix (FCFA) *">
              <input type="number" min="0" value={form.prix} onChange={e => setForm(f => ({ ...f, prix: e.target.value }))} style={inputSt} required placeholder="0" />
            </FormField>
            <FormField label="">
              <div style={{ height: 38 }} />
            </FormField>
            <FormField label="Date départ *">
              <input type="datetime-local" value={form.dateDepart} onChange={e => setForm(f => ({ ...f, dateDepart: e.target.value }))} style={inputSt} required />
            </FormField>
            <FormField label="Date arrivée *">
              <input type="datetime-local" value={form.dateArrivee} onChange={e => setForm(f => ({ ...f, dateArrivee: e.target.value }))} style={inputSt} required />
            </FormField>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Client *">
                <select value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} style={inputSt} required>
                  <option value="">Sélectionner un client...</option>
                  {clients.map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.nom} {c.prenom}{c.numeroPasseport ? ` — ${c.numeroPasseport}` : ''}
                    </option>
                  ))}
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
              {saving ? 'Enregistrement...' : 'Créer le billet'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        message="Annuler ce billet ? Cette action est irréversible."
        onConfirm={() => handleAnnuler(confirmId)}
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
      {label && <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{label}</label>}
      {children}
    </div>
  );
}

const inputSt = {
  width: '100%', height: 38, border: '1.5px solid #E5E7EB',
  borderRadius: 8, padding: '0 12px', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', background: '#fff',
};
