/**
 * @fileoverview Routes d'authentification
 */

const express = require('express');
const AuthController = require('./controllers/AuthController');
const AuthRepository = require('./repositories/AuthRepository');
const AuthService = require('./services/AuthService');
const { protect } = require('../../core/middleware/auth');

function createAuthRoutes(dependencies = {}) {
  const jwtUtil = dependencies.jwtUtil || require('../../core/utils/jwt');
  const router = express.Router();

  const authRepository = new AuthRepository();
  const authService = new AuthService(authRepository, jwtUtil);
  const authController = new AuthController(authService);

  // Routes publiques
  router.post('/login', (req, res, next) => authController.login(req, res, next));
  router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
  router.post('/logout', (req, res, next) => authController.logout(req, res, next));

  // Routes protégées
  router.get('/me', protect, (req, res, next) => authController.me(req, res, next));

  return router;
}

module.exports = createAuthRoutes;
