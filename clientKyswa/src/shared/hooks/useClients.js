/**
 * @fileoverview Hook personnalisé pour les clients
 * Pattern réutilisable pour tous les modules
 */

import { useState, useEffect, useCallback } from 'react';
import clientService from '../services/clientService';

/**
 * Hook pour gérer les clients
 * Gère : loading, erreur, pagination, CRUD
 */
export function useClients(initialPage = 1, initialLimit = 20) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit: initialLimit,
    total: 0,
  });

  /**
   * Charger les clients
   */
  const loadClients = useCallback(async (page = pagination.page, limit = pagination.limit) => {
    try {
      setLoading(true);
      setError(null);

      const data = await clientService.getAll(page, limit);

      setClients(data.data || []);
      setPagination({
        page: data.page || page,
        limit: data.limit || limit,
        total: data.total || 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du chargement');
      console.error('[useClients] Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  /**
   * Charger au montage
   */
  useEffect(() => {
    loadClients();
  }, []);

  /**
   * Créer un client
   */
  const create = useCallback(async (clientData) => {
    try {
      const newClient = await clientService.create(clientData);
      setClients([newClient, ...clients]);
      return newClient;
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création');
      throw err;
    }
  }, [clients]);

  /**
   * Mettre à jour un client
   */
  const update = useCallback(async (id, clientData) => {
    try {
      const updated = await clientService.update(id, clientData);
      setClients(clients.map(c => c._id === id ? updated : c));
      return updated;
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour');
      throw err;
    }
  }, [clients]);

  /**
   * Supprimer un client
   */
  const remove = useCallback(async (id) => {
    try {
      await clientService.delete(id);
      setClients(clients.filter(c => c._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression');
      throw err;
    }
  }, [clients]);

  /**
   * Aller à une page
   */
  const goToPage = useCallback((page) => {
    loadClients(page, pagination.limit);
  }, [pagination.limit, loadClients]);

  /**
   * Rafraîchir
   */
  const refresh = useCallback(() => {
    loadClients(pagination.page, pagination.limit);
  }, [pagination.page, pagination.limit, loadClients]);

  return {
    clients,
    loading,
    error,
    pagination,
    create,
    update,
    remove,
    goToPage,
    refresh,
  };
}

export default useClients;
