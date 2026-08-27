require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Produit = require('../models/Produit');

// Produits d'exemple pour le Kyswa Shop
const produitsExemples = [
  {
    nom: "Eau de Zamzam 5L",
    description: "Eau bénite de Zamzam authentique, conditionnée en bidon de 5 litres. Importée directement de La Mecque.",
    categorie: "EAU_ZAMZAM",
    prix: 25000, // 25000 XOF
    stock: 50,
    stockMin: 10,
    marque: "Zamzam Official",
    reference: "ZAM-5L-001",
    tags: ["zamzam", "eau", "5l", "mecque", "authentique"],
    fournisseur: {
      nom: "Al-Haramain Import",
      contact: "Ahmed Ben Said",
      telephone: "+966501234567",
      email: "contact@alharamain-import.sa"
    },
    notes: "Certificat d'authenticité inclus"
  },
  {
    nom: "Dattes Ajwa Premium - 1kg",
    description: "Dattes Ajwa de qualité supérieure, récoltées à Médine. Conditionnées en boîte de 1kg.",
    categorie: "DATTES",
    prix: 18000,
    prixPromo: 15000,
    stock: 75,
    stockMin: 15,
    marque: "Al-Madina Dates",
    reference: "DAT-AJW-1KG",
    tags: ["dattes", "ajwa", "médine", "premium", "1kg"],
    fournisseur: {
      nom: "Madina Date Company",
      contact: "Omar Al-Madani",
      telephone: "+966554321098",
      email: "sales@madinadates.sa"
    }
  },
  {
    nom: "Tapis de Prière Velours - Motif Kaaba",
    description: "Tapis de prière en velours de haute qualité avec motif Kaaba. Dimensions: 120x80cm.",
    categorie: "TAPIS_PRIERE",
    prix: 12000,
    stock: 30,
    stockMin: 5,
    marque: "Islamic Carpets",
    reference: "TAP-KAA-120",
    dimensions: {
      longueur: 120,
      largeur: 80,
      hauteur: 2,
      unite: "cm"
    },
    tags: ["tapis", "prière", "kaaba", "velours", "120cm"],
    fournisseur: {
      nom: "Turkish Textile Ltd",
      contact: "Mehmet Özkan",
      telephone: "+905321234567",
      email: "export@turkishtextile.com"
    }
  },
  {
    nom: "Miel de Sidr Yéménite - 500g",
    description: "Miel de Sidr authentique du Yémen, réputé pour ses propriétés thérapeutiques. Pot de 500g.",
    categorie: "MIEL",
    prix: 35000,
    stock: 20,
    stockMin: 3,
    marque: "Yemen Gold Honey",
    reference: "MIL-SID-500G",
    tags: ["miel", "sidr", "yémen", "thérapeutique", "500g"],
    fournisseur: {
      nom: "Yemen Honey Exports",
      contact: "Ali Al-Hadhrami",
      telephone: "+967771234567",
      email: "info@yemenhoney.ye"
    },
    notes: "Certificat d'analyse inclus"
  },
  {
    nom: "Ihram Homme - Coton Blanc",
    description: "Vêtement d'Ihram pour homme en coton blanc pur. Comprend 2 pièces non cousues.",
    categorie: "VETEMENTS",
    prix: 8000,
    stock: 100,
    stockMin: 20,
    marque: "Makkah Textiles",
    reference: "IHR-HOM-COT",
    tags: ["ihram", "homme", "coton", "blanc", "hadj", "omra"],
    fournisseur: {
      nom: "Makkah Textile Industries",
      contact: "Abdullah Al-Makki",
      telephone: "+966591234567",
      email: "sales@makkahtextiles.sa"
    }
  },
  {
    nom: "Encens Bakhour Al-Oud - 100g",
    description: "Encens premium Al-Oud, mélange traditionnel de bois d'agar. Boîte de 100g.",
    categorie: "ENCENS",
    prix: 22000,
    stock: 40,
    stockMin: 8,
    marque: "Arabian Oud",
    reference: "ENC-OUD-100G",
    tags: ["encens", "bakhour", "oud", "agar", "parfum"],
    fournisseur: {
      nom: "Arabian Perfumes Co",
      contact: "Khalid Al-Otaibi",
      telephone: "+966501987654",
      email: "wholesale@arabianoud.com"
    }
  },
  {
    nom: "Coran avec Traduction Française",
    description: "Saint Coran avec traduction française de qualité. Couverture cuir, format moyen.",
    categorie: "LIVRES",
    prix: 15000,
    stock: 60,
    stockMin: 10,
    marque: "Dar Al-Kitab",
    reference: "COR-FR-MED",
    tags: ["coran", "traduction", "français", "cuir", "livre"],
    fournisseur: {
      nom: "Dar Al-Kitab Al-Islamiya",
      contact: "Muhammad Al-Baghdadi",
      telephone: "+966541234567",
      email: "orders@daralkitab.sa"
    }
  },
  {
    nom: "Tasbih en Bois d'Olivier - 99 grains",
    description: "Chapelet en bois d'olivier naturel, 99 grains. Artisanat traditionnel palestinien.",
    categorie: "BIJOUX",
    prix: 6000,
    stock: 80,
    stockMin: 15,
    marque: "Palestine Crafts",
    reference: "TAS-OLI-99",
    tags: ["tasbih", "olivier", "99grains", "palestine", "chapelet"],
    fournisseur: {
      nom: "Palestine Handicrafts",
      contact: "Omar Khatib",
      telephone: "+972591234567",
      email: "export@palestinecrafts.ps"
    }
  },
  {
    nom: "Valise de Pèlerinage avec Roulettes",
    description: "Valise rigide spécialement conçue pour le pèlerinage. 4 roulettes, légère et résistante.",
    categorie: "ACCESSOIRES",
    prix: 45000,
    stock: 25,
    stockMin: 5,
    marque: "Hajj Luggage",
    reference: "VAL-HAJ-70L",
    dimensions: {
      longueur: 70,
      largeur: 45,
      hauteur: 25,
      unite: "cm"
    },
    poids: 3.2,
    tags: ["valise", "pèlerinage", "roulettes", "70l", "résistante"],
    fournisseur: {
      nom: "Travel Gear International",
      contact: "Hassan Al-Rashid",
      telephone: "+971501234567",
      email: "b2b@travelgear.ae"
    }
  },
  {
    nom: "Porte-clés Kaaba Miniature",
    description: "Souvenir porte-clés représentant la Kaaba en métal doré. Idéal comme cadeau.",
    categorie: "SOUVENIRS",
    prix: 2500,
    stock: 200,
    stockMin: 50,
    marque: "Makkah Souvenirs",
    reference: "PC-KAA-DOR",
    tags: ["porte-clés", "kaaba", "souvenir", "métal", "doré"],
    fournisseur: {
      nom: "Souvenir Express",
      contact: "Fatima Al-Zahra",
      telephone: "+966581234567",
      email: "orders@souvenirexpress.sa"
    }
  }
];

async function seedShop() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connexion MongoDB établie');
    
    // Supprimer tous les produits existants
    await Produit.deleteMany({});
    console.log('🗑️  Produits existants supprimés');
    
    // Créer un utilisateur factice pour les produits
    const adminUserId = '507f1f77bcf86cd799439011'; // ID MongoDB factice
    
    // Ajouter l'ID utilisateur à chaque produit
    const produitsAvecUserId = produitsExemples.map(produit => ({
      ...produit,
      creeParUtilisateurId: adminUserId
    }));
    
    // Insérer les nouveaux produits
    const produits = await Produit.insertMany(produitsAvecUserId);
    console.log(`✅ ${produits.length} produits ajoutés avec succès`);
    
    // Afficher un résumé par catégorie
    const stats = await Produit.aggregate([
      {
        $group: {
          _id: '$categorie',
          count: { $sum: 1 },
          valeurStock: { $sum: { $multiply: ['$stock', '$prix'] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\n📊 Résumé par catégorie:');
    stats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} produit(s), Valeur: ${stat.valeurStock.toLocaleString('fr-SN')} XOF`);
    });
    
    mongoose.connection.close();
    console.log('\n🎉 Seed terminé avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    process.exit(1);
  }
}

// Exécuter le seed
if (require.main === module) {
  seedShop();
}

module.exports = { seedShop, produitsExemples };