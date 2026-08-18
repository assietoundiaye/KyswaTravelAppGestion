require('dotenv').config();
require('./config/cloudinary'); // initialiser Cloudinary tôt pour valider les vars d'env

const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { initRedis, closeRedis } = require('./config/redis');

const { initSocket } = require('./config/socket');
const { connectDB, isDatabaseConnected } = require('./config/database');
const registerRoutes = require('./config/routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ── Redis ─────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  initRedis();
}

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = initSocket(server);
app.set('io', io); // accessible dans les routes via req.app.get('io')

// ── Middlewares globaux ───────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(morgan('dev'));

// Désactiver ETag pour éviter les réponses 304 qui renvoient sans body
app.disable('etag');

// Forcer les API à ne pas être mises en cache côté client (évite les 304 inattendus)
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// ── Documentation Swagger ─────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Kyswa Travel API Documentation',
}));

// ── Routes utilitaires ────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const dbConnected = await isDatabaseConnected();
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    database: dbConnected ? 'PostgreSQL connecté' : 'PostgreSQL déconnecté',
  });
});

// ── Routes API ────────────────────────────────────────────────────────────────
registerRoutes(app);

// ── Gestionnaire d'erreurs global (doit être après les routes) ────────────────
app.use(errorHandler);

// ── Gestion des erreurs non capturées ─────────────────────────────────────────
process.on('uncaughtException', (error) => {
  console.error('💥 Exception non capturée:', error);
});
process.on('unhandledRejection', (reason) => {
  console.error('💥 Rejection non gérée:', reason);
});

// ── Démarrage ─────────────────────────────────────────────────────────────────
server.listen(PORT, async () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
  await connectDB();
});

module.exports = { app, server };
