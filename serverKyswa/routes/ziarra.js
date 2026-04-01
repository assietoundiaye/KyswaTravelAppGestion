const express = require('express');
const router = express.Router();
const ZiarraProspect = require('../models/ZiarraProspect');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);
router.use(requireRole('ziara', 'commercial', 'administrateur', 'dg'));

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.statut) filter.statut = req.query.statut;
    const prospects = await ZiarraProspect.find(filter)
      .populate('clientId', 'nom prenom telephone')
      .populate('agentId', 'nom prenom')
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: prospects.length, prospects });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

router.post('/', async (req, res) => {
  try {
    const prospect = await ZiarraProspect.create({ ...req.body, agentId: req.user.id });
    return res.status(201).json({ message: 'Prospect créé', prospect });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const prospect = await ZiarraProspect.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!prospect) return res.status(404).json({ message: 'Prospect non trouvé' });
    return res.status(200).json({ message: 'Mis à jour', prospect });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await ZiarraProspect.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Supprimé' });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
