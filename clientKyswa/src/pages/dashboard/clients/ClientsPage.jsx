import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserCheck, ShieldCheck, Search, Filter,
  ScanLine, Upload, CheckCircle, AlertCircle, X, Eye, Trash2, Plus,
  Bell, Cake, ShieldAlert,
} from 'lucide-react';
import api from '../../../core/api/axios';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Pagination from '../../../components/Pagination';
import { toast } from '../../../components/Toast';

const EMPTY = {
  nom: '', prenom: '', telephone: '', email: '',
  numeroPasseport: '', dateExpirationPasseport: '',
  numeroCNI: '', dateNaissance: '', lieuNaissance: '',
  adresse: '', sexe: '', niveauFidelite: 'BRONZE',
};

const FIDELITE_COLORS = {
  BRONZE:  { bg: '#FEF3C7', color: '#92400E' },
  ARGENT:  { bg: '#F1F5F9', color: '#475569' },
  OR:      { bg: '#FEF9C3', color: '#854D0E' },
  PLATINE: { bg: '#E0F2FE', color: '#0369A1' },
};

// ── Helpers Alertes CRM ────────────────────────────────────────────────────────
const getClientBirthdayStatus = (dateNaissance) => {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth();
  const isThisMonth = d.getMonth() === today.getMonth();
  if (isToday) return { type: 'today', label: "Aujourd'hui ! 🎉" };
  if (isThisMonth) return { type: 'month', label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` };
  return null;
};

const getPassportStatus = (expiration) => {
  if (!expiration) return null;
  const exp = new Date(expiration);
  if (isNaN(exp.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  const diffDays = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const expStr = exp.toLocaleDateString('fr-FR');

  if (diffDays < 0) {
    return {
      status: 'EXPIRED',
      bg: '#FEE2E2',
      color: '#DC2626',
      border: '#FECACA',
      text: `Expiré (${expStr})`,
    };
  }
  if (diffDays <= 180) {
    return {
      status: diffDays <= 30 ? 'CRITICAL' : 'WARNING',
      bg: diffDays <= 30 ? '#FEF2F2' : '#FFFBEB',
      color: diffDays <= 30 ? '#DC2626' : '#D97706',
      border: diffDays <= 30 ? '#FCA5A5' : '#FCD34D',
      text: `Exp. dans ${diffDays}j (${expStr})`,
    };
  }
  return {
    status: 'VALID',
    bg: '#F0FDF4',
    color: '#16A34A',
    border: '#BBF7D0',
    text: `Valide (${expStr})`,
  };
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fideliteFilter, setFideliteFilter] = useState('');
  const [alertFilter, setAlertFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── OCR scan state ──────────────────────────────────────────────────────────
  const [scanStep, setScanStep] = useState('ask');
  const [scanDocType, setScanDocType] = useState('passport');
  const [scanPreview, setScanPreview] = useState(null);
  const [scanFile, setScanFile] = useState(null);
  const [scanFields, setScanFields] = useState(null);
  const fileInputRef = useRef(null);

  const fetchClients = async (q = search, p = page, l = limit) => {
    setLoading(true);
    try {
      const res = await api.get('/clients', {
        params: {
          search: q,
          page: p,
          limit: l,
        },
      });
      const items = res.data.clients || res.data.data || [];
      setClients(items);
      if (res.data.pagination) {
        setTotal(res.data.pagination.total || 0);
        setTotalPages(res.data.pagination.totalPages || res.data.pagination.pages || 1);
        setPage(res.data.pagination.page || p);
      } else {
        setTotal(items.length);
        setTotalPages(1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients('', 1, limit);
  }, []);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    fetchClients(val, 1, limit);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchClients(search, newPage, limit);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
    fetchClients(search, 1, newLimit);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setUpper = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value.toUpperCase() }));

  const openNewClient = () => {
    setForm(EMPTY);
    setScanStep('ask');
    setScanPreview(null);
    setScanFile(null);
    setScanFields(null);
    setShowModal(true);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/clients/${confirmDeleteId}`);
      toast('Client supprimé ✓');
      fetchClients(search, page, limit);
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  // ── OCR Handlers ────────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setScanFile(file);
    setScanPreview(URL.createObjectURL(file));
    setScanStep('upload');
    e.target.value = '';
  };

  const handleScan = async () => {
    if (!scanFile) return;
    setScanStep('scanning');
    try {
      const data = new FormData();
      data.append('document', scanFile);
      data.append('type', scanDocType);
      const res = await api.post('/clients/scan-document', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const extracted = res.data.data;
      setScanFields(extracted);

      setForm(f => ({
        ...f,
        nom:    extracted.nom    || f.nom,
        prenom: extracted.prenom || f.prenom,
        dateNaissance: extracted.dateNaissance || f.dateNaissance,
        dateExpirationPasseport: extracted.dateExpirationPasseport || f.dateExpirationPasseport,
        lieuNaissance: extracted.lieuNaissance || f.lieuNaissance,
        sexe: extracted.sexe || f.sexe,
        adresse: extracted.adresse || f.adresse,
        ...(extracted.type === 'passport' ? {
          numeroPasseport: extracted.numeroPasseport || f.numeroPasseport,
          photoUrl: extracted.photoUrl || f.photoUrl,
          photoPublicId: extracted.photoPublicId || f.photoPublicId,
          documentPhotoUrl: extracted.documentPhotoUrl || f.documentPhotoUrl,
          documentPhotoPublicId: extracted.documentPhotoPublicId || f.documentPhotoPublicId,
          extractedAt: extracted.extractedAt || f.extractedAt,
        } : {
          numeroCNI: extracted.numeroCNI || f.numeroCNI,
        }),
      }));
      setScanStep('done');

      if (extracted.mrzDetectee) {
        let successMessage = 'Document lu avec succès — vérifiez les informations';
        if (extracted.photoUrl) {
          successMessage += '. Photo de profil sauvegardée.';
        }
        toast(successMessage);
      } else if (extracted.avertissement) {
        toast(extracted.avertissement, 'error');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la lecture du document', 'error');
      setScanStep('upload');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
      await api.post('/clients', payload);
      setShowModal(false);
      setForm(EMPTY);
      fetchClients();
      toast('Client créé avec succès ✓');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtrage local additionnel (par niveau de fidélité et alertes CRM)
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (fideliteFilter && (c.niveauFidelite || c.niveau_fidelite || 'BRONZE').toUpperCase() !== fideliteFilter) {
        return false;
      }
      if (alertFilter === 'anniv_mois') {
        const bStatus = getClientBirthdayStatus(c.date_naissance || c.dateNaissance);
        if (!bStatus) return false;
      } else if (alertFilter === 'pass_critique') {
        const pStatus = getPassportStatus(c.expiration_passeport || c.dateExpirationPasseport);
        if (!pStatus || (pStatus.status !== 'CRITICAL' && pStatus.status !== 'WARNING')) return false;
      } else if (alertFilter === 'pass_expire') {
        const pStatus = getPassportStatus(c.expiration_passeport || c.dateExpirationPasseport);
        if (!pStatus || pStatus.status !== 'EXPIRED') return false;
      }
      return true;
    });
  }, [clients, fideliteFilter, alertFilter]);

  // KPIs
  const totalPasseports = useMemo(() => {
    return clients.filter(c => c.numeroPasseport || c.n_passeport).length;
  }, [clients]);

  const totalContacts = useMemo(() => {
    return clients.filter(c => c.telephone || c.email).length;
  }, [clients]);

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── En-tête Page ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Clients</h1>
        <button
          onClick={openNewClient}
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
          <Plus size={16} /> Nouveau client
        </button>
      </div>

      {/* ── Carte Principale ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        {/* Titre section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#DCFCE7', borderRadius: 8, padding: 8 }}>
              <Users size={18} color="#059669" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Répertoire des Clients</h2>
          </div>
          <span style={{ fontSize: 12, color: '#6B7280', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px' }}>
            {total} client{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}
          </span>
        </div>

        {/* ── KPI Cards ── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, padding: '0 24px 20px' }}>
            {/* Total Clients */}
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <Users size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>
                  TOTAL CLIENTS
                </p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                  {total.toLocaleString('fr-FR')}
                </div>
              </div>
            </div>

            {/* Avec Passeport */}
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <ShieldCheck size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>
                  AVEC PASSEPORT
                </p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                  {totalPasseports.toLocaleString('fr-FR')}
                </div>
              </div>
            </div>

            {/* Avec Coordonnées */}
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <UserCheck size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 4px' }}>
                  CONTACTS ENREGISTRÉS
                </p>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
                  {totalContacts.toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filtres ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px 20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={handleSearch}
              placeholder="Rechercher par nom, téléphone, passeport..."
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 38, border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={fideliteFilter}
              onChange={e => setFideliteFilter(e.target.value)}
              style={{ height: 38, border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '0 32px 0 12px', fontSize: 13, color: '#374151', background: '#F9FAFB', appearance: 'none', cursor: 'pointer', outline: 'none', minWidth: 160 }}
            >
              <option value="">Tous les niveaux</option>
              {['BRONZE', 'ARGENT', 'OR', 'PLATINE'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <Filter size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select
              value={alertFilter}
              onChange={e => setAlertFilter(e.target.value)}
              style={{
                height: 38, border: alertFilter ? '1.5px solid #F59E0B' : '1.5px solid #E5E7EB',
                borderRadius: 8, padding: '0 32px 0 12px', fontSize: 13,
                color: alertFilter ? '#92400E' : '#374151',
                background: alertFilter ? '#FEF3C7' : '#F9FAFB',
                appearance: 'none', cursor: 'pointer', outline: 'none', minWidth: 175,
                fontWeight: alertFilter ? 700 : 500,
              }}
            >
              <option value="">Toutes les alertes</option>
              <option value="anniv_mois">🎂 Anniv. ce mois-ci</option>
              <option value="pass_critique">⚠️ Passeport &lt; 6 mois</option>
              <option value="pass_expire">🔴 Passeport expiré</option>
            </select>
            <Bell size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: alertFilter ? '#D97706' : '#9CA3AF', pointerEvents: 'none' }} />
          </div>
          <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>
            {filteredClients.length} résultat{filteredClients.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Tableau ── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
                {['CLIENT', 'PASSEPORT', 'TÉLÉPHONE', 'EMAIL', 'FIDÉLITÉ', 'ACT.'].map(col => (
                  <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Chargement des clients...</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Aucun client trouvé</td></tr>
              ) : filteredClients.map((c, i) => {
                const fid = (c.niveauFidelite || c.niveau_fidelite || 'BRONZE').toUpperCase();
                const fidStyle = FIDELITE_COLORS[fid] || FIDELITE_COLORS.BRONZE;
                const clientId = c._id || c.id;
                const bStatus = getClientBirthdayStatus(c.date_naissance || c.dateNaissance);
                const pStatus = getPassportStatus(c.expiration_passeport || c.dateExpirationPasseport);

                return (
                  <tr
                    key={clientId || i}
                    style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background 0.15s', cursor: 'pointer' }}
                    onClick={() => navigate(`/dashboard/clients/${clientId}`)}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}
                  >
                    {/* CLIENT (Nom, Prénom, Avatar, Badge Anniversaire) */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {c.photoUrl || c.photo_url ? (
                          <img
                            src={c.photoUrl || c.photo_url}
                            alt=""
                            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #E5E7EB', flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', background: '#DCFCE7', color: '#059669',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0
                          }}>
                            {(c.prenom?.[0] || '') + (c.nom?.[0] || '')}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{c.nom} {c.prenom}</span>
                            {bStatus && (
                              <span
                                title={bStatus.type === 'today' ? "Anniversaire aujourd'hui !" : `Anniversaire le ${bStatus.label}`}
                                style={{
                                  background: bStatus.type === 'today' ? '#FEF3C7' : '#F3F4F6',
                                  color: bStatus.type === 'today' ? '#92400E' : '#4B5563',
                                  border: bStatus.type === 'today' ? '1px solid #FCD34D' : '1px solid #E5E7EB',
                                  fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 10,
                                  display: 'inline-flex', alignItems: 'center', gap: 2,
                                }}
                              >
                                🎂 {bStatus.label}
                              </span>
                            )}
                          </div>
                          {c.ville && <div style={{ fontSize: 11, color: '#6B7280' }}>{c.ville}</div>}
                        </div>
                      </div>
                    </td>

                    {/* PASSEPORT & VALIDITÉ */}
                    <td style={{ padding: '12px 16px' }}>
                      {c.numeroPasseport || c.n_passeport ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                          <span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>
                            {c.numeroPasseport || c.n_passeport}
                          </span>
                          {pStatus && (
                            <span style={{
                              background: pStatus.bg, color: pStatus.color, border: `1px solid ${pStatus.border}`,
                              borderRadius: 4, padding: '1px 6px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
                            }}>
                              {pStatus.text}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#9CA3AF', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* TÉLÉPHONE */}
                    <td style={{ padding: '12px 16px', color: '#374151', fontSize: 13, fontWeight: 500 }}>
                      {c.telephone || '—'}
                    </td>

                    {/* EMAIL */}
                    <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 12 }}>
                      {c.email || '—'}
                    </td>

                    {/* NIVEAU FIDELITE */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        background: fidStyle.bg, color: fidStyle.color,
                        borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, display: 'inline-block'
                      }}>
                        {fid}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ActionBtn
                          onClick={() => navigate(`/dashboard/clients/${clientId}`)}
                          title="Consulter le dossier"
                          hoverBg="#EFF6FF" hoverColor="#1D4ED8" hoverBorder="#BFDBFE"
                        >
                          <Eye size={13} />
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => setConfirmDeleteId(clientId)}
                          title="Supprimer"
                          hoverBg="#FEF2F2" hoverColor="#DC2626" hoverBorder="#FECACA"
                        >
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

        {/* Pagination */}
        <div style={{ borderTop: '1px solid #F3F4F6' }}>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={total}
            itemsPerPage={limit}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            limitOptions={[10, 25, 50, 100]}
          />
        </div>
      </div>

      {/* ════ MODAL NOUVEAU CLIENT ════ */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau client">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* ── ÉTAPE 1 : Demander si document disponible ── */}
        {scanStep === 'ask' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '8px 0 16px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ScanLine size={32} color="#059669" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
                Document d'identité disponible ?
              </p>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5, margin: 0 }}>
                Scannez le passeport ou la CNI pour pré-remplir automatiquement le formulaire.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                type="button"
                onClick={() => setScanStep('choose')}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                <ScanLine size={16} /> Oui, scanner le document
              </button>
              <button
                type="button"
                onClick={() => setScanStep('manual')}
                style={{ flex: 1, padding: '11px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
              >
                Non, saisie manuelle
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 : Choisir le type de document ── */}
        {scanStep === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Type de document</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { key: 'passport', label: 'Passeport', desc: 'Livret biométrique' },
                { key: 'id_card',  label: 'Carte CNI',  desc: 'Carte nationale d\'identité' },
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setScanDocType(key);
                    fileInputRef.current?.click();
                  }}
                  style={{
                    flex: 1, padding: '16px', borderRadius: 10,
                    border: `2px solid ${scanDocType === key ? '#059669' : '#E5E7EB'}`,
                    background: scanDocType === key ? '#F0FDF4' : '#fff',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                  }}
                >
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{desc}</p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setScanStep('ask')}
              style={{ alignSelf: 'flex-start', border: '1.5px solid #E5E7EB', background: '#fff', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
            >
              Retour
            </button>
          </div>
        )}

        {/* ── ÉTAPE 3 : Aperçu + lancer le scan ── */}
        {scanStep === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>
                {scanDocType === 'passport' ? 'Passeport' : 'Carte CNI'} sélectionné
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'none', border: 'none', color: '#059669', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Changer
              </button>
            </div>

            {scanPreview ? (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #E5E7EB', maxHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
                <img src={scanPreview} alt="Document" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
              </div>
            ) : (
              <div
                style={{ borderRadius: 10, border: '2px dashed #D1D5DB', padding: 32, textAlign: 'center', color: '#6B7280', cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={24} style={{ margin: '0 auto 8px', color: '#9CA3AF' }} />
                <p style={{ fontSize: 13, margin: 0 }}>Cliquer pour sélectionner une image</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleScan}
                disabled={!scanFile}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: scanFile ? 'pointer' : 'not-allowed' }}
              >
                <ScanLine size={15} /> Analyser le document
              </button>
              <button
                type="button"
                onClick={() => setScanStep('choose')}
                style={{ border: '1.5px solid #E5E7EB', background: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 4 : Analyse en cours ── */}
        {scanStep === 'scanning' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
            <div style={{ width: 44, height: 44, border: '3px solid #059669', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Lecture du document en cours...</p>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Extraction automatique des informations d'identité</p>
          </div>
        )}

        {/* ── ÉTAPE 5 : Formulaire ── */}
        {(scanStep === 'done' || scanStep === 'manual') && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {scanStep === 'done' && scanFields && (
              <div style={{
                background: scanFields.mrzDetectee ? '#F0FDF4' : '#FFFBEB',
                border: `1px solid ${scanFields.mrzDetectee ? '#BBF7D0' : '#FDE68A'}`,
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 12,
              }}>
                {scanFields.mrzDetectee
                  ? <CheckCircle size={18} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
                  : <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                }
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: scanFields.mrzDetectee ? '#16A34A' : '#D97706', margin: '0 0 2px' }}>
                    {scanFields.mrzDetectee ? 'Document lu automatiquement' : 'Lecture partielle'}
                  </p>
                  <p style={{ fontSize: 12, color: scanFields.mrzDetectee ? '#15803D' : '#92400E', margin: 0 }}>
                    {scanFields.avertissement || `${scanDocType === 'passport' ? 'Passeport' : 'CNI'} — vérifiez et complétez les informations`}
                  </p>
                </div>
                <button type="button" onClick={() => { setScanFields(null); setScanStep('ask'); setForm(EMPTY); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2 }}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Photo extraite */}
            {form.photoUrl && (
              <div style={{
                padding: 12, background: '#F0FDF4', borderRadius: 10,
                border: '1px solid #A7F3D0', display: 'flex', alignItems: 'flex-start', gap: 14,
              }}>
                <img
                  src={form.photoUrl} alt="Photo"
                  style={{ width: 64, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #059669' }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#059669', margin: '0 0 4px' }}>Photo de profil extraite</p>
                  <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>La photo est automatiquement enregistrée et liée au dossier client.</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, photoUrl: '', photoPublicId: '', documentPhotoUrl: '', documentPhotoPublicId: '' }))}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Identité */}
            <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '4px 0 0' }}>Identité</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Nom *">
                <input value={form.nom} onChange={setUpper('nom')} style={inputSt} required placeholder="NOM" />
              </FormField>
              <FormField label="Prénom *">
                <input value={form.prenom} onChange={setUpper('prenom')} style={inputSt} required placeholder="PRÉNOM" />
              </FormField>
              <FormField label="Date de naissance">
                <input type="date" value={form.dateNaissance} onChange={set('dateNaissance')} style={inputSt} />
              </FormField>
              <FormField label="Sexe">
                <select value={form.sexe || ''} onChange={set('sexe')} style={inputSt}>
                  <option value="">Non spécifié</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </FormField>
              <div style={{ gridColumn: '1 / -1' }}>
                <FormField label="Lieu de naissance">
                  <input value={form.lieuNaissance} onChange={set('lieuNaissance')} style={inputSt} placeholder="Ville, pays" />
                </FormField>
              </div>
            </div>

            {/* Contact */}
            <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '4px 0 0' }}>Contact</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="Téléphone">
                <input value={form.telephone} onChange={set('telephone')} style={inputSt} placeholder="+221 7X XXX XX XX" />
              </FormField>
              <FormField label="Email">
                <input type="email" value={form.email} onChange={set('email')} style={inputSt} placeholder="email@exemple.com" />
              </FormField>
              <div style={{ gridColumn: '1 / -1' }}>
                <FormField label="Adresse">
                  <input value={form.adresse || ''} onChange={set('adresse')} style={inputSt} placeholder="Adresse complète" />
                </FormField>
              </div>
            </div>

            {/* Documents */}
            <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '4px 0 0' }}>Documents & Fidélité</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FormField label="N° Passeport">
                <input value={form.numeroPasseport} onChange={set('numeroPasseport')} style={inputSt} placeholder="Ex: A01234567" />
              </FormField>
              <FormField label="Expiration passeport">
                <input type="date" value={form.dateExpirationPasseport} onChange={set('dateExpirationPasseport')} style={inputSt} />
              </FormField>
              <FormField label="N° CNI">
                <input value={form.numeroCNI} onChange={set('numeroCNI')} style={inputSt} placeholder="Numéro carte d'identité" />
              </FormField>
              <FormField label="Niveau fidélité">
                <select value={form.niveauFidelite} onChange={set('niveauFidelite')} style={inputSt}>
                  {['BRONZE', 'ARGENT', 'OR', 'PLATINE'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </FormField>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
              <button type="button" onClick={() => setShowModal(false)}
                style={{ border: '1.5px solid #E5E7EB', background: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                Annuler
              </button>
              <button type="submit" disabled={saving}
                style={{ background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Enregistrement...' : 'Créer le client'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirmation Suppression */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Supprimer ce client ? Cette action est irréversible."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

// ─── Micro-Composants ─────────────────────────────────────────────────────────
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
        display: 'flex', alignItems: 'center', transition: 'all 0.15s'
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
