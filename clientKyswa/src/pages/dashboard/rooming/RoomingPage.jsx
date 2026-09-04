import { useEffect, useState, useMemo } from 'react';
import {
  Hotel, Users, BedDouble, Plus, Search, Filter,
  CheckCircle, AlertCircle, Trash2, Edit3, ArrowRight,
  Printer, Sparkles, RefreshCw, UserCheck, ShieldAlert,
  ChevronRight, Phone, FileText, Check, X, Layers
} from 'lucide-react';
import api from '../../../core/api/axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from '../../../components/Toast';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';

const VILLES = [
  { key: 'Makkah', label: '🕋 Séjour Makkah (La Mecque)', icon: '🕋' },
  { key: 'Medine', label: '🕌 Séjour Médine (Al Madinah)', icon: '🕌' },
];

const TYPES_CHAMBRE = [
  { key: 'Single', label: 'Single (1 lit)', capacite: 1, icon: '🛏️' },
  { key: 'Double', label: 'Double (2 lits)', capacite: 2, icon: '🛏️🛏️' },
  { key: 'Triple', label: 'Triple (3 lits)', capacite: 3, icon: '🛏️🛏️🛏️' },
  { key: 'Quadruple', label: 'Quadruple (4 lits)', capacite: 4, icon: '🛏️🛏️🛏️🛏️' },
  { key: 'Quintuple', label: 'Quintuple (5 lits)', capacite: 5, icon: '🛏️x5' },
];

const GENRES_CHAMBRE = [
  { key: 'HOMMES', label: '👨 Hommes', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  { key: 'FEMMES', label: '👩 Femmes', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { key: 'FAMILLE', label: '👨‍👩‍👧 Famille / Mixte', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
];

export default function RoomingPage() {
  const { user } = useAuth();

  // ── États généraux ──────────────────────────────────────────────────────────
  const [departs, setDeparts] = useState([]);
  const [selectedDepartId, setSelectedDepartId] = useState('');
  const [selectedVille, setSelectedVille] = useState('Makkah');
  const [loading, setLoading] = useState(true);
  const [roomingData, setRoomingData] = useState(null);

  // ── Filtres Pèlerins & Chambres ─────────────────────────────────────────────
  const [searchPelerin, setSearchPelerin] = useState('');
  const [genrePelerinFilter, setGenrePelerinFilter] = useState('ALL'); // 'ALL' | 'HOMME' | 'FEMME'
  const [typePelerinFilter, setTypePelerinFilter] = useState('ALL');

  const [searchChambre, setSearchChambre] = useState('');
  const [genreChambreFilter, setGenreChambreFilter] = useState('ALL'); // 'ALL' | 'HOMMES' | 'FEMMES' | 'FAMILLE'
  const [dispoChambreFilter, setDispoChambreFilter] = useState('ALL'); // 'ALL' | 'DISPO' | 'COMPLET'

  // ── Modales ─────────────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showEditHotelModal, setShowEditHotelModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // ── Formulaires ─────────────────────────────────────────────────────────────
  const [chambreForm, setChambreForm] = useState({
    numeroChambre: '',
    etage: '',
    typeChambre: 'Double',
    genreChambre: 'HOMMES',
    notes: '',
  });

  const [batchForm, setBatchForm] = useState({
    prefixe: '',
    startNumero: 101,
    count: 5,
    etage: '1',
    typeChambre: 'Double',
    genreChambre: 'HOMMES',
  });

  const [hotelFormName, setHotelFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);

  // ── 1. Charger la liste des départs ─────────────────────────────────────────
  const fetchDeparts = async () => {
    try {
      const res = await api.get('/packages');
      const list = res.data.packages || res.data.data || [];
      setDeparts(list);
      if (list.length > 0 && !selectedDepartId) {
        setSelectedDepartId(list[0].id || list[0]._id);
      }
    } catch (e) {
      console.error('Erreur chargement départs:', e);
      toast('Erreur lors du chargement des départs', 'error');
    }
  };

  useEffect(() => {
    fetchDeparts();
  }, []);

  // ── 2. Charger les données de Rooming pour le départ et la ville sélectionnés
  const fetchRooming = async () => {
    if (!selectedDepartId) return;
    setLoading(true);
    try {
      const res = await api.get(`/rooming/depart/${selectedDepartId}`, {
        params: { ville: selectedVille },
      });
      setRoomingData(res.data.data);
      setHotelFormName(res.data.data?.nomHotelActuel || '');
    } catch (e) {
      console.error('Erreur chargement rooming:', e);
      toast('Impossible de charger les données de répartition', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDepartId) {
      fetchRooming();
    }
  }, [selectedDepartId, selectedVille]);

  // ── Actions : Création Chambre ──────────────────────────────────────────────
  const handleCreateChambre = async (e) => {
    e.preventDefault();
    if (!selectedDepartId) {
      return toast('Veuillez sélectionner un voyage / départ avant d’ajouter une chambre', 'error');
    }
    if (!chambreForm.numeroChambre.trim()) {
      return toast('Le numéro de chambre est obligatoire', 'error');
    }
    setSaving(true);
    try {
      await api.post('/rooming/chambres', {
        departId: selectedDepartId,
        ville: selectedVille,
        nomHotel: roomingData?.nomHotelActuel,
        ...chambreForm,
      });
      toast('Chambre créée avec succès');
      setShowAddModal(false);
      setChambreForm({ numeroChambre: '', etage: '', typeChambre: 'Double', genreChambre: 'HOMMES', notes: '' });
      fetchRooming();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBatchModal = () => {
    // Calculer le prochain numéro de chambre disponible
    const existingNums = (roomingData?.chambres || [])
      .map(c => parseInt(String(c.numero_chambre).replace(/\D/g, ''), 10))
      .filter(n => !isNaN(n) && n > 0);

    const nextStart = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 101;

    setBatchForm({
      prefixe: '',
      startNumero: nextStart,
      count: 5,
      etage: '1',
      typeChambre: 'Double',
      genreChambre: 'HOMMES',
    });
    setShowBatchModal(true);
  };

  // ── Actions : Génération en lot ─────────────────────────────────────────────
  const handleBatchCreate = async (e) => {
    e.preventDefault();
    if (!selectedDepartId) {
      return toast('Veuillez sélectionner un voyage / départ avant de générer des chambres', 'error');
    }
    setSaving(true);
    try {
      await api.post('/rooming/chambres/batch', {
        departId: selectedDepartId,
        ville: selectedVille,
        nomHotel: roomingData?.nomHotelActuel,
        ...batchForm,
      });
      toast(`${batchForm.count} chambres générées avec succès !`);
      setShowBatchModal(false);
      fetchRooming();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la génération', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Actions : Suppression Chambre ───────────────────────────────────────────
  const handleDeleteChambre = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/rooming/chambres/${confirmDeleteId}`);
      toast('Chambre supprimée');
      setConfirmDeleteId(null);
      fetchRooming();
    } catch (err) {
      toast('Erreur lors de la suppression', 'error');
    }
  };

  // ── Actions : Affectation Pèlerin ───────────────────────────────────────────
  const handleAssign = async (chambreId, inscriptionId, pelerinGenre, chambreGenre) => {
    // Alerte de genre
    if (chambreGenre !== 'FAMILLE' && pelerinGenre !== chambreGenre.replace(/S$/, '')) {
      const confirmGenre = window.confirm(
        `Attention : Vous essayez de placer un(e) ${pelerinGenre} dans une chambre ${chambreGenre}. Souhaitez-vous continuer ?`
      );
      if (!confirmGenre) return;
    }

    try {
      await api.post('/rooming/assign', { chambreId, inscriptionId });
      toast('Pèlerin assigné avec succès !');
      fetchRooming();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de l’affectation', 'error');
    }
  };

  // ── Actions : Retirer Pèlerin ───────────────────────────────────────────────
  const handleUnassign = async (chambreId, inscriptionId) => {
    try {
      await api.post('/rooming/unassign', { chambreId, inscriptionId });
      toast('Pèlerin retiré de la chambre');
      fetchRooming();
    } catch (err) {
      toast('Erreur lors du retrait', 'error');
    }
  };

  // ── Actions : Répartition Automatique ───────────────────────────────────────
  const handleAutoAssign = async () => {
    if (!window.confirm(`Lancer la répartition automatique pour le séjour à ${selectedVille} ? Les pèlerins seront placés dans les chambres disponibles de même genre.`)) {
      return;
    }
    setAutoAssigning(true);
    try {
      const res = await api.post(`/rooming/depart/${selectedDepartId}/auto-assign`, {
        ville: selectedVille,
      });
      toast(res.data.message || 'Répartition automatique terminée !');
      fetchRooming();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la répartition automatique', 'error');
    } finally {
      setAutoAssigning(false);
    }
  };

  // ── Actions : Mise à jour Hôtel ─────────────────────────────────────────────
  const handleUpdateHotel = async (e) => {
    e.preventDefault();
    if (!hotelFormName.trim()) return;
    setSaving(true);
    try {
      await api.put(`/rooming/depart/${selectedDepartId}/hotel`, {
        ville: selectedVille,
        nomHotel: hotelFormName.trim(),
      });
      toast(`Hôtel ${selectedVille} mis à jour avec succès`);
      setShowEditHotelModal(false);
      fetchRooming();
    } catch (err) {
      toast('Erreur lors de la mise à jour de hôtel', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Filtrage local des pèlerins non placés ──────────────────────────────────
  const filteredPelerins = useMemo(() => {
    if (!roomingData?.pelerinsNonPlaces) return [];
    return roomingData.pelerinsNonPlaces.filter(p => {
      if (genrePelerinFilter !== 'ALL' && p.genre !== genrePelerinFilter) return false;
      if (typePelerinFilter !== 'ALL' && (p.typeChambreSouhaite || '').toLowerCase() !== typePelerinFilter.toLowerCase()) return false;
      if (searchPelerin.trim()) {
        const q = searchPelerin.toLowerCase();
        const full = `${p.nom} ${p.prenom} ${p.telephone} ${p.nPasseport}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [roomingData, genrePelerinFilter, typePelerinFilter, searchPelerin]);

  // ── Filtrage local des chambres ─────────────────────────────────────────────
  const filteredChambres = useMemo(() => {
    if (!roomingData?.chambres) return [];
    return roomingData.chambres.filter(ch => {
      if (genreChambreFilter !== 'ALL' && ch.genre_chambre !== genreChambreFilter) return false;
      const nbOcc = (ch.occupants || []).length;
      const cap = ch.capacite || 2;
      if (dispoChambreFilter === 'DISPO' && nbOcc >= cap) return false;
      if (dispoChambreFilter === 'COMPLET' && nbOcc < cap) return false;
      if (searchChambre.trim()) {
        const q = searchChambre.toLowerCase();
        const num = String(ch.numero_chambre || '').toLowerCase();
        const notes = String(ch.notes || '').toLowerCase();
        if (!num.includes(q) && !notes.includes(q)) return false;
      }
      return true;
    });
  }, [roomingData, genreChambreFilter, dispoChambreFilter, searchChambre]);

  const stats = roomingData?.stats;
  const currentDepart = departs.find(d => (d.id || d._id) === selectedDepartId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── EN-TÊTE DU MODULE ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, #059669, #047857)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
            }}>
              <Hotel size={22} color="white" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
                Rooming &amp; Répartition des Chambres
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>
                Organisation des hébergements Makkah / Médine, gestion des lits et comparatif Hommes / Femmes
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={fetchRooming}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'white', border: '1.5px solid #E5E7EB', borderRadius: 10,
              padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: 'white',
              border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Printer size={15} />
            Exporter Rooming List
          </button>
        </div>
      </div>

      {/* ── BARRE DE SÉLECTION DÉPART & ÉTAPE VILLE ── */}
      <div style={{
        background: 'white', borderRadius: 16, border: '1.5px solid #E5E7EB',
        padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* Choix Départ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 280 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#4B5563', whiteSpace: 'nowrap' }}>
            Voyage / Départ :
          </span>
          <select
            value={selectedDepartId}
            onChange={e => setSelectedDepartId(e.target.value)}
            style={{
              flex: 1, height: 40, border: '1.5px solid #D1D5DB', borderRadius: 8,
              padding: '0 12px', fontSize: 13, fontWeight: 700, color: '#111827',
              background: '#F9FAFB', outline: 'none', cursor: 'pointer',
            }}
          >
            {departs.map(d => (
              <option key={d.id || d._id} value={d.id || d._id}>
                {d.nom_depart || d.nomReference || 'Départ'} {d.date_depart ? `(du ${new Date(d.date_depart).toLocaleDateString('fr-FR')})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Choix Étape Ville */}
        <div style={{ display: 'flex', background: '#F3F4F6', padding: 4, borderRadius: 12, gap: 6 }}>
          {VILLES.map(v => {
            const isSel = selectedVille === v.key;
            return (
              <button
                key={v.key}
                onClick={() => setSelectedVille(v.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 18px', borderRadius: 9, border: 'none',
                  background: isSel ? 'white' : 'transparent',
                  color: isSel ? '#059669' : '#6B7280',
                  fontWeight: isSel ? 800 : 600, fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: isSel ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cartouche Hôtel de l'étape */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Hôtel à {selectedVille}
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>
              {roomingData?.nomHotelActuel || 'Non renseigné'}
            </div>
          </div>
          <button
            onClick={() => setShowEditHotelModal(true)}
            title="Modifier le nom de l'hôtel"
            style={{
              width: 34, height: 34, borderRadius: 8, background: '#EFF6FF',
              border: '1px solid #BFDBFE', color: '#2563EB',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <Edit3 size={15} />
          </button>
        </div>
      </div>

      {/* ── TABLEAU DE BORD : COMPARATIFS HOMMES / FEMMES & TYPES DE CHAMBRES ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>

          {/* KPI 1 : Remplissage Global */}
          <div style={{
            background: 'white', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                  Pèlerins Logés ({selectedVille})
                </p>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#111827', marginTop: 4 }}>
                  {stats.totalPlaces} <span style={{ fontSize: 16, fontWeight: 600, color: '#9CA3AF' }}>/ {stats.totalPelerins}</span>
                </div>
              </div>
              <div style={{
                background: stats.totalNonPlaces === 0 ? '#DCFCE7' : '#FEF3C7',
                color: stats.totalNonPlaces === 0 ? '#166534' : '#92400E',
                borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 800,
              }}>
                {stats.pourcentageRemplissage}%
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ width: '100%', height: 8, background: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${stats.pourcentageRemplissage}%`, height: '100%', background: '#059669', borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6B7280', marginTop: 6 }}>
                <span>{stats.totalNonPlaces} en attente</span>
                <span>{stats.totalLitsRestants} lit(s) libre(s)</span>
              </div>
            </div>
          </div>

          {/* KPI 2 : Comparatif HOMMES 👨 */}
          <div style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            borderRadius: 14, border: '1.5px solid #BFDBFE', padding: 20,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>👨</span>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>
                    Chambres Hommes
                  </p>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#1E3A8A', marginTop: 6 }}>
                  {stats.comparatifGenre.hommes.places} <span style={{ fontSize: 15, fontWeight: 600, color: '#3B82F6' }}>/ {stats.comparatifGenre.hommes.inscrits} placés</span>
                </div>
              </div>
              <span style={{
                background: '#2563EB', color: 'white', borderRadius: 8,
                padding: '3px 8px', fontSize: 11, fontWeight: 800,
              }}>
                {stats.comparatifGenre.hommes.pourcentage}%
              </span>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: '#1E40AF', display: 'flex', justifyContent: 'space-between' }}>
              <span>{stats.comparatifGenre.hommes.restants === 0 ? '✅ Tous les hommes sont placés' : `⚠️ ${stats.comparatifGenre.hommes.restants} homme(s) à placer`}</span>
              <span>{stats.parGenreChambre.HOMMES.chambres} chambre(s)</span>
            </div>
          </div>

          {/* KPI 3 : Comparatif FEMMES 👩 */}
          <div style={{
            background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
            borderRadius: 14, border: '1.5px solid #DDD6FE', padding: 20,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 18 }}>👩</span>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#6B21A8', textTransform: 'uppercase' }}>
                    Chambres Femmes
                  </p>
                </div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#581C87', marginTop: 6 }}>
                  {stats.comparatifGenre.femmes.placees} <span style={{ fontSize: 15, fontWeight: 600, color: '#8B5CF6' }}>/ {stats.comparatifGenre.femmes.inscrites} placées</span>
                </div>
              </div>
              <span style={{
                background: '#7C3AED', color: 'white', borderRadius: 8,
                padding: '3px 8px', fontSize: 11, fontWeight: 800,
              }}>
                {stats.comparatifGenre.femmes.pourcentage}%
              </span>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: '#6B21A8', display: 'flex', justifyContent: 'space-between' }}>
              <span>{stats.comparatifGenre.femmes.restantes === 0 ? '✅ Toutes les femmes sont placées' : `⚠️ ${stats.comparatifGenre.femmes.restantes} femme(s) à placer`}</span>
              <span>{stats.parGenreChambre.FEMMES.chambres} chambre(s)</span>
            </div>
          </div>

          {/* KPI 4 : Répartition par Type de Chambre */}
          <div style={{
            background: 'white', borderRadius: 14, border: '1.5px solid #E5E7EB', padding: 18,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
              Types de Chambres ({selectedVille})
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['Single', 'Double', 'Triple', 'Quadruple'].map(t => {
                const info = stats.parTypeChambre[t] || { chambres: 0, litsOccupes: 0, litsTotal: 0 };
                return (
                  <div key={t} style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 10px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#4B5563' }}>{t}</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#111827', marginTop: 2 }}>
                      {info.litsOccupes} <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>/ {info.litsTotal} lits</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ── ZONE DE TRAVAIL PRINCIPALE EN DEUX COLONNES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── COLONNE GAUCHE : PÈLERINS À PLACER ── */}
        <div style={{
          background: 'white', borderRadius: 16, border: '1.5px solid #E5E7EB',
          padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={18} color="#059669" />
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>
                Pèlerins à placer ({filteredPelerins.length})
              </h2>
            </div>

            {/* Bouton Répartition Auto */}
            <button
              onClick={handleAutoAssign}
              disabled={autoAssigning || filteredPelerins.length === 0}
              title="Pré-remplissage automatique des chambres selon le genre"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                color: 'white', border: 'none', borderRadius: 8,
                padding: '6px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer',
              }}
            >
              <Sparkles size={13} />
              {autoAssigning ? 'En cours…' : 'Auto'}
            </button>
          </div>

          {/* Filtres Genre */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { key: 'ALL', label: 'Tous' },
              { key: 'HOMME', label: '👨 Hommes' },
              { key: 'FEMME', label: '👩 Femmes' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setGenrePelerinFilter(f.key)}
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 8,
                  border: genrePelerinFilter === f.key ? '1.5px solid #059669' : '1px solid #E5E7EB',
                  background: genrePelerinFilter === f.key ? '#DCFCE7' : 'white',
                  color: genrePelerinFilter === f.key ? '#065F46' : '#4B5563',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Recherche pèlerin */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              value={searchPelerin}
              onChange={e => setSearchPelerin(e.target.value)}
              placeholder="Rechercher pèlerin..."
              style={{
                width: '100%', height: 36, paddingLeft: 30, paddingRight: 10,
                border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12,
                background: '#F9FAFB', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Liste des pèlerins non placés */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 540, overflowY: 'auto', paddingRight: 4 }}>
            {filteredPelerins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#9CA3AF', background: '#F9FAFB', borderRadius: 10 }}>
                <CheckCircle size={28} color="#059669" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 700, color: '#065F46', fontSize: 13 }}>
                  Tous les pèlerins de ce filtre sont placés !
                </p>
              </div>
            ) : (
              filteredPelerins.map(p => {
                const isHomme = p.genre === 'HOMME';
                return (
                  <div
                    key={p.inscriptionId}
                    style={{
                      border: '1.5px solid #E5E7EB', borderRadius: 12, padding: 12,
                      background: isHomme ? '#F8FAFC' : '#FAF5FF', display: 'flex', flexDirection: 'column', gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: isHomme ? '#DBEAFE' : '#EDE9FE',
                          color: isHomme ? '#1E40AF' : '#6B21A8',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 12,
                        }}>
                          {(p.prenom?.[0] || '') + (p.nom?.[0] || '')}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>
                            {p.nom} {p.prenom}
                          </div>
                          <div style={{ fontSize: 11, color: '#6B7280' }}>
                            {p.nPasseport ? `Passeport : ${p.nPasseport}` : p.telephone || '—'}
                          </div>
                        </div>
                      </div>

                      <span style={{
                        background: isHomme ? '#EFF6FF' : '#F5F3FF',
                        color: isHomme ? '#2563EB' : '#7C3AED',
                        border: `1px solid ${isHomme ? '#BFDBFE' : '#DDD6FE'}`,
                        borderRadius: 12, padding: '2px 8px', fontSize: 10, fontWeight: 800,
                      }}>
                        {isHomme ? '👨 H' : '👩 F'}
                      </span>
                    </div>

                    {/* Formule souhaitée & Sélecteur d'assignation directe */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingTop: 4, borderTop: '1px solid #F1F5F9' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4 }}>
                        {p.typeChambreSouhaite || 'Double'}
                      </span>

                      {/* Select Chambre pour assigner */}
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const chTarget = (roomingData?.chambres || []).find(c => c.id === e.target.value);
                            handleAssign(e.target.value, p.inscriptionId, p.genre, chTarget?.genre_chambre);
                            e.target.value = '';
                          }
                        }}
                        style={{
                          fontSize: 11, fontWeight: 700, color: '#059669', background: 'white',
                          border: '1.5px solid #059669', borderRadius: 6, padding: '3px 8px', outline: 'none', cursor: 'pointer',
                        }}
                      >
                        <option value="">Placer dans une chambre…</option>
                        {(roomingData?.chambres || [])
                          .filter(ch => (ch.occupants || []).length < (ch.capacite || 2))
                          .map(ch => (
                            <option key={ch.id} value={ch.id}>
                              Ch. {ch.numero_chambre} ({ch.genre_chambre === 'HOMMES' ? '👨' : ch.genre_chambre === 'FEMMES' ? '👩' : '👨‍👩‍👧'} - {(ch.occupants || []).length}/{ch.capacite} lits)
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── COLONNE DROITE : LES CHAMBRES DE L'HÔTEL ── */}
        <div style={{
          background: 'white', borderRadius: 16, border: '1.5px solid #E5E7EB',
          padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* Barre d'outils chambres */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>
                Chambres {selectedVille} ({filteredChambres.length})
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280' }}>
                Hôtel : <strong>{roomingData?.nomHotelActuel}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleOpenBatchModal}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB',
                  borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <Sparkles size={14} color="#D97706" />
                Générer en lot
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg, #059669, #047857)', color: 'white',
                  border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                }}
              >
                <Plus size={16} />
                Ajouter une chambre
              </button>
            </div>
          </div>

          {/* Filtres Chambres */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                value={searchChambre}
                onChange={e => setSearchChambre(e.target.value)}
                placeholder="N° de chambre ou notes..."
                style={{
                  width: '100%', height: 36, paddingLeft: 30, paddingRight: 10,
                  border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12,
                  background: '#F9FAFB', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Filtre Genre Chambre */}
            <select
              value={genreChambreFilter}
              onChange={e => setGenreChambreFilter(e.target.value)}
              style={{
                height: 36, border: '1px solid #E5E7EB', borderRadius: 8,
                padding: '0 10px', fontSize: 12, fontWeight: 700, color: '#374151', background: '#F9FAFB',
              }}
            >
              <option value="ALL">Tous genres</option>
              <option value="HOMMES">👨 Hommes</option>
              <option value="FEMMES">👩 Femmes</option>
              <option value="FAMILLE">👨‍👩‍👧 Famille</option>
            </select>

            {/* Filtre Disponibilité */}
            <select
              value={dispoChambreFilter}
              onChange={e => setDispoChambreFilter(e.target.value)}
              style={{
                height: 36, border: '1px solid #E5E7EB', borderRadius: 8,
                padding: '0 10px', fontSize: 12, fontWeight: 700, color: '#374151', background: '#F9FAFB',
              }}
            >
              <option value="ALL">Toutes les chambres</option>
              <option value="DISPO">Lits libres seulement</option>
              <option value="COMPLET">Complètes seulement</option>
            </select>
          </div>

          {/* Grille des chambres */}
          {filteredChambres.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', background: '#F9FAFB', borderRadius: 12 }}>
              <BedDouble size={36} color="#D1D5DB" style={{ margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontWeight: 700, color: '#6B7280', fontSize: 14 }}>
                Aucune chambre ne correspond aux critères.
              </p>
              <p style={{ margin: '6px 0 16px', color: '#9CA3AF', fontSize: 12 }}>
                Commencez dès maintenant en ajoutant vos chambres pour <strong>{selectedVille}</strong>.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#059669', color: 'white', border: 'none',
                    borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} />
                  Ajouter une chambre
                </button>
                <button
                  type="button"
                  onClick={handleOpenBatchModal}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'white', color: '#374151', border: '1px solid #D1D5DB',
                    borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Layers size={15} />
                  Générer en lot
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {filteredChambres.map(ch => {
                const occupants = ch.occupants || [];
                const cap = ch.capacite || 2;
                const isFull = occupants.length >= cap;
                const genreConfig = GENRES_CHAMBRE.find(g => g.key === ch.genre_chambre) || GENRES_CHAMBRE[0];

                return (
                  <div
                    key={ch.id}
                    style={{
                      border: isFull ? '1.5px solid #E5E7EB' : `2px solid ${genreConfig.color}40`,
                      background: 'white', borderRadius: 14, padding: 16,
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.04)', position: 'relative',
                    }}
                  >
                    <div>
                      {/* Haut de la carte chambre */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, color: '#111827' }}>
                            Ch. {ch.numero_chambre}
                          </span>
                          {ch.etage && (
                            <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 600 }}>
                              (Étage {ch.etage})
                            </span>
                          )}
                        </div>

                        {/* Bouton supprimer */}
                        <button
                          onClick={() => setConfirmDeleteId(ch.id)}
                          title="Supprimer cette chambre"
                          style={{
                            background: 'none', border: 'none', color: '#9CA3AF',
                            cursor: 'pointer', padding: 4, borderRadius: 6,
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                          onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Badges Type & Genre */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <span style={{
                          background: genreConfig.bg, color: genreConfig.color, border: `1px solid ${genreConfig.border}`,
                          borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 800,
                        }}>
                          {genreConfig.label}
                        </span>

                        <span style={{ background: '#F3F4F6', color: '#4B5563', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                          {ch.type_chambre}
                        </span>

                        <span style={{
                          marginLeft: 'auto',
                          background: isFull ? '#DCFCE7' : '#FEF3C7',
                          color: isFull ? '#166534' : '#92400E',
                          borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 800,
                        }}>
                          {occupants.length} / {cap} lits
                        </span>
                      </div>

                      {/* Occupants actuels */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                        {occupants.map((occ, idx) => (
                          <div
                            key={occ.id || idx}
                            style={{
                              background: '#F9FAFB', borderRadius: 8, padding: '6px 10px',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              border: '1px solid #E5E7EB',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                              <span style={{ fontSize: 12 }}>{occ.genre === 'HOMME' ? '👨' : '👩'}</span>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                {occ.nom} {occ.prenom}
                              </span>
                            </div>

                            <button
                              onClick={() => handleUnassign(ch.id, occ.inscription_id)}
                              title="Retirer de la chambre"
                              style={{
                                background: 'none', border: 'none', color: '#EF4444',
                                cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center',
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}

                        {/* Emplacements libres (lits vides) */}
                        {Array.from({ length: Math.max(0, cap - occupants.length) }).map((_, i) => (
                          <div
                            key={`empty-${i}`}
                            style={{
                              border: '1.5px dashed #D1D5DB', borderRadius: 8, padding: '6px 10px',
                              color: '#9CA3AF', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            <span>🛏️</span>
                            <span>Lit disponible</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {ch.notes && (
                      <div style={{ marginTop: 10, fontSize: 11, color: '#6B7280', fontStyle: 'italic', borderTop: '1px solid #F3F4F6', paddingTop: 6 }}>
                        Note : {ch.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── MODALE 1 : AJOUTER UNE CHAMBRE UNIQUE ── */}
      {showAddModal && (
        <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Ajouter une chambre">
          <form onSubmit={handleCreateChambre} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                Numéro de Chambre *
              </label>
              <input
                value={chambreForm.numeroChambre}
                onChange={e => setChambreForm(f => ({ ...f, numeroChambre: e.target.value }))}
                placeholder="Ex: 204"
                required
                style={{ width: '100%', height: 38, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '0 12px', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Étage (optionnel)
                </label>
                <input
                  value={chambreForm.etage}
                  onChange={e => setChambreForm(f => ({ ...f, etage: e.target.value }))}
                  placeholder="Ex: 2"
                  style={{ width: '100%', height: 38, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '0 12px', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Type de Chambre
                </label>
                <select
                  value={chambreForm.typeChambre}
                  onChange={e => setChambreForm(f => ({ ...f, typeChambre: e.target.value }))}
                  style={{ width: '100%', height: 38, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '0 10px', fontSize: 13 }}
                >
                  {TYPES_CHAMBRE.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                Genre de la Chambre
              </label>
              <select
                value={chambreForm.genreChambre}
                onChange={e => setChambreForm(f => ({ ...f, genreChambre: e.target.value }))}
                style={{ width: '100%', height: 38, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '0 10px', fontSize: 13 }}
              >
                {GENRES_CHAMBRE.map(g => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                Notes particulières (optionnel)
              </label>
              <input
                value={chambreForm.notes}
                onChange={e => setChambreForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Ex: Proche ascenseur, Grand lit..."
                style={{ width: '100%', height: 38, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '0 12px', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontWeight: 700, cursor: 'pointer' }}
              >
                {saving ? 'Création…' : 'Créer la chambre'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODALE 2 : GÉNÉRATION EN LOT ── */}
      {showBatchModal && (
        <Modal open={showBatchModal} onClose={() => setShowBatchModal(false)} title="Générer une série de chambres">
          <form onSubmit={handleBatchCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#166534' }}>
              <div>✈️ Voyage : <strong>{currentDepart?.nom_depart || currentDepart?.nomReference || currentDepart?.nom || 'Départ en cours'}</strong></div>
              <div style={{ marginTop: 3, fontSize: 12, color: '#15803D' }}>
                📍 Ville : <strong>{selectedVille}</strong> — Hôtel : <strong>{roomingData?.nomHotelActuel || 'Non renseigné'}</strong>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: '#4B5563' }}>
              Créez rapidement plusieurs chambres numérotées consécutivement pour <strong>{selectedVille}</strong>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Numéro de la 1ère chambre *
                </label>
                <input
                  type="number"
                  value={batchForm.startNumero}
                  onChange={e => setBatchForm(f => ({ ...f, startNumero: e.target.value }))}
                  placeholder="Ex: 101"
                  required
                  style={{ width: '100%', height: 38, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '0 12px', fontSize: 13 }}
                />
                <span style={{ fontSize: 11, color: '#6B7280', marginTop: 2, display: 'block' }}>
                  Ex : 101 → créera 101, 102, 103...
                </span>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Nombre de chambres à créer *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={batchForm.count}
                  onChange={e => setBatchForm(f => ({ ...f, count: e.target.value }))}
                  required
                  style={{ width: '100%', height: 38, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '0 12px', fontSize: 13 }}
                />
                <span style={{ fontSize: 11, color: '#6B7280', marginTop: 2, display: 'block' }}>
                  Quantité consécutive
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Type de Chambre
                </label>
                <select
                  value={batchForm.typeChambre}
                  onChange={e => setBatchForm(f => ({ ...f, typeChambre: e.target.value }))}
                  style={{ width: '100%', height: 38, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '0 10px', fontSize: 13 }}
                >
                  {TYPES_CHAMBRE.map(t => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Genre assigné
                </label>
                <select
                  value={batchForm.genreChambre}
                  onChange={e => setBatchForm(f => ({ ...f, genreChambre: e.target.value }))}
                  style={{ width: '100%', height: 38, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '0 10px', fontSize: 13 }}
                >
                  {GENRES_CHAMBRE.map(g => (
                    <option key={g.key} value={g.key}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontWeight: 700, cursor: 'pointer' }}
              >
                {saving ? 'Génération…' : `Générer ${batchForm.count} chambres`}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODALE 3 : MODIFIER LE NOM DE L'HÔTEL ── */}
      {showEditHotelModal && (
        <Modal open={showEditHotelModal} onClose={() => setShowEditHotelModal(false)} title={`Modifier l'hôtel pour ${selectedVille}`}>
          <form onSubmit={handleUpdateHotel} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                Nom de l&apos;Hôtel *
              </label>
              <input
                value={hotelFormName}
                onChange={e => setHotelFormName(e.target.value)}
                placeholder="Ex: Pullman Zamzam Makkah"
                required
                style={{ width: '100%', height: 38, border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '0 12px', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowEditHotelModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontWeight: 700, cursor: 'pointer' }}
              >
                {saving ? 'Enregistrement…' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODALE 4 : EXPORT & IMPRESSION OFFICIELLE ROOMING LIST ── */}
      {showPrintModal && (
        <Modal open={showPrintModal} onClose={() => setShowPrintModal(false)} title="Export Officiel — Rooming List">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#F9FAFB', padding: 16, borderRadius: 10, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827' }}>
                    KYSWA TRAVEL — ROOMING LIST
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6B7280' }}>
                    Voyage : <strong>{currentDepart?.nom_depart || currentDepart?.nomReference}</strong> • Étape : <strong>{selectedVille}</strong> ({roomingData?.nomHotelActuel})
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#2563EB', color: 'white', border: 'none', borderRadius: 8,
                    padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <Printer size={14} /> Imprimer la liste
                </button>
              </div>
            </div>

            {/* Tableau récapitulatif prêt pour impression */}
            <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F3F4F6', borderBottom: '1.5px solid #D1D5DB' }}>
                    <th style={{ padding: '8px 12px' }}>Chambre</th>
                    <th style={{ padding: '8px 12px' }}>Type</th>
                    <th style={{ padding: '8px 12px' }}>Genre</th>
                    <th style={{ padding: '8px 12px' }}>Pèlerin</th>
                    <th style={{ padding: '8px 12px' }}>Passeport</th>
                    <th style={{ padding: '8px 12px' }}>Téléphone</th>
                  </tr>
                </thead>
                <tbody>
                  {(roomingData?.chambres || []).map(ch => {
                    const occupants = ch.occupants || [];
                    if (occupants.length === 0) {
                      return (
                        <tr key={ch.id} style={{ borderBottom: '1px solid #E5E7EB', color: '#9CA3AF' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 800 }}>Ch. {ch.numero_chambre}</td>
                          <td style={{ padding: '8px 12px' }}>{ch.type_chambre}</td>
                          <td style={{ padding: '8px 12px' }}>{ch.genre_chambre}</td>
                          <td colSpan={3} style={{ padding: '8px 12px', fontStyle: 'italic' }}>Chambre vide (aucun occupant)</td>
                        </tr>
                      );
                    }
                    return occupants.map((occ, idx) => (
                      <tr key={`${ch.id}-${occ.id || idx}`} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        {idx === 0 && (
                          <td rowSpan={occupants.length} style={{ padding: '8px 12px', fontWeight: 800, verticalAlign: 'top', background: '#FAFAFA' }}>
                            Ch. {ch.numero_chambre}
                            {ch.etage && <div style={{ fontSize: 10, color: '#6B7280', fontWeight: 400 }}>Ét. {ch.etage}</div>}
                          </td>
                        )}
                        {idx === 0 && (
                          <td rowSpan={occupants.length} style={{ padding: '8px 12px', verticalAlign: 'top', background: '#FAFAFA' }}>
                            {ch.type_chambre}
                          </td>
                        )}
                        {idx === 0 && (
                          <td rowSpan={occupants.length} style={{ padding: '8px 12px', verticalAlign: 'top', background: '#FAFAFA' }}>
                            {ch.genre_chambre}
                          </td>
                        )}
                        <td style={{ padding: '8px 12px', fontWeight: 700, color: '#111827' }}>
                          {occ.nom} {occ.prenom}
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                          {occ.n_passeport || '—'}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#4B5563' }}>
                          {occ.telephone || '—'}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowPrintModal(false)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── DIALOGUE DE CONFIRMATION SUPPRESSION ── */}
      {confirmDeleteId && (
        <ConfirmDialog
          isOpen={!!confirmDeleteId}
          onClose={() => setConfirmDeleteId(null)}
          onConfirm={handleDeleteChambre}
          title="Supprimer la chambre"
          message="Êtes-vous sûr de vouloir supprimer cette chambre ? Les pèlerins qui y sont affectés seront automatiquement remis dans la liste des pèlerins à placer."
        />
      )}

    </div>
  );
}
