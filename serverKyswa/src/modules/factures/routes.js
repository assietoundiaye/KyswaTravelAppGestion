/**
 * @fileoverview Routes — Module factures (génération PDF)
 * Migré vers la nouvelle architecture, utilise le service PDF existant
 */
const express = require('express');
const prisma = require('../../database/client');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

// Service PDF
let pdfService;
try {
  pdfService = require('../../shared/services/facturePdfService');
} catch (e) {
  console.warn('[factures] Service PDF non disponible:', e.message);
}

const ALLOWED_ROLES = ['commercial', 'comptable', 'administrateur', 'dg', 'secretaire', 'oumra'];

function createFacturesRoutes(dependencies) {
  const router = express.Router();

  /**
   * GET /api/factures/reservation/:id
   * Générer la facture PDF d'une inscription
   */
  router.get('/reservation/:id', protect, requireRole(...ALLOWED_ROLES), async (req, res, next) => {
    try {
      if (!pdfService) {
        return res.status(503).json({ success: false, message: 'Service PDF non disponible' });
      }

      const inscription = await prisma.inscriptions.findUnique({
        where: { id: req.params.id },
        include: {
          clients: true,
          departs: true,
          paiements: true,
          lignes_supplements: {
            include: { supplements: true }
          }
        }
      });

      if (!inscription) {
        return res.status(404).json({ success: false, message: 'Inscription introuvable' });
      }

      // Adapter au format attendu par le service PDF (compatibilité legacy)
      const reservation = {
        _id: inscription.id,
        numero: inscription.numero,
        statut: inscription.statut_paiement,
        statut_client: inscription.statut_client,
        formule: inscription.formule,
        type_chambre: inscription.type_chambre,
        montantTotalDu: Number(inscription.prix_total || 0),
        clients: inscription.clients ? [inscription.clients] : [],
        packageKId: inscription.departs,
        paiements: (inscription.paiements || []).map(p => ({
          montant: Number(p.montant || 0),
          mode: p.mode_paiement,
          date_reglement: p.date_paiement,
        })),
      };

      const lignesSupp = (inscription.lignes_supplements || []).map(ls => ({
        supplementId: ls.supplements,
        quantite: ls.quantite,
        prix_unitaire: Number(ls.prix_unitaire || 0),
        clientId: { nom: inscription.clients?.nom, prenom: inscription.clients?.prenom },
      }));

      const { buffer, factureNum } = pdfService.buildReservationFacturePdf({ reservation, lignesSupp });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="facture-${factureNum}.pdf"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/factures/billet/:id
   * Générer la facture PDF d'un billet pèlerin
   */
  router.get('/billet/:id', protect, requireRole(...ALLOWED_ROLES), async (req, res, next) => {
    try {
      if (!pdfService) {
        return res.status(503).json({ success: false, message: 'Service PDF non disponible' });
      }

      const billet = await prisma.billets_pelerins.findUnique({
        where: { id: req.params.id },
        include: {
          clients: true,
          departs: true,
        }
      });

      if (!billet) {
        return res.status(404).json({ success: false, message: 'Billet introuvable' });
      }

      // Adapter au format legacy
      const billetFormatted = {
        _id: billet.id,
        numero_billet: billet.num_billet,
        nom_sur_billet: billet.nom_sur_billet,
        clientId: billet.clients,
        depart: billet.departs,
        paiements: [],
      };

      const { buffer, factureNum } = pdfService.buildBilletFacturePdf({ billet: billetFormatted });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="facture-billet-${factureNum}.pdf"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/factures/shop/:id
   * Générer la facture PDF d'une commande shop
   */
  router.get('/shop/:id', protect, requireRole(...ALLOWED_ROLES), async (req, res, next) => {
    try {
      if (!pdfService) {
        return res.status(503).json({ success: false, message: 'Service PDF non disponible' });
      }

      const commande = await prisma.shop_commandes.findUnique({
        where: { id: req.params.id },
        include: {
          clients: { select: { nom: true, prenom: true, email: true, telephone: true } },
          profiles: { select: { nom: true, prenom: true, email: true } },
          shop_lignes_commandes: {
            include: { shop_produits: { select: { nom: true, reference: true } } }
          }
        }
      });

      if (!commande) {
        return res.status(404).json({ success: false, message: 'Commande shop introuvable' });
      }

      // Adapter au format legacy
      const order = {
        _id: commande.id,
        clientId: commande.clients,
        createdBy: commande.profiles,
        montant_total: Number(commande.montant_total || 0),
        statut: commande.statut,
        items: (commande.shop_lignes_commandes || []).map(l => ({
          produitId: l.shop_produits,
          quantite: l.quantite,
          prix_unitaire: Number(l.prix_unitaire || 0),
        })),
      };

      const { buffer, factureNum } = pdfService.buildShopOrderFacturePdf({ order });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="facture-shop-${factureNum}.pdf"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createFacturesRoutes;
