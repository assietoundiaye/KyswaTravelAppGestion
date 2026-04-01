const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const BilletGroupe = require('../models/BilletGroupe');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);
router.use(requireRole('dg', 'administrateur', 'billets', 'oumra'));

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.packageKId) filter.packageKId = req.query.packageKId;
    if (req.query.statut) filter.statut = req.query.statut;
    const billets = await BilletGroupe.find(filter)
      .populate('packageKId', 'nomReference type dateDepart')
      .sort({ dateDepart: 1 });
    return res.status(200).json({ count: billets.length, billets });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

router.post('/',
  [
    body('packageKId').isMongoId().withMessage('packageKId invalide'),
    body('compagnie').trim().notEmpty().withMessage('Compagnie requise'),
    body('numeroVol').trim().notEmpty().withMessage('Numéro de vol requis'),
    body('dateDepart').isISO8601().withMessage('Date départ invalide'),
    body('dateArrivee').isISO8601().withMessage('Date arrivée invalide'),
    body('villeDepart').trim().notEmpty().withMessage('Ville départ requise'),
    body('villeArrivee').trim().notEmpty().withMessage('Ville arrivée requise'),
    body('nombreSieges').isInt({ min: 1 }).withMessage('Nombre de sièges invalide'),
    body('prixUnitaire').isFloat({ min: 0 }).withMessage('Prix invalide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const billet = await BilletGroupe.create({ ...req.body, creeParUtilisateurId: req.user.id });
      return res.status(201).json({ message: 'Billet groupe créé', billet });
    } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
  }
);

router.patch('/:id', async (req, res) => {
  try {
    const billet = await BilletGroupe.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!billet) return res.status(404).json({ message: 'Billet non trouvé' });
    return res.status(200).json({ message: 'Mis à jour', billet });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

router.delete('/:id', requireRole('administrateur', 'dg'), async (req, res) => {
  try {
    await BilletGroupe.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Supprimé' });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
