const express = require('express');
const router = express.Router();

const Reservation = require('../models/Reservation');
const Billet = require('../models/Billet');
const ShopOrder = require('../models/ShopOrder');
const LigneSupplement = require('../models/LigneSupplement');
require('../models/Paiement');
const { protect, requireRole } = require('../middleware/auth');
const {
  buildReservationFacturePdf,
  buildBilletFacturePdf,
  buildShopOrderFacturePdf,
} = require('../services/facturePdfService');

const ALLOWED_ROLES = ['commercial', 'comptable', 'administrateur', 'dg', 'secretaire', 'oumra'];

router.get('/reservation/:id', protect, requireRole(...ALLOWED_ROLES), async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('clients')
      .populate('packageKId')
      .populate('paiements');
    if (!reservation) return res.status(404).json({ message: 'Réservation introuvable' });

    const lignesSupp = await LigneSupplement.find({ reservationId: reservation._id })
      .populate('supplementId')
      .populate('clientId', 'nom prenom');

    const { buffer, factureNum } = buildReservationFacturePdf({ reservation, lignesSupp });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${factureNum}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Erreur génération facture réservation:', err);
    return res.status(500).json({ message: 'Erreur lors de la génération de la facture' });
  }
});

router.get('/billet/:id', protect, requireRole(...ALLOWED_ROLES), async (req, res) => {
  try {
    const billet = await Billet.findById(req.params.id)
      .populate('clientId')
      .populate('paiements');
    if (!billet) return res.status(404).json({ message: 'Billet introuvable' });

    const { buffer, factureNum } = buildBilletFacturePdf({ billet });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${factureNum}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Erreur génération facture billet:', err);
    return res.status(500).json({ message: 'Erreur lors de la génération de la facture' });
  }
});

/**
 * GET /api/factures/shop/:id
 * Générer la facture PDF d'une commande shop
 */
router.get('/shop/:id', protect, requireRole(...ALLOWED_ROLES), async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id)
      .populate('clientId', 'nom prenom email telephone')
      .populate('createdBy', 'nom prenom email')
      .populate('items.produitId', 'nom reference');
      
    if (!order) {
      return res.status(404).json({ message: 'Commande shop introuvable' });
    }

    const { buffer, factureNum } = buildShopOrderFacturePdf({ order });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${factureNum}.pdf"`);
    
    console.log(`✅ Facture shop générée : ${factureNum} pour commande ${order._id}`);
    
    return res.send(buffer);
  } catch (err) {
    console.error('Erreur génération facture shop:', err);
    return res.status(500).json({ 
      message: 'Erreur lors de la génération de la facture shop',
      error: err.message 
    });
  }
});

module.exports = router;
