const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { protect, requirePermission } = require('../middleware/auth');
const paiementService = require('../services/paiementService');

router.use(protect);
// Seuls le comptable et le DG peuvent accéder aux paiements
router.use(requirePermission('paiements:read'));

const paiementValidation = [
  body('montant').isFloat({ min: 0.01 }).withMessage('Montant invalide'),
  body('dateReglement').isISO8601().withMessage('Date invalide'),
  body('mode')
    .isIn(['CARTE_BANCAIRE', 'VIREMENT', 'CHEQUE', 'ORANGE_MONEY', 'WAVE', 'MONEY', 'ESPECES', 'AUTRE'])
    .withMessage('Mode invalide'),
  body('reference').optional().trim(),
];

/**
 * POST /api/reservations/:id/paiements
 */
router.post('/reservations/:id/paiements', requirePermission('paiements:create'), paiementValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const paiement = await paiementService.payerReservation(req.params.id, req.body, req.user.id);
    return res.status(201).json({ message: 'Paiement enregistré', paiement });
  } catch (err) {
    console.error('Erreur paiement réservation:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

/**
 * POST /api/billets/:id/paiements
 */
router.post('/billets/:id/paiements', requirePermission('paiements:create'), paiementValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const paiement = await paiementService.payerBillet(req.params.id, req.body, req.user.id);
    return res.status(201).json({ message: 'Paiement enregistré', paiement });
  } catch (err) {
    console.error('Erreur paiement billet:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

/**
 * GET /api/paiements
 */
router.get('/paiements', async (req, res) => {
  try {
    const paiements = await paiementService.listerPaiements();
    return res.status(200).json({ count: paiements.length, paiements });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PATCH /api/paiements/:id
 */
router.patch(
  '/paiements/:id',
  requirePermission('paiements:update'),
  [
    body('montant').optional().isFloat({ min: 0.01 }).withMessage('Montant invalide'),
    body('dateReglement').optional().isISO8601().withMessage('Date invalide'),
    body('mode')
      .optional()
      .isIn(['CARTE_BANCAIRE', 'VIREMENT', 'CHEQUE', 'ORANGE_MONEY', 'WAVE', 'MONEY', 'ESPECES', 'AUTRE'])
      .withMessage('Mode invalide'),
    body('reference').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const paiement = await paiementService.modifierPaiement(req.params.id, req.body);
      return res.status(200).json({ message: 'Paiement modifié', paiement });
    } catch (err) {
      console.error('Erreur modification paiement:', err);
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
      }
      return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
    }
  }
);

/**
 * DELETE /api/paiements/:id
 */
router.delete('/paiements/:id', requirePermission('paiements:delete'), async (req, res) => {
  try {
    await paiementService.supprimerPaiement(req.params.id);
    return res.status(200).json({ message: 'Paiement supprimé' });
  } catch (err) {
    console.error('Erreur suppression paiement:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
