/**
 * @fileoverview Routes pour le module Shop
 */

const express = require('express');
const ShopController = require('./controllers/ShopController');
const ShopPrismaRepository = require('./repositories/ShopPrismaRepository');
const ShopService = require('./services/ShopService');
const { protect } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

/**
 * Factory fonction : créer les routes avec DI
 */
function createShopRoutes(dependencies) {
  const { auditService } = dependencies;
  const router = express.Router();

  // ─────────────────────────────────────────────────────
  // INJECTION DE DÉPENDANCES
  // ─────────────────────────────────────────────────────
  const repository = new ShopPrismaRepository();
  const service = new ShopService(repository, auditService);
  const controller = new ShopController(service);

  // ─────────────────────────────────────────────────────
  // ROUTES PRODUITS
  // ─────────────────────────────────────────────────────

  // GET tous les produits
  router.get('/produits', protect, checkPermission('shop', 'view'), (req, res, next) =>
    controller.getProduits(req, res, next)
  );

  // GET produit par ID
  router.get('/produits/:id', protect, checkPermission('shop', 'view'), (req, res, next) =>
    controller.getProduitById(req, res, next)
  );

  // POST créer produit
  router.post('/produits', protect, checkPermission('shop', 'create'), (req, res, next) =>
    controller.createProduit(req, res, next)
  );

  // PATCH modifier produit
  router.patch('/produits/:id', protect, checkPermission('shop', 'edit'), (req, res, next) =>
    controller.updateProduit(req, res, next)
  );

  // DELETE supprimer produit
  router.delete('/produits/:id', protect, checkPermission('shop', 'delete'), (req, res, next) =>
    controller.deleteProduit(req, res, next)
  );

  // DELETE supprimer tous les produits (admin seulement)
  router.delete('/produits', protect, checkPermission('shop', 'delete'), (req, res, next) =>
    controller.deleteAllProduits(req, res, next)
  );

  // ─────────────────────────────────────────────────────
  // ROUTES GESTION STOCK
  // ─────────────────────────────────────────────────────

  // POST ajuster stock
  router.post('/produits/:id/ajuster-stock', protect, checkPermission('shop', 'edit'), (req, res, next) =>
    controller.ajusterStock(req, res, next)
  );

  // GET historique mouvements stock
  router.get('/produits/:id/mouvements', protect, checkPermission('shop', 'view'), (req, res, next) =>
    controller.getMouvementsStock(req, res, next)
  );

  // ─────────────────────────────────────────────────────
  // ROUTES COMMANDES
  // ─────────────────────────────────────────────────────

  // GET toutes les commandes
  router.get('/commandes', protect, checkPermission('shop', 'view'), (req, res, next) =>
    controller.getCommandes(req, res, next)
  );

  // GET commande par ID
  router.get('/commandes/:id', protect, checkPermission('shop', 'view'), (req, res, next) =>
    controller.getCommandeById(req, res, next)
  );

  // POST créer commande
  router.post('/commandes', protect, checkPermission('shop', 'create'), (req, res, next) =>
    controller.createCommande(req, res, next)
  );

  // PATCH modifier commande
  router.patch('/commandes/:id', protect, checkPermission('shop', 'edit'), (req, res, next) =>
    controller.updateCommande(req, res, next)
  );

  // DELETE supprimer commande
  router.delete('/commandes/:id', protect, checkPermission('shop', 'delete'), (req, res, next) =>
    controller.deleteCommande(req, res, next)
  );

  // ─────────────────────────────────────────────────────
  // ROUTES STATISTIQUES ET UTILITAIRES
  // ─────────────────────────────────────────────────────

  // GET statistiques
  router.get('/statistiques', protect, checkPermission('shop', 'view'), (req, res, next) =>
    controller.getStatistiques(req, res, next)
  );

  // GET catégories
  router.get('/categories', protect, checkPermission('shop', 'view'), (req, res, next) =>
    controller.getCategories(req, res, next)
  );

  // GET rapport mouvements
  router.get('/mouvements/rapport', protect, checkPermission('shop', 'view'), (req, res, next) =>
    controller.getRapportMouvements(req, res, next)
  );

  return router;
}

module.exports = createShopRoutes;