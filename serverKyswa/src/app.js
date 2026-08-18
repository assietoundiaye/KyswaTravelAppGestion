/**
 * @fileoverview Application Express structurée
 * Centralise la configuration d'Express et charge les modules
 * 
 * Usage:
 *   const app = require('./app');
 *   app.initialize().then(() => server.listen(port));
 */

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const AppConfig = require('./core/config/AppConfig');
const { errorHandler } = require('./core/middleware/errorHandler');

// Global BigInt serializer for Express res.json()
BigInt.prototype.toJSON = function () {
  const intVal = Number(this);
  return Number.isSafeInteger(intVal) ? intVal : this.toString();
};

class App {
  constructor() {
    this.app = express();
    this.config = new AppConfig();
    this.middleware = [];
    this.routes = [];
  }

  /**
   * Initialiser la configuration d'Express
   */
  setupMiddleware() {
    // Sécurité
    this.app.use(helmet());

    // Logging
    this.app.use(morgan('combined'));

    // CORS
    this.app.use(
      cors({
        origin: this.config.getConfig().corsOrigin,
        credentials: true,
      })
    );

    // Parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ limit: '10mb', extended: true }));
    this.app.use(cookieParser());

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.status(200).json({ status: 'OK', timestamp: new Date() });
    });
  }

  /**
   * Charger les routes des modules
   * @param {Object} dependencies - Dépendances injectées (models, utils, etc.)
   */
  setupRoutes(dependencies) {
    console.log('[App] Chargement des routes modules...');

    // ─────────────────────────────────────────────────────
    // MODULES MÉTIER
    // ─────────────────────────────────────────────────────

    const moduleRoutes = [
      { path: './modules/auth/routes',         api: '/api/auth' },
      { path: './modules/clients/routes',      api: '/api/clients' },
      { path: './modules/reservations/routes', api: '/api/reservations' },
      { path: './modules/paiements/routes',    api: '/api/paiements' },
      { path: './modules/visas/routes',        api: '/api/visas' },
      { path: './modules/desistements/routes', api: '/api/desistements' },
      { path: './modules/billets/routes',      api: '/api/billets' },
      { path: './modules/comptabilite/routes', api: '/api/comptabilite' },
      { path: './modules/packages/routes',     api: '/api/packages' },
      { path: './modules/rapports/routes',     api: '/api/rapports' },
      { path: './modules/reunions/routes',     api: '/api/reunions' },
      { path: './modules/recouvrement/routes', api: '/api/recouvrement' },
      { path: './modules/messages/routes',     api: '/api/messages' },
      { path: './modules/users/routes',        api: '/api/users' },
      { path: './modules/users/routes',        api: '/api/profile' }, // Compatibilité route profile
      { path: './modules/supplements/routes',  api: '/api/supplements' },
      { path: './modules/shop/routes',         api: '/api/shop' },
      { path: './modules/audit/routes',        api: '/api/audit' },
      { path: './modules/permissions/routes',  api: '/api/permissions', factory: 'createPermissionsRoutes' },
      { path: './modules/public/routes',       api: '/api/public' },
      { path: './modules/bilan/routes',        api: '/api/bilan' },
      { path: './modules/ziarra/routes',       api: '/api/ziarra' },
      { path: './modules/factures/routes',     api: '/api/factures' },
      { path: './modules/documents/routes',    api: '/api/documents' },
    ];

    for (const { path, api, factory } of moduleRoutes) {
      try {
        const mod = require(path);
        const createRoutes = factory ? mod[factory] : mod;
        this.app.use(api, createRoutes(dependencies));
        console.log('  ✓', api);
      } catch (error) {
        console.log('  ⚠', api, '(non disponible):', error.message.split('\n')[0]);
      }
    }

    // Swagger UI Documentation
    try {
      const swaggerUi = require('swagger-ui-express');
      const swaggerSpecs = require('../config/swagger');
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
      console.log('  ✓ /api-docs (Swagger UI)');
    } catch (swErr) {
      console.log('  ⚠ /api-docs (Swagger non disponible):', swErr.message);
    }

    // ─────────────────────────────────────────────────────
    // ROUTES PUBLIQUES (Sans authentification)
    // ─────────────────────────────────────────────────────

    // Suivi réservation (example)
    // this.app.get('/public/reservation/:numero', async (req, res) => { ... });

    // ─────────────────────────────────────────────────────
    // HANDLERS GLOBAUX
    // ─────────────────────────────────────────────────────

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Route non trouvée',
        path: req.path,
      });
    });

    // Error handler (DOIT être en dernier)
    this.app.use(errorHandler);

    console.log('[App] Routes chargées ✓');
  }

  /**
   * Configurer Socket.IO
   * @param {http.Server} server - Serveur HTTP
   */
  setupSocketIO(server) {
    const config = this.config.getConfig();
    this.io = socketIo(server, {
      cors: {
        origin: config.corsOrigin,
        credentials: true,
      },
    });

    this.io.on('connection', (socket) => {
      console.log(`[Socket.IO] Client connecté: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`[Socket.IO] Client déconnecté: ${socket.id}`);
      });
    });

    return this.io;
  }

  /**
   * Initialiser l'application complète
   * @param {Object} dependencies - Dépendances (models, utils, db, etc.)
   */
  async initialize(dependencies) {
    try {
      this.config.validateEnvironment();
      this.setupMiddleware();
      this.setupRoutes(dependencies);

      console.log('[App] Configuration complète');
      return this.app;
    } catch (error) {
      console.error('[App] Erreur lors de l\'initialisation:', error);
      throw error;
    }
  }

  /**
   * Obtenir l'instance Express
   */
  getApp() {
    return this.app;
  }

  /**
   * Obtenir la configuration
   */
  getConfig() {
    return this.config.getConfig();
  }
}

module.exports = App;
