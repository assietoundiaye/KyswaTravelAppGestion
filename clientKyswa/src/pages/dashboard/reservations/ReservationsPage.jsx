import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, Users, Calendar, Plane, Download, FileText } from 'lucide-react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const STATUT_CLIENT = {
  INSCRIT: { bg: '#EFF6FF', color: '#2563EB' },
  CONFIRME: { bg: '#F0FDF4', color: '#16A34A' },
  DESISTE: { bg: '#FEF2F2', color: '#DC2626' },
  PARTI: { bg: '#F5F3FF', color: '#7C3AED' },
  RENTRE: { bg: '#F0FDF4', color: '#059669' },
  ANNULE: { bg: '#F3F4F6', color: '#6B7280' },
};

const STATUT_PAIEMENT = {
  EN_ATTENTE: { bg: '#FEF2F2', color: '#DC2626' },
  PARTIEL: { bg: '#FFFBEB', color: '#D97706' },
  SOLDE: { bg: '#F0FDF4', color: '#16A34A' },
};

const STATUT_PKG_COLORS = {
  OUVERT:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  COMPLET: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  TERMINE: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  ANNULE:  { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
};

// Bloc cliquable représentant un départ
function PackageBlock({ pkg, count, onClick }) {
  const s = STATUT_PKG_COLORS[pkg.statut] || STATUT_PKG_COLORS.ANNULE;
  const pct = pkg.quotaMax ? Math.round((pkg.placesReservees || 0) / pkg.quotaMax * 100) : 0;
  return (
    <button
      onClick={onClick}
      style={{
        background: 'white',
        border: `1.5px solid ${s.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
    >
      {/* Titre + badge statut */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text-main)', lineHeight: 1.3 }}>
          {pkg.nomReference}
        </p>
        <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {pkg.statut}
        </span>
      </div>

      {/* Type + compagnie */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{pkg.type}</span>
        {pkg.compagnieAerienne && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
            <Plane size={11} /> {pkg.compagnieAerienne}
          </span>
        )}
      </div>

      {/* Dates */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
        <Calendar size={12} />
        <span>{fmtDate(pkg.dateDepart)}</span>
        {pkg.dateRetour && <><span>→</span><span>{fmtDate(pkg.dateRetour)}</span></>}
      </div>

      {/* Inscriptions + quota */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={13} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>{count}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>inscription(s)</span>
        </div>
        {pkg.quotaMax > 0 && (
          <span style={{ fontSize: 11, color: pct >= 90 ? '#DC2626' : 'var(--text-muted)', fontWeight: 600 }}>
            {pkg.placesReservees || 0}/{pkg.quotaMax} places
          </span>
        )}
      </div>

      {/* Barre de remplissage */}
      {pkg.quotaMax > 0 && (
        <div style={{ height: 4, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            background: pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#16A34A',
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }} />
        </div>
      )}
    </button>
  );
}

function Badge({ val, map }) {
  const s = map[val] || { bg: '#F3F4F6', color: '#6B7280' };
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700 }}>{val}</span>;
}

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  packageKId: '', niveauConfort: 'ECO',
  dateDepart: '', dateRetour: '', montantTotalDu: '', notes: '',
  statutClient: 'INSCRIT', clients: [],
};

export default function ReservationsPage() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [packages, setPackages] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [clientSearch, setClientSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Départ sélectionné (null = vue grille des départs)
  const [selectedPkg, setSelectedPkg] = useState(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/reservations/${confirmDeleteId}`);
      toast('Inscription supprimée');
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally { setDeleting(false); setConfirmDeleteId(null); }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, p, c] = await Promise.all([
        api.get('/reservations'),
        api.get('/packages'),
        api.get('/clients'),
      ]);
      setReservations(r.data.reservations || []);
      setPackages(p.data.packages || []);
      setClients(c.data.clients || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // Auto-fill dates AND prix when package is selected
  const handlePackageChange = (pkgId) => {
    const pkg = packages.find(p => p._id === pkgId);
    const prixMap = { ECO: pkg?.prixEco, CONFORT: pkg?.prixCont, VIP: pkg?.prixVip };
    // Choisir le premier niveau disponible par défaut
    const defaultNiveau = ['ECO', 'CONFORT', 'VIP'].find(n => prixMap[n]) || 'ECO';
    const suggestedPrice = prixMap[defaultNiveau] || '';
    setForm(f => ({
      ...f,
      packageKId: pkgId,
      niveauConfort: defaultNiveau,
      dateDepart: pkg?.dateDepart ? pkg.dateDepart.slice(0, 10) : f.dateDepart,
      dateRetour: pkg?.dateRetour ? pkg.dateRetour.slice(0, 10) : f.dateRetour,
      montantTotalDu: suggestedPrice ? String(Math.round(Number(suggestedPrice))) : f.montantTotalDu,
    }));
  };

  // Recalculate price when niveau confort changes
  const handleConfortChange = (niveauConfort) => {
    const pkg = packages.find(p => p._id === form.packageKId);
    if (pkg) {
      const prixMap = { ECO: pkg.prixEco, CONFORT: pkg.prixCont, VIP: pkg.prixVip };
      const prix = prixMap[niveauConfort];
      setForm(f => ({
        ...f,
        niveauConfort,
        montantTotalDu: prix ? String(Math.round(Number(prix))) : f.montantTotalDu,
      }));
    } else {
      setForm(f => ({ ...f, niveauConfort }));
    }
  };

  const filtered = useMemo(() => {
    // Filtrer par départ sélectionné
    let base = reservations;
    if (selectedPkg) {
      base = reservations.filter(r =>
        (r.packageKId?._id || r.packageKId) === selectedPkg._id
      );
    }
    if (!search) return base;
    const q = search.toLowerCase();
    return base.filter(r =>
      r.numero?.toLowerCase().includes(q) ||
      r.clients?.some(c => `${c.nom} ${c.prenom}`.toLowerCase().includes(q) || c.telephone?.includes(q))
    );
  }, [reservations, search, selectedPkg]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleClient = (id) => {
    setForm(f => ({
      ...f,
      clients: f.clients.includes(id) ? f.clients.filter(c => c !== id) : [...f.clients, id],
    }));
  };

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      `${c.nom} ${c.prenom}`.toLowerCase().includes(q) ||
      c.telephone?.includes(q) ||
      c.numeroPasseport?.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  // Clients déjà inscrits sur le package sélectionné (hors annulés)
  const clientsDejaInscrits = useMemo(() => {
    if (!form.packageKId) return new Set();
    const inscrits = new Set();
    reservations
      .filter(r =>
        r.packageKId?._id === form.packageKId || r.packageKId === form.packageKId
      )
      .filter(r => !['ANNULEE', 'DESISTE'].includes(r.statut) && !['ANNULE', 'DESISTE'].includes(r.statutClient))
      .forEach(r => r.clients?.forEach(c => inscrits.add(c._id || c)));
    return inscrits;
  }, [reservations, form.packageKId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.clients.length) { toast('Sélectionnez au moins un client', 'error'); return; }
    if (!form.packageKId) { toast('Sélectionnez un départ', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        packageKId: form.packageKId,
        niveauConfort: form.niveauConfort || undefined,
        dateDepart: form.dateDepart,
        dateRetour: form.dateRetour,
        montantTotalDu: Number(form.montantTotalDu),
        nombrePlaces: form.clients.length,
        clients: form.clients,
        statutClient: form.statutClient || 'INSCRIT',
        notes: form.notes || undefined,
      };
      await api.post('/reservations', payload);
      setShowForm(false);
      setForm(EMPTY_FORM);
      setClientSearch('');
      fetchAll();
      toast('Inscription créée');
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Export CSV ──────────────────────────────────────────────────────────────
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
      return [
        r.numero || r.idReservation,
        r.clients?.map(c => `${c.nom} ${c.prenom}`).join(' | ') || '—',
        r.clients?.[0]?.telephone || '—',
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
    const csv = '\uFEFF' + lines.join('\n'); // BOM pour Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscriptions-${selectedPkg.nomReference.replace(/[^a-z0-9]/gi, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Export CSV téléchargé');
  };

  // ── Export PDF ──────────────────────────────────────────────────────────────
  const exportPDF = async () => {
    if (!selectedPkg || filtered.length === 0) return;
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // En-tête
      doc.setFillColor(0, 103, 79);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('KYSWA TRAVEL — Liste des Inscriptions', 14, 10);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Départ : ${selectedPkg.nomReference}  |  ${fmtDate(selectedPkg.dateDepart)} → ${fmtDate(selectedPkg.dateRetour)}  |  ${filtered.length} inscription(s)`, 14, 17);

      // Sous-titre date d'export
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 14, 27);

      // Résumé financier
      const totalDu = filtered.reduce((s, r) => s + (r.montantTotalDu || 0), 0);
      const totalRecu = filtered.reduce((s, r) => s + ((r.montantTotalDu || 0) - (r.resteAPayer || 0)), 0);
      const totalReste = totalDu - totalRecu;
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total dû : ${totalDu.toLocaleString('fr-FR')} FCFA   |   Reçu : ${totalRecu.toLocaleString('fr-FR')} FCFA   |   Reste : ${totalReste.toLocaleString('fr-FR')} FCFA`, 14, 33);

      // Tableau
      autoTable(doc, {
        startY: 37,
        head: [['N°', 'Client(s)', 'Téléphone', 'Classe', 'Statut Client', 'Paiement', 'Total Dû', 'Reçu', 'Reste']],
        body: filtered.map(r => {
          const recu = (r.montantTotalDu || 0) - (r.resteAPayer || 0);
          return [
            r.numero || r.idReservation,
            r.clients?.map(c => `${c.nom} ${c.prenom}`).join('\n') || '—',
            r.clients?.[0]?.telephone || '—',
            r.niveauConfort || r.typeChambre || '—',
            r.statutClient || 'INSCRIT',
            r.statutPaiement || 'EN_ATTENTE',
            `${(r.montantTotalDu || 0).toLocaleString('fr-FR')} F`,
            `${recu.toLocaleString('fr-FR')} F`,
            `${(r.resteAPayer || 0).toLocaleString('fr-FR')} F`,
          ];
        }),
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [0, 103, 79], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 250, 247] },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 50 },
          2: { cellWidth: 28 },
          3: { cellWidth: 20 },
          4: { cellWidth: 24 },
          5: { cellWidth: 24 },
          6: { cellWidth: 28, halign: 'right' },
          7: { cellWidth: 28, halign: 'right' },
          8: { cellWidth: 28, halign: 'right' },
        },
        didParseCell: (data) => {
          // Colorier la colonne Reste en rouge si > 0
          if (data.column.index === 8 && data.section === 'body') {
            const r = filtered[data.row.index];
            if (r && (r.resteAPayer || 0) > 0) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            } else if (r) {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          // Colorier statut client
          if (data.column.index === 4 && data.section === 'body') {
            const val = data.cell.raw;
            const colors = { CONFIRME: [22, 163, 74], DESISTE: [220, 38, 38], PARTI: [124, 58, 237], RENTRE: [5, 150, 105], ANNULE: [107, 114, 128] };
            if (colors[val]) data.cell.styles.textColor = colors[val];
          }
        },
      });

      // Pied de page
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} / ${pageCount}  —  Kyswa Travel`, 297 / 2, 205, { align: 'center' });
      }

      doc.save(`inscriptions-${selectedPkg.nomReference.replace(/[^a-z0-9]/gi, '-')}.pdf`);
      toast('Export PDF téléchargé');
    } catch (err) {
      console.error(err);
      toast('Erreur lors de la génération PDF', 'error');
    }
  };

  // Compter les inscriptions par package
  const countByPkg = useMemo(() => {
    const map = {};
    reservations.forEach(r => {
      const id = r.packageKId?._id || r.packageKId;
      if (id) map[id] = (map[id] || 0) + 1;
    });
    return map;
  }, [reservations]);

  // Packages triés : OUVERT en premier, puis par date de départ
  const packagesTries = useMemo(() => {
    return [...packages].sort((a, b) => {
      const order = { OUVERT: 0, COMPLET: 1, TERMINE: 2, ANNULE: 3 };
      const diff = (order[a.statut] ?? 4) - (order[b.statut] ?? 4);
      if (diff !== 0) return diff;
      return new Date(a.dateDepart) - new Date(b.dateDepart);
    });
  }, [packages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── VUE GRILLE DES DÉPARTS ── */}
      {!selectedPkg ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
                Inscriptions
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
                Sélectionnez un départ pour voir les inscriptions
              </p>
            </div>
            <button onClick={() => setShowForm(true)} className="btn-primary">+ Nouvelle inscription</button>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {[1,2,3,4].map(i => (
                <div key={i} className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : packagesTries.length === 0 ? (
            <div className="premium-card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
              Aucun départ disponible
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {packagesTries.map(pkg => (
                <PackageBlock
                  key={pkg._id}
                  pkg={pkg}
                  count={countByPkg[pkg._id] || 0}
                  onClick={() => { setSelectedPkg(pkg); setSearch(''); setPage(1); }}
                />
              ))}
            </div>
          )}
        </>
      ) : (

        /* ── VUE LISTE DES INSCRIPTIONS D'UN DÉPART ── */
        <>
          {/* Header avec retour */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => { setSelectedPkg(null); setSearch(''); setPage(1); }}
                style={{ background: 'white', border: '1.5px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}
              >
                <ChevronLeft size={15} /> Retour
              </button>
              <div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>
                  {selectedPkg.nomReference}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <Calendar size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {fmtDate(selectedPkg.dateDepart)} → {fmtDate(selectedPkg.dateRetour)}
                  </span>
                  {selectedPkg.compagnieAerienne && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <Plane size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {selectedPkg.compagnieAerienne}
                    </span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                    <Users size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {filtered.length} inscription(s)
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="N°, client, téléphone..."
                  className="premium-input"
                  style={{ paddingLeft: 36, width: 240 }}
                />
              </div>
              {/* Boutons export */}
              <button
                onClick={exportCSV}
                disabled={filtered.length === 0}
                title="Télécharger la liste en CSV"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'white', border: '1.5px solid var(--border)',
                  borderRadius: 8, padding: '7px 14px', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, color: '#16A34A',
                  opacity: filtered.length === 0 ? 0.4 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (filtered.length > 0) e.currentTarget.style.background = '#F0FDF4'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={exportPDF}
                disabled={filtered.length === 0}
                title="Télécharger la liste en PDF"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'white', border: '1.5px solid var(--border)',
                  borderRadius: 8, padding: '7px 14px', cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: 600, color: '#DC2626',
                  opacity: filtered.length === 0 ? 0.4 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (filtered.length > 0) e.currentTarget.style.background = '#FEF2F2'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
              >
                <FileText size={14} /> PDF
              </button>
              <button onClick={() => setShowForm(true)} className="btn-primary">+ Nouvelle inscription</button>
            </div>
          </div>

          {/* Résumé statuts */}
          {!loading && filtered.length > 0 && (() => {
            const stats = {};
            filtered.forEach(r => {
              const s = r.statutClient || 'INSCRIT';
              stats[s] = (stats[s] || 0) + 1;
            });
            return (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(stats).map(([statut, count]) => {
                  const s = STATUT_CLIENT[statut] || { bg: '#F3F4F6', color: '#6B7280' };
                  return (
                    <span key={statut} style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                      {statut} · {count}
                    </span>
                  );
                })}
              </div>
            );
          })()}

          {/* Table */}
          <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Client(s)</th>
                    <th>Téléphone</th>
                    <th>Classe</th>
                    <th>Prix total</th>
                    <th>Reçu</th>
                    <th>Restant</th>
                    <th>Statut client</th>
                    <th>Paiement</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</td></tr>
                  ) : paginated.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune inscription pour ce départ</td></tr>
                  ) : paginated.map(r => {
                    const recu = (r.montantTotalDu || 0) - (r.resteAPayer || 0);
                    return (
                      <tr key={r._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/reservations/${r._id}`)}>
                        <td><span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--primary)' }}>{r.numero || r.idReservation}</span></td>
                        <td style={{ fontWeight: 600 }}>{r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ') || '—'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{r.clients?.[0]?.telephone || '—'}</td>
                        <td style={{ fontSize: 12 }}>{r.niveauConfort || r.typeChambre || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(r.montantTotalDu)}</td>
                        <td style={{ color: '#16A34A', fontWeight: 600 }}>{fmt(recu)}</td>
                        <td style={{ color: r.resteAPayer > 0 ? '#DC2626' : '#16A34A', fontWeight: 700 }}>{fmt(r.resteAPayer)}</td>
                        <td onClick={e => e.stopPropagation()}><Badge val={r.statutClient || 'INSCRIT'} map={STATUT_CLIENT} /></td>
                        <td onClick={e => e.stopPropagation()}><Badge val={r.statutPaiement || 'EN_ATTENTE'} map={STATUT_PAIEMENT} /></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => navigate(`/dashboard/reservations/${r._id}`)}
                              style={{ background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6, padding: '4px 12px', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              Voir
                            </button>
                            <button onClick={() => setConfirmDeleteId(r._id)}
                              style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 12px', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontSize: 13 }}>Préc</button>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, fontSize: 13 }}>Suiv</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal inscription */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle inscription">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Départ */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Départ</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Package / Départ *</label>
              <select value={form.packageKId} onChange={e => handlePackageChange(e.target.value)} className="premium-input" required>
                <option value="">Sélectionner un départ...</option>
                {packages.filter(p => p.statut === 'OUVERT').map(p => (
                  <option key={p._id} value={p._id}>
                    {p.nomReference} — {p.type} — {fmtDate(p.dateDepart)}
                    {p.quotaMax && ` (${p.placesReservees || 0}/${p.quotaMax} places)`}
                  </option>
                ))}
              </select>
              {/* Prix du package sélectionné */}
              {form.packageKId && (() => {
                const pkg = packages.find(p => p._id === form.packageKId);
                if (!pkg) return null;
                const prix = [
                  ['Éco', pkg.prixEco], ['Confort', pkg.prixCont], ['VIP', pkg.prixVip],
                ].filter(([, v]) => v);
                if (!prix.length) return null;
                return (
                  <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {prix.map(([l, v]) => (
                      <span key={l} style={{ background: 'rgba(0,103,79,0.06)', borderRadius: 8, padding: '4px 10px', fontSize: 12 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{l}: </span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{Number(v).toLocaleString('fr-FR')} FCFA</span>
                      </span>
                    ))}
                    {pkg.compagnieAerienne && (
                      <span style={{ background: '#EFF6FF', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: '#2563EB', fontWeight: 600 }}>
                        {pkg.compagnieAerienne} {pkg.villeDepart && `· ${pkg.villeDepart} → ${pkg.villeArrivee}`}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
            <div>
              <label className="input-label">Date départ *</label>
              <input type="date" value={form.dateDepart} onChange={set('dateDepart')} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Date retour *</label>
              <input type="date" value={form.dateRetour} onChange={set('dateRetour')} className="premium-input" required />
            </div>
          </div>

          {/* Niveau confort */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Classe / Confort</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['ECO', 'prixEco'], ['CONFORT', 'prixCont'], ['VIP', 'prixVip']].map(([niveau, key]) => {
              const pkg = packages.find(p => p._id === form.packageKId);
              const prix = pkg?.[key];
              const isSelected = form.niveauConfort === niveau;
              return (
                <button
                  key={niveau}
                  type="button"
                  onClick={() => handleConfortChange(niveau)}
                  style={{
                    padding: '12px 8px',
                    borderRadius: 10,
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    background: isSelected ? 'rgba(0,103,79,0.06)' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontWeight: 800, fontSize: 13, color: isSelected ? 'var(--primary)' : 'var(--text-main)', marginBottom: 4 }}>{niveau}</p>
                  <p style={{ fontSize: 12, color: prix ? (isSelected ? 'var(--primary)' : 'var(--text-muted)') : 'var(--text-muted)', fontWeight: prix ? 600 : 400 }}>
                    {prix ? `${Number(prix).toLocaleString('fr-FR')} FCFA` : '—'}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Financier */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Financier & Statut</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Montant total dû (FCFA) *</label>
              <input type="number" min="0" value={form.montantTotalDu} onChange={set('montantTotalDu')} className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Statut client</label>
              <select value={form.statutClient} onChange={set('statutClient')} className="premium-input">
                {['INSCRIT', 'CONFIRME', 'DESISTE', 'PARTI', 'RENTRE', 'ANNULE'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Notes internes</label>
              <textarea value={form.notes} onChange={set('notes')} className="premium-input" rows={2} placeholder="Remarques, besoins spéciaux..." />
            </div>
          </div>

          {/* Clients */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
            Clients * — {form.clients.length} sélectionné(s)
          </p>
          <input
            value={clientSearch}
            onChange={e => setClientSearch(e.target.value)}
            placeholder="Filtrer les clients..."
            className="premium-input"
            style={{ marginBottom: 4 }}
          />
          <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }}>
            {filteredClients.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: 12 }}>Aucun client trouvé</p>
            ) : filteredClients.map(c => {
              const dejaInscrit = clientsDejaInscrits.has(c._id);
              return (
              <label key={c._id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px',
                borderRadius: 6, cursor: dejaInscrit ? 'not-allowed' : 'pointer', fontSize: 13,
                background: form.clients.includes(c._id) ? 'rgba(0,103,79,0.06)' : dejaInscrit ? '#F9FAFB' : 'transparent',
                opacity: dejaInscrit ? 0.5 : 1,
              }}
                onMouseEnter={e => { if (!form.clients.includes(c._id) && !dejaInscrit) e.currentTarget.style.background = '#F9FAFB'; }}
                onMouseLeave={e => { if (!form.clients.includes(c._id) && !dejaInscrit) e.currentTarget.style.background = 'transparent'; }}>
                <input type="checkbox" checked={form.clients.includes(c._id)} onChange={() => !dejaInscrit && toggleClient(c._id)} disabled={dejaInscrit} />
                <div>
                  <span style={{ fontWeight: 600 }}>{c.nom} {c.prenom}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 8 }}>
                    {c.telephone || ''} {c.numeroPasseport ? `· ${c.numeroPasseport}` : ''}
                  </span>
                  {dejaInscrit && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', borderRadius: 4, padding: '1px 6px' }}>Déjà inscrit</span>}
                </div>
              </label>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Créer l\'inscription'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Supprimer cette inscription ? Tous les paiements et suppléments associés seront aussi supprimés."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
