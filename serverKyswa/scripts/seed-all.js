/**
 * Script de seed complet pour initialiser la base de données KyswaTravel
 * Crée :
 * - Utilisateurs avec différents rôles
 * - Produits du shop
 * - Données de test basiques
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Utilisateur = require('../models/Utilisateur');
const { seedShop } = require('./seed-shop');
const bcrypt = require('bcryptjs');

// Utilisateurs par défaut pour tous les rôles
const utilisateursParDefaut = [
  {
    nom: 'Administrateur',
    prenom: 'Système',
    email: 'admin@kyswa.com',
    password: 'admin123',
    role: 'administrateur',
    telephone: '+221701000001'
  },
  {
    nom: 'Directeur',
    prenom: 'Général',
    email: 'dg@kyswa.com', 
    password: 'dg123',
    role: 'dg',
    telephone: '+221701000002'
  },
  {
    nom: 'Dupont',
    prenom: 'Marie',
    email: 'comptable@kyswa.com',
    password: 'comptable123',
    role: 'comptable',
    telephone: '+221701000003'
  },
  {
    nom: 'Sarr',
    prenom: 'Ibrahima',
    email: 'commercial@kyswa.com',
    password: 'commercial123',
    role: 'commercial',
    telephone: '+221701000004'
  },
  {
    nom: 'Fall',
    prenom: 'Aminata',
    email: 'oumra@kyswa.com',
    password: 'oumra123',
    role: 'oumra',
    telephone: '+221701000005'
  },
  {
    nom: 'Diop',
    prenom: 'Moussa',
    email: 'billets@kyswa.com',
    password: 'billets123',
    role: 'billets',
    telephone: '+221701000006'
  },
  {
    nom: 'Ndiaye',
    prenom: 'Fatou',
    email: 'secretaire@kyswa.com',
    password: 'secretaire123',
    role: 'secretaire',
    telephone: '+221701000007'
  },
  {
    nom: 'Sy',
    prenom: 'Ousmane',
    email: 'ziara@kyswa.com',
    password: 'ziara123',
    role: 'ziara',
    telephone: '+221701000008'
  },
  {
    nom: 'Ba',
    prenom: 'Aissatou',
    email: 'social@kyswa.com',
    password: 'social123',
    role: 'social',
    telephone: '+221701000009'
  }
];

async function creerUtilisateurs() {
  console.log('👥 Création des utilisateurs par défaut...');
  
  // Supprimer tous les utilisateurs existants
  await Utilisateur.deleteMany({});
  console.log('🗑️  Utilisateurs existants supprimés');
  
  // Créer les utilisateurs
  const utilisateurs = await Utilisateur.insertMany(utilisateursParDefaut);
  console.log(`✅ ${utilisateurs.length} utilisateurs créés`);
  
  // Afficher le résumé
  console.log('\n📋 Utilisateurs créés:');
  utilisateurs.forEach(user => {
    console.log(`  - ${user.email} (${user.role})`);
  });
  
  return utilisateurs;
}

async function seedAll() {
  try {
    console.log('🚀 === INITIALISATION BASE DE DONNÉES KYSWA ===\n');
    
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connexion MongoDB établie');
    console.log('📍 Base de données:', mongoose.connection.name);
    
    // 1. Créer les utilisateurs
    const utilisateurs = await creerUtilisateurs();
    
    // 2. Créer les produits du shop avec un utilisateur créateur valide
    console.log('\n🛍️  Initialisation du shop...');
    
    // Utiliser l'ID du commercial créé
    const commercial = utilisateurs.find(u => u.role === 'commercial');
    if (!commercial) {
      throw new Error('Aucun utilisateur commercial trouvé pour créer les produits');
    }
    
    // Modifier temporairement le script seed-shop pour utiliser le bon ID
    const Produit = require('../models/Produit');
    const { produitsExemples } = require('./seed-shop');
    
    // Supprimer les produits existants
    await Produit.deleteMany({});
    console.log('🗑️  Produits existants supprimés');
    
    // Créer les produits avec le bon ID utilisateur
    const produitsAvecUserId = produitsExemples.map(produit => ({
      ...produit,
      creeParUtilisateurId: commercial._id
    }));
    
    const produits = await Produit.insertMany(produitsAvecUserId);
    console.log(`✅ ${produits.length} produits ajoutés`);
    
    // Afficher les statistiques finales
    console.log('\n📊 === RÉSUMÉ FINAL ===');
    
    const totalUtilisateurs = await Utilisateur.countDocuments();
    const totalProduits = await Produit.countDocuments();
    
    console.log(`👥 Utilisateurs: ${totalUtilisateurs}`);
    console.log(`🛍️  Produits: ${totalProduits}`);
    
    const statsRoles = await Utilisateur.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n👤 Répartition par rôle:');
    statsRoles.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });
    
    const statsProduits = await Produit.aggregate([
      { $group: { 
        _id: '$categorie', 
        count: { $sum: 1 },
        valeurStock: { $sum: { $multiply: ['$stock', '$prix'] } }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n🏪 Produits par catégorie:');
    statsProduits.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} produit(s), Valeur: ${stat.valeurStock.toLocaleString('fr-SN')} XOF`);
    });
    
    console.log('\n✨ === SEED TERMINÉ AVEC SUCCÈS ===');
    console.log('\n🔑 Comptes de test créés:');
    console.log('   admin@kyswa.com / admin123 (Administrateur)');
    console.log('   commercial@kyswa.com / commercial123 (Commercial)');
    console.log('   dg@kyswa.com / dg123 (Directeur Général)');
    console.log('\n💡 Vous pouvez maintenant vous connecter et tester KyswaShop !');
    
  } catch (error) {
    console.error('❌ Erreur lors du seed complet:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
    console.log('📴 Connexion MongoDB fermée');
  }
}

// Exécuter le seed
if (require.main === module) {
  seedAll();
}

module.exports = { seedAll, creerUtilisateurs };