const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { protect, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const messageService = require('../services/messageService');

router.use(protect);

/**
 * GET /api/messages
 */
router.get('/', async (req, res) => {
  try {
    const messages = await messageService.getMessages(req.user.id);
    return res.status(200).json({ count: messages.length, messages });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/messages/non-lus
 */
router.get('/non-lus', async (req, res) => {
  try {
    const count = await messageService.compterNonLus(req.user.id);
    return res.status(200).json({ count });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/messages
 */
router.post(
  '/',
  [
    body('destinataireId').isMongoId().withMessage('destinataireId invalide'),
    body('contenu').trim().notEmpty().withMessage('Le contenu est requis'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const message = await messageService.envoyerMessage(req.body, req.user.id);
      return res.status(201).json({ message: 'Message envoyé', data: message });
    } catch (err) {
      return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
    }
  }
);

/**
 * PATCH /api/messages/:id/lu
 */
router.patch('/:id/lu', async (req, res) => {
  try {
    await messageService.marquerLu(req.params.id, req.user.id);
    return res.status(200).json({ message: 'Message marqué comme lu' });
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

/**
 * GET /api/messages/audit
 * Historique des actions (administrateur/dg seulement)
 */
router.get('/audit', requirePermission(PERMISSIONS.MESSAGES_AUDIT_READ), async (req, res) => {
  try {
    const logs = await messageService.getAuditLogs(req.query);
    return res.status(200).json({ count: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
