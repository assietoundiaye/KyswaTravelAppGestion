const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const RapportQuotidien = require('../models/RapportQuotidien');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);

/**
 * GET /api/rapports
 * Tous les rapports (secrétaire/DG/informatique) ou les siens
 */
router.get('/', async (req, res) => {
  try {
    const rolesAdmin = ['secretaire', 'dg', 'administrateur'];
    const filter = {};

    if (!rolesAdmin.includes(req.user.role)) {
      filter.agentId = req.user.id; // Voir seulement les siens
    }
    if (req.query.agentId) filter.agentId = req.query.agentId;
    if (req.query.date) {
      const d = new Date(req.query.date);
      filter.date = {
        $gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
        $lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
      };
    }

    const rapports = await RapportQuotidien.find(filter)
      .populate('agentId', 'nom prenom role')
      .sort({ date: -1 })
      .limit(50);

    return res.status(200).json({ count: rapports.length, rapports });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

/**
 * POST /api/rapports
 */
router.post('/',
  [
    body('activites').trim().notEmpty().withMessage('Les activités sont requises'),
    body('date').optional().isISO8601().withMessage('Date invalide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const rapport = await RapportQuotidien.create({
        ...req.body,
        agentId: req.user.id,
        date: req.body.date || new Date(),
      });

      return res.status(201).json({ message: 'Rapport soumis', rapport });
    } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
  }
);

/**
 * PATCH /api/rapports/:id
 * Modifiable dans les 7 jours
 */
router.patch('/:id', async (req, res) => {
  try {
    const rapport = await RapportQuotidien.findById(req.params.id);
    if (!rapport) return res.status(404).json({ message: 'Rapport non trouvé' });

    // Vérifier que c'est le bon agent
    if (rapport.agentId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Accès interdit' });
    }

    // Vérifier les 7 jours
    const diff = (new Date() - new Date(rapport.dateCreation)) / (1000 * 60 * 60 * 24);
    if (diff > 7) {
      return res.status(400).json({ message: 'Rapport non modifiable après 7 jours' });
    }

    const { activites, problemes, objectifsDemain, appelsClients, inscriptionsCreees, paiementsEncaisses } = req.body;
    if (activites) rapport.activites = activites;
    if (problemes !== undefined) rapport.problemes = problemes;
    if (objectifsDemain !== undefined) rapport.objectifsDemain = objectifsDemain;
    if (appelsClients !== undefined) rapport.appelsClients = appelsClients;
    if (inscriptionsCreees !== undefined) rapport.inscriptionsCreees = inscriptionsCreees;
    if (paiementsEncaisses !== undefined) rapport.paiementsEncaisses = paiementsEncaisses;

    await rapport.save();
    return res.status(200).json({ message: 'Rapport mis à jour', rapport });
  } catch (err) { return res.status(500).json({ message: 'Erreur serveur' }); }
});

module.exports = router;
