require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Utilisateur = require('../models/Utilisateur');
const Billet = require('../models/Billet');
const Paiement = require('../models/Paiement');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kyswa-travel';

/**
 * Script de test pour les billets d'avion
 */
async function testBillets() {
  try {
    // Connexion MongoDB
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(MONGO_URI, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connecté à MongoDB');

    // Nettoyer les données de test précédentes
    console.log('\n🗑️  Nettoyage des données de test précédentes...');
    await Billet.deleteMany({ numeroBillet: 'BIL-TEST-001' });
    await Paiement.deleteMany({ reference: 'OM-TEST-001' });

    // Trouver ou créer un Client
    console.log('\n📝 Recherche/création d\'un Client...');
    let client = await Client.findOne({ numeroPasseport: 'TEST-PASSPORT-001' });
    if (!client) {
      client = new Client({
        numeroPasseport: 'TEST-PASSPORT-001',
        numeroCNI: 'TEST-CNI-001',
        nom: 'Test',
        prenom: 'Client',
        telephone: '+221771234567',
        email: 'test.client@example.com',
        adresse: 'Dakar, Sénégal',
      });
      await client.save();
      console.log('✅ Client créé:', client._id);
    } else {
      console.log('✅ Client trouvé:', client._id);
    }

    // Trouver ou créer un Utilisateur COMMERCIAL
    console.log('\n👤 Recherche/création d\'un Utilisateur COMMERCIAL...');
    let user = await Utilisateur.findOne({ email: 'commercial.test@example.com' });
    if (!user) {
      user = new Utilisateur({
        nom: 'Test',
        prenom: 'Commercial',
        email: 'commercial.test@example.com',
        telephone: '+221771111111',
        password: 'password123',
        role: 'COMMERCIAL',
        etat: 'ACTIF',
      });
      await user.save();
      console.log('✅ Utilisateur COMMERCIAL créé:', user._id);
    } else {
      console.log('✅ Utilisateur COMMERCIAL trouvé:', user._id);
    }

    // Créer un Billet
    console.log('\n✈️  Création du Billet...');
    const billet = new Billet({
      idBillet: Date.now(),
      numeroBillet: 'BIL-TEST-001',
      compagnie: 'Air Sénégal',
      classe: 'ECONOMY',
      destination: 'Jeddah',
      typeBillet: 'aller_retour',
      dateDepart: new Date('2026-04-10'),
      dateArrivee: new Date('2026-04-11'),
      statut: 'RESERVE',
      clientId: client._id,
      paiements: [],
    });
    await billet.save();
    console.log('✅ Billet créé:');
    console.log({
      idBillet: billet.idBillet,
      numeroBillet: billet.numeroBillet,
      compagnie: billet.compagnie,
      classe: billet.classe,
      destination: billet.destination,
      typeBillet: billet.typeBillet,
      dateDepart: billet.dateDepart,
      dateArrivee: billet.dateArrivee,
      statut: billet.statut,
      clientId: billet.clientId,
    });

    // Créer un Paiement
    console.log('\n💳 Création du Paiement...');
    const paiement = new Paiement({
      idPaiement: Date.now(),
      montant: 250000,
      dateReglement: new Date(),
      mode: 'ORANGE_MONEY',
      reference: 'OM-TEST-001',
      creeParUtilisateurId: user._id,
    });
    await paiement.save();
    console.log('✅ Paiement créé:');
    console.log({
      idPaiement: paiement.idPaiement,
      montant: paiement.montant.toString(),
      mode: paiement.mode,
      reference: paiement.reference,
      dateReglement: paiement.dateReglement,
    });

    // Ajouter le paiement au billet
    console.log('\n🔗 Liaison Paiement → Billet...');
    billet.paiements.push(paiement._id);
    await billet.save();
    console.log('✅ Paiement ajouté au billet');

    // Afficher le billet avec paiements
    console.log('\n📊 Billet avec paiements (populate):');
    const billetPopulate = await Billet.findById(billet._id)
      .populate('clientId', 'nom prenom numeroPasseport email')
      .populate('paiements', 'idPaiement montant mode dateReglement reference');
    console.log(JSON.stringify(billetPopulate, null, 2));

    // Afficher les paiements du billet
    console.log('\n💰 Liste des paiements du billet:');
    const paiements = await Paiement.find({ _id: { $in: billetPopulate.paiements } });
    paiements.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.reference} - ${p.montant} ${p.mode} (${p.dateReglement})`);
    });

    console.log('\n✅ Test billets terminé avec succès!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors du test:', err.message);
    process.exit(1);
  }
}

// Lancer le test
testBillets();
