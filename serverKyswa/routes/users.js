const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const { protect, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Protéger toutes les routes avec protect et requireRole('ADMIN')
router.use(protect);
router.use(requireRole('ADMIN'));

/**
 * GET /api/users
 * Liste tous les utilisateurs
 */
router.get('/', async (req, res) => {
  try {
    const utilisateurs = await Utilisateur.find()
      .select('nom prenom email telephone role etat dateCreation createdAt')
      .sort({ dateCreation: -1 });

    return res.status(200).json({
      count: utilisateurs.length,
      utilisateurs,
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des utilisateurs:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
});

/**
 * POST /api/users
 * Créer un nouvel utilisateur
 */
router.post('/', async (req, res) => {
  try {
    const { nom, prenom, email, telephone, password, role } = req.body;

    // Validations
    if (!nom || !prenom || !email || !password || !role) {
      return res.status(400).json({ message: 'Champs requis manquants (nom, prenom, email, password, role)' });
    }

    // Vérifier les rôles autorisés
    const rolesAutorises = ['ADMIN', 'GESTIONNAIRE', 'COMMERCIAL', 'COMPTABLE'];
    if (!rolesAutorises.includes(role)) {
      return res.status(400).json({
        message: `Le rôle doit être l'un de: ${rolesAutorises.join(', ')}`,
      });
    }

    // Vérifier si email existe déjà
    const utilisateurEmail = await Utilisateur.findOne({ email: email.toLowerCase() });
    if (utilisateurEmail) {
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

    // Retourner sans password
    const utilisateurResponse = utilisateur.toObject();
    delete utilisateurResponse.password;

    return res.status(201).json({
      message: 'Utilisateur créé avec succès',
      utilisateur: utilisateurResponse,
    });
  } catch (err) {
    console.error('Erreur lors de la création:', err);
    return res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur' });
  }
});

/**
 * GET /api/users/:id
 * Détail d'un utilisateur
 */
router.get('/:id', async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.params.id)
      .select('-password');

    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.status(200).json({ utilisateur });
  } catch (err) {
    console.error('Erreur lors de la récupération:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération de l\'utilisateur' });
  }
});

/**
 * PATCH /api/users/:id
 * Modifier un utilisateur (nom, prenom, email, telephone, role)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { nom, prenom, email, telephone, role } = req.body;

    const utilisateur = await Utilisateur.findById(req.params.id);
    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier les rôles si modifié
    if (role) {
      const rolesAutorises = ['ADMIN', 'GESTIONNAIRE', 'COMMERCIAL', 'COMPTABLE'];
      if (!rolesAutorises.includes(role)) {
        return res.status(400).json({
          message: `Le rôle doit être l'un de: ${rolesAutorises.join(', ')}`,
        });
      }
      utilisateur.role = role;
    }

    // Vérifier email unique si modifié
    if (email && email.toLowerCase() !== utilisateur.email) {
      const utilisateurEmail = await Utilisateur.findOne({ email: email.toLowerCase() });
      if (utilisateurEmail) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
      utilisateur.email = email.toLowerCase();
    }

    // Vérifier téléphone unique si modifié
    if (telephone && telephone !== utilisateur.telephone) {
      const utilisateurTelephone = await Utilisateur.findOne({ telephone });
      if (utilisateurTelephone) {
        return res.status(400).json({ message: 'Ce numéro de téléphone est déjà utilisé' });
      }
      utilisateur.telephone = telephone;
    }

    // Mise à jour des autres champs
    if (nom) utilisateur.nom = nom;
    if (prenom) utilisateur.prenom = prenom;

    await utilisateur.save();

    // Retourner sans password
    const utilisateurResponse = utilisateur.toObject();
    delete utilisateurResponse.password;

    return res.status(200).json({
      message: 'Utilisateur modifié avec succès',
      utilisateur: utilisateurResponse,
    });
  } catch (err) {
    console.error('Erreur lors de la modification:', err);
    return res.status(500).json({ message: 'Erreur lors de la modification de l\'utilisateur' });
  }
});

/**
 * DELETE /api/users/:id
 * Supprimer un utilisateur
 */
router.delete('/:id', async (req, res) => {
  try {
    // Empêcher la suppression du dernier admin
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const utilisateur = await Utilisateur.findByIdAndDelete(req.params.id);

    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.status(200).json({
      message: 'Utilisateur supprimé avec succès',
      utilisateur: {
        id: utilisateur._id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
      },
    });
  } catch (err) {
    console.error('Erreur lors de la suppression:', err);
    return res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
  }
});

/**
 * PATCH /api/users/:id/toggle-status
 * Bascule etat ACTIF ↔ INACTIF
 */
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    // Empêcher la modification du statut du propre compte
    if (req.user.id.toString() === req.params.id) {
      return res.status(403).json({ message: 'Vous ne pouvez pas modifier votre propre statut vous pouver seulement visualiser protre profil' });
    }

    const utilisateur = await Utilisateur.findById(req.params.id);

    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Basculer l'état
    utilisateur.etat = utilisateur.etat === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    await utilisateur.save();

    return res.status(200).json({
      message: 'Utilisateur mis à jour',
      user: {
        id: utilisateur._id,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        role: utilisateur.role,
        etat: utilisateur.etat,
      },
    });
  } catch (err) {
    console.error('Erreur lors de la modification du statut:', err);
    return res.status(500).json({ message: 'Erreur lors de la modification du statut' });
  }
});

module.exports = router;
