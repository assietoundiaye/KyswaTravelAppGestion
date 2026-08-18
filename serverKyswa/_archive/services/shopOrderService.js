const mongoose = require('mongoose');
const ShopOrder = require('../models/ShopOrder');
const Produit = require('../models/Produit');
const StockMovement = require('../models/StockMovement');
const Paiement = require('../models/Paiement');

async function preleverStockCommande(order, userId, notesSuffix = '') {
  for (const item of order.items) {
    const produit = await Produit.findById(item.produitId);
    if (!produit) continue;

    const ancienStock = produit.stock;
    await produit.ajusterStock(item.quantite, 'RETRAIT');

    await StockMovement.creerMouvement({
      produitId: produit._id,
      type: 'RETRAIT',
      quantite: item.quantite,
      stockAvant: ancienStock,
      stockApres: produit.stock,
      motif: 'VENTE',
      notes: `Commande ${order.orderNumber || order._id}${notesSuffix ? ` - ${notesSuffix}` : ''}`,
      userId,
      referenceExterne: order._id.toString(),
      documentSource: 'COMMANDE',
    });
  }
}

async function restaurerStockCommande(order, userId, motif = '') {
  for (const item of order.items) {
    const produit = await Produit.findById(item.produitId);
    if (!produit) continue;

    const ancienStock = produit.stock;
    await produit.ajusterStock(item.quantite, 'AJOUT');

    await StockMovement.creerMouvement({
      produitId: produit._id,
      type: 'AJOUT',
      quantite: item.quantite,
      stockAvant: ancienStock,
      stockApres: produit.stock,
      motif: 'AUTRE',
      notes: `Restauration commande ${order.orderNumber || order._id}${motif ? ` - ${motif}` : ''}`,
      userId,
      referenceExterne: order._id.toString(),
      documentSource: 'COMMANDE',
    });
  }
}

async function creerCommande({ clientId, createdBy, items, notes = '' }) {
  if (!clientId || !createdBy || !Array.isArray(items) || items.length === 0) {
    throw new Error('Données de commande invalides');
  }

  const productIds = items.map((item) => item.produitId);
  const produits = await Produit.find({ _id: { $in: productIds } });
  if (produits.length !== productIds.length) {
    throw new Error('Un ou plusieurs produits sont introuvables');
  }

  const orderItems = [];
  let montantTotal = 0;

  for (const item of items) {
    const produit = produits.find((p) => p._id.toString() === item.produitId);
    if (!produit) {
      throw new Error('Produit introuvable');
    }

    const quantite = Number(item.quantite || 0);
    if (!Number.isInteger(quantite) || quantite <= 0) {
      throw new Error('La quantité doit être un entier positif');
    }
    if (produit.stock < quantite) {
      throw new Error(`Stock insuffisant pour ${produit.nom}`);
    }

    const prixUnitaire = Number(produit.prixAffichage ?? produit.prix ?? 0);
    const sousTotal = prixUnitaire * quantite;
    montantTotal += sousTotal;

    orderItems.push({
      produitId: produit._id,
      nomProduit: produit.nom,
      quantite,
      prixUnitaire,
      sousTotal,
    });
  }

  const order = await ShopOrder.create({
    clientId,
    createdBy,
    items: orderItems,
    montantTotal,
    notes,
    status: 'EN_ATTENTE_PAIEMENT',
    // Le numéro sera généré automatiquement par le hook pre-save
  });

  await preleverStockCommande(order, createdBy, 'réservation en attente de paiement');

  return order;
}

async function listerCommandes(filter = {}) {
  return ShopOrder.find(filter)
    .populate('clientId', 'nom prenom email telephone')
    .populate('createdBy', 'nom prenom email')
    .populate('items.produitId', 'nom reference prix stock')
    .sort({ createdAt: -1 });
}

async function confirmerPaiement(orderId, paiementData, userId) {
  const order = await ShopOrder.findById(orderId);
  if (!order) throw new Error('Commande introuvable');
  if (order.status === 'PAYE') throw new Error('Commande déjà payée');

  const montant = Number(paiementData.montant || 0);
  if (!montant || montant < order.montantTotal) {
    throw new Error('Montant de paiement insuffisant');
  }

  const paiement = await Paiement.create({
    idPaiement: Date.now(),
    montant,
    dateReglement: paiementData.dateReglement || new Date(),
    mode: paiementData.mode || 'ESPECES',
    reference: paiementData.reference,
    creeParUtilisateurId: userId,
    dateCreation: new Date(),
    shopOrderId: order._id,
  });

  order.payment = {
    montant,
    mode: paiementData.mode || 'ESPECES',
    reference: paiementData.reference,
    dateReglement: paiementData.dateReglement || new Date(),
    paiementId: paiement._id,
  };
  order.status = 'PAYE';
  order.paidAt = new Date();
  order.paidBy = userId;
  await order.save();

  return order;
}

async function supprimerPaiement(orderId, userId, motif = '') {
  const order = await ShopOrder.findById(orderId);
  if (!order) throw new Error('Commande introuvable');
  if (order.status !== 'PAYE') throw new Error('Aucun paiement à supprimer pour cette commande');

  const paiementId = order.payment?.paiementId;
  if (!paiementId) throw new Error('Paiement introuvable dans la commande');

  // Vérifier que le paiement existe
  const paiement = await Paiement.findById(paiementId);
  if (!paiement) throw new Error('Paiement introuvable en base de données');

  // Supprimer le paiement
  await Paiement.findByIdAndDelete(paiementId);

  // Remettre la commande en attente de paiement
  order.payment = null;
  order.status = 'EN_ATTENTE_PAIEMENT';
  order.paidAt = null;
  order.paidBy = null;
  
  // Ajouter des informations sur l'annulation
  order.cancellation = {
    cancelledAt: new Date(),
    cancelledBy: userId,
    motif: motif || 'Paiement supprimé',
    action: 'PAIEMENT_SUPPRIME'
  };

  await order.save();

  console.log(`✅ Paiement supprimé pour la commande ${orderId} par l'utilisateur ${userId}`);
  
  return order;
}

async function supprimerCommande(orderId, userId, motif = '') {
  const order = await ShopOrder.findById(orderId);
  if (!order) throw new Error('Commande introuvable');

  // Le stock est prélevé à la création : le restaurer à la suppression
  if (order.status !== 'ANNULEE') {
    await restaurerStockCommande(order, userId, motif || 'Commande supprimée');
  }

  // Supprimer le paiement associé si la commande était payée
  if (order.status === 'PAYE') {
    const paiementId = order.payment?.paiementId;
    if (paiementId) {
      await Paiement.findByIdAndDelete(paiementId);
    }
  }

  // Supprimer la commande
  await ShopOrder.findByIdAndDelete(orderId);

  console.log(`✅ Commande supprimée ${orderId} par l'utilisateur ${userId}`);
  
  return { 
    _id: orderId, 
    orderNumber: order.orderNumber,
    suppressionMotif: motif || 'Commande supprimée',
    suppressionPar: userId,
    suppressionDate: new Date()
  };
}

module.exports = {
  creerCommande,
  listerCommandes,
  confirmerPaiement,
  supprimerPaiement,
  supprimerCommande,
};
