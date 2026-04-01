const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Paiement = require('../models/Paiement');
const Reservation = require('../models/Reservation');
const Billet = require('../models/Billet');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);
router.use(requireRole('commercial', 'comptable', 'oumra', 'administrateur', 'dg'));

const paiementValidation = [
  body('montant').isFloat({ min: 0.01 }).withMessage('Montant invalide'),
  body('dateReglement').isISO8601().withMessage('Date invalide'),
  body('mode').isIn(['CARTE_BANCAIRE','VIREMENT','ORANGE_MONEY','WAVE','MONEY','ESPECES','AUTRE']).withMessage('Mode invalide'),
  body('reference').optional().trim(),
];

/**
 * POST /api/reservations/:id/paiements
 */
router.post('/reservations/:id/paiements', paiementValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const reservation = await Reservation.findById(req.params.id).populate('paiements');
    if (!reservation) return res.status(404).json({ message: 'Réservation non trouvée' });
    if (reservation.statut === 'ANNULEE') return res.status(400).json({ message: 'Réservation annulée' });

    const { montant, dateReglement, mode, reference } = req.body;

    const paiement = new Paiement({
      idPaiement: Date.now(),
      montant,
      dateReglement,
      mode,
      reference: reference || undefined,
      reservationId: reservation._id,
      creeParUtilisateurId: req.user.id,
    });

    await paiement.save();

    reservation.paiements.push(paiement._id);
    await reservation.save();

    // Mettre à jour statut selon paiements
    await reservation.populate('paiements');
    await reservation.mettreAJourStatutPaiement();

    return res.status(201).json({ message: 'Paiement enregistré', paiement });
  } catch (err) {
    console.error('Erreur paiement réservation:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/billets/:id/paiements
 */
router.post('/billets/:id/paiements', paiementValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const billet = await Billet.findById(req.params.id).populate('paiements');
    if (!billet) return res.status(404).json({ message: 'Billet non trouvé' });
    if (billet.statut === 'ANNULE') return res.status(400).json({ message: 'Billet annulé' });

    const { montant, dateReglement, mode, reference } = req.body;

    const paiement = new Paiement({
      idPaiement: Date.now(),
      montant,
      dateReglement,
      mode,
      reference: reference || undefined,
      billetId: billet._id,
      creeParUtilisateurId: req.user.id,
    });

    await paiement.save();

    billet.paiements.push(paiement._id);
    await billet.save();

    // Mettre à jour statut si tout est payé
    await billet.populate('paiements');
    if (billet.resteAPayer <= 0) {
      billet.statut = 'PAYE';
      await billet.save();
    }

    return res.status(201).json({ message: 'Paiement enregistré', paiement });
  } catch (err) {
    console.error('Erreur paiement billet:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/paiements
 * Liste tous les paiements
 */
router.get('/', async (req, res) => {
  try {
    const paiements = await Paiement.find()
      .populate('reservationId', 'idReservation')
      .populate('billetId', 'numeroBillet')
      .sort({ dateReglement: -1 });
    return res.status(200).json({ count: paiements.length, paiements });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/paiements/:id
 * Supprimer un paiement et mettre à jour l'entité liée
 */
router.delete('/paiements/:id', async (req, res) => {
  try {
    const paiement = await Paiement.findById(req.params.id);
    if (!paiement) return res.status(404).json({ message: 'Paiement non trouvé' });

    // Retirer de la réservation ou du billet
    if (paiement.reservationId) {
      await Reservation.findByIdAndUpdate(paiement.reservationId, {
        $pull: { paiements: paiement._id }
      });
      // Remettre statut EN_ATTENTE si nécessaire
      const resa = await Reservation.findById(paiement.reservationId).populate('paiements');
      if (resa && resa.statut === 'PAYEE') {
        resa.statut = 'CONFIRMEE';
        await resa.save();
      }
    }
    if (paiement.billetId) {
      await Billet.findByIdAndUpdate(paiement.billetId, {
        $pull: { paiements: paiement._id }
      });
    }

    await Paiement.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Paiement supprimé' });
  } catch (err) {
    console.error('Erreur suppression paiement:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
