/**
 * @fileoverview Contrôleur pour les suppléments
 * Gestion des requêtes HTTP et réponses
 */

class SupplementController {
  constructor(supplementService) {
    this.service = supplementService;
  }

  /**
   * GET /api/supplements
   */
  async getAll(req, res, next) {
    try {
      const { page = 1, limit = 50, search = '', actif } = req.query;

      const filters = {};
      if (actif !== undefined) {
        filters.actif = actif === 'true';
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        search: search?.trim()
      };

      const result = await this.service.getSupplements(filters, options);

      res.json({
        success: true,
        ...result,
        supplements: result.data // Compatible avec le frontend existant
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/supplements/active
   */
  async getActive(req, res, next) {
    try {
      const supplements = await this.service.getActiveSupplements();

      res.json({
        success: true,
        supplements
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/supplements/:id
   */
  async getById(req, res, next) {
    try {
      const supplement = await this.service.getSupplementById(req.params.id);

      res.json({
        success: true,
        supplement
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/supplements
   */
  async create(req, res, next) {
    try {
      const supplement = await this.service.createSupplement(req.body, req.user.id);

      res.status(201).json({
        success: true,
        supplement,
        message: 'Supplément créé avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/supplements/:id
   */
  async update(req, res, next) {
    try {
      const supplement = await this.service.updateSupplement(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        supplement,
        message: 'Supplément modifié avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/supplements/:id
   */
  async delete(req, res, next) {
    try {
      await this.service.deleteSupplement(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Supplément supprimé avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/supplements/:id/toggle
   */
  async toggleActive(req, res, next) {
    try {
      const supplement = await this.service.getSupplementById(req.params.id);
      
      const updated = await this.service.updateSupplement(
        req.params.id,
        { actif: !supplement.actif },
        req.user.id
      );

      res.json({
        success: true,
        supplement: updated,
        message: `Supplément ${updated.actif ? 'activé' : 'désactivé'} avec succès`
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SupplementController;