require('dotenv').config();
const mongoose = require('mongoose');
const Produit = require('../models/Produit');
const { connectDB } = require('../config/database');

// Produits typiques vendus par Kyswa Travel
const produitsSamples = [
  {
    nom: "Eau de Zamzam - Bouteille 500ml",
    description: "Eau sacrée provenant directement de la source Zamzam à La Mecque. Bouteille scellée et certifiée.",
    categorie: "EAU_ZAMZAM",
    prix: 5000, // 5000 FCFA
    stock: 50,
    stockMin: 10,
    marque: "Zamzam Original",
    reference: "ZAM500",
    tags: ["zamzam", "eau", "sacree", "mecque", "hajj", "oumra"],
    fournisseur: {
      nom: "Fournisseur Arabie Saoudite",
      contact: "Ahmed Al-Rashid",
      telephone: "+966 123 456 789"
    }
  },
  {
    nom: "Tapis de Prière Deluxe - Armal",
    description: "Tapis de prière traditionnel en velours de haute qualité avec motifs islamiques brodés. Idéal pour la prière quotidienne.",
    categorie: "TAPIS_PRIERE",
    prix: 15000, // 15000 FCFA
    stock: 25,
    stockMin: 5,
    marque: "Armal Premium",
    reference: "TAP001",
    dimensions: {
      longueur: 120,
      largeur: 70,
      hauteur: 2,
      unite: "cm"
    },
    poids: 0.8,
    tags: ["tapis", "priere", "armal", "velours", "islamique", "mosque"],
    fournisseur: {
      nom: "Textile Islamique Maroc",
      contact: "Youssef Bennani",
      telephone: "+212 661 234 567"
    }
  },
  {
    nom: "Hijab Soie Premium",
    description: "Hijab en soie naturelle, doux et élégant. Disponible en plusieurs couleurs. Parfait pour les occasions spéciales.",
    categorie: "VETEMENTS",
    prix: 8500, // 8500 FCFA
    stock: 40,
    stockMin: 8,
    marque: "Modesty Collection",
    reference: "HIJ001",
    tags: ["hijab", "voile", "soie", "femme", "islamique", "elegant"],
    fournisseur: {
      nom: "Fashion Islamique Turkey",
      contact: "Fatma Özkan",
      telephone: "+90 212 345 678"
    }
  },
  {
    nom: "Dattes Ajwa Premium - 500g",
    description: "Dattes Ajwa de Médine, réputées pour leur goût exceptionnel et leurs bienfaits. Conditionnées dans une boîte élégante.",
    categorie: "DATTES",
    prix: 12000, // 12000 FCFA
    stock: 30,
    stockMin: 6,
    marque: "Medina Dates",
    reference: "DAT500",
    poids: 0.5,
    tags: ["dattes", "ajwa", "medine", "premium", "ramadan", "iftar"],
    fournisseur: {
      nom: "Al-Madinah Dates Co.",
      contact: "Muhammad Al-Ansari",
      telephone: "+966 148 765 432"
    }
  },
  {
    nom: "Encens Bakhour Al-Oud",
    description: "Encens traditionnel à base d'Oud naturel. Parfum authentique pour purifier l'atmosphère et créer une ambiance spirituelle.",
    categorie: "ENCENS",
    prix: 6500, // 6500 FCFA
    stock: 35,
    stockMin: 7,
    marque: "Arabian Scents",
    reference: "ENC001",
    poids: 0.1,
    tags: ["encens", "bakhour", "oud", "parfum", "spirituel", "traditiomel"],
    fournisseur: {
      nom: "Perfumes of Arabia",
      contact: "Khalid Al-Farisi",
      telephone: "+971 4 234 5678"
    }
  },
  {
    nom: "Miel de Sidr Yéménite - 250g",
    description: "Miel rare de Sidr du Yémen, récolté selon les méthodes traditionnelles. Reconnu pour ses propriétés thérapeutiques exceptionnelles.",
    categorie: "MIEL",
    prix: 25000, // 25000 FCFA
    stock: 15,
    stockMin: 3,
    marque: "Yemen Gold Honey",
    reference: "MIL250",
    poids: 0.25,
    tags: ["miel", "sidr", "yemen", "therapeutique", "naturel", "rare"],
    fournisseur: {
      nom: "Yemen Honey Export",
      contact: "Ali Al-Hadrami",
      telephone: "+967 1 234 567"
    }
  },
  {
    nom: "Coran avec Traduction Français",
    description: "Saint Coran avec traduction en français. Édition de luxe avec couverture dorée et calligraphie arabe authentique.",
    categorie: "LIVRES",
    prix: 18000, // 18000 FCFA
    stock: 20,
    stockMin: 4,
    marque: "Editions Islamiques",
    reference: "COR001",
    dimensions: {
      longueur: 24,
      largeur: 17,
      hauteur: 3,
      unite: "cm"
    },
    poids: 0.8,
    tags: ["coran", "livre", "traduction", "francais", "islamique", "luxe"],
    fournisseur: {
      nom: "Dar Al-Kitab Al-Islami",
      contact: "Mohamed Benali",
      telephone: "+212 537 123 456"
    }
  },
  {
    nom: "Chapelet Tasbih 99 Grains",
    description: "Chapelet traditionnel en bois d'olivier avec 99 grains. Idéal pour la récitation du dhikr et la méditation spirituelle.",
    categorie: "ACCESSOIRES",
    prix: 4500, // 4500 FCFA
    stock: 60,
    stockMin: 12,
    marque: "Spiritual Tools",
    reference: "CHA001",
    poids: 0.05,
    tags: ["chapelet", "tasbih", "dhikr", "meditation", "bois", "olivier"],
    fournisseur: {
      nom: "Artisans de Palestine",
      contact: "Omar Qasemi",
      telephone: "+972 2 234 5678"
    }
  }
];

async function createKyswaProducts() {
  try {
    // Connexion à la base de données
    await connectDB();
    console.log('🔗 Connecté à MongoDB');

    // Obtenir un utilisateur admin pour les métadonnées
    const Utilisateur = require('../models/Utilisateur');
    const adminUser = await Utilisateur.findOne({ role: 'administrateur' });
    
    if (!adminUser) {
      console.error('❌ Aucun utilisateur administrateur trouvé. Créez d\'abord un utilisateur admin.');
      process.exit(1);
    }

    console.log(`👤 Utilisation de l'utilisateur: ${adminUser.nom} ${adminUser.prenom}`);

    // Supprimer les produits existants (optionnel)
    const existingCount = await Produit.countDocuments();
    if (existingCount > 0) {
      console.log(`🗑️ Suppression de ${existingCount} produits existants...`);
      await Produit.deleteMany({});
    }

    // Créer les nouveaux produits
    console.log('📦 Création des produits Kyswa...');
    
    const createdProducts = [];
    for (const produitData of produitsSamples) {
      try {
        const produit = new Produit({
          ...produitData,
          creeParUtilisateurId: adminUser._id,
          statut: 'ACTIF'
        });

        const savedProduit = await produit.save();
        createdProducts.push(savedProduit);
        console.log(`✅ Produit créé: ${savedProduit.nom} (${savedProduit.reference})`);
      } catch (error) {
        console.error(`❌ Erreur pour ${produitData.nom}:`, error.message);
      }
    }

    console.log(`\n🎉 ${createdProducts.length}/${produitsSamples.length} produits Kyswa créés avec succès !`);
    
    // Afficher les statistiques
    const stats = await Produit.obtenirStatistiques();
    if (stats.length > 0) {
      const stat = stats[0];
      console.log('\n📊 Statistiques du shop:');
      console.log(`   • Total produits: ${stat.totalProduits}`);
      console.log(`   • Produits actifs: ${stat.produitsActifs}`);
      console.log(`   • Valeur stock: ${stat.valeurTotaleStock} FCFA`);
      console.log(`   • Produits en rupture: ${stat.produitsRupture}`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la création des produits:', error);
  } finally {
    mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter le script
if (require.main === module) {
  createKyswaProducts();
}

module.exports = { createKyswaProducts, produitsSamples };