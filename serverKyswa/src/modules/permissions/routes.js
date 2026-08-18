/**
 * @fileoverview Routes — Module permissions_modules
 *
 * Logique : Accès = Défaut du rôle + Exceptions admin
 * - Super-admins (dg, administrateur, informatique) : toujours accès total
 * - Autres rôles : droits par défaut du rôle, modifiables par l'admin
 */
const express = require('express');
const prismaClient = require('../../database/client');
const { protect, requireRole } = require('../../core/middleware/auth');
const {
  SUPER_ROLES,
  ALL_MODULES,
  computeEffectivePermissions,
  getRoleDefaults,
} = require('./roleDefaults');

/**
 * Permissions complètes (super-admin)
 */
function fullAccess() {
  return ALL_MODULES.reduce((acc, mod) => {
    acc[mod] = { canView: true, canCreate: true, canEdit: true, canDelete: true };
    return acc;
  }, {});
}

function createPermissionsRoutes() {
  const router = express.Router();

  // ─────────────────────────────────────────────────────────────────
  // GET /api/permissions/me  — permissions effectives de l'utilisateur connecté
  // ─────────────────────────────────────────────────────────────────
  router.get('/me', protect, async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const role   = req.user?.role;

      if (SUPER_ROLES.includes(role)) {
        return res.json({ success: true, permissions: fullAccess(), isSuperAdmin: true });
      }

      // Récupérer les exceptions admin éventuelles
      const records = await prismaClient.permissions_modules.findMany({
        where: { user_id: userId },
      });

      // Calculer les permissions effectives = rôle par défaut + exceptions
      const permissions = computeEffectivePermissions(role, records);

      return res.json({ success: true, permissions, isSuperAdmin: false });
    } catch (e) { next(e); }
  });

  // ─────────────────────────────────────────────────────────────────
  // GET /api/permissions/:userId  — permissions effectives d'un utilisateur (admin)
  // ─────────────────────────────────────────────────────────────────
  router.get('/:userId', protect, requireRole(...SUPER_ROLES), async (req, res, next) => {
    try {
      const { userId } = req.params;

      const profile = await prismaClient.profiles.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!profile) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

      if (SUPER_ROLES.includes(profile.role)) {
        return res.json({ success: true, permissions: fullAccess(), isSuperAdmin: true, role: profile.role });
      }

      const records = await prismaClient.permissions_modules.findMany({
        where: { user_id: userId },
      });

      const permissions = computeEffectivePermissions(profile.role, records);

      // Indiquer à la modal si une exception existe pour chaque module
      const hasCustom = {};
      for (const r of records) { hasCustom[r.module] = true; }

      return res.json({
        success: true,
        permissions,
        isSuperAdmin: false,
        role: profile.role,
        hasCustom,
        roleDefaults: getRoleDefaults(profile.role),
      });
    } catch (e) { next(e); }
  });

  // ─────────────────────────────────────────────────────────────────
  // PUT /api/permissions/:userId  — sauvegarder des exceptions admin
  // Body: { permissions: { clients: { canView, canCreate, canEdit, canDelete }, ... } }
  // ─────────────────────────────────────────────────────────────────
  router.put('/:userId', protect, requireRole(...SUPER_ROLES), async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { permissions } = req.body;

      if (!permissions || typeof permissions !== 'object') {
        return res.status(400).json({ success: false, message: 'Permissions invalides' });
      }

      const upserts = Object.entries(permissions).map(([module, perms]) => {
        return prismaClient.permissions_modules.upsert({
          where: { user_id_module: { user_id: userId, module } },
          update: {
            can_view:   perms.canView   ?? false,
            can_create: perms.canCreate ?? false,
            can_edit:   perms.canEdit   ?? false,
            can_delete: perms.canDelete ?? false,
          },
          create: {
            user_id:    userId,
            module,
            can_view:   perms.canView   ?? false,
            can_create: perms.canCreate ?? false,
            can_edit:   perms.canEdit   ?? false,
            can_delete: perms.canDelete ?? false,
          },
        });
      });

      await Promise.all(upserts);

      return res.json({ success: true, message: 'Permissions mises à jour' });
    } catch (e) { next(e); }
  });

  // ─────────────────────────────────────────────────────────────────
  // DELETE /api/permissions/:userId  — réinitialiser aux défauts du rôle
  // ─────────────────────────────────────────────────────────────────
  router.delete('/:userId', protect, requireRole(...SUPER_ROLES), async (req, res, next) => {
    try {
      const { userId } = req.params;
      await prismaClient.permissions_modules.deleteMany({ where: { user_id: userId } });
      return res.json({ success: true, message: 'Permissions réinitialisées aux défauts du rôle' });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { createPermissionsRoutes, SUPER_ROLES, ALL_MODULES };
