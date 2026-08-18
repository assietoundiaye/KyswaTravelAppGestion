const express = require('express');
const router = express.Router();
const PackageK = require('../models/PackageK');
const Reservation = require('../models/Reservation');
const BilanDepart = require('../models/BilanDepart');
const { protect, requireRole } = require('../middleware/auth');

router.use(protect);
router.use(requireRole('comptable', 'administrateur', 'dg', 'commercial', 'oumra'));

/**
 * POST /api/bilan
 * Créer un bilan de départ personnalisé (comptable uniquement)
 */
router.post('/', requireRole('comptable', 'administrateur', 'dg'), async (req, res) => {
  try {
    const { packageId, commentaires, observations, actionsSuivi } = req.body;

    const pkg = await PackageK.findById(packageId);
    if (!pkg) return res.status(404).json({ message: 'Package non trouvé' });

    // Vérifier si un bilan existe déjà pour ce package
    const bilanExistant = await BilanDepart.findOne({ packageId, statut: 'ACTIF' });
    if (bilanExistant) {
      return res.status(400).json({ message: 'Un bilan actif existe déjà pour ce départ' });
    }

    // Créer le nouveau bilan
    const nouveauBilan = new BilanDepart({
      packageId,
      nomReference: pkg.nomReference,
      createdBy: req.user.nom + ' ' + req.user.prenom,
      roleCreateur: req.user.role,
      commentaires: commentaires || '',
      observations: observations || '',
      actionsSuivi: actionsSuivi.filter(action => action.trim() !== '')
    });

    await nouveauBilan.save();

    return res.status(201).json({ 
      message: 'Bilan créé avec succès',
      bilan: nouveauBilan
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur lors de la création du bilan' });
  }
});

/**
 * GET /api/bilan/personnalises
 * Récupérer tous les bilans personnalisés
 */
router.get('/personnalises', async (req, res) => {
  try {
    const bilansPersonnalises = await BilanDepart.find({ statut: 'ACTIF' })
      .populate('packageId', 'nomReference dateDepart dateRetour statut type')
      .sort({ dateCreation: -1 });

    return res.status(200).json({ bilans: bilansPersonnalises });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * PUT /api/bilan/:id
 * Modifier un bilan personnalisé (comptable uniquement)
 */
router.put('/:id', requireRole('comptable', 'administrateur', 'dg'), async (req, res) => {
  try {
    const { commentaires, observations, actionsSuivi } = req.body;
    
    const bilan = await BilanDepart.findById(req.params.id);
    if (!bilan) return res.status(404).json({ message: 'Bilan non trouvé' });

    bilan.commentaires = commentaires || bilan.commentaires;
    bilan.observations = observations || bilan.observations;
    bilan.actionsSuivi = actionsSuivi ? actionsSuivi.filter(action => action.trim() !== '') : bilan.actionsSuivi;
    bilan.dateModification = new Date();
    bilan.modifiePar = req.user.nom + ' ' + req.user.prenom;

    await bilan.save();

    return res.status(200).json({ 
      message: 'Bilan modifié avec succès',
      bilan 
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur lors de la modification' });
  }
});

/**
 * DELETE /api/bilan/:id
 * Supprimer (archiver) un bilan personnalisé (comptable uniquement)
 */
router.delete('/:id', requireRole('comptable', 'administrateur', 'dg'), async (req, res) => {
  try {
    const bilan = await BilanDepart.findById(req.params.id);
    if (!bilan) return res.status(404).json({ message: 'Bilan non trouvé' });

    bilan.statut = 'ANNULE';
    bilan.dateModification = new Date();
    bilan.modifiePar = req.user.nom + ' ' + req.user.prenom;
    
    await bilan.save();

    return res.status(200).json({ message: 'Bilan supprimé avec succès' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
});

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
