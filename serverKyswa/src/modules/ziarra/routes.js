/**
 * @fileoverview Routes — Module Ziarra (Prospects voyages Fès)
 * Migré vers Prisma/PostgreSQL (table prospects_ziarra)
 */
const express = require('express');
const prisma = require('../../database/client');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

function createZiarraRoutes(dependencies) {
  const router = express.Router();

  router.use(protect);

  /**
   * GET /api/ziarra
   * Liste des prospects Ziarra avec filtre optionnel par statut
   */
  router.get('/', checkPermission('ziarra', 'view'), async (req, res, next) => {
    try {
      const { statut, page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (statut) where.statut = statut;

      const [prospects, total] = await Promise.all([
        prisma.prospects_ziarra.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { created_at: 'desc' },
          include: {
            profiles: { select: { nom: true, prenom: true, role: true } }
          }
        }),
        prisma.prospects_ziarra.count({ where })
      ]);

      return res.status(200).json({
        success: true,
        data: prospects,
        prospects,
        total,
        count: prospects.length,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/ziarra/:id
   */
  router.get('/:id', checkPermission('ziarra', 'view'), async (req, res, next) => {
    try {
      const prospect = await prisma.prospects_ziarra.findUnique({
        where: { id: req.params.id },
        include: {
          profiles: { select: { nom: true, prenom: true } }
        }
      });
      if (!prospect) {
        return res.status(404).json({ success: false, message: 'Prospect non trouvé' });
      }
      return res.status(200).json({ success: true, data: prospect });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/ziarra
   * Créer un prospect Ziarra
   */
  router.post('/', checkPermission('ziarra', 'create'), async (req, res, next) => {
    try {
      const { id, created_at, ...data } = req.body;
      const prospect = await prisma.prospects_ziarra.create({
        data: {
          ...data,
          agent_id: req.user.id,
        }
      });
      return res.status(201).json({
        success: true,
        data: prospect,
        prospect,
        message: 'Prospect créé avec succès'
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * PATCH /api/ziarra/:id
   * Modifier un prospect
   */
  router.patch('/:id', checkPermission('ziarra', 'edit'), async (req, res, next) => {
    try {
      const { id, created_at, agent_id, ...data } = req.body;
      const prospect = await prisma.prospects_ziarra.update({
        where: { id: req.params.id },
        data
      });
      if (!prospect) {
        return res.status(404).json({ success: false, message: 'Prospect non trouvé' });
      }
      return res.status(200).json({
        success: true,
        data: prospect,
        prospect,
        message: 'Prospect mis à jour'
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /api/ziarra/:id
   */
  router.delete('/:id', checkPermission('ziarra', 'delete'), async (req, res, next) => {
    try {
      await prisma.prospects_ziarra.delete({ where: { id: req.params.id } });
      return res.status(200).json({ success: true, message: 'Prospect supprimé' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createZiarraRoutes;
