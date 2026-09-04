import { useEffect, useState, useMemo } from 'react';
import { Search, Plane, Calendar, Hotel, Package, Pencil, Trash2, Plus } from 'lucide-react';
import api from '../../../core/api/axios';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../context/PermissionsContext';
import { toast } from '../../../components/Toast';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Pagination from '../../../components/Pagination';
import NumberInput from '../../../components/NumberInput';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtPrix = (n) => {
  const raw = n?.$numberDecimal ?? n;
  const v = parseFloat(raw);
  return (!raw || isNaN(v) || v === 0) ? '—' : v.toLocaleString('fr-FR') + ' FCFA';
};

const EMPTY = {
  nomReference: '', type: 'OUMRA', statut: 'OUVERT',
  dateDepart: '', dateRetour: '',
  prixEco: '', prixCont: '', prixVip: '',
  compagnieAerienne: '', numeroVol: '', villeDepart: '', villeArrivee: '',
  hotel: '', quotaMax: '',
};

const STATUT_COLORS = {
  OUVERT:  { bg: '#DCFCE7', color: '#166534', border: '#A7F3D0' },
  COMPLET: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  ANNULE:  { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' },
  TERMINE: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
};

export default function PackagesPage() {
  const { role } = useAuth();
  const { canCreate, canEdit, canDelete } = usePermissions();
  const hasCreate = canCreate('packages') || ['dg', 'administrateur', 'informatique'].includes(role?.toLowerCase());
  const hasEdit   = canEdit('packages')   || ['dg', 'administrateur', 'informatique'].includes(role?.toLowerCase());
  const hasDelete = canDelete('packages') || ['dg', 'administrateur', 'informatique'].includes(role?.toLowerCase());
  const showActions = hasEdit || hasDelete;

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const packagesFiltres = useMemo(() => {
    if (!search.trim()) return packages;
    const q = search.toLowerCase();
    return packages.filter(p =>
      (p.nomReference || '').toLowerCase().includes(q) ||
      (p.type || '').toLowerCase().includes(q) ||
      (p.compagnieAerienne || '').toLowerCase().includes(q) ||
      (p.villeDepart || '').toLowerCase().includes(q) ||
      (p.villeArrivee || '').toLowerCase().includes(q)
    );
  }, [packages, search]);

  const paginatedPackages = useMemo(() => {
    const start = (page - 1) * limit;
    return packagesFiltres.slice(start, start + limit);
  }, [packagesFiltres, page, limit]);

  const totalPages = Math.ceil(packagesFiltres.length / limit) || 1;

  const fetchPackages = async () => {
    setLoading(true);
    try { const r = await api.get('/packages'); setPackages(r.data.packages || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPackages(); }, []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setUpper = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value.toUpperCase() }));

  const openEdit = (pkg) => {
    setEditId(pkg.id || pkg._id);
    setForm({
      nomReference: pkg.nomReference || pkg.nom_depart || '',
      type: pkg.type || pkg.service?.toUpperCase() || 'OUMRA',
      statut: pkg.statut || (pkg.actif !== false ? 'OUVERT' : 'TERMINE'),
      dateDepart: (pkg.dateDepart || pkg.date_depart)?.slice(0, 10) || '',
      dateRetour: (pkg.dateRetour || pkg.date_retour)?.slice(0, 10) || '',
      prixEco: pkg.prixEco || '',
      prixCont: pkg.prixCont || '',
      prixVip: pkg.prixVip || '',
      compagnieAerienne: pkg.compagnieAerienne || '',
      numeroVol: pkg.numeroVol || '',
      villeDepart: pkg.villeDepart || '',
      villeArrivee: pkg.villeArrivee || '',
      hotel: Array.isArray(pkg.hotel) ? pkg.hotel.join(', ') : (pkg.hotel || ''),
      quotaMax: pkg.quotaMax || pkg.places_total || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nomReference: form.nomReference,
        type: form.type,
        statut: form.statut,
        dateDepart: form.dateDepart,
        dateRetour: form.dateRetour,
        quotaMax: Number(form.quotaMax),
        prixEco: form.prixEco ? Number(form.prixEco) : undefined,
        prixCont: form.prixCont ? Number(form.prixCont) : undefined,
        prixVip: form.prixVip ? Number(form.prixVip) : undefined,
        compagnieAerienne: form.compagnieAerienne || undefined,
        numeroVol: form.numeroVol || undefined,
        villeDepart: form.villeDepart || undefined,
        villeArrivee: form.villeArrivee || undefined,
        hotel: form.hotel ? form.hotel.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      if (editId) await api.patch(`/packages/${editId}`, payload);
      else await api.post('/packages', payload);
      setShowModal(false); setEditId(null); setForm(EMPTY);
      fetchPackages();
      toast(editId ? 'Départ mis à jour ✓' : 'Départ créé ✓');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/packages/${confirmId}`);
      fetchPackages();
      toast('Départ supprimé ✓');
    } catch (e) {
      toast(e.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally { setConfirmId(null); }
  };

  // KPIs
  const totalOuvert  = packages.filter(p => p.statut === 'OUVERT').length;
  const totalComplet = packages.filter(p => p.statut === 'COMPLET').length;
  const totalPlaces  = packages.reduce((s, p) => s + (Number(p.quotaMax || 0)), 0);

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── En-tête Page ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Départs & Packages</h1>
        {hasCreate && (
          <button
            onClick={() => { setEditId(null); setForm(EMPTY); setShowModal(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(5,150,105,0.35)',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <Plus size={16} /> Nouveau départ
          </button>
        )}
      </div>

      {/* ── Carte Principale ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        {/* Titre section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#DCFCE7', borderRadius: 8, padding: 8 }}>
              <Package size={18} color="#059669" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Catalogue des Départs</h2>
          </div>
          <span style={{ fontSize: 12, color: '#6B7280', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px' }}>
            {packages.length} départ{packages.length > 1 ? 's' : ''} enregistré{packages.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* KPI Cards */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '0 24px 20px' }}>
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <Package size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>TOTAL DÉPARTS</p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{packages.length}</div>
              </div>
            </div>

            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <Plane size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>EN COURS / OUVERT</p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#059669' }}>{totalOuvert}</div>
              </div>
            </div>

            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <Calendar size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>COMPLETS</p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#DC2626' }}>{totalComplet}</div>
              </div>
            </div>

            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <Hotel size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>PLACES AU TOTAL</p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#111827' }}>{totalPlaces.toLocaleString('fr-FR')}</div>
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
              placeholder="Rechercher par référence, type, compagnie..."
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 38, border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }}
            />
          </div>
          <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>
            {packagesFiltres.length} résultat{packagesFiltres.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Tableau */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
                {['RÉFÉRENCE', 'TYPE', 'STATUT', 'DÉPART', 'RETOUR', 'PLACES', 'PRIX (ÉCO / CONFORT / VIP)', 'COMPAGNIE', showActions ? 'ACT.' : null]
                  .filter(Boolean)
                  .map(col => (
                    <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {col}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Chargement des départs...</td></tr>
              ) : packagesFiltres.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Aucun départ trouvé</td></tr>
              ) : paginatedPackages.map((p, i) => {
                const s = STATUT_COLORS[p.statut] || STATUT_COLORS.ANNULE;
                const pct = p.quotaMax > 0 ? Math.round((p.placesReservees || 0) / p.quotaMax * 100) : 0;
                return (
                  <tr
                    key={p._id || p.id || i}
                    style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}
                  >
                    {/* Référence */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 800, color: '#111827', fontSize: 13 }}>{p.nomReference}</div>
                      {p.hotel && (
                        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                          {Array.isArray(p.hotel) ? p.hotel.join(', ') : p.hotel}
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>
                        {p.type}
                      </span>
                    </td>

                    {/* Statut */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        {p.statut}
                      </span>
                    </td>

                    {/* Date départ */}
                    <td style={{ padding: '12px 16px', color: '#374151', fontSize: 12, fontWeight: 500 }}>
                      {fmtDate(p.dateDepart || p.date_depart)}
                    </td>

                    {/* Date retour */}
                    <td style={{ padding: '12px 16px', color: '#374151', fontSize: 12, fontWeight: 500 }}>
                      {fmtDate(p.dateRetour || p.date_retour)}
                    </td>

                    {/* Places */}
                    <td style={{ padding: '12px 16px' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: pct >= 90 ? '#DC2626' : '#111827' }}>
                          {p.placesReservees || 0}
                        </span>
                        <span style={{ color: '#9CA3AF' }}>/{p.quotaMax || '—'}</span>
                      </div>
                      {p.quotaMax > 0 && (
                        <div style={{ marginTop: 4, height: 4, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
                          <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#059669', borderRadius: 4 }} />
                        </div>
                      )}
                    </td>

                    {/* Prix */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {[['Éco', p.prixEco], ['Confort', p.prixCont], ['VIP', p.prixVip]].map(([label, prix]) =>
                          prix && parseFloat(prix) > 0 ? (
                            <span key={label} style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                              <span style={{ color: '#9CA3AF', fontSize: 10, fontWeight: 600 }}>{label}: </span>
                              <span style={{ fontWeight: 700, color: '#059669' }}>{fmtPrix(prix)}</span>
                            </span>
                          ) : null
                        )}
                        {!p.prixEco && !p.prixCont && !p.prixVip && (
                          <span style={{ color: '#9CA3AF' }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Compagnie */}
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#374151' }}>
                      {p.compagnieAerienne ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.compagnieAerienne}</div>
                          {p.villeDepart && (
                            <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                              {p.villeDepart} → {p.villeArrivee || ''}
                            </div>
                          )}
                        </div>
                      ) : '—'}
                    </td>

                    {/* Actions */}
                    {showActions && (
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {hasEdit && (
                            <ActionBtn
                              onClick={() => openEdit(p)}
                              title="Modifier"
                              hoverBg="#F0FDF4" hoverColor="#059669" hoverBorder="#A7F3D0"
                            >
                              <Pencil size={13} />
                            </ActionBtn>
                          )}
                          {hasDelete && (
                            <ActionBtn
                              onClick={() => {
                                if ((p.placesReservees || 0) > 0) {
                                  toast('Impossible : des inscriptions existent pour ce départ', 'error');
                                  return;
                                }
                                setConfirmId(p.id || p._id);
                              }}
                              title="Supprimer"
                              hoverBg="#FEF2F2" hoverColor="#DC2626" hoverBorder="#FECACA"
                            >
                              <Trash2 size={13} />
                            </ActionBtn>
                          )}
                        </div>
                      </td>
                    )}
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
            totalItems={packagesFiltres.length}
            itemsPerPage={limit}
            onPageChange={setPage}
            onLimitChange={l => { setLimit(l); setPage(1); }}
          />
        </div>
      </div>

      {/* ════ MODAL NOUVEAU / MODIFIER DÉPART ════ */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Modifier le départ' : 'Nouveau départ'}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Informations générales</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Nom de référence *">
                <input value={form.nomReference} onChange={setUpper('nomReference')} style={{ ...inputSt, textTransform: 'uppercase' }} required placeholder="Ex: OUMRA-JAN-2026" />
              </FormField>
            </div>
            <FormField label="Type *">
              <select value={form.type} onChange={set('type')} style={inputSt}>
                {['OUMRA', 'HAJJ', 'ZIAR_FES', 'ZIARRA', 'TOURISME', 'BILLET'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
            <FormField label="Statut">
              <select value={form.statut} onChange={set('statut')} style={inputSt}>
                {['OUVERT', 'COMPLET', 'ANNULE', 'TERMINE'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Date départ *">
              <input type="date" value={form.dateDepart} onChange={set('dateDepart')} style={inputSt} required />
            </FormField>
            <FormField label="Date retour *">
              <input type="date" value={form.dateRetour} onChange={set('dateRetour')} style={inputSt} required />
            </FormField>
            <FormField label="Quota max (places) *">
              <NumberInput value={form.quotaMax} onChange={v => setForm(f => ({ ...f, quotaMax: v }))} className="premium-input" placeholder="30" min={1} required />
            </FormField>
            <FormField label="Hôtel(s)">
              <input value={form.hotel} onChange={set('hotel')} style={inputSt} placeholder="Hôtel Makkah, Hôtel Madinah" />
            </FormField>
          </div>

          <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '4px 0 0' }}>Prix par classe (FCFA)</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['prixEco', 'Éco'], ['prixCont', 'Confort'], ['prixVip', 'VIP']].map(([k, l]) => (
              <FormField key={k} label={l}>
                <NumberInput value={form[k]} onChange={v => setForm(f => ({ ...f, [k]: v }))} className="premium-input" placeholder="0" min={0} />
              </FormField>
            ))}
          </div>

          <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '4px 0 0' }}>Informations vol</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Compagnie aérienne">
              <input value={form.compagnieAerienne} onChange={set('compagnieAerienne')} style={inputSt} placeholder="Air Sénégal, Royal Air Maroc..." />
            </FormField>
            <FormField label="Numéro de vol">
              <input value={form.numeroVol} onChange={set('numeroVol')} style={inputSt} placeholder="HC 401" />
            </FormField>
            <FormField label="Ville de départ">
              <input value={form.villeDepart} onChange={set('villeDepart')} style={inputSt} placeholder="Dakar" />
            </FormField>
            <FormField label="Ville d'arrivée">
              <input value={form.villeArrivee} onChange={set('villeArrivee')} style={inputSt} placeholder="Djeddah" />
            </FormField>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
            <button type="button" onClick={() => setShowModal(false)}
              style={{ border: '1.5px solid #E5E7EB', background: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving}
              style={{ background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Enregistrement...' : (editId ? 'Mettre à jour' : 'Créer le départ')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        message="Supprimer ce départ définitivement ? Cette action est irréversible."
        onConfirm={confirmDelete}
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
