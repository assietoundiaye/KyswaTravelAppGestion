const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Protection contre le Brute-force (CWE-770)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, 
  message: { message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Créer un nouvel utilisateur
 *     tags: [Authentification]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nom
 *               - prenom
 *               - email
 *               - password
 *               - role
 *             properties:
 *               nom:
 *                 type: string
 *                 example: Diop
 *               prenom:
 *                 type: string
 *                 example: Amadou
 *               email:
 *                 type: string
 *                 format: email
 *                 example: amadou@kyswa.sn
 *               telephone:
 *                 type: string
 *                 example: "771234567"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: Password123!
 *               role:
 *                 type: string
 *                 enum: [dg, administrateur, comptable, oumra, commercial, secretaire, billets, ziara, social]
 *                 example: commercial
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Données invalides ou email déjà utilisé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register',
  [
    body('nom').isString().notEmpty().withMessage('Le nom est requis'),
    body('prenom').isString().notEmpty().withMessage('Le prénom est requis'),
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('role').isIn(['dg','administrateur','comptable','oumra','commercial','secretaire','billets','ziara','social']).withMessage('Rôle invalide'),
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e=>e.msg).join('; ') });

    const result = await authService.register(req.body);

    return res.status(201).json({
      message: 'Utilisateur créé avec succès',
      ...result,
    });
  } catch (err) {
    console.error('Erreur lors de l\'enregistrement:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur lors de l\'enregistrement' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authentifier un utilisateur
 *     tags: [Authentification]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@kyswa.sn
 *               telephone:
 *                 type: string
 *                 example: "771234567"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Admin123!
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *                   description: Access token JWT
 *                 refreshToken:
 *                   type: string
 *                   description: Refresh token JWT
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Identifiants incorrects
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Trop de tentatives de connexion
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', loginLimiter,
  [
    body('password').isString().notEmpty().withMessage('Mot de passe requis'),
    body('email').optional().isEmail().withMessage('Email invalide'),
    body('telephone').optional().isString(),
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e=>e.msg).join('; ') });

    const result = await authService.login(req.body);

    return res.status(200).json({
      message: 'Connexion réussie',
      ...result,
    });
  } catch (err) {
    console.error('Erreur lors de la connexion:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la connexion' });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renouveler l'access token
 *     tags: [Authentification]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token JWT
 *     responses:
 *       200:
 *         description: Nouveau token généré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Nouveau access token JWT
 *       401:
 *         description: Refresh token invalide ou expiré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', async (req, res) => {
  try {
    const result = await authService.refreshAccessToken(req.body.refreshToken);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

module.exports = router;