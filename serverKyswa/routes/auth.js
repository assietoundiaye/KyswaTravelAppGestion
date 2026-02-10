const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const { generateToken } = require('../utils/jwt');
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
 * POST /api/auth/register
 * Crée un nouvel utilisateur
 */
router.post('/register',
  [
    body('nom').isString().notEmpty().withMessage('Le nom est requis'),
    body('prenom').isString().notEmpty().withMessage('Le prénom est requis'),
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
    body('role').isIn(['ADMIN','GESTIONNAIRE','COMMERCIAL','COMPTABLE']).withMessage('Rôle invalide'),
  ],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e=>e.msg).join('; ') });

    const { nom, prenom, email, telephone, password, role } = req.body;

    // Validation des types (CWE-1287) pour éviter les crashs avec .toLowerCase()
    if (typeof email !== 'string' || typeof password !== 'string' || !nom || !prenom || !role) {
      return res.status(400).json({ message: 'Champs requis manquants ou format invalide' });
    }

    const rolesAutorises = ['ADMIN', 'GESTIONNAIRE', 'COMMERCIAL', 'COMPTABLE'];
    if (!rolesAutorises.includes(role)) {
      return res.status(400).json({ message: 'Rôle non autorisé' });
    }

    const normalizedEmail = email.toLowerCase();

    const utilisateurExistant = await Utilisateur.findOne({ email: normalizedEmail });
    if (utilisateurExistant) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    if (telephone) {
      const utilisateurTelephone = await Utilisateur.findOne({ telephone });
      if (utilisateurTelephone) {
        return res.status(400).json({ message: 'Ce numéro de téléphone est déjà utilisé' });
      }
    }

    const utilisateur = new Utilisateur({
      nom,
      prenom,
      email: normalizedEmail,
      telephone,
      password,
      role,
    });

    await utilisateur.save();

    const token = generateToken(utilisateur);

    return res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: {
        id: utilisateur._id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role: utilisateur.role,
      },
    });
  } catch (err) {
    console.error('Erreur lors de l\'enregistrement:', err);
    return res.status(500).json({ message: 'Erreur lors de l\'enregistrement' });
  }
});

/**
 * POST /api/auth/login
 * Authentifie un utilisateur par email ou téléphone
 * Application du loginLimiter pour contrer le Brute-force
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

    const { email, telephone, password } = req.body;

    if ((!email && !telephone) || !password) {
      return res.status(400).json({ message: 'Identifiants et mot de passe requis' });
    }

    let utilisateur;
    
    // Protection Type Validation (CWE-1287)
    if (email && typeof email === 'string') {
      utilisateur = await Utilisateur.findOne({ email: email.toLowerCase() }).select('+password');
    } else if (telephone) {
      utilisateur = await Utilisateur.findOne({ telephone }).select('+password');
    }

    if (!utilisateur) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    // Vérification du mot de passe
    const passwordValide = await utilisateur.comparePassword(password);
    if (!passwordValide) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    utilisateur.dateDerniereConnexion = new Date();
    await utilisateur.save();

    const token = generateToken(utilisateur);

    return res.status(200).json({
      message: 'Connexion réussie',
      token,
      user: {
        id: utilisateur._id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        telephone: utilisateur.telephone,
        role: utilisateur.role,
      },
    });
  } catch (err) {
    console.error('Erreur lors de la connexion:', err);
    return res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
});

module.exports = router;