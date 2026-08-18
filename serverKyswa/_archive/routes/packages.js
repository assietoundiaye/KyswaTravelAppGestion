const express = require('express');
const router = express.Router();
const packageService = require('../services/packageService');
const { protect, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');

// Protéger toutes les routes avec protect
router.use(protect);
router.use(requirePermission(PERMISSIONS.PACKAGES_READ));

/**
 * GET /api/packages
 */
router.get('/', async (req, res) => {
  try {
    const { page, limit, search, type, actif } = req.query;
    
    const result = await packageService.findAll({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      search,
      type,
      actif: actif === 'true' ? true : actif === 'false' ? false : undefined
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('Erreur récupération packages:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/packages
 */
router.post('/', requirePermission(PERMISSIONS.PACKAGES_MANAGE), async (req, res) => {
  try {
    const { nomReference, type, dateDepart, dateRetour, prixEco, quotaMax } = req.body;

    // Validation des types
    if (typeof nomReference !== 'string' || !dateDepart || !dateRetour || !quotaMax) {
      return res.status(400).json({ message: 'Données invalides ou manquantes' });
    }

    const typesAutorises = ['OUMRA', 'HAJJ', 'ZIAR_FES', 'TOURISME'];
    if (type && !typesAutorises.includes(type)) {
      return res.status(400).json({ message: 'Type de package invalide' });
    }

    // Nettoyage et vérification unicité
    const cleanNom = nomReference.toUpperCase().trim();
    const nameExists = await packageService.checkNameExists(cleanNom);
    if (nameExists) {
      return res.status(400).json({ message: 'Ce nom de référence existe déjà' });
    }

    // Validation dates
    if (new Date(dateRetour) <= new Date(dateDepart)) {
      return res.status(400).json({ message: 'La date de retour doit être après le départ' });
    }

    // Créer le package
    const packageData = await packageService.create({
      ...req.body,
      nomReference: cleanNom,
      type: type || 'OUMRA',
      actif: req.body.actif !== false
    });

    return res.status(201).json({ 
      message: 'Package créé', 
      package: packageData 
    });
  } catch (err) {
    console.error('Erreur création package:', err);
    return res.status(500).json({ message: 'Erreur lors de la création' });
  }
});

/**
 * PATCH /api/packages/:id
 */
router.patch('/:id', requirePermission(PERMISSIONS.PACKAGES_MANAGE), async (req, res) => {
  try {
    const { nomReference, type, dateDepart, dateRetour, prixEco, quotaMax } = req.body;
    
    // Vérifier que le package existe
    const existing = await packageService.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Package non trouvé' });
    }

    // Validation nomReference si fourni
    if (nomReference && typeof nomReference === 'string') {
      const cleanNom = nomReference.toUpperCase().trim();
      if (cleanNom !== existing.nom) {
        const nameExists = await packageService.checkNameExists(cleanNom, req.params.id);
        if (nameExists) {
          return res.status(400).json({ message: 'Nom déjà utilisé' });
        }
      }
    }

    // Vérification dates si modifiées
    if (dateDepart || dateRetour) {
      const dDepart = dateDepart ? new Date(dateDepart) : new Date(existing.date_depart);
      const dRetour = dateRetour ? new Date(dateRetour) : new Date(existing.date_retour);
      if (dRetour <= dDepart) {
        return res.status(400).json({ message: 'Cohérence des dates invalide' });
      }
    }

    // Mettre à jour
    const updated = await packageService.update(req.params.id, req.body);
    
    return res.status(200).json({ 
      message: 'Modifié avec succès', 
      package: updated 
    });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Package non trouvé' });
    }
    console.error('Erreur modification package:', err);
    return res.status(500).json({ message: 'Erreur modification' });
  }
});

/**
 * DELETE /api/packages/:id
 */
router.delete('/:id', requirePermission(PERMISSIONS.PACKAGES_MANAGE), async (req, res) => {
  try {
    // Vérifier que le package existe
    const packageData = await packageService.findById(req.params.id);
    if (!packageData) {
      return res.status(404).json({ message: 'Package non trouvé' });
    }

    // TODO: Vérifier s'il y a des réservations liées
    // if (packageData.placesReservees > 0) {
    //   return res.status(400).json({ 
    //     message: 'Impossible de supprimer un package contenant des réservations' 
    //   });
    // }

    await packageService.delete(req.params.id);
    return res.status(200).json({ message: 'Package supprimé' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Package non trouvé' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ 
        message: 'Impossible de supprimer ce package car il est lié à des réservations' 
      });
    }
    console.error('Erreur suppression package:', err);
    return res.status(500).json({ message: 'Erreur suppression' });
  }
});

/**
 * GET /api/packages/actifs - Packages actifs uniquement
 */
router.get('/actifs', async (req, res) => {
  try {
    const { type } = req.query;
    const packages = await packageService.findActive({ type });
    
    return res.status(200).json({ 
      count: packages.length, 
      packages 
    });
  } catch (err) {
    console.error('Erreur packages actifs:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * GET /api/packages/stats - Statistiques
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await packageService.getStats();
    return res.status(200).json(stats);
  } catch (err) {
    console.error('Erreur stats packages:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;