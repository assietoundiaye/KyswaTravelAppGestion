require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Vérification des variables d'environnement
if (!process.env.MONGO_URI) {
  console.warn('⚠️  MONGO_URI non défini dans .env - la connexion MongoDB sera ignorée');
}

// Middlewares
// Configuration Helmet moins restrictive pour le développement
app.use(helmet({
  contentSecurityPolicy: false, // Désactivé en dev pour éviter les blocages
  crossOriginEmbedderPolicy: false
}));

// CORS configuré pour accepter toutes les origines en développement
app.use(cors({
  origin: true, // Accepte toutes les origines
  credentials: true
}));

app.use(express.json());
app.use(morgan('dev'));

// Middleware de debug pour voir toutes les requêtes
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

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

// Connexion MongoDB (ne fait plus planter le serveur en cas d'erreur)
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