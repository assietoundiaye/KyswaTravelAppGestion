const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Billet = require('../models/Billet');

/**
 * GET /api/public/reservation
 * Query: numeroReservation, nomClient
 */
router.get('/reservation', async (req, res) => {
  try {
    const { numeroReservation, nomClient } = req.query;

    if (!numeroReservation || !nomClient) {
      return res.status(400).json({ message: 'numeroReservation et nomClient sont requis' });
    }

    const reservation = await Reservation.findOne({ idReservation: Number(numeroReservation) })
      .populate('clients', 'nom prenom')
      .populate('paiements', 'montant dateReglement mode reference');

    if (!reservation) {
      return res.status(404).json({ message: 'Réservation non trouvée ou nom incorrect' });
    }

    // Vérifier que nomClient correspond à l'un des clients (insensible à la casse)
    const nomLower = nomClient.trim().toLowerCase();
    const clientTrouve = reservation.clients.some((c) => {
      const nomComplet = `${c.nom} ${c.prenom}`.toLowerCase();
      const nomSeul = c.nom.toLowerCase();
      const prenomSeul = c.prenom.toLowerCase();
      return nomComplet.includes(nomLower) || nomSeul.includes(nomLower) || prenomSeul.includes(nomLower);
    });

    if (!clientTrouve) {
      return res.status(404).json({ message: 'Réservation non trouvée ou nom incorrect' });
    }

    return res.status(200).json({
      idReservation: reservation.idReservation,
      statut: reservation.statut,
      dateDepart: reservation.dateDepart,
      dateRetour: reservation.dateRetour,
      formule: reservation.formule,
      niveauConfort: reservation.niveauConfort,
      resteAPayer: reservation.resteAPayer,
      clients: reservation.clients.map((c) => ({ nom: c.nom, prenom: c.prenom })),
      paiements: (reservation.paiements || []).map((p) => ({
        montant: p.montant ? parseFloat(p.montant.toString()) : 0,
        dateReglement: p.dateReglement,
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
 */
router.get('/billet', async (req, res) => {
  try {
    const { numeroBillet, nomClient } = req.query;

    if (!numeroBillet || !nomClient) {
      return res.status(400).json({ message: 'numeroBillet et nomClient sont requis' });
    }

    const billet = await Billet.findOne({ numeroBillet })
      .populate('clientId', 'nom prenom')
      .populate('paiements', 'montant dateReglement mode reference');

    if (!billet) {
      return res.status(404).json({ message: 'Billet non trouvé ou nom incorrect' });
    }

    // Vérifier que nomClient correspond au client du billet
    const nomLower = nomClient.trim().toLowerCase();
    const c = billet.clientId;
    const nomComplet = `${c.nom} ${c.prenom}`.toLowerCase();
    const match =
      nomComplet.includes(nomLower) ||
      c.nom.toLowerCase().includes(nomLower) ||
      c.prenom.toLowerCase().includes(nomLower);

    if (!match) {
      return res.status(404).json({ message: 'Billet non trouvé ou nom incorrect' });
    }

    return res.status(200).json({
      numeroBillet: billet.numeroBillet,
      compagnie: billet.compagnie,
      classe: billet.classe,
      destination: billet.destination,
      typeBillet: billet.typeBillet,
      dateDepart: billet.dateDepart,
      dateArrivee: billet.dateArrivee,
      prix: billet.prix,
      statut: billet.statut,
      resteAPayer: billet.resteAPayer,
      client: { nom: c.nom, prenom: c.prenom },
      paiements: (billet.paiements || []).map((p) => ({
        montant: p.montant ? parseFloat(p.montant.toString()) : 0,
        dateReglement: p.dateReglement,
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
