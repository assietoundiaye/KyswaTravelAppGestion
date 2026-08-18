/**
 * @fileoverview Routes — Module packages
 */
const express = require('express');
const PackageRepository = require('./repositories/PackageRepository');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

function createPackagesRoutes(dependencies) {
  const router = express.Router();
  const repository = new PackageRepository();

  // GET departs ouverts
  router.get('/ouverts', protect, checkPermission('packages', 'view'), async (req, res, next) => {
    try {
      const result = await repository.findActifs();
      res.json({ success: true, packages: result, data: result });
    } catch (e) { next(e); }
  });

  // GET liste (paginée)
  router.get('/', protect, checkPermission('packages', 'view'), async (req, res, next) => {
    try {
      const { page = 1, limit = 500 } = req.query;
      const result = await repository.findMany({}, { page: +page, limit: +limit });
      res.json({
        success: true,
        data: result.data,
        total: result.total,
        packages: result.data,
        departs: result.data,
        profiles: result.data
      });
    } catch (e) { next(e); }
  });

  // GET par ID
  router.get('/:id', protect, checkPermission('packages', 'view'), async (req, res, next) => {
    try {
      const item = await repository.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Non trouvé' });
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // POST créer
  router.post('/', protect, checkPermission('packages', 'create'), async (req, res, next) => {
    try {
      const item = await repository.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // PATCH mettre à jour
  router.patch('/:id', protect, checkPermission('packages', 'edit'), async (req, res, next) => {
    try {
      const item = await repository.updateById(req.params.id, req.body);
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // DELETE supprimer
  router.delete('/:id', protect, checkPermission('packages', 'delete'), async (req, res, next) => {
    try {
      const packageId = req.params.id;
      
      // Vérifier d'abord s'il y a des inscriptions liées à ce départ
      const inscriptionsCount = await dependencies.models.inscriptions.count({
        where: { depart_id: packageId }
      });
      
      if (inscriptionsCount > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Impossible de supprimer ce départ. Il y a ${inscriptionsCount} inscription(s) associée(s). Veuillez d'abord supprimer ou réassigner les inscriptions.`,
          error: 'FOREIGN_KEY_CONSTRAINT'
        });
      }
      
      await repository.deleteById(packageId);
      res.json({ success: true, message: 'Départ supprimé avec succès' });
    } catch (e) { 
      // Gérer spécifiquement l'erreur de contrainte de clé étrangère
      if (e.code === 'P2003' || e.message?.includes('Foreign key constraint')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Impossible de supprimer ce départ car il y a des inscriptions associées. Veuillez d\'abord supprimer les inscriptions.',
          error: 'FOREIGN_KEY_CONSTRAINT'
        });
      }
      next(e); 
    }
  });

  return router;
}

module.exports = createPackagesRoutes;
