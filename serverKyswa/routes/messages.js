const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Message = require('../models/Message');
const Utilisateur = require('../models/Utilisateur');
const { protect } = require('../middleware/auth');

router.use(protect);

/**
 * GET /api/messages
 * Messages reçus + envoyés de l'utilisateur connecté
 */
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ expediteurId: req.user.id }, { destinataireId: req.user.id }]
    })
      .populate('expediteurId', 'nom prenom role')
      .populate('destinataireId', 'nom prenom role')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ count: messages.length, messages });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/messages/non-lus
 * Nombre de messages non lus
 */
router.get('/non-lus', async (req, res) => {
  try {
    const count = await Message.countDocuments({ destinataireId: req.user.id, lu: false });
    return res.status(200).json({ count });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/messages
 * Envoyer un message
 */
router.post('/',
  [
    body('destinataireId').isMongoId().withMessage('destinataireId invalide'),
    body('contenu').trim().notEmpty().withMessage('Le contenu est requis'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { destinataireId, contenu } = req.body;

      if (destinataireId === req.user.id.toString()) {
        return res.status(400).json({ message: 'Vous ne pouvez pas vous envoyer un message' });
      }

      const destinataire = await Utilisateur.findById(destinataireId);
      if (!destinataire) return res.status(404).json({ message: 'Destinataire non trouvé' });

      const message = await Message.create({
        expediteurId: req.user.id,
        destinataireId,
        contenu,
      });

      await message.populate('expediteurId', 'nom prenom role');
      await message.populate('destinataireId', 'nom prenom role');

      return res.status(201).json({ message: 'Message envoyé', data: message });
    } catch (err) {
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

/**
 * PATCH /api/messages/:id/lu
 * Marquer un message comme lu
 */
router.patch('/:id/lu', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message non trouvé' });
    if (message.destinataireId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    message.lu = true;
    message.luAt = new Date();
    await message.save();
    return res.status(200).json({ message: 'Message marqué comme lu' });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/messages/audit
 * Historique des actions (administrateur/dg seulement)
 */
router.get('/audit', async (req, res) => {
  try {
    if (!['administrateur', 'dg'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Accès interdit' });
    }
    const AuditLog = require('../models/AuditLog');
    const { search, module: mod, action } = req.query;
    const filter = {};
    if (mod && mod !== 'tous') filter.module = mod;
    if (action && action !== 'tous') filter.action = action;
    if (search) {
      filter.$or = [
        { userNom: { $regex: search, $options: 'i' } },
        { module: { $regex: search, $options: 'i' } },
      ];
    }
    const logs = await AuditLog.find(filter)
      .populate('userId', 'nom prenom role')
      .sort({ createdAt: -1 })
      .limit(200);
    return res.status(200).json({ count: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
