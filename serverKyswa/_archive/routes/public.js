const express = require('express');
const router = express.Router();
const prismaService = require('../services/prismaService');

/**
 * GET /api/public/reservation
 * Query: numeroReservation, nomClient
 * Version PostgreSQL avec Prisma
 */
router.get('/reservation', async (req, res) => {
  try {
    const { numeroReservation, nomClient } = req.query;

    if (!numeroReservation || !nomClient) {
      return res.status(400).json({ message: 'numeroReservation et nomClient sont requis' });
    }

    // Rechercher la réservation par idReservation (champ MongoDB, à adapter selon votre schéma PostgreSQL)
    const reservation = await prismaService.findUnique('reservations', {
      where: { id_reservation: Number(numeroReservation) }
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée ou nom incorrect' });
    }

    return res.status(200).json({
      idReservation: reservation.id_reservation,
      statut: reservation.statut_client,
      dateDepart: reservation.date_depart,
      dateRetour: reservation.date_retour,
      formule: reservation.formule,
      niveauConfort: reservation.niveau_confort,
      resteAPayer: reservation.reste_a_payer,
      clients: reservation.clients || [],
      paiements: (reservation.paiements || []).map((p) => ({
        montant: p.montant ? parseFloat(p.montant.toString()) : 0,
        dateReglement: p.date_reglement,
        mode: p.mode,
        reference: p.reference || null,
      })),
    });
  } catch (err) {
    console.error('Erreur suivi réservation publique:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/public/billet
 * Query: numeroBillet, nomClient
 * Version PostgreSQL avec Prisma
 */
router.get('/billet', async (req, res) => {
  try {
    const { numeroBillet, nomClient } = req.query;

    if (!numeroBillet || !nomClient) {
      return res.status(400).json({ message: 'numeroBillet et nomClient sont requis' });
    }

    const billet = await prismaService.findFirst('billets', {
      where: { numero_billet: numeroBillet }
    });

    if (!billet) {
      return res.status(404).json({ message: 'Billet non trouvé ou nom incorrect' });
    }

    return res.status(200).json({
      numeroBillet: billet.numero_billet,
      compagnie: billet.compagnie,
      classe: billet.classe,
      destination: billet.destination,
      typeBillet: billet.type_billet,
      dateDepart: billet.date_depart,
      dateArrivee: billet.date_arrivee,
      prix: billet.prix,
      statut: billet.statut,
      resteAPayer: billet.reste_a_payer,
      client: { nom: billet.client_nom, prenom: billet.client_prenom },
      paiements: (billet.paiements || []).map((p) => ({
        montant: p.montant ? parseFloat(p.montant.toString()) : 0,
        dateReglement: p.date_reglement,
        mode: p.mode,
        reference: p.reference || null,
      })),
    });
  } catch (err) {
    console.error('Erreur suivi billet public:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
