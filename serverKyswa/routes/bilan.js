const express = require('express');
const router = express.Router();
const PackageK = require('../models/PackageK');
const Reservation = require('../models/Reservation');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);
router.use(requireRole('comptable', 'administrateur', 'dg'));

/**
 * GET /api/bilan
 * Vue synthétique par départ
 */
router.get('/', async (req, res) => {
  try {
    const packages = await PackageK.find({ statut: { $ne: 'ANNULE' } })
      .sort({ dateDepart: -1 });

    const bilans = await Promise.all(packages.map(async (pkg) => {
      const reservations = await Reservation.find({
        packageKId: pkg._id,
        statut: { $nin: ['ANNULEE', 'DESISTE'] },
      }).populate('paiements', 'montant');

      const nbInscrits = reservations.length;
      const totalDu = reservations.reduce((s, r) => s + (r.montantTotalDu || 0), 0);
      const totalEncaisse = reservations.reduce((s, r) => {
        const paye = (r.paiements || []).reduce((sp, p) => sp + (p.montant ? parseFloat(p.montant.toString()) : 0), 0);
        return s + paye;
      }, 0);
      const resteTotal = totalDu - totalEncaisse;
      const tauxRemplissage = pkg.quotaMax > 0 ? Math.round((nbInscrits / pkg.quotaMax) * 100) : 0;

      // Répartition par statut
      const parStatut = {};
      reservations.forEach(r => {
        parStatut[r.statut] = (parStatut[r.statut] || 0) + 1;
      });

      return {
        package: {
          _id: pkg._id,
          nomReference: pkg.nomReference,
          type: pkg.type,
          dateDepart: pkg.dateDepart,
          dateRetour: pkg.dateRetour,
          quotaMax: pkg.quotaMax,
          statut: pkg.statut,
        },
        nbInscrits,
        quotaMax: pkg.quotaMax,
        tauxRemplissage,
        totalDu,
        totalEncaisse,
        resteTotal,
        parStatut,
      };
    }));

    return res.status(200).json({ bilans });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/bilan/:packageId
 * Détail d'un départ
 */
router.get('/:packageId', async (req, res) => {
  try {
    const pkg = await PackageK.findById(req.params.packageId);
    if (!pkg) return res.status(404).json({ message: 'Package non trouvé' });

    const reservations = await Reservation.find({ packageKId: pkg._id })
      .populate('clients', 'nom prenom telephone numeroPasseport')
      .populate('paiements', 'montant mode dateReglement');

    const bilan = reservations.map(r => {
      const totalPaye = (r.paiements || []).reduce((s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0), 0);
      return {
        numero: r.numero || r.idReservation,
        clients: r.clients,
        statut: r.statut,
        typeChambre: r.typeChambre,
        montantTotalDu: r.montantTotalDu,
        totalPaye,
        resteAPayer: r.montantTotalDu - totalPaye,
        dateDepart: r.dateDepart,
      };
    });

    return res.status(200).json({ package: pkg, bilan });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
