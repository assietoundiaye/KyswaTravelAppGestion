const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const { protect, requireRole } = require('../middleware/auth');

// Protéger toutes les routes : authentification et rôle ADMIN requis
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
    console.error('Erreur récupération utilisateurs:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
});

/**
 * POST /api/users
 * Créer un nouvel utilisateur avec validation de type (CWE-1287)
 */
router.post('/', async (req, res) => {
  try {
    const { nom, prenom, email, telephone, password, role } = req.body;

    // Validation des champs requis et des types pour éviter les crashs (CWE-1287)
    if (typeof email !== 'string' || typeof password !== 'string' || !nom || !prenom || !role) {
      return res.status(400).json({ message: 'Données invalides ou manquantes' });
    }

    const rolesAutorises = ['ADMIN', 'GESTIONNAIRE', 'COMMERCIAL', 'COMPTABLE'];
    if (!rolesAutorises.includes(role)) {
      return res.status(400).json({ message: 'Rôle non autorisé' });
    }

    // Normalisation sécurisée
    const normalizedEmail = email.toLowerCase();

    const utilisateurEmail = await Utilisateur.findOne({ email: normalizedEmail });
    if (utilisateurEmail) {
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

    const utilisateurResponse = utilisateur.toObject();
    delete utilisateurResponse.password;

    return res.status(201).json({
      message: 'Utilisateur créé avec succès',
      utilisateur: utilisateurResponse,
    });
  } catch (err) {
    console.error('Erreur création:', err);
    return res.status(500).json({ message: 'Erreur lors de la création' });
  }
});

/**
 * GET /api/users/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findById(req.params.id).select('-password');

    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.status(200).json({ utilisateur });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur récupération utilisateur' });
  }
});

/**
 * PATCH /api/users/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const { nom, prenom, email, telephone, role } = req.body;
    const utilisateur = await Utilisateur.findById(req.params.id);

    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (role) {
      const rolesAutorises = ['ADMIN', 'GESTIONNAIRE', 'COMMERCIAL', 'COMPTABLE'];
      if (!rolesAutorises.includes(role)) {
        return res.status(400).json({ message: 'Rôle invalide' });
      }
      utilisateur.role = role;
    }

    // Validation de type avant modification d'email (CWE-1287)
    if (email && typeof email === 'string') {
      const normalizedEmail = email.toLowerCase();
      if (normalizedEmail !== utilisateur.email) {
        const emailPris = await Utilisateur.findOne({ email: normalizedEmail });
        if (emailPris) return res.status(400).json({ message: 'Email déjà utilisé' });
        utilisateur.email = normalizedEmail;
      }
    }

    if (telephone && telephone !== utilisateur.telephone) {
      const telPris = await Utilisateur.findOne({ telephone });
      if (telPris) return res.status(400).json({ message: 'Téléphone déjà utilisé' });
      utilisateur.telephone = telephone;
    }

    if (nom) utilisateur.nom = nom;
    if (prenom) utilisateur.prenom = prenom;

    await utilisateur.save();

    const resObj = utilisateur.toObject();
    delete resObj.password;

    return res.status(200).json({ message: 'Modifié avec succès', utilisateur: resObj });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur modification' });
  }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    // Sécurité : comparaison robuste des IDs (ToString)
    if (req.user.id.toString() === req.params.id.toString()) {
      return res.status(400).json({ message: 'Suppression de votre propre compte impossible' });
    }

    const utilisateur = await Utilisateur.findByIdAndDelete(req.params.id);
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    return res.status(200).json({ message: 'Supprimé avec succès' });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur suppression' });
  }
});

/**
 * PATCH /api/users/:id/toggle-status
 */
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    if (req.user.id.toString() === req.params.id.toString()) {
      return res.status(403).json({ message: 'Modification de votre propre statut impossible' });
    }

    const utilisateur = await Utilisateur.findById(req.params.id);
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    utilisateur.etat = utilisateur.etat === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    await utilisateur.save();

    return res.status(200).json({ message: 'Statut mis à jour', etat: utilisateur.etat });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur statut' });
  }
});

module.exports = router;