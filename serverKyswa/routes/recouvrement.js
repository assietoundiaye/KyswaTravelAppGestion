const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const recouvrementService = require('../services/recouvrementService');

router.use(protect);
router.use(requireRole('commercial', 'comptable', 'administrateur', 'dg'));

/**
 * GET /api/recouvrement
 * Impayés prioritaires + remboursements en attente
 */
router.get('/', async (req, res) => {
  try {
    const data = await recouvrementService.getImpayés(req.user.role);
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/recouvrement/relancer
 * Enregistrer une relance téléphonique
 */
router.post(
  '/relancer',
  [
    body('reservationId').isMongoId().withMessage('reservationId invalide'),
    body('clientId').isMongoId().withMessage('clientId invalide'),
    body('resultat')
      .isIn(['JOINT', 'NON_JOINT', 'PROMESSE_PAIEMENT', 'REFUSE'])
      .withMessage('Résultat invalide'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const relance = await recouvrementService.enregistrerRelance(req.body, req.user.id);
      return res.status(201).json({ message: 'Relance enregistrée', relance });
    } catch (err) {
      return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
    }
  }
);

/**
 * GET /api/recouvrement/relances/:reservationId
 */
router.get('/relances/:reservationId', async (req, res) => {
  try {
    const relances = await recouvrementService.getRelances(req.params.reservationId);
    return res.status(200).json({ relances });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
