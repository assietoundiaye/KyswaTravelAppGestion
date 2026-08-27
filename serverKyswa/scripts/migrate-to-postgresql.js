#!/usr/bin/env node
/**
 * Script de migration complète MongoDB → PostgreSQL
 * Supprime toutes les dépendances MongoDB et met à jour les services
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔄 Début migration MongoDB → PostgreSQL');

// ── ÉTAPE 1: Supprimer node_modules MongoDB ──────────────────────────────────
console.log('📦 Suppression dépendances MongoDB...');
try {
  execSync('npm uninstall mongodb mongoose mongodb-memory-server', { stdio: 'inherit' });
  console.log('✅ Dépendances MongoDB supprimées');
} catch (error) {
  console.log('⚠️  Certaines dépendances étaient déjà supprimées');
}

// ── ÉTAPE 2: Supprimer dossiers MongoDB ─────────────────────────────────────
console.log('📁 Nettoyage dossiers MongoDB...');
const mongoDirs = [
  '.mongodb-binaries',
  'data/mongodb',
  'logs/mongodb'
];

mongoDirs.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`🗑️  Supprimé: ${dir}`);
  }
});

// ── ÉTAPE 3: Archiver les modèles MongoDB ───────────────────────────────────
console.log('📋 Archivage modèles MongoDB...');
const modelsDir = path.join(__dirname, '..', 'models');
const archiveDir = path.join(__dirname, '..', 'models-mongodb-archive');

if (fs.existsSync(modelsDir) && !fs.existsSync(archiveDir)) {
  fs.renameSync(modelsDir, archiveDir);
  console.log('✅ Modèles MongoDB archivés dans models-mongodb-archive/');
}

// ── ÉTAPE 4: Créer nouveau dossier services ─────────────────────────────────
console.log('🏗️  Création services PostgreSQL...');
const servicesDir = path.join(__dirname, '..', 'services');
if (!fs.existsSync(servicesDir)) {
  fs.mkdirSync(servicesDir, { recursive: true });
}

// ── ÉTAPE 5: Générer client Prisma ──────────────────────────────────────────
console.log('⚡ Génération client Prisma...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Client Prisma généré');
} catch (error) {
  console.error('❌ Erreur génération Prisma:', error.message);
}

// ── ÉTAPE 6: Test connexion PostgreSQL ──────────────────────────────────────
console.log('🔌 Test connexion PostgreSQL...');
try {
  const { connectDB } = require('../config/database');
  connectDB().then(() => {
    console.log('✅ Connexion PostgreSQL OK');
  }).catch(err => {
    console.error('❌ Connexion PostgreSQL échouée:', err.message);
    console.log('💡 Vérifiez DATABASE_URL dans .env');
  });
} catch (error) {
  console.error('❌ Erreur test connexion:', error.message);
}

console.log('\n🎯 Migration MongoDB → PostgreSQL terminée !');
console.log('\n📋 PROCHAINES ÉTAPES:');
console.log('1. Vérifiez DATABASE_URL dans .env');
console.log('2. Lancez: npm run prisma:migrate');
console.log('3. Testez: npm run dev');
console.log('4. Supprimez models-mongodb-archive/ si tout fonctionne');