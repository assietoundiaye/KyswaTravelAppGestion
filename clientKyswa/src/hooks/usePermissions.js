import { useState, useEffect, useContext } from 'react';
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

  useEffect(() => {
    if (user?.id) {
      loadPermissions();
    } else {
      setPermissions({});
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/permissions/me');
      
      if (response.data?.success) {
        let permissionsMap = {};

        if (response.data.permissions) {
          // Format objet : { module: { canView, canCreate, ... } }
          for (const [mod, val] of Object.entries(response.data.permissions)) {
            permissionsMap[mod] = {
              view: val.canView ?? val.can_view ?? true,
              create: val.canCreate ?? val.can_create ?? true,
              edit: val.canEdit ?? val.can_edit ?? true,
              delete: val.canDelete ?? val.can_delete ?? true,
            };
          }
        } else if (Array.isArray(response.data.data)) {
          // Format tableau legacy
          response.data.data.forEach(perm => {
            permissionsMap[perm.module] = {
              view: perm.can_view,
              create: perm.can_create,
              edit: perm.can_edit,
              delete: perm.can_delete
            };
          });
        }

        setPermissions(permissionsMap);
        setError(null);
      } else {
        throw new Error(response.data?.message || 'Erreur lors du chargement des permissions');
      }
    } catch (err) {
      console.error('Erreur permissions:', err);
      setError(err.message);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  /**
   * Vérifier si l'utilisateur a une permission spécifique
   */
  const hasPermission = (module, action = 'view') => {
    if (isSuper) {
      return true;
    }
    const actionKey = action === 'canView' ? 'view' : action;
    return permissions[module]?.[actionKey] === true || permissions[module]?.[action] === true;
  };

  /**
   * Vérifier si l'utilisateur peut voir un module
   */
  const canViewModule = (module) => {
    if (isSuper) return true;
    return hasPermission(module, 'view');
  };

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
    return permissions[module] || null;
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
        'visas', 'desistements', 'rapports', 'comptabilite', 'reunions',
        'recouvrement', 'messages', 'users', 'supplements', 'shop',
        'audit', 'ziarra', 'documents', 'factures', 'statistiques'
      ];
    }

    return Object.keys(permissions).filter(module => hasAnyPermission(module));
  };

  return {
    permissions,
    loading,
    error,
    hasPermission,
    canViewModule,
    getModulePermissions,
    hasAnyPermission,
    getAccessibleModules,
    refresh: loadPermissions
  };
};

export default usePermissions;