/**
 * Script de migration des données Shop depuis MongoDB vers PostgreSQL
 * À exécuter SEULEMENT si vous avez des données existantes en MongoDB
 */

require('dotenv').config();
const mongoose = require('mongoose');
const prismaClient = require('../src/database/client');

// Anciens modèles MongoDB (pour lecture seulement)
const ProduitMongo = require('../models/Produit');
const StockMovementMongo = require('../models/StockMovement');
const ShopOrderMongo = require('../models/ShopOrder');

async function migrateShopData() {
  console.log('🚀 Début de la migration Shop MongoDB → PostgreSQL');

  try {
    // Connexion MongoDB (lecture seule)
    if (process.env.MONGO_URI) {
      console.log('📦 Connexion à MongoDB...');
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connecté à MongoDB');
    } else {
      console.log('⚠️ MONGO_URI non défini, migration annulée');
      return;
    }

    // Connexion PostgreSQL
    console.log('🐘 Connexion à PostgreSQL...');
    await prismaClient.$connect();
    console.log('✅ Connecté à PostgreSQL');

    // === MIGRATION DES PRODUITS ===
    console.log('\n📦 Migration des produits...');
    const produitsMongo = await ProduitMongo.find({}).lean();
    console.log(`📊 ${produitsMongo.length} produits trouvés en MongoDB`);

    for (const produit of produitsMongo) {
      try {
        await prismaClient.shop_produits.create({
          data: {
            nom: produit.nom,
            description: produit.description,
            categorie: produit.categorie,
            prix: produit.prix.toString(), // Convertir Decimal128 en string
            prix_promo: produit.prixPromo ? produit.prixPromo.toString() : null,
            stock: produit.stock || 0,
            stock_min: produit.stockMin || 5,
            statut: produit.statut || 'ACTIF',
            marque: produit.marque,
            reference: produit.reference,
            code_barres: produit.codeBarres,
            dimensions_json: produit.dimensions,
            poids: produit.poids,
            images_json: produit.images,
            tags: produit.tags || [],
            fournisseur_json: produit.fournisseur,
            notes: produit.notes,
            slug: produit.slug,
            meta_description: produit.metaDescription,
            visible: produit.visible !== false,
            cree_par_user_id: produit.creeParUtilisateurId,
            modifie_par_user_id: produit.modifieParUtilisateurId,
            created_at: produit.dateCreation || produit.createdAt || new Date(),
            updated_at: produit.dateDerniereModification || produit.updatedAt || new Date()
          }
        });
        console.log(`✅ Produit migré: ${produit.nom}`);
      } catch (error) {
        console.log(`❌ Erreur migration produit ${produit.nom}:`, error.message);
      }
    }

    // === MIGRATION DES MOUVEMENTS DE STOCK ===
    console.log('\n📊 Migration des mouvements de stock...');
    const mouvementsMongo = await StockMovementMongo.find({}).lean();
    console.log(`📊 ${mouvementsMongo.length} mouvements trouvés en MongoDB`);

    for (const mouvement of mouvementsMongo) {
      try {
        // Trouver l'ID PostgreSQL du produit
        const produitPG = await prismaClient.shop_produits.findFirst({
          where: { 
            OR: [
              { reference: produit.reference },
              { nom: produit.nom }
            ]
          }
        });

        if (produitPG) {
          await prismaClient.shop_stock_movements.create({
            data: {
              produit_id: produitPG.id,
              ancienne_quantite: mouvement.ancienneQuantite,
              nouvelle_quantite: mouvement.nouvelleQuantite,
              quantite_ajustee: mouvement.quantiteAjustee,
              type: mouvement.type,
              motif: mouvement.motif,
              notes: mouvement.notes,
              reference_externe: mouvement.referenceExterne,
              document_source: mouvement.documentSource,
              cree_par_user_id: mouvement.createdBy,
              created_at: mouvement.createdAt || new Date()
            }
          });
          console.log(`✅ Mouvement migré pour produit: ${produitPG.nom}`);
        } else {
          console.log(`⚠️ Produit non trouvé pour le mouvement`);
        }
      } catch (error) {
        console.log(`❌ Erreur migration mouvement:`, error.message);
      }
    }

    // === MIGRATION DES COMMANDES ===
    console.log('\n🛒 Migration des commandes...');
    const commandesMongo = await ShopOrderMongo.find({}).populate('clientId').lean();
    console.log(`📊 ${commandesMongo.length} commandes trouvées en MongoDB`);

    for (const commande of commandesMongo) {
      try {
        // Créer la commande
        const nouvelleCom = await prismaClient.shop_commandes.create({
          data: {
            client_id: commande.clientId._id, // Assume same client IDs
            status: commande.status || 'EN_ATTENTE_PAIEMENT',
            montant_total: commande.montantTotal.toString(),
            notes: commande.notes,
            cree_par_user_id: commande.createdBy,
            created_at: commande.createdAt || new Date(),
            updated_at: commande.updatedAt || new Date()
          }
        });

        // Créer les items de commande
        if (commande.items && commande.items.length > 0) {
          for (const item of commande.items) {
            const produitPG = await prismaClient.shop_produits.findFirst({
              where: { reference: item.produitId } // Adapt selon vos données
            });

            if (produitPG) {
              await prismaClient.shop_commande_items.create({
                data: {
                  commande_id: nouvelleCom.id,
                  produit_id: produitPG.id,
                  quantite: item.quantite,
                  prix_unitaire: item.prixUnitaire.toString(),
                  prix_total: item.prixTotal.toString()
                }
              });
            }
          }
        }

        console.log(`✅ Commande migrée: ${nouvelleCom.id}`);
      } catch (error) {
        console.log(`❌ Erreur migration commande:`, error.message);
      }
    }

    console.log('\n✅ Migration Shop terminée avec succès!');
    console.log('\n📋 Résumé:');
    
    const stats = await Promise.all([
      prismaClient.shop_produits.count(),
      prismaClient.shop_stock_movements.count(),
      prismaClient.shop_commandes.count()
    ]);

    console.log(`   📦 Produits: ${stats[0]}`);
    console.log(`   📊 Mouvements: ${stats[1]}`);
    console.log(`   🛒 Commandes: ${stats[2]}`);

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
  } finally {
    await mongoose.disconnect();
    await prismaClient.$disconnect();
    console.log('👋 Connexions fermées');
  }
}

// Exécuter seulement si appelé directement
if (require.main === module) {
  migrateShopData().catch(console.error);
}

module.exports = { migrateShopData };