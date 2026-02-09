const express = require('express');
const router = express.Router();
const PackageK = require('../models/PackageK');
const { protect, requireRole } = require('../middleware/auth');

// Protéger toutes les routes avec protect
router.use(protect);

/**
 * GET /api/packages
 */
router.get('/', async (req, res) => {
  try {
    const packages = await PackageK.find()
      .populate('creeParUtilisateurId', 'nom prenom email')
      .select('idPackageK nomReference type statut dateDepart dateRetour quotaMax placesReservees prixEco prixCont prixVip hotel')
      .sort({ dateDepart: -1 });

    return res.status(200).json({ count: packages.length, packages });
  } catch (err) {
    console.error('Erreur récupération packages:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/packages
 */
router.post('/', requireRole('GESTIONNAIRE'), async (req, res) => {
  try {
    const { nomReference, type, statut, dateDepart, dateRetour, prixEco, prixCont, prixVip, hotel, quotaMax } = req.body;

    // Validation des types (CWE-1287)
    if (typeof nomReference !== 'string' || !dateDepart || !dateRetour || !quotaMax) {
      return res.status(400).json({ message: 'Données invalides ou manquantes' });
    }

    const typesAutorises = ['OUMRA', 'HAJJ', 'ZIAR_FES', 'TOURISME'];
    if (type && !typesAutorises.includes(type)) {
      return res.status(400).json({ message: 'Type de package invalide' });
    }

    // Sécurisation du trim()
    const cleanNom = nomReference.trim();
    const existingByName = await PackageK.findOne({ nomReference: cleanNom });
    if (existingByName) {
      return res.status(400).json({ message: 'Ce nom de référence existe déjà' });
    }

    if (new Date(dateRetour) <= new Date(dateDepart)) {
      return res.status(400).json({ message: 'La date de retour doit être après le départ' });
    }

    const packageK = new PackageK({
      idPackageK: Date.now(),
      nomReference: cleanNom,
      type: type || undefined,
      statut: statut || 'OUVERT',
      dateDepart,
      dateRetour,
      prixEco, prixCont, prixVip,
      hotel: Array.isArray(hotel) ? hotel : [],
      quotaMax,
      creeParUtilisateurId: req.user.id,
    });

    await packageK.save();
    await packageK.populate('creeParUtilisateurId', 'nom prenom email');

    return res.status(201).json({ message: 'Package créé', package: packageK });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur lors de la création' });
  }
});

/**
 * PATCH /api/packages/:id
 */
router.patch('/:id', requireRole('GESTIONNAIRE'), async (req, res) => {
  try {
    const { nomReference, type, statut, dateDepart, dateRetour, prixEco, prixCont, prixVip, hotel, quotaMax } = req.body;
    const packageK = await PackageK.findById(req.params.id);

    if (!packageK) return res.status(404).json({ message: 'Package non trouvé' });

    // Validation de type pour nomReference si fourni
    if (nomReference) {
      if (typeof nomReference !== 'string') return res.status(400).json({ message: 'Format nomReference invalide' });
      const cleanNom = nomReference.trim();
      if (cleanNom !== packageK.nomReference) {
        const existing = await PackageK.findOne({ nomReference: cleanNom });
        if (existing) return res.status(400).json({ message: 'Nom déjà utilisé' });
        packageK.nomReference = cleanNom;
      }
    }

    // Vérification logique des dates
    const dDepart = dateDepart ? new Date(dateDepart) : new Date(packageK.dateDepart);
    const dRetour = dateRetour ? new Date(dateRetour) : new Date(packageK.dateRetour);
    if (dRetour <= dDepart) {
      return res.status(400).json({ message: 'Cohérence des dates invalide' });
    }

    // Mise à jour sécurisée
    if (type) packageK.type = type;
    if (statut) packageK.statut = statut;
    if (dateDepart) packageK.dateDepart = dateDepart;
    if (dateRetour) packageK.dateRetour = dateRetour;
    if (prixEco) packageK.prixEco = prixEco;
    if (prixCont) packageK.prixCont = prixCont;
    if (prixVip) packageK.prixVip = prixVip;
    if (hotel) packageK.hotel = Array.isArray(hotel) ? hotel : packageK.hotel;
    if (quotaMax) packageK.quotaMax = quotaMax;

    await packageK.save();
    return res.status(200).json({ message: 'Modifié avec succès', package: packageK });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur modification' });
  }
});

/**
 * DELETE /api/packages/:id
 */
router.delete('/:id', requireRole('GESTIONNAIRE'), async (req, res) => {
  try {
    const packageK = await PackageK.findById(req.params.id);
    if (!packageK) return res.status(404).json({ message: 'Package non trouvé' });

    if (packageK.placesReservees > 0) {
      return res.status(400).json({ message: 'Impossible de supprimer un package contenant des réservations' });
    }

    await PackageK.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Package supprimé' });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur suppression' });
  }
});

/**
 * POST /api/packages/:id/supplements
 */
router.post('/:id/supplements', requireRole('GESTIONNAIRE'), async (req, res) => {
  try {
    const { supplementIds } = req.body;
    if (!Array.isArray(supplementIds)) return res.status(400).json({ message: 'Array supplementIds requis' });

    const packageK = await PackageK.findById(req.params.id);
    if (!packageK) return res.status(404).json({ message: 'Package non trouvé' });

    // Ajout sans doublons
    supplementIds.forEach(id => {
      if (!packageK.supplements.includes(id)) packageK.supplements.push(id);
    });

    await packageK.save();
    return res.status(200).json({ message: 'Suppléments ajoutés', package: packageK });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur association' });
  }
});

module.exports = router;