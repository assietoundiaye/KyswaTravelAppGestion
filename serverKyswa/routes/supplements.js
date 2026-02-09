const express = require('express');
const router = express.Router();
const Supplement = require('../models/Supplement');
const LigneSupplement = require('../models/LigneSupplement');
const { protect, requireRole } = require('../middleware/auth');

// Protéger toutes les routes avec protect et requireRole('GESTIONNAIRE')
router.use(protect);
router.use(requireRole('GESTIONNAIRE'));

/**
 * GET /api/supplements
 */
router.get('/', async (req, res) => {
  try {
    const supplements = await Supplement.find()
      .populate('creeParUtilisateurId', 'nom prenom email')
      .select('idSupplement nom prix dateCreation creeParUtilisateurId')
      .sort({ dateCreation: -1 });

    return res.status(200).json({
      count: supplements.length,
      supplements,
    });
  } catch (err) {
    console.error('Erreur récupération suppléments:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/supplements
 * Correction : Validation de type (CWE-1287)
 */
router.post('/', async (req, res) => {
  try {
    const { nom, prix } = req.body;

    // Validation stricte des types pour éviter les crashs
    if (typeof nom !== 'string' || prix === undefined || prix === null) {
      return res.status(400).json({ message: 'Champs requis manquants ou format invalide (nom doit être du texte)' });
    }

    const cleanPrix = Number(prix);
    if (isNaN(cleanPrix) || cleanPrix < 0) {
      return res.status(400).json({ message: 'Le prix doit être un nombre positif' });
    }

    // Sécurisation du trim()
    const cleanNom = nom.trim();
    const supplementExistant = await Supplement.findOne({ nom: cleanNom });
    if (supplementExistant) {
      return res.status(400).json({ message: 'Ce nom de supplément existe déjà' });
    }

    const supplement = new Supplement({
      idSupplement: Date.now(),
      nom: cleanNom,
      prix: cleanPrix,
      creeParUtilisateurId: req.user.id,
    });

    await supplement.save();
    await supplement.populate('creeParUtilisateurId', 'nom prenom email');

    return res.status(201).json({ message: 'Supplément créé', supplement });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur lors de la création' });
  }
});

/**
 * PATCH /api/supplements/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const { nom, prix } = req.body;
    const supplement = await Supplement.findById(req.params.id);

    if (!supplement) {
      return res.status(404).json({ message: 'Supplément non trouvé' });
    }

    // Validation du prix
    if (prix !== undefined && prix !== null) {
      const cleanPrix = Number(prix);
      if (isNaN(cleanPrix) || cleanPrix < 0) {
        return res.status(400).json({ message: 'Prix invalide' });
      }
      supplement.prix = cleanPrix;
    }

    // Validation du nom et du type (CWE-1287)
    if (nom) {
      if (typeof nom !== 'string') {
        return res.status(400).json({ message: 'Le nom doit être une chaîne de caractères' });
      }
      const cleanNom = nom.trim();
      if (cleanNom !== supplement.nom) {
        const existant = await Supplement.findOne({ nom: cleanNom });
        if (existant) return res.status(400).json({ message: 'Nom déjà utilisé' });
        supplement.nom = cleanNom;
      }
    }

    await supplement.save();
    await supplement.populate('creeParUtilisateurId', 'nom prenom email');

    return res.status(200).json({ message: 'Modifié avec succès', supplement });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur modification' });
  }
});

/**
 * DELETE /api/supplements/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const supplement = await Supplement.findById(req.params.id);
    if (!supplement) return res.status(404).json({ message: 'Supplément non trouvé' });

    // Sécurité supplémentaire : On pourrait vérifier ici si le supplément 
    // est lié à des factures ou commandes réelles avant de supprimer.
    
    await Supplement.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Supplément supprimé' });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur suppression' });
  }
});

module.exports = router;