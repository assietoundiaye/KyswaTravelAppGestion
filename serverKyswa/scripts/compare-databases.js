/**
 * @fileoverview Script de comparaison et de vérification des bases de données
 * Compare le nombre d'enregistrements et vérifie des échantillons de données 
 * entre MongoDB (source) et PostgreSQL/Supabase (destination).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const prisma = require('../src/database/client');

// Import des modèles Mongoose
const Utilisateur = require('../models/Utilisateur');
const Client = require('../models/Client');
const Counter = require('../models/Reservation').Counter;
const BilletCounter = require('../models/Billet').BilletCounter;
const Supplement = require('../models/Supplement');
const PackageK = require('../models/PackageK');
const Produit = require('../models/Produit');
const StockMovement = require('../models/StockMovement');
const ShopOrder = require('../models/ShopOrder');
const Reservation = require('../models/Reservation');
const Billet = require('../models/Billet');
const Paiement = require('../models/Paiement');
const Document = require('../models/Document');
const Desistement = require('../models/Desistement');
const Visa = require('../models/Visa');
const BilanDepart = require('../models/BilanDepart');
const Bureau = require('../models/Bureau');
const ConfigurationPeriode = require('../models/ConfigurationPeriode');
const Depense = require('../models/Depense');
const HistoriqueAction = require('../models/HistoriqueAction');
const Message = require('../models/Message');
const RapportQuotidien = require('../models/RapportQuotidien');
const Relance = require('../models/Relance');
const Reunion = require('../models/Reunion');
const ZiarraProspect = require('../models/ZiarraProspect');
const AuditLog = require('../models/AuditLog');
const BilletGroupe = require('../models/BilletGroupe');

const modelsToCompare = [
  { name: 'Utilisateur', mongoModel: Utilisateur, prismaModel: prisma.utilisateur, checkField: 'email' },
  { name: 'Client', mongoModel: Client, prismaModel: prisma.client, checkField: 'nom' },
  { name: 'Counter', mongoModel: mongoose.model('Counter'), prismaModel: prisma.counter, checkField: 'seq' },
  { name: 'BilletCounter', mongoModel: mongoose.model('BilletCounter'), prismaModel: prisma.billetCounter, checkField: 'seq' },
  { name: 'Supplement', mongoModel: Supplement, prismaModel: prisma.supplement, checkField: 'nom' },
  { name: 'PackageK', mongoModel: PackageK, prismaModel: prisma.packageK, checkField: 'nomReference' },
  { name: 'Produit', mongoModel: Produit, prismaModel: prisma.produit, checkField: 'nom' },
  { name: 'StockMovement', mongoModel: StockMovement, prismaModel: prisma.stockMovement, checkField: 'type' },
  { name: 'ShopOrder', mongoModel: ShopOrder, prismaModel: prisma.shopOrder, checkField: 'orderNumber' },
  { name: 'Reservation', mongoModel: Reservation, prismaModel: prisma.reservation, checkField: 'numero' },
  { name: 'Billet', mongoModel: Billet, prismaModel: prisma.billet, checkField: 'numeroBillet' },
  { name: 'Paiement', mongoModel: Paiement, prismaModel: prisma.paiement, checkField: 'idPaiement' },
  { name: 'Document', mongoModel: Document, prismaModel: prisma.document, checkField: 'cheminFichier' },
  { name: 'Desistement', mongoModel: Desistement, prismaModel: prisma.desistement, checkField: 'statut' },
  { name: 'Visa', mongoModel: Visa, prismaModel: prisma.visa, checkField: 'statut' },
  { name: 'BilanDepart', mongoModel: BilanDepart, prismaModel: prisma.bilanDepart, checkField: 'nomReference' },
  { name: 'Bureau', mongoModel: Bureau, prismaModel: prisma.bureau, checkField: 'nom' },
  { name: 'ConfigurationPeriode', mongoModel: ConfigurationPeriode, prismaModel: prisma.configurationPeriode, checkField: 'type' },
  { name: 'Depense', mongoModel: Depense, prismaModel: prisma.depense, checkField: 'categorie' },
  { name: 'HistoriqueAction', mongoModel: HistoriqueAction, prismaModel: prisma.historiqueAction, checkField: 'typeAction' },
  { name: 'Message', mongoModel: Message, prismaModel: prisma.message, checkField: 'contenu' },
  { name: 'RapportQuotidien', mongoModel: RapportQuotidien, prismaModel: prisma.rapportQuotidien, checkField: 'statutJournee' },
  { name: 'Relance', mongoModel: Relance, prismaModel: prisma.relance, checkField: 'resultat' },
  { name: 'Reunion', mongoModel: Reunion, prismaModel: prisma.reunion, checkField: 'titre' },
  { name: 'ZiarraProspect', mongoModel: ZiarraProspect, prismaModel: prisma.ziarraProspect, checkField: 'statut' },
  { name: 'AuditLog', mongoModel: AuditLog, prismaModel: prisma.auditLog, checkField: 'action' },
  { name: 'BilletGroupe', mongoModel: BilletGroupe, prismaModel: prisma.billetGroupe, checkField: 'compagnie' }
];

async function runComparison() {
  try {
    // 1. Connexions
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI manquante");
    }
    await mongoose.connect(mongoUri);
    console.log('🔌 Connecté à MongoDB');

    console.log(`
================================================================
📊 RAPPORT DE COMPARAISON DES BASES DE DONNEES
================================================================
`);

    console.log(String('Collection/Table').padEnd(25) + ' | ' + String('MongoDB').padStart(10) + ' | ' + String('PostgreSQL').padStart(10) + ' | Status');
    console.log('-'.repeat(60));

    let totalDiscrepancies = 0;

    for (const model of modelsToCompare) {
      try {
        const mongoCount = await model.mongoModel.countDocuments();
        const postgresCount = await model.prismaModel.count();
        
        const match = mongoCount === postgresCount;
        const status = match ? '✅ MATCH' : `❌ DISCREPANCY (-${mongoCount - postgresCount})`;
        if (!match) totalDiscrepancies++;

        console.log(model.name.padEnd(25) + ' | ' + String(mongoCount).padStart(10) + ' | ' + String(postgresCount).padStart(10) + ' | ' + status);
      } catch (err) {
        console.log(model.name.padEnd(25) + ' | ' + 'ERROR'.padStart(10) + ' | ' + 'ERROR'.padStart(10) + ' | ⚠️ ' + err.message);
      }
    }

    console.log('='.repeat(60));
    console.log(`Total des écarts de volumes : ${totalDiscrepancies}`);

    console.log(`
================================================================
🔎 VERIFICATION D'ECHANTILLONS DE DONNEES (INTEGRITE)
================================================================
`);

    for (const model of modelsToCompare) {
      try {
        // Prendre un échantillon au hasard depuis MongoDB
        const sample = await model.mongoModel.findOne().lean();
        if (!sample) {
          console.log(`[${model.name}] Aucun document disponible pour vérification.`);
          continue;
        }

        const id = sample._id.toString();
        // Chercher sur Postgres
        const pgRecord = await model.prismaModel.findUnique({
          where: { id }
        });

        if (!pgRecord) {
          console.log(`❌ [${model.name}] Échantillon ID ${id} manquant dans PostgreSQL !`);
          continue;
        }

        // Vérifier le champ de contrôle
        const checkField = model.checkField;
        const mongoVal = String(sample[checkField]);
        const pgVal = String(pgRecord[checkField]);

        if (mongoVal === pgVal) {
          console.log(`✅ [${model.name}] Échantillon OK (ID: ${id}) - Champ "${checkField}": "${pgVal}"`);
        } else {
          console.log(`❌ [${model.name}] Différence de valeur (ID: ${id}) - Champ "${checkField}": MongoDB="${mongoVal}" vs Postgres="${pgVal}"`);
        }
      } catch (err) {
        console.log(`⚠️ [${model.name}] Erreur durant la vérification de l'échantillon :`, err.message);
      }
    }

  } catch (err) {
    console.error('Erreur durant la comparaison :', err);
  } finally {
    await mongoose.disconnect();
    await prisma.$disconnect();
    console.log('\n🔌 Fermeture des connexions');
  }
}

runComparison();
