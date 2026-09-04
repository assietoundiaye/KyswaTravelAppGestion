/**
 * @fileoverview Routes pour le module Rooming (Répartition des chambres)
 */

const express = require('express');
const { protect, requireRole } = require('../../core/middleware/auth');
const RoomingRepository = require('./repositories/RoomingRepository');
const RoomingService = require('./services/RoomingService');
const RoomingController = require('./controllers/RoomingController');

function createRoomingRoutes() {
  const router = express.Router();
  const repository = new RoomingRepository();
  const service = new RoomingService(repository);
  const controller = new RoomingController(service);

  // Tous les rôles autorisés (Commercial, Oumra, Direction, Admin)
  const allowedRoles = ['commercial', 'oumra', 'oumra_ziara', 'dg', 'administrateur', 'informatique', 'admin', 'secretaire'];

  router.use(protect);
  router.use(requireRole(...allowedRoles));

  // Récupérer la vue d'ensemble du rooming pour un départ
  router.get('/depart/:departId', (req, res, next) => controller.getOverview(req, res, next));

  // Créer une chambre unique
  router.post('/chambres', (req, res, next) => controller.createChambre(req, res, next));

  // Créer une série de chambres en lot
  router.post('/chambres/batch', (req, res, next) => controller.createChambresBatch(req, res, next));

  // Modifier une chambre
  router.put('/chambres/:id', (req, res, next) => controller.updateChambre(req, res, next));

  // Supprimer une chambre
  router.delete('/chambres/:id', (req, res, next) => controller.deleteChambre(req, res, next));

  // Affecter un pèlerin à une chambre
  router.post('/assign', (req, res, next) => controller.assign(req, res, next));

  // Retirer un pèlerin d'une chambre
  router.post('/unassign', (req, res, next) => controller.unassign(req, res, next));

  // Mettre à jour l'hôtel du départ
  router.put('/depart/:departId/hotel', (req, res, next) => controller.updateHotel(req, res, next));

  // Pré-affectation automatique intelligente
  router.post('/depart/:departId/auto-assign', (req, res, next) => controller.autoAssign(req, res, next));

  return router;
}

module.exports = createRoomingRoutes;
