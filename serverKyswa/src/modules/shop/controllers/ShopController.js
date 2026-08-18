/**
 * @fileoverview Contrôleur pour le module Shop
 * Gestion des requêtes HTTP et réponses
 */

class ShopController {
  constructor(shopService) {
    this.service = shopService;
  }

  // ── Gestion des produits ──────────────────────────────────────────────────

  /**
   * GET /api/shop/produits
   */
  async getProduits(req, res, next) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        search: req.query.search,
        categorie: req.query.categorie,
        statut: req.query.statut,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await this.service.getProduits(filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/shop/produits/:id
   */
  async getProduitById(req, res, next) {
    try {
      const produit = await this.service.getProduitById(req.params.id);

      res.json({
        success: true,
        data: { produit }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/shop/produits
   */
  async createProduit(req, res, next) {
    try {
      const produit = await this.service.createProduit(req.body, req.user.id);

      res.status(201).json({
        success: true,
        data: { produit },
        message: 'Produit créé avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/shop/produits/:id
   */
  async updateProduit(req, res, next) {
    try {
      const produit = await this.service.updateProduit(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        data: { produit },
        message: 'Produit modifié avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/shop/produits/:id
   */
  async deleteProduit(req, res, next) {
    try {
      await this.service.deleteProduit(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Produit supprimé avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/shop/produits
   */
  async deleteAllProduits(req, res, next) {
    try {
      const result = await this.service.deleteAllProduits(req.user.id);

      res.json({
        success: true,
        message: `${result.deletedCount} produits supprimés avec succès`
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Gestion du stock ──────────────────────────────────────────────────────

  /**
   * POST /api/shop/produits/:id/ajuster-stock
   */
  async ajusterStock(req, res, next) {
    try {
      const result = await this.service.ajusterStock(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        data: result,
        message: 'Stock ajusté avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/shop/produits/:id/mouvements
   */
  async getMouvementsStock(req, res, next) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        dateDebut: req.query.dateDebut,
        dateFin: req.query.dateFin
      };

      const result = await this.service.getMouvementsStock(req.params.id, filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Statistiques ──────────────────────────────────────────────────────────

  /**
   * GET /api/shop/statistiques
   */
  async getStatistiques(req, res, next) {
    try {
      const statistiques = await this.service.getStatistiques();

      res.json({
        success: true,
        data: statistiques
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/shop/categories
   */
  async getCategories(req, res, next) {
    try {
      const categories = await this.service.getCategories();

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Gestion des commandes ─────────────────────────────────────────────────

  /**
   * POST /api/shop/commandes
   */
  async createCommande(req, res, next) {
    try {
      const commande = await this.service.createCommande(req.body, req.user.id);

      res.status(201).json({
        success: true,
        data: { order: commande },
        message: 'Commande créée avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/shop/commandes
   */
  async getCommandes(req, res, next) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        statut: req.query.statut,
        dateDebut: req.query.dateDebut,
        dateFin: req.query.dateFin
      };

      const result = await this.service.getCommandes(filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/shop/commandes/:id
   */
  async getCommandeById(req, res, next) {
    try {
      const commande = await this.service.getCommandeById(req.params.id);

      res.json({
        success: true,
        data: { order: commande }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/shop/commandes/:id
   */
  async updateCommande(req, res, next) {
    try {
      const commande = await this.service.updateCommande(
        req.params.id,
        req.body,
        req.user.id
      );

      res.json({
        success: true,
        data: { order: commande },
        message: 'Commande modifiée avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/shop/commandes/:id
   */
  async deleteCommande(req, res, next) {
    try {
      await this.service.deleteCommande(req.params.id, req.user.id);

      res.json({
        success: true,
        message: 'Commande supprimée avec succès'
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Méthodes utilitaires ──────────────────────────────────────────────────

  /**
   * GET /api/shop/mouvements/rapport
   */
  async getRapportMouvements(req, res, next) {
    try {
      const { dateDebut, dateFin, produitId } = req.query;

      // Cette fonctionnalité peut être implémentée plus tard
      res.json({
        success: true,
        data: {
          message: 'Rapport des mouvements - fonctionnalité à implémenter'
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ShopController;