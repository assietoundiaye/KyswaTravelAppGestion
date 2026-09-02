import { useEffect, useState, useMemo } from 'react';
import { Search, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../../../core/api/axios';
import DataTable from '../../../components/DataTable';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Modal from '../../../components/Modal';
import Pagination from '../../../components/Pagination';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../hooks/usePermissions';
import PermissionGuard from '../../../components/PermissionGuard';
import NumberInput from '../../../components/NumberInput';

const MODES = ['ESPECES','VIREMENT','CHEQUE','CARTE_BANCAIRE','ORANGE_MONEY','WAVE','MONEY','AUTRE'];
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
// Gère Decimal128 sérialisé en { $numberDecimal: "..." }, string, ou number
const parseMontant = (m) => {
  if (!m) return 0;
  if (typeof m === 'number') return m;
  if (typeof m === 'string') return parseFloat(m) || 0;
  if (m.$numberDecimal) return parseFloat(m.$numberDecimal) || 0;
  return parseFloat(m.toString()) || 0;
};

export default function PaiementsPage() {
  return (
    <PermissionGuard module="paiements" action="view">
      <PaiementsPageContent />
    </PermissionGuard>
  );
}

function PaiementsPageContent() {
  const [reservations, setReservations] = useState([]);
  const [billets, setBillets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [entiteType, setEntiteType] = useState('reservation');

  // Recherche client dans le formulaire
  const [clientSearch, setClientSearch] = useState('');
  const [form, setForm] = useState({
    montant: '',
    dateReglement: new Date().toISOString().split('T')[0],
    mode: 'ESPECES',
    reference: '',
    reservationId: '',
    billetId: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [editPaiement, setEditPaiement] = useState(null);
  const [editForm, setEditForm] = useState({ montant: '', dateReglement: '', mode: 'ESPECES', reference: '' });
  const [editSaving, setEditSaving] = useState(false);
  const { role } = useAuth();
  const { canDelete: checkCanDelete, canCreate, canUpdate } = usePermissions();
  const canDelete = checkCanDelete('paiements');
  const canCreatePaiement = canCreate('paiements');
  const canEditPaiement = canUpdate('paiements');
  const [searchPaiements, setSearchPaiements] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, b] = await Promise.all([api.get('/reservations'), api.get('/billets')]);
      setReservations(r.data.reservations || []);
      setBillets(b.data.billets || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // Réservations filtrées par recherche client
  const reservationsFiltrees = useMemo(() => {
    const actives = reservations.filter(r =>
      !['ANNULEE', 'DESISTE', 'ANNULE'].includes(r.statut) &&
      !['ANNULEE', 'DESISTE', 'ANNULE'].includes(r.statutClient)
    );
    if (!clientSearch.trim()) return actives;
    const q = clientSearch.toLowerCase();
    return actives.filter(r =>
      r.clients?.some(c =>
        `${c.nom} ${c.prenom}`.toLowerCase().includes(q) ||
        `${c.prenom} ${c.nom}`.toLowerCase().includes(q)
      ) ||
      (r.numero || '').toLowerCase().includes(q) ||
      (r.packageKId?.nomReference || '').toLowerCase().includes(q)
    );
  }, [reservations, clientSearch]);

  // Billets filtrés par recherche client
  const billetsFiltres = useMemo(() => {
    const actifs = billets.filter(b => b.statut !== 'ANNULE');
    if (!clientSearch.trim()) return actifs;
    const q = clientSearch.toLowerCase();
    return actifs.filter(b =>
      `${b.clientId?.nom || ''} ${b.clientId?.prenom || ''}`.toLowerCase().includes(q) ||
      (b.numeroBillet || '').toLowerCase().includes(q)
    );
  }, [billets, clientSearch]);

  const resetForm = () => {
    setForm({ montant: '', dateReglement: new Date().toISOString().split('T')[0], mode: 'ESPECES', reference: '', reservationId: '', billetId: '' });
    setClientSearch('');
    setError('');
  };

  const downloadFacture = async (p) => {
    try {
      const token = localStorage.getItem('token');
      const url = p._reservationId
        ? `/api/factures/reservation/${p._reservationId}`
        : `/api/factures/billet/${p._billetId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast('Erreur génération facture', 'error'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `facture-${p.entite?.replace(/[^a-z0-9]/gi, '-') || 'kyswa'}.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast('Erreur téléchargement', 'error'); }
  };

  const openEdit = (p) => {
    setEditPaiement(p);
    setEditForm({
      montant: p.montantNum || '',
      dateReglement: p.dateReglement ? new Date(p.dateReglement).toISOString().split('T')[0] : '',
      mode: p.mode || 'ESPECES',
      reference: p.reference || '',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await api.patch(`/paiements/${editPaiement._id}`, {
        montant: Number(editForm.montant),
        dateReglement: editForm.dateReglement,
        mode: editForm.mode,
        reference: editForm.reference || undefined,
      });
      toast('Paiement modifié');
      setEditPaiement(null);
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setEditSaving(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');

    // Calcul du reste à payer pour la validation
    let resteActuel = null;
    if (entiteType === 'reservation' && form.reservationId) {
      const r = reservations.find(x => x._id === form.reservationId);
      if (r) {
        const dejaRecu = (r.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
        resteActuel = (r.montantTotalDu || 0) - dejaRecu;
      }
    } else if (entiteType === 'billet' && form.billetId) {
      const b = billets.find(x => x._id === form.billetId);
      if (b) {
        const dejaRecu = (b.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
        resteActuel = (b.prix || 0) - dejaRecu;
      }
    }

    const montantSaisi = Number(form.montant);
    if (resteActuel !== null && montantSaisi > resteActuel) {
      setError(`Le montant saisi (${fmt(montantSaisi)}) dépasse le reste à payer (${fmt(resteActuel)}). Veuillez saisir un montant ≤ ${fmt(resteActuel)}.`);
      setSaving(false);
      return;
    }
    if (montantSaisi <= 0) {
      setError('Le montant doit être supérieur à 0.');
      setSaving(false);
      return;
    }

    try {
      const payload = {
        montant: montantSaisi,
        dateReglement: form.dateReglement,
        mode: form.mode,
        reference: form.reference || undefined,
      };
      if (entiteType === 'reservation') {
        await api.post(`/reservations/${form.reservationId}/paiements`, payload);
      } else {
        await api.post(`/billets/${form.billetId}/paiements`, payload);
      }
      setShowForm(false);
      resetForm();
      fetchAll();
      toast('Paiement enregistré');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally { setSaving(false); }
  };

  // Réservations et billets avec un solde restant (qu'ils aient ou non des paiements)
  const soldesEnAttente = useMemo(() => {
    const lignes = [];
    reservations.forEach(r => {
      if (['ANNULEE', 'DESISTE', 'ANNULE'].includes(r.statut) || ['ANNULEE', 'DESISTE', 'ANNULE'].includes(r.statutClient)) return;
      const totalDu = r.montantTotalDu || 0;
      const totalRecu = (r.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
      const reste = totalDu - totalRecu;
      if (reste > 0) {
        lignes.push({
          _id: r._id,
          type: 'reservation',
          entite: `${r.numero || `#${r.idReservation}`}${r.packageKId?.nomReference ? ` · ${r.packageKId.nomReference}` : ''}`,
          client: r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ') || '—',
          montantTotalDu: totalDu,
          montantTotalRecu: totalRecu,
          montantReste: reste,
          nbPaiements: (r.paiements || []).length,
        });
      }
    });
    billets.forEach(b => {
      if (b.statut === 'ANNULE') return;
      const totalDu = b.prix || 0;
      const totalRecu = (b.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
      const reste = totalDu - totalRecu;
      if (reste > 0) {
        lignes.push({
          _id: b._id,
          type: 'billet',
          entite: `Billet ${b.numeroBillet}`,
          client: `${b.clientId?.nom || ''} ${b.clientId?.prenom || ''}`.trim() || '—',
          montantTotalDu: totalDu,
          montantTotalRecu: totalRecu,
          montantReste: reste,
          nbPaiements: (b.paiements || []).length,
        });
      }
    });
    return lignes.sort((a, b) => b.montantReste - a.montantReste);
  }, [reservations, billets]);

  // Agréger tous les paiements pour le tableau avec reste cumulatif par versement
  const allPaiements = useMemo(() => {
    const fromResa = reservations.flatMap(r => {
      const totalDu = r.montantTotalDu || 0;
      // Trier les paiements par date croissante pour calculer le cumul
      const paiementsTriés = [...(r.paiements || [])].sort(
        (a, b) => new Date(a.dateReglement) - new Date(b.dateReglement)
      );
      let cumul = 0;
      return paiementsTriés.map(p => {
        cumul += parseMontant(p.montant);
        const resteApres = totalDu - cumul;
        return {
          ...p,
          _reservationId: r._id,
          entite: `${r.numero || `#${r.idReservation}`}${r.packageKId?.nomReference ? ` · ${r.packageKId.nomReference}` : ''}`,
          client: r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ') || '—',
          montantNum: parseMontant(p.montant),
          montantTotalDu: totalDu,
          montantReste: resteApres,
        };
      });
    });
    const fromBillets = billets.flatMap(b => {
      const totalDu = b.prix || 0;
      const paiementsTriés = [...(b.paiements || [])].sort(
        (a, b) => new Date(a.dateReglement) - new Date(b.dateReglement)
      );
      let cumul = 0;
      return paiementsTriés.map(p => {
        cumul += parseMontant(p.montant);
        const resteApres = totalDu - cumul;
        return {
          ...p,
          _billetId: b._id,
          entite: `Billet ${b.numeroBillet}`,
          client: `${b.clientId?.nom || ''} ${b.clientId?.prenom || ''}`.trim() || '—',
          montantNum: parseMontant(p.montant),
          montantTotalDu: totalDu,
          montantReste: resteApres,
        };
      });
    });
    return [...fromResa, ...fromBillets].sort((a, b) => new Date(b.dateReglement) - new Date(a.dateReglement));
  }, [reservations, billets]);

  const cols = useMemo(() => [
    { header: 'Date', accessorFn: (p) => fmtDate(p.dateReglement) },
    { header: 'Inscription / Billet', accessorKey: 'entite' },
    { header: 'Client', accessorKey: 'client' },
    { header: 'Mode', accessorKey: 'mode' },
    { header: 'Total dû', accessorKey: 'montantTotalDu', cell: ({ getValue }) => <span style={{ fontWeight: 600, color: '#1D4ED8' }}>{fmt(getValue())}</span> },
    { header: 'Montant versé', accessorKey: 'montantNum', cell: ({ getValue }) => <span style={{ fontWeight: 700, color: '#16A34A' }}>{fmt(getValue())}</span> },
    {
      header: 'Reste à payer', accessorKey: 'montantReste', cell: ({ getValue }) => {
        const v = getValue();
        return <span style={{ fontWeight: 700, color: v <= 0 ? '#16A34A' : '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 3 }}>{v <= 0 ? <><CheckCircle size={12} /> Soldé</> : fmt(v)}</span>;
      }
    },
    {
      header: 'Actions', id: 'actions',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {canEditPaiement && (
            <button onClick={() => openEdit(row.original)}
              style={{ background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6, padding: '3px 10px', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Modifier
            </button>
          )}
          <button onClick={() => downloadFacture(row.original)}
            style={{ background: 'rgba(37,99,235,0.08)', border: 'none', borderRadius: 6, padding: '3px 10px', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Facture
          </button>
          {canDelete && (
            <button onClick={() => setConfirmId(row.original._id)}
              style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '3px 10px', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Supprimer
            </button>
          )}
        </div>
      ),
    },
  ], []);

  // Résumé global
  const { grandTotalDu, grandTotalRecu } = useMemo(() => {
    let du = 0, recu = 0;
    reservations.forEach(r => {
      du += r.montantTotalDu || 0;
      recu += (r.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
    });
    billets.forEach(b => {
      du += b.prix || 0;
      recu += (b.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
    });
    return { grandTotalDu: du, grandTotalRecu: recu };
  }, [reservations, billets]);
  const grandReste = grandTotalDu - grandTotalRecu;

  // Réservation sélectionnée dans le formulaire
  const resaSelectionnee = form.reservationId ? reservations.find(x => x._id === form.reservationId) : null;
  const recuResa = resaSelectionnee ? (resaSelectionnee.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0) : 0;
  const resteResa = resaSelectionnee ? (resaSelectionnee.montantTotalDu || 0) - recuResa : 0;

  // Filtrage de l'historique et des soldes par la barre de recherche
  const allPaiementsFiltres = useMemo(() => {
    if (!searchPaiements.trim()) return allPaiements;
    const q = searchPaiements.toLowerCase();
    return allPaiements.filter(p =>
      (p.client || '').toLowerCase().includes(q) ||
      (p.entite || '').toLowerCase().includes(q) ||
      (p.mode || '').toLowerCase().includes(q) ||
      (p.reference || '').toLowerCase().includes(q)
    );
  }, [allPaiements, searchPaiements]);

  const [pagePaiements, setPagePaiements] = useState(1);
  const [limitPaiements, setLimitPaiements] = useState(25);

  const paginatedPaiements = useMemo(() => {
    return allPaiementsFiltres.slice((pagePaiements - 1) * limitPaiements, pagePaiements * limitPaiements);
  }, [allPaiementsFiltres, pagePaiements, limitPaiements]);

  const totalPagesPaiements = Math.ceil(allPaiementsFiltres.length / limitPaiements) || 1;

  const soldesEnAttenteFiltres = useMemo(() => {
    if (!searchPaiements.trim()) return soldesEnAttente;
    const q = searchPaiements.toLowerCase();
    return soldesEnAttente.filter(l =>
      (l.client || '').toLowerCase().includes(q) ||
      (l.entite || '').toLowerCase().includes(q)
    );
  }, [soldesEnAttente, searchPaiements]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Paiements</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Barre de recherche globale */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              value={searchPaiements}
              onChange={e => setSearchPaiements(e.target.value)}
              placeholder="Rechercher client, inscription, mode..."
              className="premium-input"
              style={{ paddingLeft: 36, width: 300 }}
            />
          </div>
          <button onClick={() => { setShowForm(true); resetForm(); }} className="btn-primary" disabled={!canCreatePaiement}>
            + Ajouter paiement
          </button>
        </div>
      </div>

      {/* Résumé global */}
      {!loading && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', background: 'white', borderRadius: 'var(--radius-lg)', padding: '28px 24px', borderLeft: '4px solid #1D4ED8', border: '1.5px solid #BFDBFE', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Total dû</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#1D4ED8', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{fmt(grandTotalDu)}</p>
          </div>
          <div style={{ flex: '1 1 200px', background: 'white', borderRadius: 'var(--radius-lg)', padding: '28px 24px', borderLeft: '4px solid #0891B2', border: '1.5px solid #BAE6FD', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#0891B2', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Total reçu</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#0891B2', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{fmt(grandTotalRecu)}</p>
          </div>
          <div style={{ flex: '1 1 200px', background: 'white', borderRadius: 'var(--radius-lg)', padding: '28px 24px', borderLeft: `4px solid ${grandReste <= 0 ? '#16A34A' : '#DC2626'}`, border: `1.5px solid ${grandReste <= 0 ? '#BBF7D0' : '#FECACA'}`, boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: grandReste <= 0 ? '#16A34A' : '#DC2626', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Reste à payer</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: grandReste <= 0 ? '#16A34A' : '#DC2626', fontFamily: 'var(--font-display)', lineHeight: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              {grandReste <= 0 ? <><CheckCircle size={20} /> Tout soldé</> : fmt(grandReste)}
            </p>
          </div>
        </div>
      )}
      

      {/* Formulaire ajout paiement */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Nouveau paiement</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Type : réservation ou billet */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value="reservation" checked={entiteType === 'reservation'}
                onChange={() => { setEntiteType('reservation'); setForm(f => ({ ...f, reservationId: '', billetId: '' })); }} />
              Réservation / Inscription
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" value="billet" checked={entiteType === 'billet'}
                onChange={() => { setEntiteType('billet'); setForm(f => ({ ...f, reservationId: '', billetId: '' })); }} />
              Billet
            </label>
          </div>

          {/* Recherche par nom de client */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Search size={12} /> Rechercher un client (nom, prénom, numéro…)
            </label>
            <input
              type="text"
              value={clientSearch}
              onChange={e => {
                setClientSearch(e.target.value);
                setForm(f => ({ ...f, reservationId: '', billetId: '' }));
              }}
              placeholder="Ex: Diallo, Fatou, INS-2026-001…"
              className="premium-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {entiteType === 'reservation' ? (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Réservation * {reservationsFiltrees.length > 0 && <span style={{ color: 'var(--primary)' }}>({reservationsFiltrees.length} trouvée{reservationsFiltrees.length > 1 ? 's' : ''})</span>}
                </label>
                {reservationsFiltrees.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#6B7280', padding: '8px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                    {clientSearch ? 'Aucune réservation trouvée pour cette recherche.' : 'Aucune réservation active.'}
                  </p>
                ) : (
                  <select
                    value={form.reservationId}
                    onChange={e => setForm(f => ({ ...f, reservationId: e.target.value }))}
                    className="premium-input"
                    required
                  >
                    <option value="">— Sélectionner une réservation —</option>
                    {reservationsFiltrees.map(r => {
                      const recu = (r.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
                      const reste = (r.montantTotalDu || 0) - recu;
                      const clients = r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ') || '—';
                      return (
                        <option key={r._id} value={r._id}>
                          {r.numero || `#${r.idReservation}`}
                          {r.packageKId?.nomReference ? ` — ${r.packageKId.nomReference}` : ''}
                          {` — ${clients}`}
                          {` — Reste: ${fmt(reste)}`}
                        </option>
                      );
                    })}
                  </select>
                )}

                {/* Détail de la réservation sélectionnée */}
                {resaSelectionnee && (
                  <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(0,103,79,0.06)', borderRadius: 8, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Clients</p>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{resaSelectionnee.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ') || '—'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Package</p>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{resaSelectionnee.packageKId?.nomReference || '—'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total dû</p>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{fmt(resaSelectionnee.montantTotalDu)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Déjà reçu</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>{fmt(recuResa)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Reste à payer</p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: resteResa <= 0 ? '#16A34A' : '#DC2626' }}>
                        {resteResa <= 0 ? <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={12} /> Soldé</span> : fmt(resteResa)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Billet * {billetsFiltres.length > 0 && <span style={{ color: 'var(--primary)' }}>({billetsFiltres.length} trouvé{billetsFiltres.length > 1 ? 's' : ''})</span>}
                </label>
                {billetsFiltres.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#6B7280', padding: '8px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                    {clientSearch ? 'Aucun billet trouvé pour cette recherche.' : 'Aucun billet actif.'}
                  </p>
                ) : (
                  <select
                    value={form.billetId}
                    onChange={e => setForm(f => ({ ...f, billetId: e.target.value }))}
                    className="premium-input"
                    required
                  >
                    <option value="">— Sélectionner un billet —</option>
                    {billetsFiltres.map(b => {
                      const recu = (b.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
                      const reste = (b.prix || 0) - recu;
                      return (
                        <option key={b._id} value={b._id}>
                          {b.numeroBillet}
                          {` — ${b.clientId?.nom || ''} ${b.clientId?.prenom || ''}`}
                          {b.destination ? ` — ${b.destination}` : ''}
                          {` — Reste: ${fmt(reste)}`}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Montant (FCFA) *
                {(() => {
                  let reste = null;
                  if (entiteType === 'reservation' && form.reservationId) {
                    const r = reservations.find(x => x._id === form.reservationId);
                    if (r) {
                      const dejaRecu = (r.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
                      reste = (r.montantTotalDu || 0) - dejaRecu;
                    }
                  } else if (entiteType === 'billet' && form.billetId) {
                    const b = billets.find(x => x._id === form.billetId);
                    if (b) {
                      const dejaRecu = (b.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
                      reste = (b.prix || 0) - dejaRecu;
                    }
                  }
                  if (reste === null) return null;
                  return <span style={{ color: reste > 0 ? '#DC2626' : '#16A34A', fontWeight: 700, marginLeft: 8 }}>max : {fmt(reste)}</span>;
                })()}
              </label>
              <NumberInput
                min={1}
                value={form.montant}
                onChange={v => setForm(f => ({ ...f, montant: v }))}
                className="premium-input"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date règlement *</label>
              <input
                type="date"
                value={form.dateReglement}
                onChange={e => setForm(f => ({ ...f, dateReglement: e.target.value }))}
                className="premium-input"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mode *</label>
              <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))} className="premium-input">
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Référence</label>
              <input
                value={form.reference}
                onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                className="premium-input"
                placeholder="N° chèque, virement…"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-secondary">
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Soldes en attente — clients avec reste à payer */}
      {!loading && soldesEnAttenteFiltres.length > 0 && (
        <div className="premium-card">
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#DC2626', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={15} /> Soldes en attente ({soldesEnAttenteFiltres.length})
              </h2>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>
                Réservations et billets avec un reste à payer
              </p>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#DC2626' }}>
              Total restant : {fmt(soldesEnAttenteFiltres.reduce((s, l) => s + l.montantReste, 0))}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#FEF2F2' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#991B1B', fontSize: 11, textTransform: 'uppercase' }}>Inscription / Billet</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#991B1B', fontSize: 11, textTransform: 'uppercase' }}>Client</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#991B1B', fontSize: 11, textTransform: 'uppercase' }}>Total dû</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#991B1B', fontSize: 11, textTransform: 'uppercase' }}>Déjà reçu</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#991B1B', fontSize: 11, textTransform: 'uppercase' }}>Reste à payer</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#991B1B', fontSize: 11, textTransform: 'uppercase' }}>Versements</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#991B1B', fontSize: 11, textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {soldesEnAttenteFiltres.map((l, i) => (
                  <tr key={l._id} style={{ borderBottom: '1px solid #FEE2E2', background: i % 2 === 0 ? '#fff' : '#FFF7F7' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{l.entite}</td>
                    <td style={{ padding: '10px 14px' }}>{l.client}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#1D4ED8', fontWeight: 600 }}>{fmt(l.montantTotalDu)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#16A34A', fontWeight: 600 }}>{fmt(l.montantTotalRecu)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#DC2626', fontWeight: 800 }}>{fmt(l.montantReste)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#6B7280' }}>
                      {l.nbPaiements === 0
                        ? <span style={{ color: '#DC2626', fontWeight: 600 }}>Aucun</span>
                        : <span style={{ color: '#D97706', fontWeight: 600 }}>{l.nbPaiements} versement{l.nbPaiements > 1 ? 's' : ''}</span>
                      }
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setEntiteType(l.type);
                          setClientSearch(l.client);
                          setForm(f => ({
                            ...f,
                            reservationId: l.type === 'reservation' ? l._id : '',
                            billetId: l.type === 'billet' ? l._id : '',
                          }));
                          setShowForm(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        + Payer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Historique de tous les paiements */}
      <div className="premium-card">
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
            Historique des paiements
            {searchPaiements && (
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                — {allPaiementsFiltres.length} résultat(s)
              </span>
            )}
          </h2>
        </div>
        <DataTable columns={cols} data={paginatedPaiements} loading={loading} />
        <Pagination
          currentPage={pagePaiements}
          totalPages={totalPagesPaiements}
          totalItems={allPaiementsFiltres.length}
          itemsPerPage={limitPaiements}
          onPageChange={setPagePaiements}
          onLimitChange={(l) => { setLimitPaiements(l); setPagePaiements(1); }}
          limitOptions={[10, 25, 50, 100]}
        />
      </div>

      <ConfirmDialog
        open={!!confirmId}
        message="Supprimer ce paiement ? Le reste à payer sera recalculé."
        onConfirm={async () => {
          try {
            await api.delete(`/paiements/${confirmId}`);
            toast('Paiement supprimé');
            fetchAll();
          } catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
          finally { setConfirmId(null); }
        }}
        onCancel={() => setConfirmId(null)}
      />

      {/* Modal modification paiement */}
      <Modal open={!!editPaiement} onClose={() => setEditPaiement(null)} title="Modifier le paiement">
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Montant (FCFA) *</label>
              <NumberInput value={editForm.montant}
                onChange={v => setEditForm(f => ({ ...f, montant: v }))}
                className="premium-input" min={1} required />
            </div>
            <div>
              <label className="input-label">Date règlement *</label>
              <input type="date" value={editForm.dateReglement}
                onChange={e => setEditForm(f => ({ ...f, dateReglement: e.target.value }))}
                className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Mode *</label>
              <select value={editForm.mode} onChange={e => setEditForm(f => ({ ...f, mode: e.target.value }))} className="premium-input">
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Référence</label>
              <input value={editForm.reference} onChange={e => setEditForm(f => ({ ...f, reference: e.target.value }))} className="premium-input" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditPaiement(null)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={editSaving} className="btn-primary">
              {editSaving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
