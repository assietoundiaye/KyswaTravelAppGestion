/**
 * Routes de gestion des emails
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const emailService = require('../services/emailService');
const { protect, requireRole } = require('../middleware/auth');

// Protection: Administrateurs et commerciaux
router.use(protect);
router.use(requireRole('administrateur', 'dg', 'commercial', 'secretaire'));

/**
 * @swagger
 * /api/emails/test:
 *   post:
 *     summary: Tester l'envoi d'email
 *     tags: [Emails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 example: test@example.com
 *     responses:
 *       200:
 *         description: Email de test envoyé
 *       400:
 *         description: Données invalides
 */
router.post('/test', 
  [
    body('to').isEmail().withMessage('Email invalide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { to } = req.body;
      const result = await emailService.testEmail(to);

      return res.json({
        message: 'Email de test envoyé',
        result,
      });
    } catch (err) {
      console.error('Erreur test email:', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

/**
 * @swagger
 * /api/emails/send:
 *   post:
 *     summary: Envoyer un email personnalisé
 *     tags: [Emails]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - subject
 *               - content
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *                 description: Contenu HTML de l'email
 *     responses:
 *       200:
 *         description: Email envoyé
 *       400:
 *         description: Données invalides
 */
router.post('/send',
  [
    body('to').isEmail().withMessage('Email invalide'),
    body('subject').notEmpty().withMessage('Sujet requis'),
    body('content').notEmpty().withMessage('Contenu requis'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { to, subject, content } = req.body;
      const result = await emailService.sendEmail(to, subject, content);

      return res.json({
        message: 'Email envoyé',
        result,
      });
    } catch (err) {
      console.error('Erreur envoi email:', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

/**
 * @swagger
 * /api/emails/templates:
 *   get:
 *     summary: Obtenir la liste des templates d'emails
 *     tags: [Emails]
 *     responses:
 *       200:
 *         description: Liste des templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 templates:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/templates', async (req, res) => {
  try {
    const templates = emailService.getAvailableTemplates();
    return res.json({ templates });
  } catch (err) {
    console.error('Erreur récupération templates:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/emails/config:
 *   get:
 *     summary: Vérifier la configuration email
 *     tags: [Emails]
 *     responses:
 *       200:
 *         description: État de la configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configured:
 *                   type: boolean
 *                 smtp_host:
 *                   type: string
 *                 smtp_user:
 *                   type: string
 */
router.get('/config', async (req, res) => {
  try {
    const configured = emailService.isEmailConfigured();
    
    return res.json({
      configured,
      smtp_host: process.env.SMTP_HOST || 'Non configuré',
      smtp_user: process.env.SMTP_USER || 'Non configuré',
      smtp_port: process.env.SMTP_PORT || 587,
    });
  } catch (err) {
    console.error('Erreur vérification config email:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;