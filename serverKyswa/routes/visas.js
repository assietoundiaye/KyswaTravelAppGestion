const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Visa = require('../models/Visa');
const Reservation = require('../models/Reservation');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);
router.use(requireRole('commercial', 'oumra', 'secretaire', 'comptable', 'administrateur', 'dg'));

/**
 * GET /api/visas?reservationId=...
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.reservationId) filter.reservationId = req.query.reservationId;
    if (req.query.clientId) filter.clientId = req.query.clientId;
    if (req.query.statut) filter.statut = req.query.statut;

    const visas = await Visa.find(filter)
      .populate('clientId', 'nom prenom numeroPasseport')
      .populate('reservationId', 'numero idReservation statut')
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: visas.length, visas });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/visas
 */
router.post('/',
  [
    body('reservationId').isMongoId().withMessage('reservationId invalide'),
    body('clientId').isMongoId().withMessage('clientId invalide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { reservationId, clientId, notes } = req.body;

      // Vérifier que le client est dans la réservation
      const reservation = await Reservation.findById(reservationId);
      if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });
      if (!reservation.clients.map(c => c.toString()).includes(clientId)) {
        return res.status(400).json({ message: 'Ce client n\'est pas dans cette réservation' });
      }

      // Éviter les doublons
      const existing = await Visa.findOne({ reservationId, clientId });
      if (existing) return res.status(400).json({ message: 'Un dossier visa existe déjà pour ce client dans cette réservation' });

      const visa = await Visa.create({
        reservationId, clientId, notes,
        creeParUtilisateurId: req.user.id,
      });

      return res.status(201).json({ message: 'Dossier visa créé', visa });
    } catch (err) {
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

/**
 * PATCH /api/visas/:id
 * Mettre à jour le statut du visa
 */
router.patch('/:id', async (req, res) => {
  try {
    const { statut, dateEnvoi, dateReception, motifRefus, notes } = req.body;
    const visa = await Visa.findById(req.params.id);
    if (!visa) return res.status(404).json({ message: 'Dossier visa non trouvé' });

    if (statut) visa.statut = statut;
    if (dateEnvoi) visa.dateEnvoi = dateEnvoi;
    if (dateReception) visa.dateReception = dateReception;
    if (motifRefus !== undefined) visa.motifRefus = motifRefus;
    if (notes !== undefined) visa.notes = notes;

    await visa.save();
    return res.status(200).json({ message: 'Dossier visa mis à jour', visa });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
