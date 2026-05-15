/**
 * Connexion MongoDB Atlas via Mongoose.
 * Le serveur HTTP reste accessible même si la DB est indisponible.
 */

const mongoose = require('mongoose');

async function connectDB() {
  if (!process.env.MONGO_URI) {
    console.warn('⚠️  MONGO_URI non défini — le serveur fonctionne sans base de données');
    return;
  }
  try {
    console.log('🔄 Connexion à MongoDB Atlas...');
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('\x1b[32m%s\x1b[0m', '✅ Connecté à MongoDB Atlas');
  } catch (err) {
    console.error('❌ Erreur connexion MongoDB:', err.message);
    console.log('⚠️  Le serveur HTTP reste accessible malgré l\'erreur MongoDB');
  }
}

module.exports = { connectDB };
