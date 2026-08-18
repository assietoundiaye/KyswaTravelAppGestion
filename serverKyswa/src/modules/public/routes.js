/**
 * @fileoverview Routes publiques (sans authentification)
 * Suivi réservation et billet par les pèlerins eux-mêmes
 */
const express = require('express');
const prisma = require('../../database/client');

function createPublicRoutes(dependencies) {
  const router = express.Router();

  /**
   * GET /api/public/reservation
   * Suivi public d'une inscription par numéro + nom client
   */
  router.get('/reservation', async (req, res) => {
    try {
      const { numeroReservation, nomClient } = req.query;

      if (!numeroReservation || !nomClient) {
        return res.status(400).json({
          success: false,
          message: 'numeroReservation et nomClient sont requis'
        });
      }

      // Recherche par numéro d'inscription
      const inscription = await prisma.inscriptions.findFirst({
        where: {
          numero: numeroReservation,
        },
        include: {
          clients: { select: { nom: true, prenom: true } },
          departs: { select: { nom_depart: true, date_depart: true, date_retour: true } },
          paiements: { select: { montant: true, date_paiement: true, mode_paiement: true } },
        }
      });

      if (!inscription) {
        return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
      }

      // Vérification du nom client (sécurité basique)
      const nomBD = ((inscription.clients?.nom || '') + ' ' + (inscription.clients?.prenom || '')).toLowerCase().trim();
      if (!nomBD.includes(nomClient.toLowerCase().trim())) {
        return res.status(404).json({ success: false, message: 'Réservation non trouvée ou nom incorrect' });
      }

      const totalPaye = (inscription.paiements || []).reduce((s, p) => s + Number(p.montant || 0), 0);
      const resteAPayer = Math.max(0, Number(inscription.prix_total || 0) - totalPaye);

      return res.status(200).json({
        success: true,
        data: {
          numero: inscription.numero,
          statut: inscription.statut_client,
          statut_paiement: inscription.statut_paiement,
          formule: inscription.formule,
          type_chambre: inscription.type_chambre,
          depart: inscription.departs,
          totalDu: Number(inscription.prix_total || 0),
          totalPaye,
          resteAPayer,
          paiements: (inscription.paiements || []).map(p => ({
            montant: Number(p.montant || 0),
            date: p.date_paiement,
            mode: p.mode_paiement,
          })),
        }
      });
    } catch (err) {
      console.error('Erreur suivi réservation publique:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /**
   * GET /api/public/billet
   * Suivi public d'un billet par numéro + nom
   */
  router.get('/billet', async (req, res) => {
    try {
      const { numeroBillet, nomClient } = req.query;

      if (!numeroBillet || !nomClient) {
        return res.status(400).json({
          success: false,
          message: 'numeroBillet et nomClient sont requis'
        });
      }

      const billet = await prisma.billets_pelerins.findFirst({
        where: { num_billet: numeroBillet },
        include: {
          clients: { select: { nom: true, prenom: true, telephone: true } },
          departs: { select: { nom_depart: true, date_depart: true } },
        }
      });

      if (!billet) {
        return res.status(404).json({ success: false, message: 'Billet non trouvé' });
      }

      const nomBD = ((billet.clients?.nom || '') + ' ' + (billet.clients?.prenom || '')).toLowerCase().trim();
      if (!nomBD.includes(nomClient.toLowerCase().trim())) {
        return res.status(404).json({ success: false, message: 'Billet non trouvé ou nom incorrect' });
      }

      return res.status(200).json({
        success: true,
        data: {
          num_billet: billet.num_billet,
          nom_sur_billet: billet.nom_sur_billet,
          billet_emis: billet.billet_emis,
          verifie: billet.verifie,
          depart: billet.departs,
          client: billet.clients,
        }
      });
    } catch (err) {
      console.error('Erreur suivi billet public:', err);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  return router;
}

module.exports = createPublicRoutes;
