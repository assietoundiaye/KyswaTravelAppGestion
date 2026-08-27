/**
 * Script pour créer de vrais utilisateurs et rapports réalistes
 * Usage: node create_real_data.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Utilisateur = require('./models/Utilisateur');
const RapportQuotidien = require('./models/RapportQuotidien');

// Configuration
require('dotenv').config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kyswa';

// Vrais utilisateurs de l'agence Kyswa
const realUsers = [
  // Secrétaire
  {
    nom: 'Diallo',
    prenom: 'Aminata',
    email: 'aminata.diallo@kyswa.com',
    password: 'password123',
    role: 'secretaire',
    etat: 'ACTIF'
  },
  
  // Équipe commerciale
  {
    nom: 'Ba',
    prenom: 'Mamadou',
    email: 'mamadou.ba@kyswa.com',
    password: 'password123',
    role: 'commercial',
    etat: 'ACTIF'
  },
  {
    nom: 'Sow',
    prenom: 'Fatou',
    email: 'fatou.sow@kyswa.com',
    password: 'password123',
    role: 'commercial',
    etat: 'ACTIF'
  },
  
  // Social Media
  {
    nom: 'Ndiaye',
    prenom: 'Khadija',
    email: 'khadija.ndiaye@kyswa.com',
    password: 'password123',
    role: 'social',
    etat: 'ACTIF'
  },
  
  // Comptabilité
  {
    nom: 'Traore',
    prenom: 'Ousmane',
    email: 'ousmane.traore@kyswa.com',
    password: 'password123',
    role: 'comptable',
    etat: 'ACTIF'
  },
  
  // Gestionnaire
  {
    nom: 'Cisse',
    prenom: 'Mariam',
    email: 'mariam.cisse@kyswa.com',
    password: 'password123',
    role: 'commercial', // Changed from 'gestionnaire' to 'commercial'
    etat: 'ACTIF'
  },
  
  // Direction
  {
    nom: 'Ndiaye',
    prenom: 'Ibrahima',
    email: 'ibrahima.ndiaye@kyswa.com',
    password: 'password123',
    role: 'dg',
    etat: 'ACTIF'
  }
];

// Générateur de rapports réalistes
function generateRealisticReport(user, date, hasReport = true) {
  if (!hasReport) return null;

  const baseReport = {
    agentId: user._id,
    date: date,
    dateCreation: date,
    dateModification: date,
    statutJournee: ['PRODUCTIF', 'NORMAL', 'DIFFICILE'][Math.floor(Math.random() * 3)]
  };

  switch (user.role) {
    case 'commercial':
      return {
        ...baseReport,
        activites: `Prospection client pour forfaits Omra 2026. Suivi des dossiers en cours. Relance des clients ayant manifesté un intérêt pour les packages Premium. Préparation des devis personnalisés.`,
        problemes: Math.random() > 0.7 ? 'Difficulté à joindre certains clients. Délai de réponse des banques pour les financements.' : '',
        objectifsDemain: 'Finaliser 3 inscriptions en cours. Organiser réunion avec la famille Diop pour package famille. Préparer présentation nouveaux circuits.',
        notes: 'Bonne dynamique commerciale. Clients intéressés par les nouveaux itinéraires.',
        appelsClients: Math.floor(Math.random() * 15) + 5,
        inscriptionsCreees: Math.floor(Math.random() * 4),
        paiementsEncaisses: Math.floor(Math.random() * 2000000) + 500000,
        suiviCommercial: 'Pipeline bien fourni. 12 prospects chauds identifiés cette semaine.',
        constats: 'Augmentation des demandes pour les forfaits tout inclus.',
        appelsDetail: [
          { nom: 'Famille Diop', telephone: '77 123 45 67', motif: 'Devis Omra famille', type: 'SORTANT', commentaire: 'Intéressés par package premium' },
          { nom: 'M. Sarr', telephone: '76 987 65 43', motif: 'Suivi inscription', type: 'ENTRANT', commentaire: 'Confirmation paiement effectué' }
        ]
      };

    case 'social':
      return {
        ...baseReport,
        activites: `Gestion des réseaux sociaux Kyswa Travel. Publication du contenu promotionnel pour les forfaits Omra. Réponse aux messages clients sur WhatsApp et Facebook. Création de stories Instagram avec témoignages clients.`,
        problemes: Math.random() > 0.8 ? 'Problème technique avec la programmation des posts automatiques.' : '',
        objectifsDemain: 'Lancer la campagne publicitaire pour les nouveaux circuits. Organiser un live Instagram avec un guide spirituel.',
        notes: 'Très bonne engagement sur les dernières publications. Stories témoignages très appréciées.',
        publications: Math.floor(Math.random() * 8) + 2,
        vues: Math.floor(Math.random() * 5000) + 1000,
        abonnesGagnes: Math.floor(Math.random() * 50) + 10,
        likes: Math.floor(Math.random() * 200) + 50,
        campagnesActives: Math.floor(Math.random() * 3) + 1,
        budgetCampagne: Math.floor(Math.random() * 100000) + 50000,
        plateformes: ['Facebook', 'Instagram', 'WhatsApp', 'TikTok']
      };

    case 'comptable':
      return {
        ...baseReport,
        activites: `Traitement des paiements clients. Réconciliation bancaire. Suivi des encaissements et échéanciers. Préparation des états financiers mensuels. Gestion des fournisseurs et prestataires.`,
        problemes: Math.random() > 0.9 ? 'Retard dans la réception de certains justificatifs de paiement.' : '',
        objectifsDemain: 'Finaliser le bilan mensuel. Préparer les déclarations fiscales. Réunion avec la banque pour les nouveaux produits.',
        notes: 'Situation financière saine. Croissance du chiffre d\'affaires de 15% ce mois.',
        appelsClients: Math.floor(Math.random() * 8) + 2,
        inscriptionsCreees: Math.floor(Math.random() * 3),
        paiementsEncaisses: Math.floor(Math.random() * 5000000) + 2000000
      };

    case 'gestionnaire':
      return {
        ...baseReport,
        activites: `Coordination des opérations quotidiennes. Suivi des dossiers clients avec les prestataires. Gestion des plannings des guides et accompagnateurs. Interface avec les hôtels et compagnies aériennes.`,
        problemes: Math.random() > 0.8 ? 'Modification de dernière minute sur un vol, nécessite réorganisation.' : '',
        objectifsDemain: 'Finaliser les arrangements pour le départ du groupe du 15. Négocier les tarifs hôtels pour la saison haute.',
        notes: 'Bonne coordination avec nos partenaires. Satisfaction client élevée.',
        appelsClients: Math.floor(Math.random() * 10) + 3,
        inscriptionsCreees: Math.floor(Math.random() * 2)
      };

    default:
      return {
        ...baseReport,
        activites: `Activités administratives et de gestion. Suivi des dossiers en cours. Coordination avec les différents services.`,
        problemes: '',
        objectifsDemain: 'Poursuivre les activités de gestion et améliorer les processus.',
        notes: 'Bonne progression sur les tâches assignées.'
      };
  }
}

async function createRealData() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connecté à MongoDB\n');

    // 1. Créer les utilisateurs
    console.log('👥 CRÉATION DES UTILISATEURS RÉELS...');
    const createdUsers = [];

    for (const userData of realUsers) {
      try {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await Utilisateur.findOne({ email: userData.email });
        
        if (existingUser) {
          console.log(`⚠️  ${userData.prenom} ${userData.nom} existe déjà`);
          createdUsers.push(existingUser);
          continue;
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(userData.password, 12);
        
        // Créer l'utilisateur
        const newUser = new Utilisateur({
          ...userData,
          password: hashedPassword,
          dateCreation: new Date()
        });
        
        const savedUser = await newUser.save();
        createdUsers.push(savedUser);
        console.log(`✅ ${userData.prenom} ${userData.nom} (${userData.role}) créé`);
        
      } catch (error) {
        console.error(`❌ Erreur création ${userData.prenom} ${userData.nom}:`, error.message);
      }
    }

    // 2. Créer des rapports pour les derniers jours
    console.log('\n📝 CRÉATION DES RAPPORTS RÉALISTES...');
    
    const employeeUsers = createdUsers.filter(u => !['secretaire', 'dg'].includes(u.role));
    const datesRecentes = [];
    
    // Générer les 7 derniers jours
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(9, 0, 0, 0); // 9h du matin
      datesRecentes.push(date);
    }

    let totalReports = 0;

    for (const date of datesRecentes) {
      const dateStr = date.toLocaleDateString('fr-FR');
      console.log(`\n📅 Rapports pour le ${dateStr}:`);

      for (const user of employeeUsers) {
        // 80% de chance d'avoir un rapport (réaliste)
        const hasReport = Math.random() > 0.2;
        
        if (hasReport) {
          try {
            // Vérifier si un rapport existe déjà pour cette date
            const existingReport = await RapportQuotidien.findOne({
              agentId: user._id,
              date: {
                $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
              }
            });

            if (existingReport) {
              console.log(`   ⚠️ ${user.prenom} ${user.nom} - rapport existe déjà`);
              continue;
            }

            const reportData = generateRealisticReport(user, date, true);
            const report = new RapportQuotidien(reportData);
            await report.save();
            
            totalReports++;
            console.log(`   ✅ ${user.prenom} ${user.nom} (${user.role}) - rapport créé`);
            
          } catch (error) {
            console.error(`   ❌ Erreur rapport ${user.prenom} ${user.nom}:`, error.message);
          }
        } else {
          console.log(`   ⏸️ ${user.prenom} ${user.nom} (${user.role}) - pas de rapport`);
        }
      }
    }

    // 3. Statistiques finales
    console.log('\n📊 STATISTIQUES FINALES:');
    
    const finalUserCount = await Utilisateur.countDocuments();
    const finalReportCount = await RapportQuotidien.countDocuments();
    
    console.log(`👥 Total utilisateurs: ${finalUserCount}`);
    console.log(`📝 Total rapports: ${finalReportCount}`);
    console.log(`📈 Rapports créés cette session: ${totalReports}`);

    // Statistiques par rôle
    const roleStats = await Utilisateur.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📋 Répartition par rôle:');
    roleStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count} utilisateur(s)`);
    });

    // Rapports par jour
    const todayReports = await RapportQuotidien.countDocuments({
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });

    console.log(`\n📅 Rapports aujourd'hui: ${todayReports}`);

    console.log('\n🔑 COMPTES DE TEST CRÉÉS:');
    console.log('Secrétaire: aminata.diallo@kyswa.com / password123');
    console.log('Commercial: mamadou.ba@kyswa.com / password123');
    console.log('Social: khadija.ndiaye@kyswa.com / password123');
    console.log('Comptable: ousmane.traore@kyswa.com / password123');
    console.log('DG: ibrahima.ndiaye@kyswa.com / password123');

    console.log('\n🎯 TEST RECOMMANDÉ:');
    console.log('1. Se connecter avec aminata.diallo@kyswa.com');
    console.log('2. Aller sur le dashboard');
    console.log('3. Vérifier la section "Suivi des Rapports"');
    console.log('4. Le secrétaire devrait voir tous les employés avec leurs vrais rapports');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 MongoDB n\'est pas démarré. Démarrez MongoDB puis relancez ce script.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Gestion des erreurs
process.on('unhandledRejection', (error) => {
  console.error('❌ Erreur non gérée:', error);
  process.exit(1);
});

console.log(`
🏢 CRÉATION DE DONNÉES RÉELLES KYSWA TRAVEL
===========================================

Ce script va créer:
✅ 7 utilisateurs réels avec des rôles appropriés
✅ Des rapports quotidiens réalistes pour les 7 derniers jours
✅ Du contenu professionnel et crédible
✅ Des métriques cohérentes selon les rôles

⚠️  Assurez-vous que MongoDB est démarré
`);

createRealData();