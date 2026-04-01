const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Desistement = require('../models/Desistement');
const Reservation = require('../models/Reservation');
const Paiement = require('../models/Paiement');
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
      .populate('clientId', 'nom prenom numeroPasseport')
      .populate('reservationId', 'numero idReservation statut')
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
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { reservationId, clientId, motif } = req.body;

      const reservation = await Reservation.findById(reservationId).populate('paiements');
      if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });
      if (reservation.statut === 'DESISTE' || reservation.statut === 'ANNULEE') {
        return res.status(400).json({ message: 'Cette réservation est déjà annulée' });
      }

      // Calculer montant payé
      const montantPaye = (reservation.paiements || []).reduce((s, p) => {
        return s + (p.montant ? parseFloat(p.montant.toString()) : 0);
      }, 0);

      const desistement = await Desistement.create({
        reservationId,
        clientId,
        dateAnnulation: new Date(),
        dateDepart: reservation.dateDepart,
        montantPaye,
        motif,
        creeParUtilisateurId: req.user.id,
      });

      // Mettre à jour statut réservation
      reservation.statut = 'DESISTE';
      await reservation.save();

      return res.status(201).json({
        message: 'Désistement créé',
        desistement,
        tauxRemboursement: desistement.tauxRemboursement,
        montantRembourse: desistement.montantRembourse,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

/**
 * PATCH /api/desistements/:id/rembourser
 */
router.patch('/:id/rembourser', requireRole('comptable', 'administrateur', 'dg'), async (req, res) => {
  try {
    const desistement = await Desistement.findById(req.params.id);
    if (!desistement) return res.status(404).json({ message: 'Désistement non trouvé' });

    desistement.statut = 'REMBOURSE';
    desistement.dateRemboursement = new Date();
    await desistement.save();

    return res.status(200).json({ message: 'Remboursement enregistré', desistement });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
