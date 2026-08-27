/**
 * Script pour créer un rapport DG afin que le secrétaire puisse le voir
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Utilisateur = require('./models/Utilisateur');
const RapportQuotidien = require('./models/RapportQuotidien');

async function createDGReport() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connecté à MongoDB');

    // Trouver l'utilisateur DG
    const dgUser = await Utilisateur.findOne({ role: 'dg' });
    if (!dgUser) {
      console.log('❌ Aucun utilisateur DG trouvé');
      return;
    }

    console.log(`👤 DG trouvé: ${dgUser.prenom} ${dgUser.nom} (${dgUser.email})`);

    // Créer un rapport pour aujourd'hui
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dateRapport = new Date(todayStr + 'T10:00:00.000Z'); // 10h du matin

    // Vérifier si un rapport existe déjà
    const existingReport = await RapportQuotidien.findOne({
      agentId: dgUser._id,
      date: {
        $gte: new Date(dateRapport.getFullYear(), dateRapport.getMonth(), dateRapport.getDate()),
        $lt: new Date(dateRapport.getFullYear(), dateRapport.getMonth(), dateRapport.getDate() + 1)
      }
    });

    if (existingReport) {
      console.log('⚠️  Un rapport DG existe déjà pour aujourd\'hui');
      console.log('   ID:', existingReport._id);
      console.log('   Date:', existingReport.date);
      console.log('   Activités:', existingReport.activites?.substring(0, 50) + '...');
      return;
    }

    // Créer un nouveau rapport DG
    const rapportData = {
      agentId: dgUser._id,
      date: dateRapport,
      dateCreation: new Date(),
      dateModification: new Date(),
      statutJournee: 'PRODUCTIF',
      activites: `Réunion de direction avec l'équipe de management. Révision des objectifs trimestriels et validation des nouveaux packages Omra 2026. Analyse des performances commerciales et définition des stratégies pour la haute saison. Supervision des opérations et suivi des indicateurs clés de performance.`,
      problemes: '',
      objectifsDemain: 'Finaliser la présentation pour le conseil d\'administration. Organiser la réunion mensuelle avec les chefs de service. Valider le budget marketing pour le prochain trimestre.',
      notes: 'Excellente dynamique de l\'équipe. Croissance du chiffre d\'affaires de 22% ce mois. Nouveaux partenariats stratégiques en cours de négociation.',
      
      // Métriques spécifiques DG
      alertes: [
        {
          message: 'Pic de demandes pour les forfaits famille - attention aux délais de traitement',
          priorite: 'MOYENNE',
          statut: 'EN_COURS'
        },
        {
          message: 'Négociations en cours avec nouveaux partenaires hôteliers à La Mecque',
          priorite: 'HAUTE',
          statut: 'NOUVEAU'
        }
      ],
      commentairesDirection: 'Situation très positive. Équipe motivée et résultats dépassant les prévisions. Focus sur l\'amélioration de la satisfaction client.',
      
      version: 1
    };

    const rapport = new RapportQuotidien(rapportData);
    await rapport.save();

    console.log('✅ Rapport DG créé avec succès!');
    console.log('   ID:', rapport._id);
    console.log('   Date:', rapport.date);
    console.log('   Statut:', rapport.statutJournee);
    console.log('');
    console.log('🎯 TEST SECRÉTAIRE:');
    console.log('1. Se connecter avec: aminata.diallo@kyswa.com / password123');
    console.log('2. Aller sur le dashboard');
    console.log('3. Dans "Suivi des Rapports", vous devriez maintenant voir:');
    console.log('   - Tous les employés (commercial, social, comptable, etc.)');
    console.log('   - ET le DG: El Hadji Malick SEYE avec son rapport');
    console.log('');
    console.log('✨ Le secrétaire peut maintenant voir TOUS les rapports y compris ceux du DG!');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

createDGReport();