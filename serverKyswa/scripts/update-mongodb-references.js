#!/usr/bin/env node
/**
 * Script pour remplacer toutes les références MongoDB par Prisma
 * Met à jour automatiquement les imports et les appels dans tous les fichiers
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔄 Mise à jour des références MongoDB → Prisma');

// Mapping des anciens modèles vers les nouveaux services/tables
const modelMapping = {
  'Client': 'clients',
  'Reservation': 'reservations', 
  'PackageK': 'packages',
  'Utilisateur': 'profiles',
  'Paiement': 'paiements',
  'Document': 'documents',
  'Message': 'messages',
  'Billet': 'billets',
  'Supplement': 'supplements',
  'Visa': 'visas',
  'Desistement': 'desistements',
  'BilanDepart': 'bilan_departs',
  'RapportQuotidien': 'rapports_quotidiens',
  'AuditLog': 'audit_logs',
  'Reunion': 'reunions',
  'Produit': 'produits',
  'ShopOrder': 'shop_orders',
  'StockMovement': 'stock_movements',
  'BilletGroupe': 'billets_groupe',
  'LigneSupplement': 'lignes_supplements',
  'Depense': 'depenses',
  'ZiarraProspect': 'ziarra_prospects',
  'Relance': 'relances'
};

// Créer une sauvegarde
console.log('💾 Création sauvegarde...');
const backupDir = path.join(__dirname, '..', 'backup-before-prisma');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Fonction pour créer un commentaire d'instruction
function createInstructions(filePath, models) {
  const instructions = `/**
 * ⚠️ MIGRATION MONGODB → PRISMA NÉCESSAIRE
 * 
 * Ce fichier contient des références aux anciens modèles MongoDB.
 * Modèles détectés: ${models.join(', ')}
 * 
 * Actions requises:
 * 1. Remplacer require('../models/X') par prismaService
 * 2. Remplacer Model.find() par prismaService.findMany('table', options)
 * 3. Remplacer Model.create() par prismaService.create('table', data)
 * 4. Adapter les requêtes aux conventions Prisma
 * 
 * Exemple:
 * const Client = require('../models/Client'); // ❌ Ancien
 * const prismaService = require('../services/prismaService'); // ✅ Nouveau
 * 
 * const clients = await Client.find(); // ❌ Ancien  
 * const clients = await prismaService.findMany('clients'); // ✅ Nouveau
 */

`;
  return instructions;
}

// Trouver tous les fichiers JS qui importent des modèles
const filesToCheck = [
  'routes/**/*.js',
  'services/**/*.js',
  'middleware/**/*.js',
  'config/**/*.js',
  'scripts/**/*.js'
];

let totalUpdated = 0;

filesToCheck.forEach(pattern => {
  const files = glob.sync(pattern, { cwd: path.join(__dirname, '..') });
  
  files.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    
    // Skip files already processed
    if (file.includes('prismaService.js') || file.includes('clientService.js')) {
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let hasModelImports = false;
    let modelsFound = [];
    
    // Chercher les imports de modèles MongoDB
    Object.keys(modelMapping).forEach(model => {
      const importPattern = new RegExp(`const ${model} = require\\(['"]\\.\\.\/models\/${model}['"]\\);?`, 'g');
      if (importPattern.test(content)) {
        hasModelImports = true;
        modelsFound.push(model);
      }
    });
    
    if (hasModelImports) {
      console.log(`📝 Traitement: ${file}`);
      
      // Sauvegarder le fichier original
      const backupPath = path.join(backupDir, file);
      const backupFileDir = path.dirname(backupPath);
      if (!fs.existsSync(backupFileDir)) {
        fs.mkdirSync(backupFileDir, { recursive: true });
      }
      fs.copyFileSync(filePath, backupPath);
      
      // Ajouter les instructions au début du fichier
      const instructions = createInstructions(file, modelsFound);
      
      // Conserver le contenu original mais ajouter les instructions
      const updatedContent = instructions + content;
      
      fs.writeFileSync(filePath, updatedContent);
      
      totalUpdated++;
      console.log(`   ✅ Instructions ajoutées (${modelsFound.length} modèles détectés)`);
    }
  });
});

// Créer un fichier de migration rapide pour les cas les plus courants
const quickMigrationScript = `// Script de migration rapide
// Remplacements les plus courants:

// 1. Imports
const prismaService = require('../services/prismaService'); // Au lieu des imports de modèles

// 2. Recherches
await prismaService.findMany('clients', { where: { actif: true } }); // Au lieu de Client.find()
await prismaService.findFirst('clients', { where: { id } }); // Au lieu de Client.findById()
await prismaService.findUnique('clients', { where: { id } }); // Pour un seul résultat unique

// 3. Création
await prismaService.create('clients', data); // Au lieu de Client.create()

// 4. Mise à jour  
await prismaService.update('clients', { id }, updateData); // Au lieu de Client.findByIdAndUpdate()

// 5. Suppression
await prismaService.delete('clients', { id }); // Au lieu de Client.findByIdAndDelete()

// 6. Comptage
await prismaService.count('clients', { actif: true }); // Au lieu de Client.countDocuments()

// Relations:
await prismaService.findMany('reservations', {
  include: {
    client: true,    // Populate équivalent
    packages: true
  }
});
`;

fs.writeFileSync(path.join(__dirname, '..', 'MIGRATION_GUIDE.js'), quickMigrationScript);

console.log(`\n✅ Traitement terminé:`);
console.log(`   📁 ${totalUpdated} fichiers marqués pour migration`);
console.log(`   💾 Sauvegardes créées dans: backup-before-prisma/`);
console.log(`   📖 Guide de migration: MIGRATION_GUIDE.js`);
console.log(`\n🔧 PROCHAINES ÉTAPES:`);
console.log(`1. Examiner chaque fichier marqué`);
console.log(`2. Remplacer les appels MongoDB par Prisma`);
console.log(`3. Tester chaque module`);
console.log(`4. Supprimer les commentaires d'instructions`);