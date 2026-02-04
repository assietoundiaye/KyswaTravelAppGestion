const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const { generateToken } = require('../utils/jwt');

/**
 * POST /api/auth/register
 * Crée un nouvel utilisateur
 */
router.post('/register', async (req, res) => {
  try {
    const { nom, prenom, email, telephone, password, role } = req.body;

    // Validations
    if (!nom || !prenom || !email || !password || !role) {
      return res.status(400).json({ message: 'Champs requis manquants' });
    }

    // Vérifier les rôles autorisés
    const rolesAutorises = ['ADMIN', 'GESTIONNAIRE', 'COMMERCIAL', 'COMPTABLE'];
    if (!rolesAutorises.includes(role)) {
      return res.status(400).json({
        message: `Le rôle doit être l'un de: ${rolesAutorises.join(', ')}`,
      });
    }

    // Vérifier si email existe déjà
    const utilisateurExistant = await Utilisateur.findOne({ email: email.toLowerCase() });
    if (utilisateurExistant) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Vérifier si téléphone existe déjà (si fourni)
    if (telephone) {
      const utilisateurTelephone = await Utilisateur.findOne({ telephone });
      if (utilisateurTelephone) {
        return res.status(400).json({ message: 'Ce numéro de téléphone est déjà utilisé' });
      }
    }

    // Créer nouvel utilisateur
    const utilisateur = new Utilisateur({
      nom,
      prenom,
      email: email.toLowerCase(),
      telephone,
      password,
      role,
    });

    await utilisateur.save();

    // Générer le token
    const token = generateToken(utilisateur);

    // Répondre
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
 */
router.post('/login', async (req, res) => {
  try {
    const { email, telephone, password } = req.body;

    // Validations
    if ((!email && !telephone) || !password) {
      return res.status(400).json({ message: 'Email ou téléphone et mot de passe requis' });
    }

    // Trouver utilisateur par email ou téléphone (+ charger le password)
    let utilisateur;
    if (email) {
      utilisateur = await Utilisateur.findOne({ email: email.toLowerCase() }).select('+password');
    } else {
      utilisateur = await Utilisateur.findOne({ telephone }).select('+password');
    }

    if (!utilisateur) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    // Vérifier le password
    const passwordValide = await utilisateur.comparePassword(password);
    if (!passwordValide) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    // Mettre à jour la date de dernière connexion
    utilisateur.dateDerniereConnexion = new Date();
    await utilisateur.save();

    // Générer le token
    const token = generateToken(utilisateur);

    // Répondre
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
