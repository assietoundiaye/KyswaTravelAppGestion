const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const reunionService = require('../services/reunionService');

router.use(protect);
router.use(requireRole('commercial', 'secretaire', 'oumra', 'billets', 'administrateur', 'dg'));

/**
 * GET /api/reunions
 */
router.get('/', async (req, res) => {
  try {
    const reunions = await reunionService.listerReunions(req.query);
    return res.status(200).json({ count: reunions.length, reunions });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/reunions
 */
router.post(
  '/',
  [
    body('packageKId').isMongoId().withMessage('packageKId invalide'),
    body('titre').trim().notEmpty().withMessage('Le titre est requis'),
    body('dateReunion').isISO8601().withMessage('Date invalide'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const reunion = await reunionService.creerReunion(req.body, req.user.id);
      return res.status(201).json({ message: 'Réunion créée', reunion });
    } catch (err) {
      return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
    }
  }
);

/**
 * PATCH /api/reunions/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const reunion = await reunionService.modifierReunion(req.params.id, req.body);
    return res.status(200).json({ message: 'Réunion mise à jour', reunion });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

/**
 * DELETE /api/reunions/:id
 */
router.delete('/:id', requireRole('dg', 'administrateur'), async (req, res) => {
  try {
    await reunionService.supprimerReunion(req.params.id);
    return res.status(200).json({ message: 'Réunion supprimée' });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
