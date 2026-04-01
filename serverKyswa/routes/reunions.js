const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Reunion = require('../models/Reunion');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);
router.use(requireRole('commercial', 'secretaire', 'oumra', 'billets', 'administrateur', 'dg'));

/**
 * GET /api/reunions
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.packageKId) filter.packageKId = req.query.packageKId;
    if (req.query.statut) filter.statut = req.query.statut;

    const reunions = await Reunion.find(filter)
      .populate('packageKId', 'nomReference type dateDepart')
      .populate('participants', 'nom prenom telephone')
      .sort({ dateReunion: 1 });

    return res.status(200).json({ count: reunions.length, reunions });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/reunions
 */
router.post('/',
  [
    body('packageKId').isMongoId().withMessage('packageKId invalide'),
    body('titre').trim().notEmpty().withMessage('Le titre est requis'),
    body('dateReunion').isISO8601().withMessage('Date invalide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { packageKId, titre, dateReunion, lieu, ordreJour, participants } = req.body;

      const reunion = await Reunion.create({
        packageKId, titre, dateReunion, lieu, ordreJour,
        participants: participants || [],
        creeParUtilisateurId: req.user.id,
      });

      return res.status(201).json({ message: 'Réunion créée', reunion });
    } catch (err) {
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

/**
 * PATCH /api/reunions/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const { titre, dateReunion, lieu, ordreJour, participants, statut, compteRendu } = req.body;
    const reunion = await Reunion.findById(req.params.id);
    if (!reunion) return res.status(404).json({ message: 'Réunion non trouvée' });

    if (titre) reunion.titre = titre;
    if (dateReunion) reunion.dateReunion = dateReunion;
    if (lieu !== undefined) reunion.lieu = lieu;
    if (ordreJour !== undefined) reunion.ordreJour = ordreJour;
    if (participants) reunion.participants = participants;
    if (statut) reunion.statut = statut;
    if (compteRendu !== undefined) reunion.compteRendu = compteRendu;

    await reunion.save();
    return res.status(200).json({ message: 'Réunion mise à jour', reunion });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/reunions/:id
 */
router.delete('/:id', requireRole('dg', 'administrateur'), async (req, res) => {
  try {
    await Reunion.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Réunion supprimée' });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
