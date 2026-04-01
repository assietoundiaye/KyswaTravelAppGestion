require('dotenv').config();
// initialize Cloudinary config early so env vars are checked
require('./config/cloudinary');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  },
});

// Rendre io accessible dans les routes
app.set('io', io);

io.on('connection', (socket) => {
  const userId = socket.handshake.auth.userId;
  if (userId) {
    socket.join(`user_${userId}`);
    console.log(`🔌 Socket connecté: user_${userId}`);
  }

  socket.on('send_message', async (data) => {
    try {
      const Message = require('./models/Message');
      const message = await Message.create({
        expediteurId: userId,
        destinataireId: data.destinataireId,
        contenu: data.contenu,
      });
      await message.populate('expediteurId', 'nom prenom role');
      await message.populate('destinataireId', 'nom prenom role');

      // Envoyer au destinataire en temps réel
      io.to(`user_${data.destinataireId}`).emit('new_message', message);
      // Confirmer à l'expéditeur
      socket.emit('message_sent', message);
    } catch (err) {
      socket.emit('message_error', { message: 'Erreur envoi message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket déconnecté: user_${userId}`);
  });
});

// Vérification des variables d'environnement
if (!process.env.MONGO_URI) {
  console.warn('⚠️  MONGO_URI non défini dans .env - la connexion MongoDB sera ignorée');
}

// CORS configuré pour accepter toutes les origines en développement
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(morgan('dev'));

// Middleware de debug pour voir toutes les requêtes
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Middleware d'audit (enregistre les mutations)
const { auditMiddleware } = require('./middleware/audit');

// Routes publiques (sans authentification)
const publicRoutes = require('./routes/public');
app.use('/api/public', publicRoutes);

// Routes d'authentification
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Routes de gestion des utilisateurs (ADMIN seulement)
const usersRoutes = require('./routes/users');
app.use('/api/users', auditMiddleware, usersRoutes);

// Routes de profil (utilisateur connecté)
const profileRoutes = require('./routes/profile');
app.use('/api/profile', auditMiddleware, profileRoutes);

// Routes clients (consultation par tous les rôles internes)
const clientsRoutes = require('./routes/clients');
app.use('/api/clients', auditMiddleware, clientsRoutes);

// Routes de gestion des packages (GESTIONNAIRE ou ADMIN)
const packagesRoutes = require('./routes/packages');
app.use('/api/packages', auditMiddleware, packagesRoutes);

// Routes de gestion des suppléments (GESTIONNAIRE ou ADMIN)
const supplementsRoutes = require('./routes/supplements');
app.use('/api/supplements', auditMiddleware, supplementsRoutes);

// Routes de gestion des billets (COMMERCIAL, GESTIONNAIRE, COMPTABLE)
const billetsRoutes = require('./routes/billets');
app.use('/api/billets', auditMiddleware, billetsRoutes);

// Routes de gestion des documents (COMMERCIAL, COMPTABLE, ADMIN)
const documentsRoutes = require('./routes/documents');
app.use('/api/documents', auditMiddleware, documentsRoutes);

// Routes de test protégées
const testRoutes = require('./routes/test');
app.use('/api/test', testRoutes);

// Middleware global de gestion des erreurs (doit être après les routes)
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

// Route de test
app.get('/api/test', (req, res) => {
  try {
    console.log('✅ Route /api/test appelée avec succès');
    res.json({
      message: 'Backend Kyswa Travel OK',
      timestamp: new Date().toISOString(),
      mongoStatus: mongoose.connection.readyState === 1 ? 'connecté' : 'non connecté'
    });
  } catch (error) {
    console.error('Erreur dans /api/test:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    mongo: mongoose.connection.readyState === 1 ? 'connecté' : 'déconnecté'
  });
});

// Gestion des erreurs globales
process.on('uncaughtException', (error) => {
  console.error('❌ Exception non capturée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Rejection non gérée:', reason);
});

// Connexion MongoDB
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.log('ℹ️  MongoDB non configuré - le serveur fonctionne sans DB');
    return;
  }
  try {
    console.log('🔄 Tentative de connexion à MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
      serverSelectionTimeoutMS: 5000
    });
    console.log('\x1b[32m%s\x1b[0m', '✅ Connecté à MongoDB Atlas !');
  } catch (err) {
    console.error('❌ Erreur connexion MongoDB:', err.message);
    console.log('ℹ️  Le serveur HTTP reste accessible malgré l\'erreur MongoDB');
  }
};

// Routes de gestion des réservations (COMMERCIAL ou ADMIN)
const reservationsRoutes = require('./routes/reservations');
app.use('/api/reservations', auditMiddleware, reservationsRoutes);

// Routes de paiements (réservations + billets)
const paiementsRoutes = require('./routes/paiements');
app.use('/api/reservations', auditMiddleware, paiementsRoutes);
app.use('/api/billets', auditMiddleware, paiementsRoutes);
app.use('/api/paiements', auditMiddleware, paiementsRoutes);

// Routes de factures (génération PDF)
const facturesRoutes = require('./routes/factures');
app.use('/api/factures', facturesRoutes);

// Routes de messagerie interne
const messagesRoutes = require('./routes/messages');
app.use('/api/messages', messagesRoutes);

// Routes statistiques (ADMIN)
const statsRoutes = require('./routes/stats');
app.use('/api/stats', statsRoutes);

// Routes export CSV
const exportRoutes = require('./routes/export');
app.use('/api/export', exportRoutes);

// Nouveaux modules métier
const visasRoutes = require('./routes/visas');
app.use('/api/visas', auditMiddleware, visasRoutes);

const desistementsRoutes = require('./routes/desistements');
app.use('/api/desistements', auditMiddleware, desistementsRoutes);

const recouvrementRoutes = require('./routes/recouvrement');
app.use('/api/recouvrement', auditMiddleware, recouvrementRoutes);

const reunionsRoutes = require('./routes/reunions');
app.use('/api/reunions', auditMiddleware, reunionsRoutes);

const bilanRoutes = require('./routes/bilan');
app.use('/api/bilan', bilanRoutes);

// Nouveaux modules
const billetsGroupeRoutes = require('./routes/billetsGroupe');
app.use('/api/billets-groupe', auditMiddleware, billetsGroupeRoutes);

const ziarraRoutes = require('./routes/ziarra');
app.use('/api/ziarra', auditMiddleware, ziarraRoutes);

const comptabiliteRoutes = require('./routes/comptabilite');
app.use('/api/comptabilite', auditMiddleware, comptabiliteRoutes);

const rapportsRoutes = require('./routes/rapports');
app.use('/api/rapports', auditMiddleware, rapportsRoutes);

// Démarrage du serveur
server.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
  console.log(`📡 Route de test: http://localhost:${PORT}/api/test`);
  connectDB();
});