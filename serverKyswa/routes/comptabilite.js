const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Depense = require('../models/Depense');
const Paiement = require('../models/Paiement');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);
router.use(requireRole('comptable', 'administrateur', 'dg'));

/**
 * GET /api/comptabilite/depenses
 */
router.get('/depenses', async (req, res) => {
  try {
    const filter = {};
    if (req.query.categorie) filter.categorie = req.query.categorie;
    if (req.query.mois) {
      const d = new Date(req.query.mois);
      filter.dateDepense = {
        $gte: new Date(d.getFullYear(), d.getMonth(), 1),
        $lt: new Date(d.getFullYear(), d.getMonth() + 1, 1),
      };
    }
    const depenses = await Depense.find(filter).sort({ dateDepense: -1 });
    const total = depenses.reduce((s, d) => s + d.montant, 0);
    return res.status(200).json({ count: depenses.length, total, depenses });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

/**
 * POST /api/comptabilite/depenses
 */
router.post('/depenses',
  [
    body('categorie').isIn(['LOYER','SALAIRES','FOURNITURES','TRANSPORT','COMMUNICATION','MARKETING','TAXES','AUTRE']).withMessage('Catégorie invalide'),
    body('montant').isFloat({ min: 0 }).withMessage('Montant invalide'),
    body('dateDepense').isISO8601().withMessage('Date invalide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const depense = await Depense.create({ ...req.body, creeParUtilisateurId: req.user.id });
      return res.status(201).json({ message: 'Dépense enregistrée', depense });
    } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
  }
);

router.delete('/depenses/:id', async (req, res) => {
  try {
    await Depense.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Supprimée' });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

/**
 * GET /api/comptabilite/solde
 * Solde général : encaissements - dépenses
 */
router.get('/solde', async (req, res) => {
  try {
    const paiements = await Paiement.find();
    const totalEncaisse = paiements.reduce((s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0), 0);
    const depenses = await Depense.find();
    const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0);
    return res.status(200).json({
      totalEncaisse,
      totalDepenses,
      solde: totalEncaisse - totalDepenses,
    });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
