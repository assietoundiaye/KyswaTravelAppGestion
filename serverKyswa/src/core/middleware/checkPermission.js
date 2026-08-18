/**
 * @fileoverview Middleware checkPermission
 *
 * Vérifie si l'utilisateur a le droit d'effectuer une action sur un module.
 *
 * Logique : Accès = Défaut du rôle + Exceptions admin
 * 1. Super-admins → toujours autorisés
 * 2. Vérifier si une exception admin existe en base pour cet utilisateur/module
 *    - Si oui → utiliser la valeur stockée
 *    - Si non → utiliser le défaut du rôle
 *
 * Usage:
 *   router.post('/', protect, checkPermission('clients', 'create'), handler);
 */
const prismaClient = require('../../database/client');
const { AuthorizationException } = require('../../shared/exceptions');
const { SUPER_ROLES, ROLE_DEFAULT_PERMISSIONS } = require('../../modules/permissions/roleDefaults');

const ACTION_FIELD = {
  view:   'can_view',
  create: 'can_create',
  edit:   'can_edit',
  delete: 'can_delete',
};

const ACTION_KEY = {
  view:   'canView',
  create: 'canCreate',
  edit:   'canEdit',
  delete: 'canDelete',
};

/**
 * Factory middleware : vérifie une permission sur un module
 * @param {string} module - ex: 'clients'
 * @param {'view'|'create'|'edit'|'delete'} action
 */
function checkPermission(module, action) {
  return async (req, res, next) => {
    try {
      const userId   = req.user?.id;
      const role     = (req.user?.role || '').toLowerCase();
      const superSet = SUPER_ROLES.map(r => r.toLowerCase());

      // 1. Super-admins : toujours autorisés
      if (superSet.includes(role)) return next();

      const dbField  = ACTION_FIELD[action];
      const jsKey    = ACTION_KEY[action];

      if (!dbField) return next(new Error(`Action inconnue: ${action}`));

      // 2. Chercher une exception admin explicite en base (avec fallback sécurisé)
      let record = null;
      try {
        record = await prismaClient.permissions_modules.findUnique({
          where: { user_id_module: { user_id: userId, module } },
          select: { [dbField]: true },
        });
      } catch (dbErr) {
        // En cas d'absence de la table ou erreur DB, continuer vers le défaut du rôle
        record = null;
      }

      if (record !== null) {
        // Exception admin trouvée → on l'utilise (peut autoriser ou refuser)
        if (!record[dbField]) {
          return next(new AuthorizationException(
            `Permission '${action}' refusée sur le module '${module}'`
          ));
        }
        return next();
      }

      // 3. Pas d'exception → utiliser le défaut du rôle
      const rolePerms = ROLE_DEFAULT_PERMISSIONS[role];
      if (!rolePerms || !rolePerms[module] || !rolePerms[module][jsKey]) {
        return next(new AuthorizationException(
          `Permission '${action}' non accordée sur le module '${module}' pour le rôle '${role}'`
        ));
      }

      return next();
    } catch (e) { next(e); }
  };
}

module.exports = { checkPermission, SUPER_ROLES };
