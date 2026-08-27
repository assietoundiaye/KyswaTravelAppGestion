/**
 * Script d'initialisation de la base de données de test
 * Utilise Prisma pour créer les tables dans kyswa_test
 */

require('dotenv').config();
const { execSync } = require('child_process');
const { PrismaClient } = require('../src/generated/prisma');

async function initTestDatabase() {
  console.log('🔄 Initialisation de la base de test kyswa_test...');
  
  const testDatabaseUrl = 'postgresql://bahdieng@localhost:5432/kyswa_test?schema=public';
  
  // Définir l'URL de test
  process.env.DATABASE_URL = testDatabaseUrl;
  
  try {
    // Étape 1 : S'assurer que la base existe
    console.log('📦 Vérification de la base de données...');
    execSync(`psql -U bahdieng -d postgres -c "CREATE DATABASE kyswa_test" 2>&1 || echo "Base existe déjà"`, { 
      stdio: 'inherit' 
    });
    
    // Étape 2 : Pousser le schéma Prisma
    console.log('📋 Application du schéma Prisma...');
    execSync(`npx prisma db push --skip-generate`, { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: testDatabaseUrl }
    });
    
    // Étape 3 : Vérifier les tables
    const prisma = new PrismaClient({
      datasources: {
        db: { url: testDatabaseUrl }
      }
    });
    
    await prisma.$connect();
    
    const result = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log(`✅ Base de test initialisée avec ${result[0].count} tables`);
    console.log(`🎯 Prête pour les tests : ${testDatabaseUrl}`);
    
    await prisma.$disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error.message);
    process.exit(1);
  }
}

initTestDatabase();
