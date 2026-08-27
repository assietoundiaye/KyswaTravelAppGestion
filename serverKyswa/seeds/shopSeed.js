/**
 * Script de seed pour Kyswa Shop
 * Créer des données de test pour les produits
 */

const mongoose = require('mongoose');
const Produit = require('../models/Produit');
const StockMovement = require('../models/StockMovement');
require('dotenv').config();

const produitsSeed = [
  {
    nom: 'Eau de Zamzam 500ml',
    description: 'Eau bénite de Zamzam directement de La Mecque, bouteille de 500ml',
    categorie: 'EAU_ZAMZAM',
    prix: 5000,
    stock: 100,
    stockMin: 10,
    marque: 'Al-Masjid Al-Haram',
    reference: 'ZAM-500',
    tags: ['zamzam', 'eau', 'bénite', 'mecque'],
    fournisseur: {
      nom: 'Fournisseur Zamzam Officiel',
      contact: 'Ahmed Al-Saud',
      telephone: '+966 12 345 6789',
      email: 'contact@zamzam-official.sa'
    }
  },
  {
    nom: 'Dattes Medjool Premium',
    description: 'Dattes Medjool de première qualité, boîte de 1kg',
    categorie: 'DATTES',
    prix: 8000,
    prixPromo: 7000,
    stock: 50,
    stockMin: 5,
    marque: 'Palmiers du Désert',
    reference: 'DAT-MEDJ-1KG',
    poids: 1.0,
    tags: ['dattes', 'medjool', 'premium', 'ramadan'],
    fournisseur: {
      nom: 'Oasis Dates Ltd',
      contact: 'Fatima Benali',
      telephone: '+212 6 78 90 12 34',
      email: 'fatima@oasisdates.ma'
    }
  },
  {
    nom: 'Tapis de Prière Velours Bleu',
    description: 'Tapis de prière en velours avec motifs islamiques, couleur bleu royal',
    categorie: 'TAPIS_PRIERE',
    prix: 12000,
    stock: 25,
    stockMin: 3,
    marque: 'Artisanat Islamique',
    reference: 'TAP-VEL-BLEU',
    dimensions: {
      longueur: 120,
      largeur: 80,
      hauteur: 1,
      unite: 'cm'
    },
    poids: 0.8,
    tags: ['tapis', 'prière', 'velours', 'bleu', 'motifs'],
    fournisseur: {
      nom: 'Tissages Islamiques',
      contact: 'Mourad Cherif',
      telephone: '+216 98 765 432',
      email: 'mourad@tissages-islamiques.tn'
    }
  },
  {
    nom: 'Miel d\'Acacia Pur',
    description: 'Miel d\'acacia 100% naturel, pot de 500g',
    categorie: 'MIEL',
    prix: 6500,
    stock: 30,
    stockMin: 5,
    marque: 'Ruches d\'Or',
    reference: 'MIEL-ACA-500',
    poids: 0.5,
    tags: ['miel', 'acacia', 'naturel', 'pur'],
    fournisseur: {
      nom: 'Apiculture Moderne',
      contact: 'Hassan Alami',
      telephone: '+212 6 12 34 56 78',
      email: 'hassan@apiculture-moderne.ma'
    }
  },
  {
    nom: 'Encens Bakhour Al-Oud',
    description: 'Encens traditionnel au bois d\'oud, boîte de 40g',
    categorie: 'ENCENS',
    prix: 15000,
    stock: 40,
    stockMin: 8,
    marque: 'Parfums d\'Orient',
    reference: 'ENC-OUD-40',
    poids: 0.04,
    tags: ['encens', 'bakhour', 'oud', 'parfum', 'traditionnel'],
    fournisseur: {
      nom: 'Maison des Parfums',
      contact: 'Khalid Al-Rashid',
      telephone: '+971 4 567 8901',
      email: 'khalid@maisondesparfums.ae'
    }
  },
  {
    nom: 'Coran avec Traduction Française',
    description: 'Saint Coran avec traduction française et phonétique, couverture cuir',
    categorie: 'LIVRES',
    prix: 18000,
    stock: 20,
    stockMin: 2,
    marque: 'Éditions Islamiques',
    reference: 'COR-FR-CUIR',
    dimensions: {
      longueur: 24,
      largeur: 17,
      hauteur: 4,
      unite: 'cm'
    },
    poids: 1.2,
    tags: ['coran', 'traduction', 'française', 'cuir', 'phonétique'],
    fournisseur: {
      nom: 'Librairie Al-Kitab',
      contact: 'Nadia Cherif',
      telephone: '+33 1 45 67 89 01',
      email: 'nadia@al-kitab.fr'
    }
  },
  {
    nom: 'Vêtement Ihram Homme',
    description: 'Ensemble Ihram traditionnel pour homme, coton blanc, taille unique',
    categorie: 'VETEMENTS',
    prix: 4500,
    stock: 60,
    stockMin: 10,
    marque: 'Hadj Wear',
    reference: 'IHR-HOM-BLANC',
    tags: ['ihram', 'hadj', 'oumra', 'coton', 'blanc'],
    fournisseur: {
      nom: 'Textile Hadj',
      contact: 'Omar Benali',
      telephone: '+212 5 23 45 67 89',
      email: 'omar@textile-hadj.ma'
    }
  },
  {
    nom: 'Chapelet Tasbih 99 Grains',
    description: 'Chapelet en bois d\'olivier avec 99 grains, fabrication artisanale',
    categorie: 'BIJOUX',
    prix: 3500,
    stock: 35,
    stockMin: 5,
    marque: 'Artisanat Palestinien',
    reference: 'TAS-99-OLIVIER',
    poids: 0.1,
    tags: ['tasbih', 'chapelet', 'olivier', 'palestine', '99grains'],
    fournisseur: {
      nom: 'Coopérative Artisanale',
      contact: 'Mariam Khoury',
      telephone: '+970 2 234 5678',
      email: 'mariam@artisanat-palestine.ps'
    }
  }
];

async function seedProduits() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connexion MongoDB établie');

    // Supprimer les produits existants
    await Produit.deleteMany({});
    await StockMovement.deleteMany({});
    console.log('🗑️  Données existantes supprimées');

    // Créer les produits
    console.log('📦 Création des produits...');
    for (let i = 0; i < produitsSeed.length; i++) {
      const produitData = {
        ...produitsSeed[i],
        creeParUtilisateurId: new mongoose.Types.ObjectId(), // ID factice pour l'admin
        dateCreation: new Date(),
        statut: 'ACTIF'
      };

      const produit = await Produit.create(produitData);
      console.log(`✅ Produit créé: ${produit.nom} (${produit.stock} en stock)`);

      // Créer un mouvement de stock initial
      if (produit.stock > 0) {
        await StockMovement.create({
          produitId: produit._id,
          type: 'SET',
          quantite: produit.stock,
          stockAvant: 0,
          stockApres: produit.stock,
          motif: 'INVENTAIRE_CORRECTION',
          notes: 'Stock initial lors du seed',
          userId: produitData.creeParUtilisateurId,
          statut: 'CONFIRME'
        });
      }
    }

    console.log(`🎉 ${produitsSeed.length} produits créés avec succès !`);

    // Afficher les statistiques
    const stats = await Produit.aggregate([
      {
        $group: {
          _id: '$categorie',
          count: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          valeurStock: { $sum: { $multiply: ['$stock', '$prix'] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('\n📊 Statistiques par catégorie:');
    stats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count} produits, ${stat.totalStock} unités, ${stat.valeurStock.toLocaleString('fr-FR')} FCFA`);
    });

    const totalValue = stats.reduce((sum, stat) => sum + stat.valeurStock, 0);
    console.log(`\n💰 Valeur totale du stock: ${totalValue.toLocaleString('fr-FR')} FCFA`);

  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

// Exécuter le seed si ce fichier est lancé directement
if (require.main === module) {
  seedProduits().catch(console.error);
}

module.exports = { seedProduits, produitsSeed };