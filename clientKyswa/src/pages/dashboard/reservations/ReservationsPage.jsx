import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronLeft, Users, Calendar, Plane, Download,
  FileText, Plus, Eye, Trash2, Banknote, CreditCard, AlertCircle
} from 'lucide-react';
import api from '../../../core/api/axios';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Pagination from '../../../components/Pagination';
import { toast } from '../../../components/Toast';
import NumberInput from '../../../components/NumberInput';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const STATUT_CLIENT = {
  INSCRIT:  { bg: '#EFF6FF', color: '#1D4ED8' },
  CONFIRME: { bg: '#DCFCE7', color: '#166534' },
  DESISTE:  { bg: '#FEF2F2', color: '#DC2626' },
  PARTI:    { bg: '#F5F3FF', color: '#6D28D9' },
  RENTRE:   { bg: '#ECFDF5', color: '#047857' },
  ANNULE:   { bg: '#F3F4F6', color: '#4B5563' },
};

const STATUT_PAIEMENT = {
  EN_ATTENTE: { bg: '#FEF2F2', color: '#DC2626' },
  PARTIEL:    { bg: '#FEF9C3', color: '#854D0E' },
  SOLDE:      { bg: '#DCFCE7', color: '#166534' },
};

const STATUT_PKG_COLORS = {
  OUVERT:  { bg: '#DCFCE7', color: '#166534', border: '#A7F3D0' },
  COMPLET: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  TERMINE: { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  ANNULE:  { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' },
};

function MontantCell({ value, color = '#059669' }) {
  return (
    <div style={{ lineHeight: 1.2 }}>
      <div style={{ fontWeight: 800, fontSize: 14, color }}>
        {fmt(value)}
      </div>
      <div style={{ fontWeight: 700, fontSize: 10, color }}>FCFA</div>
    </div>
  );
}

// Bloc cliquable représentant un départ
function PackageBlock({ pkg, count, onClick }) {
  const s = STATUT_PKG_COLORS[pkg.statut] || STATUT_PKG_COLORS.ANNULE;
  const pct = pkg.quotaMax ? Math.round((pkg.placesReservees || 0) / pkg.quotaMax * 100) : 0;

  return (
    <button
      onClick={onClick}
      style={{
        background: '#fff',
        border: `1.5px solid ${s.border}`,
        borderRadius: 12,
        padding: '18px 20px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ fontWeight: 800, fontSize: 14, color: '#111827', margin: 0, lineHeight: 1.3 }}>
          {pkg.nomReference || pkg.nom_depart}
        </p>
        <span style={{ background: s.bg, color: s.color, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {pkg.statut}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
          {pkg.type || pkg.service}
        </span>
        {pkg.compagnieAerienne && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B7280' }}>
            <Plane size={11} /> {pkg.compagnieAerienne}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6B7280' }}>
        <Calendar size={12} />
        <span>{fmtDate(pkg.dateDepart || pkg.date_depart)}</span>
        {(pkg.dateRetour || pkg.date_retour) && <><span>→</span><span>{fmtDate(pkg.dateRetour || pkg.date_retour)}</span></>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={13} color="#059669" />
          <span style={{ fontWeight: 800, fontSize: 13, color: '#059669' }}>{count}</span>
          <span style={{ fontSize: 12, color: '#6B7280' }}>inscription(s)</span>
        </div>
        {pkg.quotaMax > 0 && (
          <span style={{ fontSize: 11, color: pct >= 90 ? '#DC2626' : '#6B7280', fontWeight: 600 }}>
            {pkg.placesReservees || 0}/{pkg.quotaMax} places
          </span>
        )}
      </div>

      {pkg.quotaMax > 0 && (
        <div style={{ height: 4, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            background: pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#059669',
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}
    </button>
  );
}

function Badge({ val, map }) {
  const s = map[val] || { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {val}
    </span>
  );
}

const EMPTY_FORM = {
  packageKId: '', niveauConfort: 'ECO',
  dateDepart: '', dateRetour: '', montantTotalDu: '', notes: '',
  statutClient: 'INSCRIT', clients: [],
  selectedSupplements: {},
};

const buildPackageForm = (pkg, base = EMPTY_FORM) => {
  if (!pkg) return EMPTY_FORM;
  const prixMap = {
    ECO: Number(pkg.prixEco || pkg.prix_eco || 0),
    CONFORT: Number(pkg.prixCont || pkg.prix_confort || 0),
    VIP: Number(pkg.prixVip || pkg.prix_vip || 0),
  };
  const defaultNiveau = ['ECO', 'CONFORT', 'VIP'].find(n => prixMap[n] > 0) || 'ECO';
  const suggestedPrice = prixMap[defaultNiveau] || 0;
  const basePrice = suggestedPrice > 0 ? suggestedPrice : 0;
  const suppTotal = Object.values(base.selectedSupplements || {}).reduce((acc, s) => acc + (s.quantite || 1) * Number(s.prix || 0), 0);
  const total = basePrice + suppTotal;

  return {
    ...base,
    packageKId: pkg.id || pkg._id,
    niveauConfort: defaultNiveau,
    dateDepart: (pkg.dateDepart || pkg.date_depart) ? (pkg.dateDepart || pkg.date_depart).slice(0, 10) : base.dateDepart,
    dateRetour: (pkg.dateRetour || pkg.date_retour) ? (pkg.dateRetour || pkg.date_retour).slice(0, 10) : base.dateRetour,
    montantTotalDu: total > 0 ? String(Math.round(total)) : base.montantTotalDu,
  };
};

export default function ReservationsPage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [clients, setClients] = useState([]);
  const [supplementsList, setSupplementsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rRes, pRes, cRes, sRes] = await Promise.allSettled([
        api.get('/reservations?limit=1000'),
        api.get('/packages?limit=200'),
        api.get('/clients?limit=500'),
        api.get('/supplements?limit=100'),
      ]);
      setReservations(rRes.status === 'fulfilled' ? (rRes.value.data.reservations || rRes.value.data.data || []) : []);
      setPackages(pRes.status === 'fulfilled' ? (pRes.value.data.packages || pRes.value.data.data || []) : []);
      setClients(cRes.status === 'fulfilled' ? (cRes.value.data.clients || cRes.value.data.data || []) : []);
      setSupplementsList(sRes.status === 'fulfilled' ? (sRes.value.data.supplements || sRes.value.data.data || []) : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openForm = (pkg = null) => {
    if (pkg && pkg.id !== 'ALL') {
      setForm(buildPackageForm(pkg, EMPTY_FORM));
    } else {
      setForm(EMPTY_FORM);
    }
    setClientSearch('');
    setShowForm(true);
  };

  const handlePackageChange = (packageId) => {
    const pkg = packages.find(p => (p.id === packageId || p._id === packageId));
    setForm(f => buildPackageForm(pkg, { ...f, packageKId: packageId }));
  };

  const handleConfortChange = (niveau) => {
    const pkg = packages.find(p => (p.id === form.packageKId || p._id === form.packageKId));
    const prixMap = {
      ECO: Number(pkg?.prixEco || pkg?.prix_eco || 0),
      CONFORT: Number(pkg?.prixCont || pkg?.prix_confort || 0),
      VIP: Number(pkg?.prixVip || pkg?.prix_vip || 0),
    };
    const basePrice = prixMap[niveau] || 0;
    const suppTotal = Object.values(form.selectedSupplements || {}).reduce((acc, s) => acc + (s.quantite || 1) * Number(s.prix || 0), 0);
    const total = basePrice + suppTotal;

    setForm(f => ({
      ...f,
      niveauConfort: niveau,
      montantTotalDu: total > 0 ? String(Math.round(total)) : f.montantTotalDu,
    }));
  };

  const toggleSupplement = (supp) => {
    const suppId = supp._id || supp.id;
    const prix = Number(supp.prix?.$numberDecimal || supp.prix || 0);

    setForm(f => {
      const current = { ...(f.selectedSupplements || {}) };
      if (current[suppId]) {
        delete current[suppId];
      } else {
        current[suppId] = { id: suppId, nom: supp.nom, prix, quantite: 1 };
      }

      const pkg = packages.find(p => (p.id === f.packageKId || p._id === f.packageKId));
      const prixMap = {
        ECO: Number(pkg?.prixEco || pkg?.prix_eco || 0),
        CONFORT: Number(pkg?.prixCont || pkg?.prix_confort || 0),
        VIP: Number(pkg?.prixVip || pkg?.prix_vip || 0),
      };
      const basePrice = prixMap[f.niveauConfort] || 0;
      const suppTotal = Object.values(current).reduce((acc, s) => acc + (s.quantite || 1) * Number(s.prix || 0), 0);
      const total = basePrice + suppTotal;

      return {
        ...f,
        selectedSupplements: current,
        montantTotalDu: total > 0 ? String(Math.round(total)) : f.montantTotalDu,
      };
    });
  };

  const updateSupplementQuantity = (suppId, delta) => {
    setForm(f => {
      const current = { ...(f.selectedSupplements || {}) };
      if (!current[suppId]) return f;
      const newQte = Math.max(1, (current[suppId].quantite || 1) + delta);
      current[suppId] = { ...current[suppId], quantite: newQte };

      const pkg = packages.find(p => (p.id === f.packageKId || p._id === f.packageKId));
      const prixMap = {
        ECO: Number(pkg?.prixEco || pkg?.prix_eco || 0),
        CONFORT: Number(pkg?.prixCont || pkg?.prix_confort || 0),
        VIP: Number(pkg?.prixVip || pkg?.prix_vip || 0),
      };
      const basePrice = prixMap[f.niveauConfort] || 0;
      const suppTotal = Object.values(current).reduce((acc, s) => acc + (s.quantite || 1) * Number(s.prix || 0), 0);
      const total = basePrice + suppTotal;

      return {
        ...f,
        selectedSupplements: current,
        montantTotalDu: total > 0 ? String(Math.round(total)) : f.montantTotalDu,
      };
    });
  };

  const toggleClient = (clientId) => {
    setForm(f => {
      const exists = f.clients.includes(clientId);
      return {
        ...f,
        clients: exists ? f.clients.filter(id => id !== clientId) : [...f.clients, clientId],
      };
    });
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/reservations/${confirmDeleteId}`);
      toast('Inscription supprimée ✓');
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const filtered = useMemo(() => {
    let list = reservations;
    if (selectedPkg && selectedPkg.id !== 'ALL') {
      const pkgId = selectedPkg.id || selectedPkg._id;
      list = list.filter(r => (r.depart_id === pkgId || r.departs?.id === pkgId || r.packageKId?._id === pkgId || r.packageKId === pkgId));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => {
        const clientsList = Array.isArray(r.clients) ? r.clients : (r.clients ? [r.clients] : []);
        return (
          (r.numero || '').toLowerCase().includes(q) ||
          (r.idReservation || '').toLowerCase().includes(q) ||
          clientsList.some(c => `${c.nom} ${c.prenom}`.toLowerCase().includes(q)) ||
          (r.notes || '').toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [reservations, selectedPkg, search]);

  useEffect(() => {
    setTotalPages(Math.ceil(filtered.length / pageSize) || 1);
  }, [filtered, pageSize]);

  const paginated = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c => `${c.nom} ${c.prenom}`.toLowerCase().includes(q) || (c.telephone || '').includes(q));
  }, [clients, clientSearch]);

  const clientsDejaInscrits = useMemo(() => {
    if (!form.packageKId) return new Set();
    const inscrits = new Set();
    reservations
      .filter(r => (r.packageKId?._id === form.packageKId || r.packageKId === form.packageKId || r.depart_id === form.packageKId))
      .filter(r => !['ANNULEE', 'DESISTE'].includes(r.statut) && !['ANNULE', 'DESISTE'].includes(r.statutClient))
      .forEach(r => {
        const cList = Array.isArray(r.clients) ? r.clients : (r.clients ? [r.clients] : []);
        cList.forEach(c => inscrits.add(c._id || c.id || c));
      });
    return inscrits;
  }, [reservations, form.packageKId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clients.length) { toast('Sélectionnez au moins un client', 'error'); return; }
    if (!form.packageKId) { toast('Sélectionnez un départ', 'error'); return; }
    setSaving(true);
    try {
      const supplementsPayload = Object.values(form.selectedSupplements || {}).map(s => ({
        supplementId: s.id,
        quantite: s.quantite || 1,
        prixUnitaire: Number(s.prix || 0),
      }));

      const payload = {
        packageKId: form.packageKId,
        depart_id: form.packageKId,
        niveauConfort: form.niveauConfort || undefined,
        dateDepart: form.dateDepart,
        dateRetour: form.dateRetour,
        montantTotalDu: Number(form.montantTotalDu),
        nombrePlaces: form.clients.length,
        clients: form.clients,
        supplements: supplementsPayload,
        statutClient: form.statutClient || 'INSCRIT',
        notes: form.notes || undefined,
      };
      await api.post('/reservations', payload);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setClientSearch('');
      fetchAll();
      toast('Inscription créée avec succès ✓');
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Totaux Financiers ──
  const { totalDuGlobal, totalRecuGlobal, totalResteGlobal } = useMemo(() => {
    let du = 0, recu = 0;
    filtered.forEach(r => {
      const total = Number(r.montantTotalDu || r.prix_total || 0);
      const reste = Number(r.resteAPayer || 0);
      du += total;
      recu += Math.max(0, total - reste);
    });
    return {
      totalDuGlobal: du,
      totalRecuGlobal: recu,
      totalResteGlobal: Math.max(0, du - recu)
    };
  }, [filtered]);

  // Export CSV
  const exportCSV = () => {
    if (!selectedPkg || filtered.length === 0) return;
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };
    const headers = ['N° Inscription', 'Client(s)', 'Téléphone', 'Classe', 'Statut Client', 'Statut Paiement', 'Total Dû (FCFA)', 'Reçu (FCFA)', 'Reste (FCFA)', 'Notes'];
    const rows = filtered.map(r => {
      const recu = (r.montantTotalDu || 0) - (r.resteAPayer || 0);
      const cList = Array.isArray(r.clients) ? r.clients : (r.clients ? [r.clients] : []);
      return [
        r.numero || r.idReservation,
        cList.map(c => `${c.nom} ${c.prenom}`).join(' | ') || '—',
        cList[0]?.telephone || '—',
        r.niveauConfort || r.typeChambre || '—',
        r.statutClient || 'INSCRIT',
        r.statutPaiement || 'EN_ATTENTE',
        r.montantTotalDu || 0,
        recu,
        r.resteAPayer || 0,
        r.notes || '',
      ];
    });
    const lines = [headers.join(','), ...rows.map(row => row.map(escape).join(','))];
    const csv = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscriptions-${(selectedPkg.nomReference || selectedPkg.nom_depart || 'kyswa').replace(/[^a-z0-9]/gi, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export CSV téléchargé ✓');
  };

  // Export PDF
  const exportPDF = async () => {
    if (!selectedPkg || filtered.length === 0) return;
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      doc.setFillColor(5, 150, 105);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('KYSWA TRAVEL — Liste des Inscriptions', 14, 10);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Départ : ${selectedPkg.nomReference || selectedPkg.nom_depart}  |  ${fmtDate(selectedPkg.dateDepart || selectedPkg.date_depart)} → ${fmtDate(selectedPkg.dateRetour || selectedPkg.date_retour)}  |  ${filtered.length} inscription(s)`, 14, 17);

      autoTable(doc, {
        startY: 30,
        head: [['N°', 'Client(s)', 'Téléphone', 'Classe', 'Statut', 'Paiement', 'Total Dû', 'Reçu', 'Reste']],
        body: filtered.map(r => {
          const recu = (r.montantTotalDu || 0) - (r.resteAPayer || 0);
          const cList = Array.isArray(r.clients) ? r.clients : (r.clients ? [r.clients] : []);
          return [
            r.numero || r.idReservation,
            cList.map(c => `${c.nom} ${c.prenom}`).join('\n') || '—',
            cList[0]?.telephone || '—',
            r.niveauConfort || r.typeChambre || '—',
            r.statutClient || 'INSCRIT',
            r.statutPaiement || 'EN_ATTENTE',
            `${fmt(r.montantTotalDu)} F`,
            `${fmt(recu)} F`,
            `${fmt(r.resteAPayer)} F`,
          ];
        }),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 250, 247] },
      });

      doc.save(`inscriptions-${(selectedPkg.nomReference || selectedPkg.nom_depart || 'kyswa').replace(/[^a-z0-9]/gi, '-')}.pdf`);
      toast('Export PDF téléchargé ✓');
    } catch (err) {
      console.error(err);
      toast('Erreur lors de la génération PDF', 'error');
    }
  };

  const countByPkg = useMemo(() => {
    const map = {};
    reservations.forEach(r => {
      const id = r.depart_id || r.departs?.id || r.packageKId?._id || r.packageKId;
      if (id) map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [reservations]);

  const packagesTries = useMemo(() => {
    return [...packages].sort((a, b) => {
      const order = { OUVERT: 0, COMPLET: 1, TERMINE: 2, ANNULE: 3 };
      const diff = (order[a.statut] ?? 4) - (order[b.statut] ?? 4);
      if (diff !== 0) return diff;
      return new Date(a.dateDepart || a.date_depart) - new Date(b.dateDepart || b.date_depart);
    });
  }, [packages]);

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── En-tête Page ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Inscriptions</h1>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 4, margin: 0 }}>
            Gestion des inscriptions, réservations et répartition des pèlerins par départ
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!selectedPkg ? (
            <button
              onClick={() => { setSelectedPkg({ id: 'ALL', nomReference: 'Toutes les inscriptions' }); setSearch(''); setPage(1); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
            >
              <Users size={15} /> Toutes les inscriptions ({reservations.length})
            </button>
          ) : (
            <button
              onClick={() => { setSelectedPkg(null); setSearch(''); setPage(1); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
            >
              <ChevronLeft size={15} /> Départs ({packages.length})
            </button>
          )}
          <button
            onClick={() => openForm(selectedPkg)}
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
            <Plus size={16} /> Nouvelle inscription
          </button>
        </div>
      </div>

      {/* ── VUE 1 : GRILLE DES DÉPARTS ── */}
      {!selectedPkg ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 8, padding: 8 }}>
                <Calendar size={18} color="#059669" />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Départs Disponibles</h2>
            </div>
            <span style={{ fontSize: 12, color: '#6B7280', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px' }}>
              {packagesTries.length} départ{packagesTries.length > 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ padding: '0 24px 24px' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Chargement des départs...</p>
            ) : packagesTries.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Aucun départ disponible</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {packagesTries.map(pkg => (
                  <PackageBlock
                    key={pkg.id || pkg._id}
                    pkg={pkg}
                    count={countByPkg[pkg.id] || countByPkg[pkg._id] || 0}
                    onClick={() => { setSelectedPkg(pkg); setSearch(''); setPage(1); }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (

        /* ── VUE 2 : TABLEAU DÉTAILLÉ DES INSCRIPTIONS ── */
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          
          {/* Titre & Informations départ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 8, padding: 8 }}>
                <Users size={18} color="#059669" />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>
                  {selectedPkg.nomReference || selectedPkg.nom_depart}
                </h2>
                {selectedPkg.id !== 'ALL' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3 }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>
                      {fmtDate(selectedPkg.dateDepart || selectedPkg.date_depart)} → {fmtDate(selectedPkg.dateRetour || selectedPkg.date_retour)}
                    </span>
                    {selectedPkg.compagnieAerienne && (
                      <span style={{ fontSize: 12, color: '#1D4ED8', fontWeight: 600 }}>
                        · {selectedPkg.compagnieAerienne}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Boutons Export */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={exportCSV}
                disabled={filtered.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#059669', cursor: 'pointer' }}
              >
                <Download size={13} /> Export CSV
              </button>
              <button
                onClick={exportPDF}
                disabled={filtered.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#DC2626', cursor: 'pointer' }}
              >
                <FileText size={13} /> Export PDF
              </button>
            </div>
          </div>

          {/* ── KPI Cards Financiers du départ ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, padding: '0 24px 20px' }}>
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <Users size={20} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px' }}>INSCRIPTIONS</p>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{filtered.length}</div>
              </div>
            </div>

            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <Banknote size={20} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px' }}>TOTAL FACTURÉ</p>
                <div style={{ lineHeight: 1.15 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{fmt(totalDuGlobal)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280' }}>FCFA</div>
                </div>
              </div>
            </div>

            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <CreditCard size={20} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px' }}>TOTAL ENCAISSÉ</p>
                <div style={{ lineHeight: 1.15 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#059669' }}>{fmt(totalRecuGlobal)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>FCFA</div>
                </div>
              </div>
            </div>

            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <AlertCircle size={20} color="#DC2626" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px' }}>RESTE À RECOUVRER</p>
                <div style={{ lineHeight: 1.15 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: totalResteGlobal > 0 ? '#DC2626' : '#059669' }}>{fmt(totalResteGlobal)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: totalResteGlobal > 0 ? '#DC2626' : '#059669' }}>FCFA</div>
                </div>
              </div>
            </div>
          </div>

          {/* Filtres & Recherche */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px 20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Rechercher par N°, nom client, téléphone..."
                style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 38, border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }}
              />
            </div>
            <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>
              {filtered.length} inscription{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Tableau des Inscriptions */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
                  {['N°', 'CLIENT(S)', 'TÉLÉPHONE', selectedPkg?.id === 'ALL' ? 'DÉPART' : null, 'CLASSE', 'TOTAL DÛ', 'REÇU', 'RESTE', 'STATUT', 'PAIEMENT', 'ACT.']
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
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Chargement des inscriptions...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Aucune inscription trouvée</td></tr>
                ) : paginated.map((r, i) => {
                  const recu = (Number(r.montantTotalDu || r.prix_total || 0)) - (Number(r.resteAPayer || 0));
                  const clientsList = Array.isArray(r.clients) ? r.clients : (r.clients ? [r.clients] : r.client ? [r.client] : []);
                  const nomClients = clientsList.map(c => `${c.nom || ''} ${c.prenom || ''}`.trim()).filter(Boolean).join(', ') || '—';
                  const tel = clientsList[0]?.telephone || '—';
                  const typeChambre = r.type_chambre || r.typeChambre || r.niveauConfort || '—';
                  const nomDepart = r.departs?.nom_depart || r.packageKId?.nomReference || r.service || '—';
                  const rowId = r.id || r._id;

                  return (
                    <tr
                      key={rowId || i}
                      style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background 0.15s', cursor: 'pointer' }}
                      onClick={() => navigate(`/dashboard/reservations/${rowId}`)}
                      onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}
                    >
                      {/* N° Inscription */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 800, fontSize: 12, color: '#059669' }}>
                          {r.numero || (r.id ? `#${r.id.slice(0, 8)}` : '—')}
                        </span>
                      </td>

                      {/* Client */}
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827' }}>
                        {nomClients}
                      </td>

                      {/* Téléphone */}
                      <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: 12 }}>
                        {tel}
                      </td>

                      {/* Départ (si vue globale) */}
                      {selectedPkg?.id === 'ALL' && (
                        <td style={{ padding: '12px 16px', color: '#1D4ED8', fontWeight: 600, fontSize: 12 }}>
                          {nomDepart}
                        </td>
                      )}

                      {/* Classe */}
                      <td style={{ padding: '12px 16px', color: '#374151', fontSize: 12 }}>
                        {typeChambre}
                      </td>

                      {/* Montant total */}
                      <td style={{ padding: '12px 16px' }}>
                        <MontantCell value={r.montantTotalDu || r.prix_total} color="#111827" />
                      </td>

                      {/* Reçu */}
                      <td style={{ padding: '12px 16px' }}>
                        <MontantCell value={recu} color="#059669" />
                      </td>

                      {/* Reste */}
                      <td style={{ padding: '12px 16px' }}>
                        <MontantCell value={r.resteAPayer} color={r.resteAPayer > 0 ? '#DC2626' : '#059669'} />
                      </td>

                      {/* Statut client */}
                      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                        <Badge val={r.statutClient || 'INSCRIT'} map={STATUT_CLIENT} />
                      </td>

                      {/* Statut paiement */}
                      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                        <Badge val={r.statutPaiement || 'EN_ATTENTE'} map={STATUT_PAIEMENT} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ActionBtn
                            onClick={() => navigate(`/dashboard/reservations/${rowId}`)}
                            title="Voir le dossier"
                            hoverBg="#EFF6FF" hoverColor="#1D4ED8" hoverBorder="#BFDBFE"
                          >
                            <Eye size={13} />
                          </ActionBtn>
                          <ActionBtn
                            onClick={() => setConfirmDeleteId(rowId)}
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

          <div style={{ borderTop: '1px solid #F3F4F6' }}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={pageSize}
              onPageChange={setPage}
              onLimitChange={newL => { setPageSize(newL); setPage(1); }}
              limitOptions={[10, 25, 50, 100]}
            />
          </div>
        </div>
      )}

      {/* ════ MODAL NOUVELLE INSCRIPTION ════ */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle inscription">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Départ</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Package / Départ *">
                {(selectedPkg && selectedPkg.id !== 'ALL') ? (
                  <div style={{ ...inputSt, height: 'auto', padding: '10px 12px', background: '#F9FAFB', fontWeight: 600 }}>
                    {selectedPkg.nomReference || selectedPkg.nom_depart} — {selectedPkg.type || selectedPkg.service} — {fmtDate(selectedPkg.dateDepart || selectedPkg.date_depart)}
                  </div>
                ) : (
                  <select value={form.packageKId} onChange={e => handlePackageChange(e.target.value)} style={inputSt} required>
                    <option value="">Sélectionner un départ...</option>
                    {packages.filter(p => p.statut === 'OUVERT' || p.actif !== false).map(p => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.nomReference || p.nom_depart} — {p.type || p.service} — {fmtDate(p.dateDepart || p.date_depart)}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
            </div>
            <FormField label="Date départ">
              <input type="date" value={form.dateDepart} onChange={setField('dateDepart')} style={inputSt} />
            </FormField>
            <FormField label="Date retour">
              <input type="date" value={form.dateRetour} onChange={setField('dateRetour')} style={inputSt} />
            </FormField>
          </div>

          <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Classe / Confort</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['ECO', 'prixEco'], ['CONFORT', 'prixCont'], ['VIP', 'prixVip']].map(([niveau, key]) => {
              const pkg = packages.find(p => (p.id === form.packageKId || p._id === form.packageKId));
              const fallbackKey = key === 'prixEco' ? 'prix_eco' : key === 'prixCont' ? 'prix_confort' : 'prix_vip';
              const rawPrix = pkg?.[key] || pkg?.[fallbackKey];
              const prix = Number(rawPrix) > 0 ? rawPrix : null;
              const isSelected = form.niveauConfort === niveau;
              return (
                <button
                  key={niveau}
                  type="button"
                  onClick={() => handleConfortChange(niveau)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: 10,
                    border: `2px solid ${isSelected ? '#059669' : '#E5E7EB'}`,
                    background: isSelected ? '#F0FDF4' : '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontWeight: 800, fontSize: 13, color: isSelected ? '#059669' : '#111827', margin: '0 0 4px' }}>{niveau}</p>
                  <p style={{ fontSize: 11, color: isSelected ? '#059669' : '#6B7280', fontWeight: 600, margin: 0 }}>
                    {prix ? `${Number(prix).toLocaleString('fr-FR')} FCFA` : '—'}
                  </p>
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>Financier & Statut</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Montant total dû (FCFA) *">
              <NumberInput
                value={form.montantTotalDu}
                onChange={v => setForm(f => ({ ...f, montantTotalDu: v === '' ? '' : String(v) }))}
                className="premium-input"
                min={0}
                required
              />
            </FormField>
            <FormField label="Statut client">
              <select value={form.statutClient} onChange={setField('statutClient')} style={inputSt}>
                {['INSCRIT', 'CONFIRME', 'DESISTE', 'PARTI', 'RENTRE', 'ANNULE'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Notes internes">
                <textarea value={form.notes} onChange={setField('notes')} style={{ ...inputSt, height: 'auto', padding: '8px 12px', resize: 'vertical' }} rows={2} placeholder="Remarques..." />
              </FormField>
            </div>
          </div>

          {/* Suppléments */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
                Suppléments / Options ({Object.keys(form.selectedSupplements || {}).length})
              </p>
              {Object.keys(form.selectedSupplements || {}).length > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                  + {Object.values(form.selectedSupplements || {}).reduce((acc, s) => acc + (s.quantite || 1) * Number(s.prix || 0), 0).toLocaleString('fr-FR')} FCFA
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: 8 }}>
              {supplementsList.filter(s => s.actif !== false).map(s => {
                const suppId = s._id || s.id;
                const isSelected = !!form.selectedSupplements?.[suppId];
                const suppPrix = Number(s.prix?.$numberDecimal || s.prix || 0);
                const qte = form.selectedSupplements?.[suppId]?.quantite || 1;

                return (
                  <div key={suppId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, background: isSelected ? '#F0FDF4' : '#FAFAFA', border: `1px solid ${isSelected ? '#A7F3D0' : '#E5E7EB'}` }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, margin: 0 }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSupplement(s)} style={{ accentColor: '#059669' }} />
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{s.nom}</span>
                      <span style={{ fontSize: 12, color: '#059669', fontWeight: 700, marginLeft: 8 }}>{suppPrix.toLocaleString('fr-FR')} FCFA</span>
                    </label>
                    {isSelected && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>Qté:</span>
                        <button type="button" onClick={() => updateSupplementQuantity(suppId, -1)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>-</button>
                        <span style={{ fontWeight: 700, fontSize: 12, minWidth: 16, textAlign: 'center' }}>{qte}</span>
                        <button type="button" onClick={() => updateSupplementQuantity(suppId, 1)} style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sélection des Clients */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>
              Clients * ({form.clients.length} sélectionné(s))
            </p>
            <input
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              placeholder="Filtrer les clients..."
              style={{ ...inputSt, marginBottom: 8 }}
            />
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8, padding: 8 }}>
              {filteredClients.map(c => {
                const clientId = c._id || c.id;
                const dejaInscrit = clientsDejaInscrits.has(clientId);
                return (
                  <label key={clientId} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px',
                    borderRadius: 6, cursor: dejaInscrit ? 'not-allowed' : 'pointer', fontSize: 13,
                    background: form.clients.includes(clientId) ? '#F0FDF4' : 'transparent',
                    opacity: dejaInscrit ? 0.5 : 1,
                  }}>
                    <input type="checkbox" checked={form.clients.includes(clientId)} onChange={() => !dejaInscrit && toggleClient(clientId)} disabled={dejaInscrit} style={{ accentColor: '#059669' }} />
                    <span style={{ fontWeight: 600, color: '#111827' }}>{c.nom} {c.prenom}</span>
                    <span style={{ color: '#6B7280', fontSize: 11, marginLeft: 8 }}>{c.telephone || ''}</span>
                    {dejaInscrit && <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', borderRadius: 4, padding: '1px 6px' }}>Déjà inscrit</span>}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ border: '1.5px solid #E5E7EB', background: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving}
              style={{ background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Enregistrement...' : 'Créer l\'inscription'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Supprimer cette inscription ? Les paiements et suppléments associés seront également affectés."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
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
