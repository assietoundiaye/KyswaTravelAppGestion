/**
 * Configuration Jest pour tests avec PostgreSQL/Prisma
 * Remplace l'ancienne configuration MongoDB
 */

const { PrismaClient } = require('../src/generated/prisma');

// Base de données de test dédiée
const testDatabaseUrl = process.env.TEST_DATABASE_URL || 
  'postgresql://bahdieng@localhost:5432/kyswa_local?schema=public';

// Override DATABASE_URL pour les tests
process.env.DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV = 'test';

// Créer instance Prisma globale
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: testDatabaseUrl,
    },
  },
  log: [], // Pas de logs pendant les tests
});

// Mock de config/database.js pour les tests
jest.mock('../config/database', () => {
  const { PrismaClient } = require('../src/generated/prisma');
  const mockPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://bahdieng@localhost:5432/kyswa_local?schema=public',
      },
    },
    log: [],
  });
  
  return {
    connectDB: jest.fn().mockResolvedValue(true),
    getPrisma: () => mockPrisma,
    isDatabaseConnected: jest.fn().mockResolvedValue(true),
    disconnectDB: jest.fn().mockResolvedValue(undefined)
  };
});

// Avant tous les tests : Connexion à la base de test
beforeAll(async () => {
  try {
    await prisma.$connect();
    console.log('✅ Connecté à la base de test PostgreSQL');
  } catch (error) {
    console.error('❌ Erreur connexion base de test:', error.message);
    throw error;
  }
}, 30000); // Timeout 30s

// Après tous les tests : Déconnexion propre
afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
    console.log('✅ Déconnecté de la base de test');
  }
}, 30000);

// Entre chaque test : Nettoyer les données de test
afterEach(async () => {
  if (!prisma) return;
  
  try {
    // Liste des tables à nettoyer (ordre important pour les clés étrangères)
    const tablesToClean = [
      'paiements',
      'lignes_supplements',
      'inscriptions',
      'pelerins',
      'passeports',
      'billets',
      'billets_groupe',
      'shop_commande_items',
      'shop_commandes',
      'shop_produits',
      'visas',
      'desistements',
      'recouvrement',
      'reunions',
      'documents_admin',
      'rapports_quotidiens',
      'messages',
      'message_reads',
      'audit_logs',
      'clients',
      'profiles',
    ];
    
    // Désactiver temporairement les contraintes de clés étrangères
    await prisma.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;
    
    // Nettoyer chaque table
    for (const table of tablesToClean) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
      } catch (error) {
        // Ignorer si la table n'existe pas
        if (!error.message.includes('does not exist')) {
          console.warn(`Warning: Could not truncate ${table}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.warn('Warning: Cleanup failed:', error.message);
  }
}, 10000);

// Export de l'instance Prisma pour les tests
module.exports = { prisma };
