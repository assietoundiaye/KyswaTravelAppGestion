const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const { generateToken } = require('../utils/jwt');
const rateLimit = require('express-rate-limit');

// Protection contre le Brute-force (CWE-770)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, 
  message: { message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { nom, prenom, email, telephone, password, role } = req.body;

    // Validation des champs et des TYPES (CWE-1287)
    // On force la conversion en String pour éviter que 'email' soit un objet
    if (typeof email !== 'string' || !password || !role) {
      return res.status(400).json({ message: 'Données invalides ou manquantes' });
    }

    const rolesAutorises = ['ADMIN', 'GESTIONNAIRE', 'COMMERCIAL', 'COMPTABLE'];
    if (!rolesAutorises.includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    // Sécurisation du toLowerCase()
    const normalizedEmail = email.toLowerCase();

    const utilisateurExistant = await Utilisateur.findOne({ email: normalizedEmail });
    if (utilisateurExistant) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const utilisateur = new Utilisateur({
      nom, prenom, email: normalizedEmail, telephone, password, role,
    });

    await utilisateur.save();
    const token = generateToken(utilisateur);

    return res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: { id: utilisateur._id, nom, prenom, email: normalizedEmail, role }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur lors de l\'enregistrement' });
  }
});

/**
 * POST /api/auth/login
 * Correction : Application du loginLimiter ici
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, telephone, password } = req.body;

    if ((!email && !telephone) || !password) {
      return res.status(400).json({ message: 'Identifiants requis' });
    }

    let utilisateur;
    if (email && typeof email === 'string') {
      utilisateur = await Utilisateur.findOne({ email: email.toLowerCase() }).select('+password');
    } else if (telephone) {
      utilisateur = await Utilisateur.findOne({ telephone }).select('+password');
    }

    if (!utilisateur) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    // Vérification sécurisée du mot de passe
    const passwordValide = await utilisateur.comparePassword(password);
    if (!passwordValide) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    utilisateur.dateDerniereConnexion = new Date();
    await utilisateur.save();

    const token = generateToken(utilisateur);

    return res.status(200).json({
      token,
      user: { id: utilisateur._id, nom: utilisateur.nom, email: utilisateur.email, role: utilisateur.role }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur lors de la connexion' });
  }
});

module.exports = router;