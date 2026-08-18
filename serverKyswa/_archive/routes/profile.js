const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prismaService = require('../services/prismaService');
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
    const user = await prismaService.findUnique('profiles', {
      where: { id: req.user.id },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        date_creation: true,
      }
    });

    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    // Mapper actif vers etat pour compatibilité frontend
    const userResponse = {
      ...user,
      etat: user.actif ? 'ACTIF' : 'INACTIF',
      dateCreation: user.date_creation,
    };

    return res.status(200).json({ user: userResponse });
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
        const normalizedEmail = updates.email.toLowerCase().trim();
        const existing = await prismaService.findFirst('profiles', {
          where: { 
            email: normalizedEmail,
            NOT: { id: req.user.id }
          }
        });
        if (existing) {
          return res.status(400).json({ message: 'Email déjà utilisé' });
        }
        updates.email = normalizedEmail;
      }

      const user = await prismaService.findUnique('profiles', {
        where: { id: req.user.id }
      });
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      const updatedUser = await prismaService.update('profiles',
        { id: req.user.id },
        updates
      );

      const userResponse = {
        id: updatedUser.id,
        nom: updatedUser.nom,
        prenom: updatedUser.prenom,
        email: updatedUser.email,
        telephone: updatedUser.telephone,
        role: updatedUser.role,
        etat: updatedUser.actif ? 'ACTIF' : 'INACTIF',
        dateCreation: updatedUser.date_creation,
      };

      return res.status(200).json({ message: 'Profil mis à jour avec succès', user: userResponse });
    } catch (err) {
      console.error('Erreur mise à jour profil:', err);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
    }
  }
);

/**
 * PATCH /api/profile/me/password
 * Changer son mot de passe
 */
router.patch('/me/password',
  [
    body('ancienPassword').notEmpty().withMessage('Ancien mot de passe requis'),
    body('nouveauPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join('; ') });

      const { ancienPassword, nouveauPassword } = req.body;
      const user = await prismaService.findUnique('profiles', {
        where: { id: req.user.id }
      });
      if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

      const valide = await bcrypt.compare(ancienPassword, user.password_hash);
      if (!valide) return res.status(400).json({ message: 'Ancien mot de passe incorrect' });

      const hashedPassword = await bcrypt.hash(nouveauPassword, 12);
      await prismaService.update('profiles',
        { id: req.user.id },
        { password_hash: hashedPassword }
      );

      return res.status(200).json({ message: 'Mot de passe modifié avec succès' });
    } catch (err) {
      console.error('Erreur changement mot de passe:', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  }
);

module.exports = router;
