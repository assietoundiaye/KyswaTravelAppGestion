const express = require('express');
const router = express.Router();
const Reservation = require('../models/Reservation');
const Billet = require('../models/Billet');
const Client = require('../models/Client');
const PackageK = require('../models/PackageK');
const Paiement = require('../models/Paiement');
const Utilisateur = require('../models/Utilisateur');
const { protect, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const { cacheStats } = require('../middleware/cache');

router.use(protect);
router.use(requirePermission(PERMISSIONS.STATS_READ));

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Statistiques globales pour l'administration
 *     tags: [Statistiques]
 *     responses:
 *       200:
 *         description: Statistiques globales
 *         headers:
 *           X-Cache:
 *             description: Indique si les données viennent du cache (HIT/MISS)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalClients:
 *                   type: number
 *                 totalReservations:
 *                   type: number
 *                 totalBillets:
 *                   type: number
 *                 totalPackages:
 *                   type: number
 *                 totalUtilisateurs:
 *                   type: number
 *                 totalEncaisse:
 *                   type: number
 *                 resteGlobal:
 *                   type: number
 *                 reservationsParStatut:
 *                   type: array
 *                   items:
 *                     type: object
 *                 resaParMois:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/', cacheStats, async (req, res) => {
  try {
    const [
      totalClients,
      totalReservations,
      totalBillets,
      totalPackages,
      totalUtilisateurs,
      reservationsParStatut,
      paiements,
    ] = await Promise.all([
      Client.countDocuments(),
      Reservation.countDocuments(),
      Billet.countDocuments(),
      PackageK.countDocuments(),
      Utilisateur.countDocuments(),
      Reservation.aggregate([{ $group: { _id: '$statut', count: { $sum: 1 } } }]),
      Paiement.find(),
    ]);

    const totalEncaisse = paiements.reduce((s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0), 0);

    const reservations = await Reservation.find().select('montantTotalDu paiements').populate('paiements', 'montant');
    const resteGlobal = reservations.reduce((s, r) => {
      const paye = (r.paiements || []).reduce((sp, p) => sp + (p.montant ? parseFloat(p.montant.toString()) : 0), 0);
      return s + (r.montantTotalDu - paye);
    }, 0);

    // Réservations par mois (12 mois de l'année courante)
    const year = new Date().getFullYear();
    const debutAnnee = new Date(year, 0, 1);

    const [resaParMois, clientsParMois, departsParMois, paiementsParMois] = await Promise.all([
      Reservation.aggregate([
        { $match: { createdAt: { $gte: debutAnnee } } },
        { $group: { _id: { mois: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.mois': 1 } },
      ]),
      Client.aggregate([
        { $match: { createdAt: { $gte: debutAnnee } } },
        { $group: { _id: { mois: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.mois': 1 } },
      ]),
      PackageK.aggregate([
        { $match: { createdAt: { $gte: debutAnnee } } },
        { $group: { _id: { mois: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.mois': 1 } },
      ]),
      Paiement.aggregate([
        { $match: { createdAt: { $gte: debutAnnee } } },
        { $group: { _id: { mois: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.mois': 1 } },
      ]),
    ]);

    return res.status(200).json({
      totalClients,
      totalReservations,
      totalBillets,
      totalPackages,
      totalUtilisateurs,
      totalEncaisse,
      resteGlobal,
      reservationsParStatut,
      resaParMois,
      clientsParMois,
      departsParMois,
      paiementsParMois,
    });
  } catch (err) {
    console.error('Erreur stats:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
