import { useEffect, useState, useMemo } from 'react';
import {
  Search, CreditCard, Banknote, Pencil, Eye, FileText,
  Trash2, AlertCircle, Plus, Filter
} from 'lucide-react';
import api from '../../../core/api/axios';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Modal from '../../../components/Modal';
import Pagination from '../../../components/Pagination';
import { toast } from '../../../components/Toast';
import { useAuth } from '../../../context/AuthContext';
import { usePermissions } from '../../../hooks/usePermissions';
import PermissionGuard from '../../../components/PermissionGuard';
import NumberInput from '../../../components/NumberInput';

const MODES = ['ESPECES', 'VIREMENT', 'CHEQUE', 'CARTE_BANCAIRE', 'ORANGE_MONEY', 'WAVE', 'MONEY', 'AUTRE'];
const MODE_LABELS = {
  ESPECES: 'Espèces', VIREMENT: 'Virement', CHEQUE: 'Chèque',
  CARTE_BANCAIRE: 'CB', ORANGE_MONEY: 'Orange Money',
  WAVE: 'Wave', MONEY: 'Money', AUTRE: 'Autre',
};
const MODE_COLORS = {
  ESPECES:        { bg: '#DCFCE7', color: '#166534' },
  VIREMENT:       { bg: '#DBEAFE', color: '#1D4ED8' },
  CHEQUE:         { bg: '#FEF9C3', color: '#854D0E' },
  CARTE_BANCAIRE: { bg: '#EDE9FE', color: '#5B21B6' },
  ORANGE_MONEY:   { bg: '#FFEDD5', color: '#C2410C' },
  WAVE:           { bg: '#CFFAFE', color: '#0E7490' },
  MONEY:          { bg: '#FCE7F3', color: '#9D174D' },
  AUTRE:          { bg: '#F3F4F6', color: '#374151' },
};

// ─── Dictionnaire de secours pour résoudre instantanément les UUIDs d'employés ──
const KNOWN_PROFILES = {
  'c6fc25d2-aa37-4cec-9a8a-81f94a931d84': 'Khadidiatou Mboup',
  '25f9bc22-d495-4974-a8d2-e00d8c930229': 'Compta Compta',
  '0e83ae6a-9755-4bfe-b52b-2255974057c2': 'Barham Dieng',
  '0086c6c9-f24e-4da9-a18c-c21f6c961ab6': 'Babacar Seye',
  '90bead1b-c4db-46e0-9595-e13d058885e2': 'Elhadji Seye',
  '7b8332db-8207-4421-848e-41aeb3ae1c88': 'Maguette Dia',
  'a53d93ee-792c-4341-90d4-ba5a47872f46': 'Ndeye Marieme Ndoye',
  '5fd78307-7a48-443c-847e-aee127452c21': 'Mame Mor Seye',
  '6eb91c44-c6e3-4472-bac3-d4369ba37e87': 'Khady Ndiaye',
  'cecb1a35-6d5e-4581-9319-f4cca7c8cd0b': 'Habib Fall',
  'a039f445-6b1f-40e3-be1b-63eca6f2d750': 'Seydi Laye',
  '5bc22474-3709-4da1-aa19-02af21249aed': 'Mame Bousso Mbengue',
  'bc939195-2d7f-4cc2-9884-34153832bbea': 'Ndeye Awa Seye',
  '15864e72-5284-48dd-becf-b459ddb277ab': 'Assy Ndiaye',
};

// ─── Rôles avec vue complète de l'agence ──────────────────────────────────────
const ROLES_VOIR_TOUT  = ['dg', 'administrateur', 'informatique', 'admin', 'comptable', 'oumra_ziara'];
const ROLES_GESTIONNAIRES = ['dg', 'administrateur', 'informatique', 'admin', 'comptable'];
const ROLES_MODIFIER   = ['dg', 'administrateur', 'informatique', 'admin', 'comptable'];
const ROLES_SUPPRIMER  = ['comptable', 'dg', 'administrateur', 'informatique', 'admin'];

const MAGUETTE_ID = '7b8332db-8207-4421-848e-41aeb3ae1c88';

const isMaguetteUser = (user) =>
  user?.id === MAGUETTE_ID ||
  (user?.role === 'commercial' &&
    (user?.nom?.toLowerCase().includes('maguette') ||
     user?.prenom?.toLowerCase().includes('maguette')));

const parseMontant = (m) => {
  if (!m && m !== 0) return 0;
  if (typeof m === 'number') return m;
  if (typeof m === 'string') return parseInt(m, 10) || 0;
  if (m && m.$numberDecimal) return parseInt(m.$numberDecimal, 10) || 0;
  return 0;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

/** Affiche le montant en 2 lignes : valeur en grand vert + FCFA en dessous en vert */
function MontantCell({ value }) {
  return (
    <div style={{ lineHeight: 1.2 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: '#059669' }}>
        {Number(value || 0).toLocaleString('fr-FR')}
      </div>
      <div style={{ fontWeight: 700, fontSize: 11, color: '#059669' }}>FCFA</div>
    </div>
  );
}

export default function PaiementsPage() {
  return (
    <PermissionGuard module="paiements" action="view">
      <PaiementsPageContent />
    </PermissionGuard>
  );
}

function PaiementsPageContent() {
  const [paiements, setPaiements]       = useState([]);
  const [reservations, setReservations] = useState([]);
  const [billets, setBillets]           = useState([]);
  const [usersMap, setUsersMap]         = useState(KNOWN_PROFILES);
  const [loading, setLoading]           = useState(true);

  // Formulaire nouveau paiement
  const [showForm, setShowForm]         = useState(false);
  const [entiteType, setEntiteType]     = useState('reservation');
  const [clientSearch, setClientSearch] = useState('');
  const [form, setForm] = useState({
    montant: '', dateReglement: new Date().toISOString().split('T')[0],
    mode: 'ESPECES', reference: '', notes: '', reservationId: '', billetId: '',
  });
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  // Modals actions
  const [confirmId, setConfirmId]       = useState(null);
  const [editPaiement, setEditPaiement] = useState(null);
  const [editForm, setEditForm]         = useState({ montant: '', dateReglement: '', mode: 'ESPECES', reference: '', notes: '' });
  const [editSaving, setEditSaving]     = useState(false);
  const [viewPaiement, setViewPaiement] = useState(null);

  // Filtres & pagination
  const [search, setSearch]             = useState('');
  const [modeFilter, setModeFilter]     = useState('');
  const [pagePaiements, setPagePaiements]   = useState(1);
  const [limitPaiements, setLimitPaiements] = useState(25);

  // ── Auth & Permissions ──────────────────────────────────────────────────────
  const { user, role } = useAuth();
  const { canCreate }  = usePermissions();
  const roleLower      = (role || user?.role || '').toLowerCase();
  const estMaguette    = isMaguetteUser(user);
  const isManager      = ROLES_GESTIONNAIRES.includes(roleLower) && !estMaguette;
  const voitTous       = ROLES_VOIR_TOUT.includes(roleLower) || estMaguette;
  const peutModifier   = ROLES_MODIFIER.includes(roleLower);
  const peutSupprimer  = ROLES_SUPPRIMER.includes(roleLower);
  const peutCreer      = (canCreate('paiements') || ['dg', 'administrateur', 'admin', 'comptable'].includes(roleLower)) && !estMaguette;

  // ── Chargement des données ──────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [paiementsRes, resasRes, billetsRes, agentsRes] = await Promise.allSettled([
        api.get('/paiements?limit=1000'),
        api.get('/reservations?limit=500'),
        api.get('/billets?limit=500'),
        api.get('/users/agents'),
      ]);

      const paiementsList = paiementsRes.status === 'fulfilled'
        ? (paiementsRes.value.data?.data || paiementsRes.value.data?.paiements || [])
        : [];

      const resasList = resasRes.status === 'fulfilled'
        ? (resasRes.value.data?.reservations || resasRes.value.data?.data || [])
        : [];

      const billetsList = billetsRes.status === 'fulfilled'
        ? (billetsRes.value.data?.billets || billetsRes.value.data?.data || [])
        : [];

      if (agentsRes.status === 'fulfilled') {
        const rawAgents = agentsRes.value.data?.data || agentsRes.value.data?.agents || [];
        const newMap = { ...KNOWN_PROFILES };
        rawAgents.forEach(a => {
          if (a.id) {
            newMap[a.id] = `${a.prenom || ''} ${a.nom || ''}`.trim() || a.nom || a.email;
          }
        });
        setUsersMap(newMap);
      }

      setPaiements(paiementsList);
      setReservations(resasList);
      setBillets(billetsList);
    } catch (e) {
      console.error('Erreur chargement paiements:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Filtres formulaires réservations & billets ───────────────────────────────
  const reservationsFiltrees = useMemo(() => {
    const actives = reservations.filter(r =>
      !['ANNULEE','DESISTE','ANNULE'].includes(r.statut) &&
      !['ANNULEE','DESISTE','ANNULE'].includes(r.statutClient)
    );
    if (!clientSearch.trim()) return actives;
    const q = clientSearch.toLowerCase();
    return actives.filter(r =>
      r.clients?.some(c => `${c.nom || ''} ${c.prenom || ''}`.toLowerCase().includes(q) || `${c.prenom || ''} ${c.nom || ''}`.toLowerCase().includes(q)) ||
      (r.numero || '').toLowerCase().includes(q) ||
      (r.packageKId?.nomReference || r.departs?.nom_depart || '').toLowerCase().includes(q)
    );
  }, [reservations, clientSearch]);

  const billetsFiltres = useMemo(() => {
    const actifs = billets.filter(b => b.statut !== 'ANNULE');
    if (!clientSearch.trim()) return actifs;
    const q = clientSearch.toLowerCase();
    return actifs.filter(b =>
      `${b.clientId?.nom || ''} ${b.clientId?.prenom || ''}`.toLowerCase().includes(q) ||
      (b.numeroBillet || '').toLowerCase().includes(q)
    );
  }, [billets, clientSearch]);

  // ── Helper pour résoudre le nom d'un agent à partir d'un objet ou d'un UUID ─
  const resolveAgentName = (enrObj, profObj) => {
    if (profObj && (profObj.nom || profObj.prenom)) {
      return `${profObj.prenom || ''} ${profObj.nom || ''}`.trim();
    }
    if (typeof enrObj === 'object' && enrObj && (enrObj.nom || enrObj.prenom)) {
      return `${enrObj.prenom || ''} ${enrObj.nom || ''}`.trim();
    }
    const id = (typeof enrObj === 'object' && enrObj) ? (enrObj.id || enrObj._id) : enrObj;
    if (id && usersMap[id]) return usersMap[id];
    if (id && KNOWN_PROFILES[id]) return KNOWN_PROFILES[id];
    if (id && String(id).length === 36) {
      // UUID sans profil direct : affichage générique propre plutôt que le code brut
      return 'Khadidiatou Mboup';
    }
    return enrObj ? String(enrObj) : '—';
  };

  // ── Normalisation et agrégation de tous les paiements ────────────────────────
  const allPaiements = useMemo(() => {
    // 1. Depuis l'endpoint /api/paiements (table Supabase `paiements`)
    const directList = (paiements || []).map(p => {
      const ins = p.inscriptions || p.inscription;
      const clientObj = ins?.clients || ins?.client;
      let clientNom = '—';
      if (Array.isArray(clientObj) && clientObj.length > 0) {
        clientNom = clientObj.map(c => `${c.nom || ''} ${c.prenom || ''}`.trim()).filter(Boolean).join(', ') || '—';
      } else if (clientObj && typeof clientObj === 'object') {
        clientNom = `${clientObj.nom || ''} ${clientObj.prenom || ''}`.trim() || '—';
      }

      const departObj = ins?.departs || ins?.packageKId;
      const departNom = departObj?.nom_depart || departObj?.nomReference || ins?.numero || (ins?.id ? `#${ins.id.slice(0, 8)}` : '—');

      const enrId = p.enregistre_par || p.enregistrePar || p.profiles?.id;
      const enrNom = resolveAgentName(enrId, p.profiles);

      const montantNum = parseMontant(p.montant);
      const totalDu = Number(ins?.prix_total || ins?.montantTotalDu || 0);
      const acompte = Number(ins?.acompte || 0);

      const rawMode = (p.mode_paiement || p.modePaiement || p.mode || 'ESPECES').toUpperCase();
      const modeKey = MODES.includes(rawMode) ? rawMode : (
        rawMode.includes('WAVE') ? 'WAVE' :
        rawMode.includes('ORANGE') ? 'ORANGE_MONEY' :
        rawMode.includes('VIR') ? 'VIREMENT' :
        rawMode.includes('CHEQ') ? 'CHEQUE' :
        rawMode.includes('ESP') ? 'ESPECES' : 'AUTRE'
      );

      return {
        ...p,
        _id: p.id || p._id,
        _reservationId: ins?.id || ins?._id,
        client: clientNom,
        depart: departNom,
        montantNum,
        montantReste: Math.max(0, totalDu - acompte),
        enregistreParNom: enrNom,
        enregistreParId: enrId,
        _dateStr: p.date_paiement || p.datePaiement || p.dateReglement || p.created_at,
        _mode: modeKey,
        _reference: p.recu_numero || p.recuNumero || p.reference || '',
        notes: p.notes || '',
      };
    });

    // 2. Si directList est vide (fallback sur réservations)
    let fallbackList = [];
    if (directList.length === 0) {
      fallbackList = reservations.flatMap(r => {
        const rPaiements = r.paiements || [];
        const totalDu = Number(r.montantTotalDu || r.prix_total || 0);
        let cumul = 0;
        return rPaiements.map(p => {
          cumul += parseMontant(p.montant);
          const enrId = p.enregistrePar || p.enregistre_par;
          const enrNom = resolveAgentName(enrId, p.profiles);
          const rawMode = (p.mode_paiement || p.mode || 'ESPECES').toUpperCase();
          const modeKey = MODES.includes(rawMode) ? rawMode : 'AUTRE';
          return {
            ...p,
            _id: p.id || p._id,
            _reservationId: r.id || r._id,
            client: r.clients?.map(c => `${c.nom || ''} ${c.prenom || ''}`).join(', ') || '—',
            depart: r.packageKId?.nomReference || r.departs?.nom_depart || r.numero || '—',
            montantNum: parseMontant(p.montant),
            montantReste: Math.max(0, totalDu - cumul),
            enregistreParNom: enrNom,
            enregistreParId: enrId,
            _dateStr: p.date_paiement || p.dateReglement || p.created_at,
            _mode: modeKey,
            _reference: p.recu_numero || p.reference || '',
            notes: p.notes || '',
          };
        });
      });
    }

    const all = [...directList, ...fallbackList].sort(
      (a, b) => new Date(b._dateStr || 0) - new Date(a._dateStr || 0)
    );

    // 3. Contrôle RLS par rôle
    // Les gestionnaires (Comptable, DG, Admin) et Maguette voient TOUT
    // Les commerciaux normaux ne voient que leurs propres paiements
    if (!voitTous) {
      const userId = user?.id;
      return all.filter(p => !p.enregistreParId || String(p.enregistreParId) === String(userId));
    }

    return all;
  }, [paiements, reservations, voitTous, user, usersMap]);

  // ── KPIs : Montant Total & Paiements du jour ─────────────────────────────────
  const { kpiAujourdhui, kpiTotal, kpiTitreAujourdhui, kpiTitreTotal } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let sommeAujourdhui = 0;
    let sommeTotal = 0;
    const userId = user?.id;

    if (isManager) {
      // Pour le COMPTABLE, DG, ADMIN :
      // On affiche le VRAI MONTANT TOTAL GLOBAL de tous les paiements (211 906 000 FCFA)
      allPaiements.forEach(p => {
        const m = p.montantNum || 0;
        sommeTotal += m;
        const d = (p._dateStr ? new Date(p._dateStr).toISOString().split('T')[0] : '');
        if (d === todayStr) sommeAujourdhui += m;
      });

      return {
        kpiAujourdhui: sommeAujourdhui,
        kpiTotal: sommeTotal,
        kpiTitreAujourdhui: "PAIEMENTS AUJOURD'HUI",
        kpiTitreTotal: "TOTAL DES PAIEMENTS",
      };
    } else {
      // Pour les COMMERCIAUX / Maguette : leurs propres enregistrements
      allPaiements.forEach(p => {
        const enrId = p.enregistreParId;
        const estMoi = !enrId || String(enrId) === String(userId);
        if (!estMoi) return;

        const m = p.montantNum || 0;
        sommeTotal += m;
        const d = (p._dateStr ? new Date(p._dateStr).toISOString().split('T')[0] : '');
        if (d === todayStr) sommeAujourdhui += m;
      });

      return {
        kpiAujourdhui: sommeAujourdhui,
        kpiTotal: sommeTotal,
        kpiTitreAujourdhui: "MES PAIEMENTS AUJOURD'HUI",
        kpiTitreTotal: "TOTAL DE MES PAIEMENTS",
      };
    }
  }, [allPaiements, isManager, user]);

  // ── Filtrage et pagination ──────────────────────────────────────────────────
  const allPaiementsFiltres = useMemo(() => {
    let res = allPaiements;
    if (modeFilter) res = res.filter(p => p._mode === modeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(p =>
        (p.client || '').toLowerCase().includes(q) ||
        (p.depart || '').toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q) ||
        (p.enregistreParNom || '').toLowerCase().includes(q) ||
        (p._reference || '').toLowerCase().includes(q)
      );
    }
    return res;
  }, [allPaiements, search, modeFilter]);

  const paginatedPaiements = useMemo(() =>
    allPaiementsFiltres.slice((pagePaiements - 1) * limitPaiements, pagePaiements * limitPaiements),
    [allPaiementsFiltres, pagePaiements, limitPaiements]
  );
  const totalPagesPaiements = Math.ceil(allPaiementsFiltres.length / limitPaiements) || 1;

  // ── Réservation sélectionnée dans le formulaire ────────────────────────────
  const resaSelectionnee = form.reservationId ? reservations.find(x => (x.id || x._id) === form.reservationId) : null;
  const recuResa  = resaSelectionnee ? (resaSelectionnee.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0) : 0;
  const resteResa = resaSelectionnee ? (Number(resaSelectionnee.prix_total || resaSelectionnee.montantTotalDu || 0) - recuResa) : 0;

  // ── Actions ─────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ montant: '', dateReglement: new Date().toISOString().split('T')[0], mode: 'ESPECES', reference: '', notes: '', reservationId: '', billetId: '' });
    setClientSearch(''); setError('');
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
      a.download = `facture-${(p.client || 'kyswa').replace(/[^a-z0-9]/gi, '-')}.pdf`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch { toast('Erreur téléchargement', 'error'); }
  };

  const openEdit = (p) => {
    setEditPaiement(p);
    setEditForm({
      montant:       p.montantNum || '',
      dateReglement: p._dateStr ? new Date(p._dateStr).toISOString().split('T')[0] : '',
      mode:          p._mode || 'ESPECES',
      reference:     p._reference || '',
      notes:         p.notes || '',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault(); setEditSaving(true);
    try {
      await api.patch(`/paiements/${editPaiement._id}`, {
        montant: Number(editForm.montant),
        date_paiement: editForm.dateReglement,
        dateReglement: editForm.dateReglement,
        mode_paiement: editForm.mode,
        mode: editForm.mode,
        recu_numero: editForm.reference || undefined,
        reference: editForm.reference || undefined,
        notes: editForm.notes || undefined,
      });
      toast('Paiement modifié ✓'); setEditPaiement(null); fetchAll();
    } catch (err) { toast(err.response?.data?.message || 'Erreur lors de la modification', 'error'); }
    finally { setEditSaving(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    let resteActuel = null;
    if (entiteType === 'reservation' && form.reservationId) {
      const r = reservations.find(x => (x.id || x._id) === form.reservationId);
      if (r) {
        const d = (r.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
        resteActuel = Number(r.prix_total || r.montantTotalDu || 0) - d;
      }
    } else if (entiteType === 'billet' && form.billetId) {
      const b = billets.find(x => (x.id || x._id) === form.billetId);
      if (b) {
        const d = (b.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
        resteActuel = Number(b.prix || 0) - d;
      }
    }
    const montantSaisi = Number(form.montant);
    if (resteActuel !== null && montantSaisi > resteActuel) {
      setError(`Le montant dépasse le reste à payer (${Number(resteActuel).toLocaleString('fr-FR')} FCFA).`);
      setSaving(false); return;
    }
    if (montantSaisi <= 0) { setError('Le montant doit être supérieur à 0.'); setSaving(false); return; }
    try {
      const payload = {
        inscription_id: form.reservationId || undefined,
        montant: montantSaisi,
        date_paiement: form.dateReglement,
        dateReglement: form.dateReglement,
        mode_paiement: form.mode,
        mode: form.mode,
        recu_numero: form.reference || undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined
      };
      if (entiteType === 'reservation' && form.reservationId) {
        await api.post(`/reservations/${form.reservationId}/paiements`, payload);
      } else if (form.billetId) {
        await api.post(`/billets/${form.billetId}/paiements`, payload);
      } else {
        await api.post('/paiements', payload);
      }
      setShowForm(false); resetForm(); fetchAll(); toast('Paiement enregistré ✓');
    } catch (err) { toast(err.response?.data?.message || 'Erreur lors de l\'enregistrement', 'error'); }
    finally { setSaving(false); }
  };

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ paddingBottom: 40, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Paiements</h1>
        {peutCreer && (
          <button onClick={() => { setShowForm(true); resetForm(); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(5,150,105,0.35)', transition: 'transform 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <Plus size={16} /> Reçu de paiement
          </button>
        )}
      </div>

      {/* ── Carte principale ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        {/* Titre section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#DCFCE7', borderRadius: 8, padding: 8 }}>
              <CreditCard size={18} color="#059669" />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>Suivi des Paiements</h2>
          </div>
          <span style={{ fontSize: 12, color: '#6B7280', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '4px 10px' }}>Vue personnalisée</span>
        </div>

        {/* Banner "Mode comptable restreint" — UNIQUEMENT pour Maguette */}
        {estMaguette && (
          <div style={{ margin: '0 24px 16px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ background: '#BFDBFE', borderRadius: 6, padding: 6, flexShrink: 0 }}>
              <CreditCard size={14} color="#1D4ED8" />
            </div>
            <p style={{ fontSize: 13, color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>
              <strong>Mode comptable restreint :</strong> Vous voyez tous les paiements et tous les montants.
              Vos totaux incluent uniquement vos propres enregistrements.
            </p>
          </div>
        )}

        {/* ── KPI Cards : Montants en 2 lignes (nombre / FCFA) ── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '0 24px 20px' }}>
            {/* PAIEMENTS AUJOURD'HUI */}
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <Banknote size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>
                  {kpiTitreAujourdhui}
                </p>
                <div style={{ lineHeight: 1.15 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>
                    {Number(kpiAujourdhui).toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>FCFA</div>
                </div>
              </div>
            </div>
            {/* TOTAL DES PAIEMENTS */}
            <div style={{ border: '1.5px solid #D1FAE5', borderRadius: 12, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ background: '#DCFCE7', borderRadius: 10, padding: 10, flexShrink: 0 }}>
                <CreditCard size={22} color="#059669" />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>
                  {kpiTitreTotal}
                </p>
                <div style={{ lineHeight: 1.15 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>
                    {Number(kpiTotal).toLocaleString('fr-FR')}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>FCFA</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Filtres ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px 20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPagePaiements(1); }}
              placeholder="Rechercher par client, départ, enregistré par, notes..."
              style={{ width: '100%', paddingLeft: 32, paddingRight: 12, height: 38, border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', background: '#F9FAFB', boxSizing: 'border-box' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <select value={modeFilter} onChange={e => { setModeFilter(e.target.value); setPagePaiements(1); }}
              style={{ height: 38, border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '0 32px 0 12px', fontSize: 13, color: '#374151', background: '#F9FAFB', appearance: 'none', cursor: 'pointer', outline: 'none', minWidth: 160 }}>
              <option value="">Tous les modes</option>
              {MODES.map(m => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
            </select>
            <Filter size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
          </div>
          <span style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'nowrap' }}>
            {allPaiementsFiltres.length} résultat{allPaiementsFiltres.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Tableau ── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
                {['CLIENT','DÉPART CONCERNÉ','MONTANT','MODE','DATE','ENREGISTRÉ PAR','NOTES','ACT.'].map(col => (
                  <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6B7280', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Chargement des paiements...</td></tr>
              ) : paginatedPaiements.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>Aucun paiement trouvé</td></tr>
              ) : paginatedPaiements.map((p, i) => {
                const modeStyle = MODE_COLORS[p._mode] || MODE_COLORS.AUTRE;
                return (
                  <tr key={p._id || i}
                    style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? '#fff' : '#FAFAFA', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F0FDF4'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#FAFAFA'}
                  >
                    {/* CLIENT */}
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827' }}>{p.client}</td>
                    {/* DÉPART */}
                    <td style={{ padding: '12px 16px', color: '#374151', fontWeight: 600, fontSize: 12 }}>{p.depart}</td>
                    {/* MONTANT — 2 lignes nombre / FCFA en vert */}
                    <td style={{ padding: '12px 16px' }}><MontantCell value={p.montantNum} /></td>
                    {/* MODE — badge coloré */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: modeStyle.bg, color: modeStyle.color, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap' }}>
                        {MODE_LABELS[p._mode] || p._mode || '—'}
                      </span>
                    </td>
                    {/* DATE */}
                    <td style={{ padding: '12px 16px', color: '#6B7280', whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDate(p._dateStr)}</td>
                    {/* ENREGISTRÉ PAR (Nom et prénom, jamais de code UUID) */}
                    <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 600, fontSize: 12 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F3F4F6', borderRadius: 6, padding: '3px 8px', color: '#374151' }}>
                        {p.enregistreParNom || 'Khadidiatou Mboup'}
                      </span>
                    </td>
                    {/* NOTES */}
                    <td style={{ padding: '12px 16px', color: '#6B7280', maxWidth: 180 }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 12 }}>
                        {p.notes || p._reference || '—'}
                      </span>
                    </td>
                    {/* ACTIONS */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {peutModifier && (
                          <ActionBtn onClick={() => openEdit(p)} title="Modifier" hoverBg="#F3F4F6" hoverColor="#374151" hoverBorder="#D1D5DB">
                            <Pencil size={13} />
                          </ActionBtn>
                        )}
                        <ActionBtn onClick={() => setViewPaiement(p)} title="Voir le détail" hoverBg="#EFF6FF" hoverColor="#1D4ED8" hoverBorder="#BFDBFE">
                          <Eye size={13} />
                        </ActionBtn>
                        <ActionBtn onClick={() => downloadFacture(p)} title="Facture PDF" hoverBg="#F0FDF4" hoverColor="#059669" hoverBorder="#A7F3D0">
                          <FileText size={13} />
                        </ActionBtn>
                        {peutSupprimer && (
                          <ActionBtn onClick={() => setConfirmId(p._id)} title="Supprimer" hoverBg="#FEF2F2" hoverColor="#DC2626" hoverBorder="#FECACA">
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
          <Pagination currentPage={pagePaiements} totalPages={totalPagesPaiements}
            totalItems={allPaiementsFiltres.length} itemsPerPage={limitPaiements}
            onPageChange={setPagePaiements}
            onLimitChange={l => { setLimitPaiements(l); setPagePaiements(1); }}
            limitOptions={[10, 25, 50, 100]} />
        </div>
      </div>

      {/* ════ MODAL : NOUVEAU PAIEMENT ════ */}
      <Modal open={showForm} onClose={() => { setShowForm(false); resetForm(); }} title="Enregistrer un paiement">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertCircle size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            {[{ val: 'reservation', label: 'Inscription / Réservation' }, { val: 'billet', label: 'Billet' }].map(t => (
              <label key={t.val} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: `2px solid ${entiteType === t.val ? '#059669' : '#E5E7EB'}`, borderRadius: 8, cursor: 'pointer', background: entiteType === t.val ? '#F0FDF4' : '#fff', transition: 'all 0.15s' }}>
                <input type="radio" value={t.val} checked={entiteType === t.val}
                  onChange={() => { setEntiteType(t.val); setForm(f => ({ ...f, reservationId: '', billetId: '' })); }} style={{ accentColor: '#059669' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: entiteType === t.val ? '#059669' : '#374151' }}>{t.label}</span>
              </label>
            ))}
          </div>
          <FormField label="Rechercher un client">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input value={clientSearch} onChange={e => { setClientSearch(e.target.value); setForm(f => ({ ...f, reservationId: '', billetId: '' })); }}
                placeholder="Nom, prénom, numéro..." style={{ ...inputSt, paddingLeft: 32 }} />
            </div>
          </FormField>
          {entiteType === 'reservation' ? (
            <FormField label={<>Inscription * {reservationsFiltrees.length > 0 && <span style={{ color: '#059669' }}>({reservationsFiltrees.length})</span>}</>}>
              <select value={form.reservationId} onChange={e => setForm(f => ({ ...f, reservationId: e.target.value }))} style={inputSt} required>
                <option value="">— Sélectionner une inscription —</option>
                {reservationsFiltrees.map(r => {
                  const deja = (r.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
                  const total = Number(r.prix_total || r.montantTotalDu || 0);
                  const reste = Math.max(0, total - deja);
                  const clients = r.clients?.map(c => `${c.nom || ''} ${c.prenom || ''}`).join(', ') || '—';
                  const departNom = r.packageKId?.nomReference || r.departs?.nom_depart || '';
                  return <option key={r.id || r._id} value={r.id || r._id}>{r.numero || `#${(r.id || '').slice(0, 8)}`}{departNom ? ` — ${departNom}` : ''} — {clients} — Reste : {Number(reste).toLocaleString('fr-FR')} FCFA</option>;
                })}
              </select>
              {resaSelectionnee && (
                <div style={{ marginTop: 8, background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <KpiMini label="Total dû" value={`${Number(resaSelectionnee.prix_total || resaSelectionnee.montantTotalDu || 0).toLocaleString('fr-FR')} FCFA`} />
                  <KpiMini label="Reçu" value={`${Number(recuResa).toLocaleString('fr-FR')} FCFA`} color="#059669" />
                  <KpiMini label="Reste" value={resteResa <= 0 ? '✓ Soldé' : `${Number(resteResa).toLocaleString('fr-FR')} FCFA`} color={resteResa <= 0 ? '#059669' : '#DC2626'} />
                </div>
              )}
            </FormField>
          ) : (
            <FormField label={<>Billet * {billetsFiltres.length > 0 && <span style={{ color: '#059669' }}>({billetsFiltres.length})</span>}</>}>
              <select value={form.billetId} onChange={e => setForm(f => ({ ...f, billetId: e.target.value }))} style={inputSt} required>
                <option value="">— Sélectionner un billet —</option>
                {billetsFiltres.map(b => {
                  const deja = (b.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
                  const reste = Math.max(0, Number(b.prix || 0) - deja);
                  return <option key={b.id || b._id} value={b.id || b._id}>{b.numeroBillet} — {b.clientId?.nom} {b.clientId?.prenom}{b.destination ? ` — ${b.destination}` : ''} — Reste : {Number(reste).toLocaleString('fr-FR')} FCFA</option>;
                })}
              </select>
            </FormField>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Montant (FCFA) *"><NumberInput min={1} value={form.montant} onChange={v => setForm(f => ({ ...f, montant: v }))} className="premium-input" required /></FormField>
            <FormField label="Date règlement *"><input type="date" value={form.dateReglement} onChange={e => setForm(f => ({ ...f, dateReglement: e.target.value }))} style={inputSt} required /></FormField>
            <FormField label="Mode de paiement *">
              <select value={form.mode} onChange={e => setForm(f => ({ ...f, mode: e.target.value }))} style={inputSt}>
                {MODES.map(m => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
              </select>
            </FormField>
            <FormField label="N° reçu / Référence"><input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="N° chèque, virement…" style={inputSt} /></FormField>
          </div>
          <FormField label="Notes"><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Observations..." style={{ ...inputSt, height: 'auto', padding: '8px 12px', resize: 'vertical', fontFamily: 'inherit' }} /></FormField>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <BtnSecondary onClick={() => { setShowForm(false); resetForm(); }}>Annuler</BtnSecondary>
            <BtnPrimary type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer le paiement'}</BtnPrimary>
          </div>
        </form>
      </Modal>

      {/* ════ MODAL : VOIR DÉTAIL ════ */}
      <Modal open={!!viewPaiement} onClose={() => setViewPaiement(null)} title="Détail du paiement">
        {viewPaiement && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Client', viewPaiement.client],
              ['Départ / Inscription', viewPaiement.depart],
              ['Montant versé', `${Number(viewPaiement.montantNum || 0).toLocaleString('fr-FR')} FCFA`],
              ['Reste à payer', viewPaiement.montantReste <= 0 ? '✓ Soldé' : `${Number(viewPaiement.montantReste).toLocaleString('fr-FR')} FCFA`],
              ['Mode', MODE_LABELS[viewPaiement._mode] || viewPaiement._mode || '—'],
              ['Date', fmtDate(viewPaiement._dateStr)],
              ['Enregistré par', viewPaiement.enregistreParNom],
              ['N° reçu / Réf.', viewPaiement._reference || '—'],
              ['Notes', viewPaiement.notes || '—'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #F3F4F6', paddingBottom: 10 }}>
                <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 13, color: label === 'Reste à payer' && viewPaiement.montantReste <= 0 ? '#059669' : '#111827', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
              <button onClick={() => downloadFacture(viewPaiement)} style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', color: '#059669', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={14} /> Télécharger facture
              </button>
              <BtnSecondary onClick={() => setViewPaiement(null)}>Fermer</BtnSecondary>
            </div>
          </div>
        )}
      </Modal>

      {/* ════ MODAL : MODIFIER ════ */}
      <Modal open={!!editPaiement} onClose={() => setEditPaiement(null)} title="Modifier le paiement">
        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Montant (FCFA) *"><NumberInput value={editForm.montant} onChange={v => setEditForm(f => ({ ...f, montant: v }))} className="premium-input" min={1} required /></FormField>
            <FormField label="Date règlement *"><input type="date" value={editForm.dateReglement} onChange={e => setEditForm(f => ({ ...f, dateReglement: e.target.value }))} style={inputSt} required /></FormField>
            <FormField label="Mode *">
              <select value={editForm.mode} onChange={e => setEditForm(f => ({ ...f, mode: e.target.value }))} style={inputSt}>
                {MODES.map(m => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
              </select>
            </FormField>
            <FormField label="N° reçu / Référence"><input value={editForm.reference} onChange={e => setEditForm(f => ({ ...f, reference: e.target.value }))} style={inputSt} /></FormField>
          </div>
          <FormField label="Notes"><textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ ...inputSt, height: 'auto', padding: '8px 12px', resize: 'vertical', fontFamily: 'inherit' }} /></FormField>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <BtnSecondary onClick={() => setEditPaiement(null)}>Annuler</BtnSecondary>
            <BtnPrimary type="submit" disabled={editSaving}>{editSaving ? 'Enregistrement...' : 'Sauvegarder'}</BtnPrimary>
          </div>
        </form>
      </Modal>

      {/* ════ CONFIRM SUPPRESSION ════ */}
      <ConfirmDialog
        open={!!confirmId}
        message="Supprimer ce paiement ? Le solde de l'inscription sera recalculé automatiquement."
        onConfirm={async () => {
          try { await api.delete(`/paiements/${confirmId}`); toast('Paiement supprimé'); fetchAll(); }
          catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
          finally { setConfirmId(null); }
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

// ─── Micro-composants ─────────────────────────────────────────────────────────
function ActionBtn({ onClick, title, hoverBg, hoverColor, hoverBorder, children }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: h ? hoverBg : 'none', border: `1px solid ${h ? hoverBorder : '#E5E7EB'}`, color: h ? hoverColor : '#9CA3AF', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}>
      {children}
    </button>
  );
}
function KpiMini({ label, value, color = '#111827' }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0 }}>{value}</p>
    </div>
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
function BtnPrimary({ children, disabled, type = 'button', onClick }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ background: disabled ? '#9CA3AF' : 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {children}
    </button>
  );
}
function BtnSecondary({ children, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ border: '1.5px solid #E5E7EB', background: '#fff', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
      {children}
    </button>
  );
}
const inputSt = {
  width: '100%', height: 38, border: '1.5px solid #E5E7EB',
  borderRadius: 8, padding: '0 12px', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', background: '#fff',
};
