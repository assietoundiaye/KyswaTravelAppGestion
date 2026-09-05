import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Hotel, Users, BedDouble, Plus, Search, Filter,
  CheckCircle, AlertCircle, Trash2, Edit3, ArrowRight,
  Printer, Sparkles, RefreshCw, UserCheck, ShieldAlert,
  ChevronRight, Phone, FileText, Check, X, Layers, Download,
  ChevronDown, Calendar, Plane
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

  const [departs, setDeparts] = useState([]);
  const [selectedDepartId, setSelectedDepartId] = useState('');
  const [departSearchQuery, setDepartSearchQuery] = useState('');
  const [isDepartDropdownOpen, setIsDepartDropdownOpen] = useState(false);
  const departDropdownRef = useRef(null);
  const [selectedVille, setSelectedVille] = useState('Makkah');
  const [loading, setLoading] = useState(true);
  const [roomingData, setRoomingData] = useState(null);

  // Fermer le menu dropdown lors d'un clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (departDropdownRef.current && !departDropdownRef.current.contains(event.target)) {
        setIsDepartDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // ── Actions : Export & Téléchargement PDF (Makkah & Médine - Charte Factures KYSWA) ───
  const handleExportPDF = async () => {
    if (!selectedDepartId) {
      return toast('Veuillez sélectionner un voyage avant d’exporter la Rooming List', 'error');
    }

    try {
      toast('Préparation du document PDF (Makkah & Médine)...', 'info');

      // Récupérer les données pour Makkah ET Médine en parallèle
      const [resMakkah, resMedine] = await Promise.all([
        api.get(`/rooming/depart/${selectedDepartId}`, { params: { ville: 'Makkah' } }).catch(() => null),
        api.get(`/rooming/depart/${selectedDepartId}`, { params: { ville: 'Medine' } }).catch(() => null)
      ]);

      const makkahData = resMakkah?.data?.data || (selectedVille === 'Makkah' ? roomingData : null);
      const medineData = resMedine?.data?.data || (selectedVille === 'Medine' ? roomingData : null);

      const chambresMakkah = makkahData?.chambres || [];
      const chambresMedine = medineData?.chambres || [];

      if (chambresMakkah.length === 0 && chambresMedine.length === 0) {
        return toast('Aucune chambre trouvée pour ce voyage (ni à Makkah, ni à Médine)', 'error');
      }

      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const GREEN = [0, 103, 79];         // #00674F (Vert officiel KYSWA)
      const GRAY_LIGHT = [248, 250, 252]; // #F8FAFC
      const GRAY_BORDER = [229, 231, 235];
      const GRAY_TEXT = [100, 100, 100];
      const BLACK = [30, 30, 30];
      const WHITE = [255, 255, 255];

      const currentDepart = departs.find(d => (d.id || d._id) === selectedDepartId);
      const departNom = currentDepart?.nom_depart || currentDepart?.nomReference || currentDepart?.nom || 'Départ';
      const dDep = currentDepart?.date_depart ? new Date(currentDepart.date_depart).toLocaleDateString('fr-FR') : '—';
      const dRet = currentDepart?.date_retour ? new Date(currentDepart.date_retour).toLocaleDateString('fr-FR') : '—';
      const dateStr = new Date().toLocaleDateString('fr-FR');
      const refNum = `RL-${String(selectedDepartId).replace(/-/g, '').slice(0, 8).toUpperCase()}`;

      // Logo officiel Kyswa (819x304 ratio 2.69 -> w: 27, h: 10 mm)
      const LOGO_B64 = 'data:image/jpeg;base64,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';

      // ── Fonction de rendu d'une étape (Makkah ou Médine) ─────────────────────
      const renderCitySection = (cityKey, cityTitle, data, isFirstSection) => {
        if (!isFirstSection) {
          doc.addPage();
        }

        // 1. Barre supérieure verte
        doc.setFillColor(...GREEN);
        doc.rect(0, 0, W, 2.5, 'F');

        // Logo officiel Kyswa avec proportions respectées (27mm x 10mm)
        try {
          doc.addImage(LOGO_B64, 'JPEG', 10, 5.5, 27, 10);
        } catch (err) {
          console.warn('Logo Kyswa non chargé', err);
        }

        // Raison sociale & Coordonnées agence (charte Factures)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...GREEN);
        doc.text('KYSWA TRAVEL', 41, 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...GRAY_TEXT);
        doc.text('Agence de voyages & Tourisme | Oumra · Hajj · Ziarra', 41, 15);
        doc.text('+221 77 661 71 71  ·  +221 76 160 22 22  ·  Dakar', 41, 19);

        // Bloc Document Officiel & Référence à droite
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...GREEN);
        doc.text('ROOMING LIST OFFICIEL', W - 10, 11.5, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...BLACK);
        doc.text(`N° ${refNum}`, W - 10, 16, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY_TEXT);
        doc.text(`Date : ${dateStr}`, W - 10, 20, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...GREEN);
        doc.text(`ÉTAPE : ${cityKey.toUpperCase()}`, W - 10, 24.5, { align: 'right' });

        // Ligne de séparation verte
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(0.8);
        doc.line(10, 28, W - 10, 28);

        // 2. Blocs d'informations style facture (Voyage & Hébergement)
        let y = 32;
        const blockW = (W - 20 - 6) / 2;
        const block1X = 10;
        const block2X = 10 + blockW + 6;
        const blockH = 24;

        const hotelNom = data?.nomHotelActuel || data?.hotel?.nom || 'Non renseigné';
        const chambres = data?.chambres || [];
        const stats = data?.stats || {};

        // Bloc 1 : Détails du Voyage
        doc.setFillColor(...GRAY_LIGHT);
        doc.rect(block1X, y, blockW, blockH, 'F');
        doc.setDrawColor(...GRAY_BORDER);
        doc.setLineWidth(0.3);
        doc.rect(block1X, y, blockW, blockH, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...GREEN);
        doc.text('DÉTAILS DU VOYAGE', block1X + 4, y + 5.5);
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(0.5);
        doc.line(block1X + 4, y + 7, block1X + 40, y + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...BLACK);
        let vy = y + 12;
        doc.text(`Voyage : ${departNom}`, block1X + 4, vy); vy += 4;
        doc.text(`Service : ${currentDepart?.service || 'Oumra / Hajj'}`, block1X + 4, vy); vy += 4;
        doc.text(`Période : Du ${dDep} au ${dRet}`, block1X + 4, vy);

        // Bloc 2 : Hébergement & Étape
        doc.setFillColor(...GRAY_LIGHT);
        doc.rect(block2X, y, blockW, blockH, 'F');
        doc.setDrawColor(...GRAY_BORDER);
        doc.setLineWidth(0.3);
        doc.rect(block2X, y, blockW, blockH, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...GREEN);
        doc.text('HÉBERGEMENT & ÉTAPE', block2X + 4, y + 5.5);
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(0.5);
        doc.line(block2X + 4, y + 7, block2X + 44, y + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...BLACK);
        let hy = y + 12;
        doc.text(`Étape : ${cityTitle}`, block2X + 4, hy); hy += 4;
        doc.text(`Hôtel : ${hotelNom}`, block2X + 4, hy); hy += 4;
        const totCh = stats.totalChambres || chambres.length;
        const occLits = stats.totalPlacesOccupees || 0;
        const capLits = stats.totalCapaciteLits || 0;
        doc.text(`Total : ${totCh} ch. — ${occLits}/${capLits} lits`, block2X + 4, hy);

        y += blockH + 4;

        // 3. Bandeau récapitulatif (Texte propre sans emojis pour encodage parfait)
        doc.setFillColor(240, 253, 244);
        doc.rect(10, y, W - 20, 8, 'F');
        doc.setDrawColor(187, 247, 208);
        doc.setLineWidth(0.4);
        doc.rect(10, y, W - 20, 8, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(21, 128, 61);

        const hPlaces = stats.comparatifGenre?.hommes?.places || 0;
        const hInscrits = stats.comparatifGenre?.hommes?.inscrits || 0;
        const fPlaces = stats.comparatifGenre?.femmes?.placees || 0;
        const fInscrites = stats.comparatifGenre?.femmes?.inscrites || 0;
        const litsLibres = (stats.totalCapaciteLits || 0) - (stats.totalPlacesOccupees || 0);

        doc.text(
          `RÉCAPITULATIF ${cityKey.toUpperCase()} : Chambres : ${totCh}  |  Lits occupés : ${occLits}/${capLits}  |  Hommes : ${hPlaces}/${hInscrits}  |  Femmes : ${fPlaces}/${fInscrites}  |  Lits libres : ${litsLibres >= 0 ? litsLibres : 0}`,
          W / 2,
          y + 5.2,
          { align: 'center' }
        );

        y += 12;

        // 4. Tableau des chambres et pèlerins
        const tableRows = [];
        if (chambres.length === 0) {
          tableRows.push([
            '—',
            '—',
            '—',
            '— Aucune chambre configurée pour cette étape —',
            '—',
            '—',
            '—',
            '—'
          ]);
        } else {
          chambres.forEach(ch => {
            const occupants = ch.occupants || [];
            const chNum = `Ch. ${ch.numero_chambre}${ch.etage ? ` (Ét. ${ch.etage})` : ''}`;
            const typeStr = ch.type_chambre || 'Double';
            const genreStr = ch.genre_chambre === 'HOMMES' ? 'Hommes' : (ch.genre_chambre === 'FEMMES' ? 'Femmes' : 'Famille');

            if (occupants.length === 0) {
              tableRows.push([
                chNum,
                typeStr,
                genreStr,
                '— Chambre disponible (vide) —',
                '—',
                '—',
                '—',
                `${ch.capacite || 2} lit(s) libre(s)`
              ]);
            } else {
              occupants.forEach((occ, idx) => {
                const isF = (occ.genre === 'FEMME' || occ.genre === 'F');
                const pelerinGenre = isF ? 'F' : 'M';
                tableRows.push([
                  idx === 0 ? chNum : '',
                  idx === 0 ? typeStr : '',
                  idx === 0 ? genreStr : '',
                  `${(occ.nom || '').toUpperCase()} ${occ.prenom || ''}`.trim() || '—',
                  pelerinGenre,
                  occ.n_passeport || '—',
                  occ.telephone || '—',
                  occ.nationalite || occ.ville || 'Sénégalaise'
                ]);
              });
            }
          });
        }

        autoTable(doc, {
          startY: y,
          head: [['N° Chambre', 'Type', 'Genre Chambre', 'Nom & Prénom du Pèlerin', 'Sexe', 'N° Passeport', 'Téléphone', 'Nationalité / Ville']],
          body: tableRows,
          styles: { fontSize: 7.5, cellPadding: 2, textColor: [...BLACK], font: 'helvetica' },
          headStyles: { fillColor: [...GREEN], textColor: 255, fontStyle: 'bold', fontSize: 7.8 },
          alternateRowStyles: { fillColor: [248, 250, 249] },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 23 },
            1: { cellWidth: 19 },
            2: { cellWidth: 22 },
            3: { fontStyle: 'bold', cellWidth: 46 },
            4: { cellWidth: 10, halign: 'center' },
            5: { cellWidth: 26, font: 'courier' },
            6: { cellWidth: 24 },
            7: { cellWidth: 20 },
          },
          margin: { left: 10, right: 10, bottom: 14 }
        });
      };

      // Rendu Étape 1 : Makkah (La Mecque)
      renderCitySection('Makkah', 'Makkah (La Mecque)', makkahData, true);

      // Rendu Étape 2 : Médine (Al Madinah) sur une nouvelle page dédiée
      renderCitySection('Medine', 'Médine (Al Madinah)', medineData, false);

      // ── Pagination et pied de page officiel sur toutes les pages ────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFillColor(...GREEN);
        doc.rect(0, H - 9, W, 9, 'F');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...WHITE);
        doc.text(
          `KYSWA TRAVEL  —  Document officiel d'attribution et de répartition des chambres  —  Page ${i} / ${totalPages}`,
          W / 2,
          H - 3.5,
          { align: 'center' }
        );
      }

      const cleanDepart = departNom.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`Rooming_List_${cleanDepart}_Makkah_Medine.pdf`);
      toast('Rooming List (Makkah & Médine) téléchargée en PDF avec succès !');
    } catch (err) {
      console.error('Erreur export PDF rooming:', err);
      toast('Erreur lors de la génération du PDF', 'error');
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

  // ── Filtrage des départs pour la barre de recherche ────────────────────────
  const filteredDeparts = useMemo(() => {
    if (!departSearchQuery.trim()) return departs;
    const q = departSearchQuery.toLowerCase();
    return departs.filter(d => {
      const nom = (d.nom_depart || d.nomReference || d.nom || '').toLowerCase();
      const service = (d.service || '').toLowerCase();
      const dateDep = d.date_depart ? new Date(d.date_depart).toLocaleDateString('fr-FR') : '';
      return nom.includes(q) || service.includes(q) || dateDep.includes(q);
    });
  }, [departs, departSearchQuery]);

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
            onClick={handleExportPDF}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #059669, #047857)', color: 'white',
              border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
            }}
          >
            <Download size={15} />
            Télécharger PDF
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'white', color: '#1F2937',
              border: '1.5px solid #D1D5DB', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Printer size={15} />
            Aperçu & Impression
          </button>
        </div>
      </div>

      {/* ── BARRE DE SÉLECTION DÉPART & ÉTAPE VILLE ── */}
      <div style={{
        background: 'white', borderRadius: 16, border: '1.5px solid #E5E7EB',
        padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* Recherche / Sélection de Voyage Départ */}
        <div ref={departDropdownRef} style={{ position: 'relative', flex: 1, minWidth: 320, maxWidth: 540 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plane size={15} color="#059669" />
              Voyage / Départ :
            </span>
            {currentDepart && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                background: currentDepart.actif ? '#DCFCE7' : '#F3F4F6',
                color: currentDepart.actif ? '#15803D' : '#4B5563',
                padding: '2px 8px', borderRadius: 6
              }}>
                {currentDepart.actif ? '🟢 En cours' : 'Terminé'}
              </span>
            )}
          </div>

          <div
            onClick={() => setIsDepartDropdownOpen(true)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              border: isDepartDropdownOpen ? '2px solid #059669' : '1.5px solid #D1D5DB',
              borderRadius: 10,
              background: 'white',
              boxShadow: isDepartDropdownOpen ? '0 0 0 3px rgba(5,150,105,0.12)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Search size={16} color={isDepartDropdownOpen ? '#059669' : '#9CA3AF'} style={{ marginLeft: 12, flexShrink: 0 }} />
            
            <input
              type="text"
              value={isDepartDropdownOpen ? departSearchQuery : (currentDepart?.nom_depart || currentDepart?.nomReference || currentDepart?.nom || '')}
              onChange={e => {
                setDepartSearchQuery(e.target.value);
                if (!isDepartDropdownOpen) setIsDepartDropdownOpen(true);
              }}
              onFocus={() => {
                setDepartSearchQuery('');
                setIsDepartDropdownOpen(true);
              }}
              placeholder="Tapez pour rechercher un voyage (ex: Oumra, Mars, 2026)..."
              style={{
                width: '100%',
                height: 40,
                border: 'none',
                outline: 'none',
                padding: '0 10px',
                fontSize: 13,
                fontWeight: 600,
                color: '#111827',
                background: 'transparent',
              }}
            />

            {isDepartDropdownOpen && departSearchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDepartSearchQuery('');
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginRight: 4,
                  color: '#9CA3AF', display: 'flex', alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsDepartDropdownOpen(!isDepartDropdownOpen);
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px',
                color: '#6B7280', display: 'flex', alignItems: 'center'
              }}
            >
              <ChevronDown size={16} style={{ transform: isDepartDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>

          {/* Menu flottant des résultats de recherche */}
          {isDepartDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              background: 'white',
              border: '1.5px solid #E5E7EB',
              borderRadius: 12,
              boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
              maxHeight: 280,
              overflowY: 'auto',
              zIndex: 100,
              padding: 6,
            }}>
              {filteredDeparts.length === 0 ? (
                <div style={{ padding: '16px 12px', textAlign: 'center', color: '#6B7280', fontSize: 13 }}>
                  🔍 Aucun voyage ne correspond à &quot;{departSearchQuery}&quot;
                </div>
              ) : (
                filteredDeparts.map(d => {
                  const dId = d.id || d._id;
                  const isSelected = selectedDepartId === dId;
                  const nom = d.nom_depart || d.nomReference || d.nom || 'Départ';
                  const dateStr = d.date_depart ? new Date(d.date_depart).toLocaleDateString('fr-FR') : null;
                  const dateRet = d.date_retour ? new Date(d.date_retour).toLocaleDateString('fr-FR') : null;

                  return (
                    <div
                      key={dId}
                      onClick={() => {
                        setSelectedDepartId(dId);
                        setIsDepartDropdownOpen(false);
                        setDepartSearchQuery('');
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: isSelected ? '#ECFDF5' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'background 0.15s',
                        marginBottom: 2,
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = '#F9FAFB';
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: isSelected ? '#065F46' : '#111827' }}>
                            {nom}
                          </span>
                          {d.service && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: 4 }}>
                              {d.service}
                            </span>
                          )}
                        </div>
                        {(dateStr || dateRet) && (
                          <div style={{ fontSize: 11, color: '#6B7280' }}>
                            📅 {dateStr ? `Du ${dateStr}` : ''} {dateRet ? `au ${dateRet}` : ''}
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', background: '#059669',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          <Check size={13} color="white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
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
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleExportPDF}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: '#059669', color: 'white', border: 'none', borderRadius: 8,
                      padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    <Download size={14} /> Télécharger PDF
                  </button>
                  <button
                    onClick={() => window.print()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: '#2563EB', color: 'white', border: 'none', borderRadius: 8,
                      padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    <Printer size={14} /> Imprimer
                  </button>
                </div>
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
