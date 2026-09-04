/**
 * @fileoverview Controller pour les Clients
 * Gère les requêtes HTTP
 * 
 * Responsabilité UNIQUE: Conversion HTTP ↔ Service
 */

const { ValidationException } = require('../../../shared/exceptions');

class ClientController {
  constructor(clientService) {
    this.service = clientService;
  }

  // ─────────────────────────────────────────────────────
  // CRUD DE BASE
  // ─────────────────────────────────────────────────────

  /**
   * GET /api/clients
   * Récupérer tous les clients avec pagination
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 50, search, q } = req.query;
      const searchQuery = (search || q || '').trim();

      const result = searchQuery
        ? await this.service.search(searchQuery, {
            page: parseInt(page),
            limit: parseInt(limit),
          })
        : await this.service.getAll(
            {},
            {
              page: parseInt(page),
              limit: parseInt(limit),
            }
          );

      const total = result.total || result.data?.length || 0;
      const lim = parseInt(limit);
      const cur = parseInt(page);
      const totalPages = Math.ceil(total / lim) || 1;

      res.status(200).json({
        success: true,
        data: result.data,
        clients: result.data,
        pagination: {
          current: cur,
          page: cur,
          limit: lim,
          total: total,
          pages: totalPages,
          totalPages: totalPages,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/clients/:id
   * Récupérer un client
   */
  async getById(req, res, next) {
    try {
      // getClientFull inclut inscriptions + départs + paiements + visas
      const client = await this.service.getClientFull(req.params.id);

      res.status(200).json({
        success: true,
        data: client,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/clients
   * Créer un client
   */
  async create(req, res, next) {
    try {
      const client = await this.service.create(req.body, req.user.id);

      res.status(201).json({
        success: true,
        data: client,
        message: 'Client créé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/clients/:id
   * Mettre à jour un client
   */
  async update(req, res, next) {
    try {
      const client = await this.service.update(req.params.id, req.body, req.user.id);

      res.status(200).json({
        success: true,
        data: client,
        message: 'Client mis à jour avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/clients/:id
   * Supprimer un client
   */
  async delete(req, res, next) {
    try {
      await this.service.delete(req.params.id, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Client supprimé avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  // ─────────────────────────────────────────────────────
  // RECHERCHE ET FILTRAGE
  // ─────────────────────────────────────────────────────

  /**
   * GET /api/clients/search?q=...
   * Rechercher clients
   */
  async search(req, res, next) {
    try {
      const { q, page = 1, limit = 20 } = req.query;

      if (!q) {
        throw new ValidationException('Terme de recherche requis (paramètre q)');
      }

      const result = await this.service.search(q, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          current: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/clients/alerts
   * Récupérer les alertes CRM (anniversaires et expirations de passeport)
   */
  async getAlerts(req, res, next) {
    try {
      const alerts = await this.service.getAlerts();
      res.status(200).json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/clients/agent/:agentId
   * Récupérer clients d'un agent
   */
  async getByAgent(req, res, next) {
    try {
      const { agentId } = req.params;

      const result = await this.service.getByAgent(agentId);

      // getByAgent retourne un tableau direct
      const data = Array.isArray(result) ? result : (result.data || []);

      res.status(200).json({
        success: true,
        data,
        total: data.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // ─────────────────────────────────────────────────────
  // FIDÉLITÉ
  // ─────────────────────────────────────────────────────

  /**
   * POST /api/clients/:id/loyalty/promote
   * Promouvoir client
   */
  async promoteLoyalty(req, res, next) {
    try {
      const client = await this.service.promoteLoyalty(req.params.id);

      res.status(200).json({
        success: true,
        data: client,
        message: `Client promu à ${client.niveauFidelite}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/clients/:id/loyalty/demote
   * Rétrograder client
   */
  async demoteLoyalty(req, res, next) {
    try {
      const client = await this.service.demoteLoyalty(req.params.id);

      res.status(200).json({
        success: true,
        data: client,
        message: `Client rétrogradé à ${client.niveauFidelite}`,
      });
    } catch (error) {
      next(error);
    }
  }

  // ─────────────────────────────────────────────────────
  // VISAS ET VOYAGES
  // ─────────────────────────────────────────────────────

  /**
   * POST /api/clients/:id/visa
   * Ajouter visa
   */
  async addVisa(req, res, next) {
    try {
      const client = await this.service.addVisa(req.params.id, req.body);

      res.status(200).json({
        success: true,
        data: client,
        message: 'Visa ajouté avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/clients/:id/voyage
   * Enregistrer voyage
   */
  async addVoyage(req, res, next) {
    try {
      const client = await this.service.addVoyage(req.params.id, req.body);

      res.status(200).json({
        success: true,
        data: client,
        message: 'Voyage enregistré avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  // ─────────────────────────────────────────────────────
  // STATISTIQUES
  // ─────────────────────────────────────────────────────

  /**
   * GET /api/clients/stats
   * Statistiques clients
   */
  async getStats(req, res, next) {
    try {
      const stats = await this.service.getStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ClientController;
