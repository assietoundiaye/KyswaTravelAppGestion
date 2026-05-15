require('dotenv').config();
require('./config/cloudinary'); // initialiser Cloudinary tôt pour valider les vars d'env

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');

const { initSocket } = require('./config/socket');
const { connectDB } = require('./config/database');
const registerRoutes = require('./config/routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

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

// ── Routes API ────────────────────────────────────────────────────────────────
registerRoutes(app);

// ── Routes utilitaires ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    mongo: mongoose.connection.readyState === 1 ? 'connecté' : 'déconnecté',
  });
});

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
server.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
  connectDB();
});
