const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Relance = require('../models/Relance');
const Desistement = require('../models/Desistement');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);
router.use(requireRole('commercial', 'comptable', 'administrateur', 'dg'));

/**
 * GET /api/recouvrement
 * Inscriptions avec solde impayé à moins d'un mois du départ
 */
router.get('/', async (req, res) => {
  try {
    const unMoisAvant = new Date();
    unMoisAvant.setDate(unMoisAvant.getDate() + 30);

    const reservations = await Reservation.find({
      statut: { $in: ['INSCRIT', 'CONFIRME', 'PARTIEL'] },
      dateDepart: { $lte: unMoisAvant, $gte: new Date() },
    })
      .populate('clients', 'nom prenom telephone email')
      .populate('packageKId', 'nomReference type dateDepart')
      .populate('paiements', 'montant');

    // Filtrer ceux avec un reste > 0
    const impayés = reservations
      .map(r => {
        const totalPaye = (r.paiements || []).reduce((s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0), 0);
        const reste = r.montantTotalDu - totalPaye;
        return { ...r.toObject(), resteAPayer: reste, totalPaye };
      })
      .filter(r => r.resteAPayer > 0);

    // Si comptable, ajouter aussi les remboursements en attente
    let remboursements = [];
    if (['comptable', 'administrateur', 'dg'].includes(req.user.role)) {
      remboursements = await Desistement.find({ statut: 'EN_ATTENTE' })
        .populate('clientId', 'nom prenom telephone')
        .populate('reservationId', 'numero idReservation');
    }

    return res.status(200).json({
      count: impayés.length,
      impayés,
      remboursements,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/recouvrement/relancer
 * Enregistrer une relance téléphonique
 */
router.post('/relancer',
  [
    body('reservationId').isMongoId().withMessage('reservationId invalide'),
    body('clientId').isMongoId().withMessage('clientId invalide'),
    body('resultat').isIn(['JOINT', 'NON_JOINT', 'PROMESSE_PAIEMENT', 'REFUSE']).withMessage('Résultat invalide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { reservationId, clientId, notes, resultat, dateProchaineRelance } = req.body;

      const relance = await Relance.create({
        reservationId, clientId, notes, resultat,
        dateProchaineRelance: dateProchaineRelance || undefined,
        agentId: req.user.id,
      });

      return res.status(201).json({ message: 'Relance enregistrée', relance });
    } catch (err) {
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

/**
 * GET /api/recouvrement/relances/:reservationId
 */
router.get('/relances/:reservationId', async (req, res) => {
  try {
    const relances = await Relance.find({ reservationId: req.params.reservationId })
      .populate('agentId', 'nom prenom')
      .sort({ dateRelance: -1 });
    return res.status(200).json({ relances });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
