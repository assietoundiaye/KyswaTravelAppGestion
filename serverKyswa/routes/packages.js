const express = require('express');
const router = express.Router();
const PackageK = require('../models/PackageK');
const { protect, requireRole } = require('../middleware/auth');

// Protéger toutes les routes avec protect et requireRole('GESTIONNAIRE', 'ADMIN')
router.use(protect);
router.use(requireRole('GESTIONNAIRE', 'ADMIN'));

/**
 * GET /api/packages
 * Liste tous les packages
 */
router.get('/', async (req, res) => {
  try {
    const packages = await PackageK.find()
      .populate('creeParUtilisateurId', 'nom prenom email')
      .select('idPackageK nomReference type statut dateDepart dateRetour quotaMax placesReservees prixEco prixCont prixVip hotel')
      .sort({ dateDepart: -1 });

    return res.status(200).json({
      count: packages.length,
      packages,
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des packages:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des packages' });
  }
});

/**
 * POST /api/packages
 * Créer un nouveau package
 */
router.post('/', async (req, res) => {
  try {
    const { nomReference, type, statut, dateDepart, dateRetour, prixEco, prixCont, prixVip, hotel, quotaMax } = req.body;

    // Validations
    if (!nomReference || !dateDepart || !dateRetour || !quotaMax) {
      return res.status(400).json({ message: 'Champs requis manquants (nomReference, dateDepart, dateRetour, quotaMax)' });
    }

    // Vérifier les types autorisés
    const typesAutorises = ['OUMRA', 'HAJJ', 'ZIAR_FES', 'TOURISME'];
    if (type && !typesAutorises.includes(type)) {
      return res.status(400).json({
        message: `Le type doit être l'un de: ${typesAutorises.join(', ')}`,
      });
    }

    // Vérifier que nomReference est unique
    const existingByName = await PackageK.findOne({ nomReference: nomReference.trim() });
    if (existingByName) {
      return res.status(400).json({ message: 'Un package avec ce nom de référence existe déjà' });
    }

    // Vérifier les statuts autorisés
    const statutsAutorises = ['OUVERT', 'COMPLET', 'ANNULE', 'TERMINE'];
    if (statut && !statutsAutorises.includes(statut)) {
      return res.status(400).json({
        message: `Le statut doit être l'un de: ${statutsAutorises.join(', ')}`,
      });
    }

    // Vérifier que dateRetour > dateDepart
    if (new Date(dateRetour) <= new Date(dateDepart)) {
      return res.status(400).json({ message: 'La date de retour doit être après la date de départ' });
    }

    // Créer le package
    const packageK = new PackageK({
      idPackageK: Date.now(),
      nomReference,
      type: type || undefined,
      statut: statut || 'OUVERT',
      dateDepart,
      dateRetour,
      prixEco: prixEco || undefined,
      prixCont: prixCont || undefined,
      prixVip: prixVip || undefined,
      hotel: hotel || [],
      quotaMax,
      creeParUtilisateurId: req.user.id,
    });

    await packageK.save();
    await packageK.populate('creeParUtilisateurId', 'nom prenom email');

    return res.status(201).json({
      message: 'Package créé avec succès',
      package: packageK,
    });
  } catch (err) {
    console.error('Erreur lors de la création du package:', err);
    return res.status(500).json({ message: 'Erreur lors de la création du package' });
  }
});

/**
 * GET /api/packages/:id
 * Détail d'un package
 */
router.get('/:id', async (req, res) => {
  try {
    const packageK = await PackageK.findById(req.params.id)
      .populate('creeParUtilisateurId', 'nom prenom email');

    if (!packageK) {
      return res.status(404).json({ message: 'Package non trouvé' });
    }

    return res.status(200).json({ package: packageK });
  } catch (err) {
    console.error('Erreur lors de la récupération du package:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération du package' });
  }
});

/**
 * PATCH /api/packages/:id
 * Modifier un package (sauf id)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { nomReference, type, statut, dateDepart, dateRetour, prixEco, prixCont, prixVip, hotel, quotaMax } = req.body;

    const packageK = await PackageK.findById(req.params.id);

    if (!packageK) {
      return res.status(404).json({ message: 'Package non trouvé' });
    }

    // Vérifier les types autorisés
    const typesAutorises = ['OUMRA', 'HAJJ', 'ZIAR_FES', 'TOURISME'];
    if (type && !typesAutorises.includes(type)) {
      return res.status(400).json({
        message: `Le type doit être l'un de: ${typesAutorises.join(', ')}`,
      });
    }

    // Vérifier les statuts autorisés
    const statutsAutorises = ['OUVERT', 'COMPLET', 'ANNULE', 'TERMINE'];
    if (statut && !statutsAutorises.includes(statut)) {
      return res.status(400).json({
        message: `Le statut doit être l'un de: ${statutsAutorises.join(', ')}`,
      });
    }

    // Vérifier que dateRetour > dateDepart
    const newDateDepart = dateDepart ? new Date(dateDepart) : packageK.dateDepart;
    const newDateRetour = dateRetour ? new Date(dateRetour) : packageK.dateRetour;
    if (newDateRetour <= newDateDepart) {
      return res.status(400).json({ message: 'La date de retour doit être après la date de départ' });
    }

    // Mise à jour des champs
    if (nomReference && nomReference.trim() !== packageK.nomReference) {
      const existing = await PackageK.findOne({ nomReference: nomReference.trim() });
      if (existing && existing._id.toString() !== packageK._id.toString()) {
        return res.status(400).json({ message: 'Un package avec ce nom de référence existe déjà' });
      }
      packageK.nomReference = nomReference;
    }
    if (type) packageK.type = type;
    if (statut) packageK.statut = statut;
    if (dateDepart) packageK.dateDepart = dateDepart;
    if (dateRetour) packageK.dateRetour = dateRetour;
    if (prixEco) packageK.prixEco = prixEco;
    if (prixCont) packageK.prixCont = prixCont;
    if (prixVip) packageK.prixVip = prixVip;
    if (hotel) packageK.hotel = hotel;
    if (quotaMax) packageK.quotaMax = quotaMax;

    await packageK.save();
    await packageK.populate('creeParUtilisateurId', 'nom prenom email');

    return res.status(200).json({
      message: 'Package modifié avec succès',
      package: packageK,
    });
  } catch (err) {
    console.error('Erreur lors de la modification du package:', err);
    return res.status(500).json({ message: 'Erreur lors de la modification du package' });
  }
});

/**
 * DELETE /api/packages/:id
 * Supprimer un package (vérifie que placesReservees === 0)
 */
router.delete('/:id', async (req, res) => {
  try {
    const packageK = await PackageK.findById(req.params.id);

    if (!packageK) {
      return res.status(404).json({ message: 'Package non trouvé' });
    }

    // Vérifier que le package est vide
    if (packageK.placesReservees > 0) {
      return res.status(400).json({ message: 'Package non vide' });
    }

    await PackageK.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      message: 'Package supprimé avec succès',
      package: {
        id: packageK._id,
        nomReference: packageK.nomReference,
        type: packageK.type,
      },
    });
  } catch (err) {
    console.error('Erreur lors de la suppression du package:', err);
    return res.status(500).json({ message: 'Erreur lors de la suppression du package' });
  }
});

/**
 * POST /api/packages/:id/supplements
 * Associer un ou plusieurs suppléments à un package
 */
router.post('/:id/supplements', async (req, res) => {
  try {
    const { supplementIds } = req.body;

    // Validations
    if (!supplementIds || !Array.isArray(supplementIds) || supplementIds.length === 0) {
      return res.status(400).json({ message: 'Veuillez fournir un array de supplementIds' });
    }

    const packageK = await PackageK.findById(req.params.id);

    if (!packageK) {
      return res.status(404).json({ message: 'Package non trouvé' });
    }

    // Ajouter les suppléments (éviter les doublons)
    supplementIds.forEach((supplementId) => {
      if (!packageK.supplements.includes(supplementId)) {
        packageK.supplements.push(supplementId);
      }
    });

    await packageK.save();
    await packageK.populate('supplements', 'idSupplement nom prix');

    return res.status(200).json({
      message: 'Suppléments associés avec succès',
      package: packageK,
    });
  } catch (err) {
    console.error('Erreur lors de l\'association des suppléments:', err);
    return res.status(500).json({ message: 'Erreur lors de l\'association des suppléments' });
  }
});

/**
 * GET /api/packages/:id/supplements
 * Lister les suppléments associés à un package
 */
router.get('/:id/supplements', async (req, res) => {
  try {
    const packageK = await PackageK.findById(req.params.id)
      .populate('supplements', 'idSupplement nom prix dateCreation');

    if (!packageK) {
      return res.status(404).json({ message: 'Package non trouvé' });
    }

    return res.status(200).json({
      count: packageK.supplements.length,
      supplements: packageK.supplements,
    });
  } catch (err) {
    console.error('Erreur lors de la récupération des suppléments:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des suppléments' });
  }
});

/**
 * DELETE /api/packages/:id/supplements/:supplementId
 * Retirer un supplément d'un package
 */
router.delete('/:id/supplements/:supplementId', async (req, res) => {
  try {
    const packageK = await PackageK.findById(req.params.id);

    if (!packageK) {
      return res.status(404).json({ message: 'Package non trouvé' });
    }

    // Retirer le supplément de l'array
    packageK.supplements = packageK.supplements.filter(
      (id) => id.toString() !== req.params.supplementId
    );

    await packageK.save();
    await packageK.populate('supplements', 'idSupplement nom prix');

    return res.status(200).json({
      message: 'Supplément retiré avec succès',
      package: packageK,
    });
  } catch (err) {
    console.error('Erreur lors de la suppression du supplément:', err);
    return res.status(500).json({ message: 'Erreur lors de la suppression du supplément' });
  }
});

module.exports = router;
