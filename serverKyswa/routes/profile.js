const express = require('express');
const router = express.Router();
const Utilisateur = require('../models/Utilisateur');
const { protect } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Toutes les routes ici sont protégées : l'utilisateur authentifié gère son profil
router.use(protect);

/**
 * GET /api/profile/me
 * Retourne le profil de l'utilisateur connecté
 */
router.get('/me', async (req, res) => {
  try {
    const user = await Utilisateur.findById(req.user.id)
      .select('nom prenom email telephone role etat dateCreation creeParUtilisateurId')
      .populate('creeParUtilisateurId', 'nom prenom email');

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    return res.status(200).json({ user });
  } catch (err) {
    console.error('Erreur récupération profil:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération du profil' });
  }
});

/**
 * PATCH /api/profile/me
 * Modifier son propre profil (nom, prenom, telephone, email)
 */
router.patch(
  '/me',
  [
    body('email').optional().isEmail().withMessage('Email invalide'),
    body('nom').optional().isString().notEmpty().withMessage('Le nom est requis'),
    body('prenom').optional().isString().notEmpty().withMessage('Le prénom est requis'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join('; ') });

      const allowed = ['nom', 'prenom', 'telephone', 'email'];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'Aucun champ modifiable fourni' });
      }

      // Si email modifié, vérifier unicité
      if (updates.email) {
        const existing = await Utilisateur.findOne({ email: updates.email.toLowerCase().trim() });
        if (existing && existing._id.toString() !== req.user.id) {
          return res.status(400).json({ message: 'Email déjà utilisé' });
        }
      }

      const user = await Utilisateur.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      Object.assign(user, updates);
      await user.save();

      const cleaned = await Utilisateur.findById(user._id).select('nom prenom email telephone role etat dateCreation');

      return res.status(200).json({ message: 'Profil mis à jour avec succès', user: cleaned });
    } catch (err) {
      console.error('Erreur mise à jour profil:', err);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
    }
  }
);

module.exports = router;
