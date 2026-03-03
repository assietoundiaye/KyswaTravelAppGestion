require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
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

// Routes d'authentification
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Routes de gestion des utilisateurs (ADMIN seulement)
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

// Routes de profil (utilisateur connecté)
const profileRoutes = require('./routes/profile');
app.use('/api/profile', profileRoutes);

// Routes clients (consultation par tous les rôles internes)
const clientsRoutes = require('./routes/clients');
app.use('/api/clients', clientsRoutes);

// Routes de gestion des packages (GESTIONNAIRE ou ADMIN)
const packagesRoutes = require('./routes/packages');
app.use('/api/packages', packagesRoutes);

// Routes de gestion des suppléments (GESTIONNAIRE ou ADMIN)
const supplementsRoutes = require('./routes/supplements');
app.use('/api/supplements', supplementsRoutes);

// Routes de gestion des billets (COMMERCIAL, GESTIONNAIRE, COMPTABLE)
const billetsRoutes = require('./routes/billets');
app.use('/api/billets', billetsRoutes);

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

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
  console.log(`📡 Route de test: http://localhost:${PORT}/api/test`);
  connectDB();
});

// Routes de gestion des réservations (COMMERCIAL ou ADMIN)
const reservationsRoutes = require('./routes/reservations');
app.use('/api/reservations', reservationsRoutes);

// Routes de factures (génération PDF)
const facturesRoutes = require('./routes/factures');
app.use('/api/factures', facturesRoutes);