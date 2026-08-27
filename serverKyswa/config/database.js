/**
 * Configuration base de données PostgreSQL avec Prisma.
 * Remplace complètement MongoDB.
 */

const { PrismaClient } = require('../src/generated/prisma');

let prisma;

async function connectDB() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL non défini dans .env');
    process.exit(1);
  }
  
  try {
    console.log('🔄 Connexion à PostgreSQL...');
    
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    
    // Test de connexion
    await prisma.$connect();
    console.log('\x1b[32m%s\x1b[0m', '✅ Connecté à PostgreSQL via Prisma');
    return true;
  } catch (err) {
    console.error('❌ Erreur connexion PostgreSQL:', err.message);
    
    if (err.message.includes('authentication')) {
      console.log('💡 Solution: Vérifier les identifiants PostgreSQL dans DATABASE_URL');
    } else if (err.message.includes('ECONNREFUSED')) {
      console.log('💡 Solution: Vérifier que PostgreSQL est démarré');
    }
    
    process.exit(1);
  }
}

// Obtenir l'instance Prisma
function getPrisma() {
  if (!prisma) {
    throw new Error('Base de données non initialisée. Appelez connectDB() d\'abord.');
  }
  return prisma;
}

// Vérifier l'état de la connexion
async function isDatabaseConnected() {
  if (!prisma) return false;
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// Fermeture propre
async function disconnectDB() {
  if (prisma) {
    await prisma.$disconnect();
    console.log('📴 Connexion PostgreSQL fermée');
  }
}

module.exports = { 
  connectDB, 
  getPrisma, 
  isDatabaseConnected, 
  disconnectDB 
};
