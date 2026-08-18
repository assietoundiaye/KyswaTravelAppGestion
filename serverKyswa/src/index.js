/**
 * @fileoverview Point d'entrée — Backend Kyswa Travel
 * Architecture : Express + Prisma + PostgreSQL seulement
 */

require('dotenv').config();
const http = require('http');
const App = require('./app');

// ─────────────────────────────────────────────────────────
// DÉMARRAGE DU SERVEUR
// ─────────────────────────────────────────────────────────

async function startServer() {
  try {
    // 1. Instance App
    const appInstance = new App();
    const config = appInstance.getConfig();

    // 2. Connexion PostgreSQL via Prisma
    console.log('[DB] Connexion à PostgreSQL...');
    const prisma = require('./database/client');
    await prisma.$connect();
    console.log('[DB] ✓ Connecté à PostgreSQL');

    // 3. Délégués Prisma (vrais noms de tables PostgreSQL)
    console.log('[Models] Chargement des modèles Prisma...');
    const models = require('./database/prismaModels');
    console.log('[Models] ✓ Modèles chargés');

    // 4. Dépendances injectées dans les routes
    const dependencies = {
      models,
      config,
    };

    // 5. Initialiser l'application Express
    const expressApp = await appInstance.initialize(dependencies);

    // 6. Serveur HTTP
    const server = http.createServer(expressApp);

    // 7. Socket.IO
    appInstance.setupSocketIO(server);

    // 8. Écoute
    const port = config.port || process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`
╔════════════════════════════════════════════╗
║   🚀 KYSWA TRAVEL — API Démarrée          ║
║   Port      : ${String(port).padEnd(28)}║
║   Env       : ${String(config.env || 'development').padEnd(28)}║
║   Base      : PostgreSQL seulement ✓       ║
║   Socket.IO : Activé ✓                     ║
╚════════════════════════════════════════════╝
      `);
    });

    // 9. Gestion de l'arrêt propre
    const shutdown = async (signal) => {
      console.log(`\n[Server] Signal ${signal} — Arrêt en cours...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('[Server] ✓ Déconnecté de PostgreSQL');
        console.log('[Server] ✓ Serveur arrêté');
        process.exit(0);
      });
    };

    process.on('SIGINT',  () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // 10. Erreur port déjà utilisé
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server] ❌ Port ${port} déjà utilisé. Tuez le process existant :`);
        console.error(`         lsof -ti:${port} | xargs kill -9`);
      } else {
        console.error('[Server] ❌ Erreur serveur:', err.message);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('[Error] ❌ Impossible de démarrer:', error.message);
    process.exit(1);
  }
}

startServer();
