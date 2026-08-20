import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../core/api/axios';

/**
 * Hook pour gérer les permissions des utilisateurs
 * Récupère et cache les permissions depuis l'API
 */
const SUPER_ROLES = ['dg', 'administrateur', 'informatique', 'admin'];

export const usePermissions = () => {
  const { user } = useContext(AuthContext);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isSuper = SUPER_ROLES.includes(user?.role?.toLowerCase());

  const loadPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissions({});
      setLoading(false);
      return;
    }

    if (isSuper) {
      setPermissions({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/permissions/me');
      
      if (response.data?.success) {
        let permissionsMap = {};

        if (response.data.permissions) {
          // Format objet : { module: { canView, canCreate, ... } }
          for (const [mod, val] of Object.entries(response.data.permissions)) {
            permissionsMap[mod] = {
              view: val.canView ?? val.can_view ?? val.view ?? false,
              create: val.canCreate ?? val.can_create ?? val.create ?? false,
              edit: val.canEdit ?? val.can_edit ?? val.edit ?? false,
              delete: val.canDelete ?? val.can_delete ?? val.delete ?? false,
            };
          }
        } else if (Array.isArray(response.data.data)) {
          // Format tableau legacy
          response.data.data.forEach(perm => {
            permissionsMap[perm.module] = {
              view: perm.can_view ?? perm.view ?? false,
              create: perm.can_create ?? perm.create ?? false,
              edit: perm.can_edit ?? perm.edit ?? false,
              delete: perm.can_delete ?? perm.delete ?? false,
            };
          });
        }

        setPermissions(permissionsMap);
        setError(null);
      } else {
        throw new Error(response.data?.message || 'Erreur lors du chargement des permissions');
      }
    } catch (err) {
      console.error('Erreur chargement permissions:', err);
      setError(err.message);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, isSuper]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  /**
   * Vérifier si l'utilisateur a une permission spécifique (tolérant aux alias read/view, update/edit)
   */
  const hasPermission = (module, action = 'view') => {
    if (isSuper) {
      return true;
    }
    const act = (action || '').toLowerCase();
    const actionKey = (act === 'canview' || act === 'read' || act === 'view')
      ? 'view'
      : (act === 'cancreate' || act === 'create'
        ? 'create'
        : (act === 'canedit' || act === 'edit' || act === 'update' || act === 'canupdate'
          ? 'edit'
          : (act === 'candelete' || act === 'delete' ? 'delete' : act)));

    return permissions[module]?.[actionKey] === true || permissions[module]?.[action] === true;
  };

  /**
   * Helpers
   */
  const canViewModule = (module) => hasPermission(module, 'view');
  const canView = (module) => hasPermission(module, 'view');
  const canCreate = (module) => hasPermission(module, 'create');
  const canEdit = (module) => hasPermission(module, 'edit');
  const canUpdate = (module) => hasPermission(module, 'edit');
  const canDelete = (module) => hasPermission(module, 'delete');

  /**
   * Obtenir toutes les permissions pour un module
   */
  const getModulePermissions = (module) => {
    if (isSuper) {
      return {
        view: true,
        create: true,
        edit: true,
        delete: true
      };
    }
    return permissions[module] || {
      view: false,
      create: false,
      edit: false,
      delete: false
    };
  };

  /**
   * Vérifier si l'utilisateur a au moins une permission sur un module
   */
  const hasAnyPermission = (module) => {
    if (isSuper) return true;
    const modulePerms = getModulePermissions(module);
    return modulePerms && (modulePerms.view || modulePerms.create || modulePerms.edit || modulePerms.delete);
  };

  /**
   * Obtenir la liste des modules accessibles
   */
  const getAccessibleModules = () => {
    if (isSuper) {
      return [
        'clients', 'packages', 'reservations', 'paiements', 'billets',
        'billets-groupe', 'visas', 'desistements', 'rapports', 'comptabilite', 'reunions',
        'recouvrement', 'messages', 'users', 'supplements', 'shop',
        'audit', 'ziarra', 'documents', 'factures', 'statistiques', 'simulateur'
      ];
    }

    return Object.keys(permissions).filter(module => hasAnyPermission(module));
  };

  return {
    permissions,
    loading,
    error,
    isSuperAdmin: isSuper,
    hasPermission,
    canViewModule,
    canView,
    canCreate,
    canEdit,
    canUpdate,
    canDelete,
    getModulePermissions,
    hasAnyPermission,
    getAccessibleModules,
    refresh: loadPermissions
  };
};

export default usePermissions;