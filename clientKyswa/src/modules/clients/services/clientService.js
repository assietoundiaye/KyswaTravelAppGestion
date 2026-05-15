/**
 * @fileoverview Service API pour le module clients
 * Exemple de pattern pour les services frontend
 */

import api from '../../../core/api/axios';

/**
 * Service pour les opérations clients
 * Chaque méthode correspond à une route API
 */
export const clientService = {
  /**
   * Récupérer tous les clients avec pagination
   * GET /api/clients?page=1&limit=20
   */
  getAll: async (page = 1, limit = 20, filters = {}) => {
    const queryString = new URLSearchParams({
      page,
      limit,
      ...filters,
    }).toString();

    const response = await api.get(`/clients?${queryString}`);
    return response.data.data;
  },

  /**
   * Récupérer un client par ID
   * GET /api/clients/:id
   */
  getById: async (id) => {
    const response = await api.get(`/clients/${id}`);
    return response.data.data;
  },

  /**
   * Créer un nouveau client
   * POST /api/clients
   */
  create: async (clientData) => {
    const response = await api.post('/clients', clientData);
    return response.data.data;
  },

  /**
   * Mettre à jour un client
   * PATCH /api/clients/:id
   */
  update: async (id, clientData) => {
    const response = await api.patch(`/clients/${id}`, clientData);
    return response.data.data;
  },

  /**
   * Supprimer un client
   * DELETE /api/clients/:id
   */
  delete: async (id) => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  },

  /**
   * Rechercher des clients
   * GET /api/clients/search?q=...
   */
  search: async (query) => {
    const response = await api.get('/clients/search', {
      params: { q: query },
    });
    return response.data.data;
  },

  /**
   * Importer des clients depuis CSV
   * POST /api/clients/import
   */
  importCsv: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/clients/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Exporter les clients en CSV
   * GET /api/clients/export
   */
  exportCsv: async () => {
    const response = await api.get('/clients/export', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default clientService;
