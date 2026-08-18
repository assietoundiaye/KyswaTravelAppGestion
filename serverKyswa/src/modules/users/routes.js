/**
 * @fileoverview Routes — Module users + profil
 * Inclut la gestion du profil de l'utilisateur connecté (/me)
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const UserRepository = require('./repositories/UserRepository');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');
const prisma = require('../../database/client');

function createUsersRoutes(dependencies) {
  const router = express.Router();
  const repository = new UserRepository();


  // GET liste (paginée)
  router.get('/', protect, checkPermission('utilisateurs', 'view'), async (req, res, next) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const result = await repository.findMany({}, { page: +page, limit: +limit });
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        utilisateurs: result.data,
        departs: result.data,
        profiles: result.data
      });
    } catch (e) { next(e); }
  });

  // GET par ID
  router.get('/:id', protect, checkPermission('utilisateurs', 'view'), async (req, res, next) => {
    try {
      const item = await repository.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Non trouvé' });
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // POST créer
  router.post('/', protect, checkPermission('utilisateurs', 'create'), async (req, res, next) => {
    try {
      const item = await repository.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // PATCH mettre à jour
  router.patch('/:id', protect, checkPermission('utilisateurs', 'edit'), async (req, res, next) => {
    try {
      const item = await repository.updateById(req.params.id, req.body);
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // DELETE supprimer
  router.delete('/:id', protect, checkPermission('utilisateurs', 'delete'), async (req, res, next) => {
    try {
      await repository.deleteById(req.params.id);
      res.json({ success: true, message: 'Supprimé avec succès' });
    } catch (e) { next(e); }
  });

  // ─────────────────────────────────────────────────────
  // ROUTES PROFIL (utilisateur connecté)
  // ─────────────────────────────────────────────────────

  /**
   * GET /api/users/me
   * Retourne le profil de l'utilisateur connecté
   */
  router.get('/me', protect, async (req, res, next) => {
    try {
      const profile = await prisma.profiles.findUnique({
        where: { id: req.user.id },
        select: {
          id: true, nom: true, prenom: true, email: true,
          telephone: true, role: true, poste: true, actif: true,
          avatar_url: true, bio: true, couleur: true,
          theme: true, language: true, created_at: true,
        }
      });
      if (!profile) return res.status(404).json({ success: false, message: 'Profil non trouvé' });
      return res.status(200).json({ success: true, data: profile, user: profile });
    } catch (e) { next(e); }
  });

  /**
   * PATCH /api/users/me
   * Modifier son propre profil
   */
  router.patch('/me', protect, async (req, res, next) => {
    try {
      const allowed = ['nom', 'prenom', 'telephone', 'bio', 'avatar_url', 'couleur', 'theme', 'language'];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, message: 'Aucun champ modifiable fourni' });
      }
      // Email : vérifier unicité si modifié
      if (req.body.email) {
        const email = req.body.email.toLowerCase().trim();
        const exists = await prisma.profiles.findFirst({
          where: { email, NOT: { id: req.user.id } }
        });
        if (exists) return res.status(400).json({ success: false, message: 'Email déjà utilisé' });
        updates.email = email;
      }
      const profile = await prisma.profiles.update({
        where: { id: req.user.id },
        data: updates,
      });
      return res.status(200).json({ success: true, data: profile, user: profile, message: 'Profil mis à jour' });
    } catch (e) { next(e); }
  });

  /**
   * PATCH /api/users/me/password
   * Changer son mot de passe
   */
  router.patch('/me/password', protect, async (req, res, next) => {
    try {
      const { ancienPassword, nouveauPassword } = req.body;
      if (!ancienPassword || !nouveauPassword) {
        return res.status(400).json({ success: false, message: 'Les deux mots de passe sont requis' });
      }
      if (nouveauPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit faire au moins 6 caractères' });
      }
      // Vérifier l'ancien mot de passe dans auth.users
      const authUser = await prisma.users.findUnique({ where: { id: req.user.id } });
      if (!authUser?.encrypted_password) {
        return res.status(400).json({ success: false, message: 'Compte sans mot de passe configuré' });
      }
      const valide = await bcrypt.compare(ancienPassword, authUser.encrypted_password);
      if (!valide) return res.status(400).json({ success: false, message: 'Ancien mot de passe incorrect' });
      const hashed = await bcrypt.hash(nouveauPassword, 12);
      await prisma.users.update({
        where: { id: req.user.id },
        data: { encrypted_password: hashed }
      });
      return res.status(200).json({ success: true, message: 'Mot de passe modifié avec succès' });
    } catch (e) { next(e); }
  });

  // Route de compatibilité legacy : /api/profile/me → redirige vers /api/users/me
  router.get('/profile/me', protect, async (req, res, next) => {
    try {
      const profile = await prisma.profiles.findUnique({ where: { id: req.user.id } });
      if (!profile) return res.status(404).json({ success: false, message: 'Profil non trouvé' });
      return res.status(200).json({ success: true, data: profile, user: { ...profile, etat: profile.actif ? 'ACTIF' : 'INACTIF' } });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = createUsersRoutes;
