const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Desistement = require('../models/Desistement');
const Reservation = require('../models/Reservation');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);
router.use(requireRole('commercial', 'secretaire', 'oumra', 'comptable', 'administrateur', 'dg'));

/**
 * GET /api/desistements
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.reservationId) filter.reservationId = req.query.reservationId;
    if (req.query.statut) filter.statut = req.query.statut;

    const desistements = await Desistement.find(filter)
      .populate('clientId', 'nom prenom numeroPasseport telephone')
      .populate('reservationId', 'numero idReservation statut statutClient montantTotalDu nombrePlaces')
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: desistements.length, desistements });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/desistements
 * Créer un désistement — calcul automatique du remboursement
 */
router.post('/',
  [
    body('reservationId').isMongoId().withMessage('reservationId invalide'),
    body('clientId').isMongoId().withMessage('clientId invalide'),
    body('motif').optional().trim(),
    body('dateDepart').optional().isISO8601().withMessage('dateDepart invalide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { reservationId, clientId, motif, dateDepart } = req.body;

      const reservation = await Reservation.findById(reservationId).populate('paiements');
      if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });
      if (['DESISTE', 'ANNULEE'].includes(reservation.statut)) {
        return res.status(400).json({ message: 'Cette réservation est déjà annulée ou désistée' });
      }

      // Vérifier que le client appartient à la réservation
      const clientIds = reservation.clients.map(c => c.toString());
      if (!clientIds.includes(clientId.toString())) {
        return res.status(400).json({ message: 'Ce client n\'appartient pas à cette réservation' });
      }

      // Utiliser la date de départ fournie ou celle de la réservation
      const dateDepartEffective = dateDepart ? new Date(dateDepart) : reservation.dateDepart;

      // ── Calcul du montant payé par ce client ──────────────────────────────
      // Si plusieurs clients sur la réservation, on divise proportionnellement
      const totalPaye = (reservation.paiements || []).reduce((s, p) => {
        return s + (p.montant ? parseFloat(p.montant.toString()) : 0);
      }, 0);

      const nbClients = reservation.clients.length || 1;
      // Part du client qui se désiste = total payé / nombre de clients
      const montantPayeClient = Math.round(totalPaye / nbClients);

      const desistement = await Desistement.create({
        reservationId,
        clientId,
        dateAnnulation: new Date(),
        dateDepart: dateDepartEffective,
        montantPaye: montantPayeClient,
        motif,
        creeParUtilisateurId: req.user.id,
      });

      // ── Mise à jour des statuts de la réservation ─────────────────────────
      // Si c'est le seul client ou tous se désistent → DESISTE
      // Sinon → on garde INSCRIT mais on note le désistement partiel
      const autresDesistements = await Desistement.countDocuments({
        reservationId,
        statut: { $ne: 'ANNULE' },
      });

      if (autresDesistements >= nbClients) {
        // Tous les clients se sont désistés
        reservation.statut = 'DESISTE';
        reservation.statutClient = 'DESISTE';
      } else if (nbClients === 1) {
        reservation.statut = 'DESISTE';
        reservation.statutClient = 'DESISTE';
      }
      // Sinon on laisse la réservation active pour les autres clients

      await reservation.save();

      return res.status(201).json({
        message: 'Désistement créé',
        desistement,
        tauxRemboursement: desistement.tauxRemboursement,
        montantRembourse: desistement.montantRembourse,
        montantPayeClient,
        nbClients,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

/**
 * PATCH /api/desistements/:id/rembourser
 * Marquer un désistement comme remboursé
 */
router.patch('/:id/rembourser', requireRole('comptable', 'administrateur', 'dg'), async (req, res) => {
  try {
    const desistement = await Desistement.findById(req.params.id);
    if (!desistement) return res.status(404).json({ message: 'Désistement non trouvé' });
    if (desistement.statut === 'REMBOURSE') {
      return res.status(400).json({ message: 'Ce désistement est déjà remboursé' });
    }

    desistement.statut = 'REMBOURSE';
    desistement.dateRemboursement = new Date();
    await desistement.save();

    return res.status(200).json({ message: 'Remboursement enregistré', desistement });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/desistements/:id
 * Corriger la date de départ et recalculer le remboursement
 */
router.patch('/:id', [
  body('dateDepart').optional().isISO8601().withMessage('dateDepart invalide'),
  body('motif').optional().trim(),
], async (req, res) => {
  try {
    console.log('[PATCH desistement] id:', req.params.id, 'body:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const desistement = await Desistement.findById(req.params.id);
    if (!desistement) return res.status(404).json({ message: 'Désistement non trouvé' });
    if (desistement.statut === 'REMBOURSE') {
      return res.status(400).json({ message: 'Impossible de modifier un désistement déjà remboursé' });
    }

    if (req.body.dateDepart) desistement.dateDepart = new Date(req.body.dateDepart);
    if (req.body.motif !== undefined) desistement.motif = req.body.motif;

    // Le hook pre('save') recalcule automatiquement joursAvantDepart, taux et montantRembourse
    await desistement.save();

    return res.status(200).json({
      message: 'Désistement mis à jour',
      desistement,
      joursAvantDepart: desistement.joursAvantDepart,
      tauxRemboursement: desistement.tauxRemboursement,
      montantRembourse: desistement.montantRembourse,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/desistements/:id
 * Supprimer un désistement et remettre la réservation en INSCRIT
 */
router.delete('/:id', async (req, res) => {
  try {
    const desistement = await Desistement.findById(req.params.id);
    if (!desistement) return res.status(404).json({ message: 'Désistement non trouvé' });

    if (desistement.reservationId) {
      const reservation = await Reservation.findById(desistement.reservationId);
      if (reservation && ['DESISTE', 'ANNULEE'].includes(reservation.statut)) {
        reservation.statut = 'INSCRIT';
        reservation.statutClient = 'INSCRIT';
        await reservation.save();
      }
    }

    await Desistement.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Désistement supprimé' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/desistements/:id/recu
 * Générer un reçu PDF de désistement/remboursement
 */
router.get('/:id/recu', async (req, res) => {
  try {
    const desistement = await Desistement.findById(req.params.id)
      .populate('clientId', 'nom prenom telephone numeroPasseport')
      .populate({
        path: 'reservationId',
        populate: { path: 'packageKId', select: 'nomReference type' },
      });

    if (!desistement) return res.status(404).json({ message: 'Désistement non trouvé' });

    const { jsPDF } = require('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    const GREEN = [0, 103, 79];
    const GRAY = [100, 100, 100];
    const BLACK = [30, 30, 30];
    const WHITE = [255, 255, 255];

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
    const fmtMoney = (n) => {
      const num = Number(n) || 0;
      return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
    };

    const c = desistement.clientId || {};
    const r = desistement.reservationId || {};
    const pkg = r.packageKId || {};
    const refNum = `DES-${desistement._id.toString().slice(-6).toUpperCase()}`;

    // Bande verte
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 2, 'F');

    // En-tête
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...GREEN);
    doc.text('KYSWA TRAVEL', 14, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text('Agence de voyages | Oumra · Hajj · Ziarra · Billets', 14, 19);
    doc.text('+221 77 661 71 71  ·  +221 76 160 22 22  ·  +221 77 461 12 52', 14, 23.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(`N° ${refNum}`, W - 14, 14, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(`Date : ${fmtDate(new Date())}`, W - 14, 19, { align: 'right' });

    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.8);
    doc.line(10, 30, W - 10, 30);

    let y = 38;

    // Titre
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...GREEN);
    doc.text('REÇU DE DÉSISTEMENT', W / 2, y, { align: 'center' });
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.5);
    doc.line(55, y + 3, W - 55, y + 3);
    y += 14;

    // Statut badge
    const isRembourse = desistement.statut === 'REMBOURSE';
    doc.setFillColor(...(isRembourse ? [22, 163, 74] : [217, 119, 6]));
    doc.roundedRect(W / 2 - 25, y - 5, 50, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text(isRembourse ? 'REMBOURSÉ' : 'EN ATTENTE DE REMBOURSEMENT', W / 2, y, { align: 'center' });
    y += 12;

    // Blocs CLIENT + RÉSERVATION
    const blockW = (W - 34) / 2;
    const b1X = 14, b2X = 14 + blockW + 6;

    doc.setFillColor(245, 245, 245);
    doc.rect(b1X, y, blockW, 34, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...GREEN);
    doc.text('CLIENT', b1X + 4, y + 6);
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.4);
    doc.line(b1X + 4, y + 7.5, b1X + 20, y + 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    let cy = y + 13;
    doc.text(`${c.nom || '—'} ${c.prenom || ''}`, b1X + 4, cy); cy += 5;
    doc.text(`Tél : ${c.telephone || '—'}`, b1X + 4, cy); cy += 5;
    doc.text(`Passeport : ${c.numeroPasseport || '—'}`, b1X + 4, cy);

    doc.setFillColor(245, 245, 245);
    doc.rect(b2X, y, blockW, 34, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...GREEN);
    doc.text('RÉSERVATION', b2X + 4, y + 6);
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.4);
    doc.line(b2X + 4, y + 7.5, b2X + 28, y + 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    let vy = y + 13;
    doc.text(`Réf : ${r.numero || r.idReservation || '—'}`, b2X + 4, vy); vy += 5;
    doc.text(`Package : ${pkg.nomReference || '—'}`, b2X + 4, vy); vy += 5;
    doc.text(`Départ prévu : ${fmtDate(desistement.dateDepart)}`, b2X + 4, vy);

    y += 42;

    // Détails désistement
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    doc.text('Détails du désistement', 14, y);
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.3);
    doc.line(14, y + 2, 80, y + 2);
    y += 8;

    const details = [
      ['Date d\'annulation', fmtDate(desistement.dateAnnulation)],
      ['Jours avant départ', `${desistement.joursAvantDepart} jour(s)`],
      ['Taux de remboursement', `${desistement.tauxRemboursement}%`],
      ['Motif', desistement.motif || '—'],
    ];

    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY);
      doc.text(label + ' :', 14, y);
      doc.setTextColor(...BLACK);
      doc.setFont('helvetica', 'bold');
      doc.text(value, 80, y);
      y += 6;
    });

    y += 6;

    // Tableau financier
    const rows = [
      ['Montant paye par le client', fmtMoney(desistement.montantPaye)],
      ['Montant a rembourser', fmtMoney(desistement.montantRembourse)],
    ];

    const tW = W - 28;
    const col1W = tW * 0.65;
    const col2W = tW * 0.35;
    const rowH = 8;

    // En-tête
    doc.setFillColor(...GREEN);
    doc.rect(14, y, tW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE);
    doc.text('Désignation', 18, y + 5.5);
    doc.text('Montant', 14 + col1W + col2W - 3, y + 5.5, { align: 'right' });
    y += rowH;

    rows.forEach((row, i) => {
      const isLast = i === rows.length - 1;
      doc.setFillColor(isLast ? (isRembourse ? 240 : 255) : (i % 2 === 0 ? 255 : 248),
                       isLast ? (isRembourse ? 253 : 251) : (i % 2 === 0 ? 255 : 250),
                       isLast ? (isRembourse ? 244 : 235) : (i % 2 === 0 ? 255 : 248));
      doc.rect(14, y, tW, rowH, 'F');
      doc.setFont('helvetica', isLast ? 'bold' : 'normal');
      doc.setFontSize(isLast ? 9.5 : 8.5);
      doc.setTextColor(...(isLast ? GREEN : BLACK));
      doc.text(row[0], 18, y + 5.5);
      doc.text(row[1], 14 + col1W + col2W - 3, y + 5.5, { align: 'right' });
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(14, y + rowH, 14 + tW, y + rowH);
      y += rowH;
    });

    y += 12;

    // Date de remboursement si effectué
    if (isRembourse && desistement.dateRemboursement) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY);
      doc.text(`Remboursement effectué le : ${fmtDate(desistement.dateRemboursement)}`, 14, y);
      y += 10;
    }

    // Zone signatures
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    doc.text('Signature Agence', 14 + blockW / 2, y, { align: 'center' });
    doc.text('Signature Client', b2X + blockW / 2, y, { align: 'center' });
    y += 4;
    doc.setDrawColor(...GRAY);
    doc.setLineWidth(0.3);
    doc.rect(14, y, blockW, 30);
    doc.rect(b2X, y, blockW, 30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`${c.nom || ''} ${c.prenom || ''}`, b2X + blockW / 2, y + 34, { align: 'center' });

    // Pied de page
    const H = doc.internal.pageSize.getHeight();
    doc.setFillColor(...GREEN);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text('Kyswa Travel  —  Ce document tient lieu de reçu officiel', W / 2, H - 4, { align: 'center' });

    const buffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recu-desistement-${refNum}.pdf"`);
    return res.send(buffer);

  } catch (err) {
    console.error('Erreur génération reçu désistement:', err);
    return res.status(500).json({ message: 'Erreur lors de la génération du reçu' });
  }
});

module.exports = router;
