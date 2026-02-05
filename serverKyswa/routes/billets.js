const express = require('express');
const router = express.Router();
const Billet = require('../models/Billet');
const Client = require('../models/Client');
const { protect, requireRole } = require('../middleware/auth');

// Protéger toutes les routes : COMMERCIAL, GESTIONNAIRE, COMPTABLE
router.use(protect);
router.use(requireRole('COMMERCIAL', 'GESTIONNAIRE', 'COMPTABLE'));

/**
 * POST /api/billets
 * Créer un billet d'avion
 */
router.post('/', async (req, res) => {
  try {
    const { numeroBillet, compagnie, classe, destination, typeBillet, dateDepart, dateArrivee, statut, clientId } = req.body;

    // Validations champs obligatoires
    if (!numeroBillet || !compagnie || !classe || !destination || !typeBillet || !dateDepart || !dateArrivee || !statut || !clientId) {
      return res.status(400).json({ 
        message: 'Champs requis manquants (numeroBillet, compagnie, classe, destination, typeBillet, dateDepart, dateArrivee, statut, clientId)' 
      });
    }

    // Vérifier que le client existe
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }

    // Vérifier typeBillet enum
    if (!['aller_simple', 'aller_retour'].includes(typeBillet)) {
      return res.status(400).json({ message: 'Le type de billet doit être "aller_simple" ou "aller_retour"' });
    }

    // Vérifier que dateArrivee > dateDepart
    if (new Date(dateArrivee) <= new Date(dateDepart)) {
      return res.status(400).json({ message: 'La date d\'arrivée doit être après la date de départ' });
    }

    // Créer le billet
    const billet = new Billet({
      idBillet: Date.now(),
      numeroBillet,
      compagnie,
      classe,
      destination,
      typeBillet,
      dateDepart,
      dateArrivee,
      statut,
      clientId,
      paiements: [],
    });

    await billet.save();
    await billet.populate('clientId', 'nom prenom numeroPasseport');

    return res.status(201).json({
      message: 'Billet créé avec succès',
      billet,
    });
  } catch (err) {
    console.error('Erreur création billet:', err);
    return res.status(500).json({ message: 'Erreur lors de la création du billet' });
  }
});

/**
 * GET /api/billets
 * Liste tous les billets
 */
router.get('/', async (req, res) => {
  try {
    const billets = await Billet.find()
      .populate('clientId', 'nom prenom numeroPasseport email')
      .populate('paiements', 'idPaiement montant mode dateReglement')
      .sort({ dateDepart: -1 });

    return res.status(200).json({
      count: billets.length,
      billets,
    });
  } catch (err) {
    console.error('Erreur récupération billets:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des billets' });
  }
});

/**
 * GET /api/billets/:id
 * Détail d'un billet
 */
router.get('/:id', async (req, res) => {
  try {
    const billet = await Billet.findById(req.params.id)
      .populate('clientId', 'nom prenom numeroPasseport email telephone')
      .populate('paiements', 'idPaiement montant mode dateReglement');

    if (!billet) {
      return res.status(404).json({ message: 'Billet non trouvé' });
    }

    return res.status(200).json({ billet });
  } catch (err) {
    console.error('Erreur récupération billet:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération du billet' });
  }
});

/**
 * PATCH /api/billets/:id
 * Modifier un billet (sauf idBillet et clientId)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { numeroBillet, compagnie, classe, destination, typeBillet, dateDepart, dateArrivee, statut } = req.body;

    const billet = await Billet.findById(req.params.id);
    if (!billet) {
      return res.status(404).json({ message: 'Billet non trouvé' });
    }

    // Vérifier typeBillet si modifié
    if (typeBillet && !['aller_simple', 'aller_retour'].includes(typeBillet)) {
      return res.status(400).json({ message: 'Le type de billet doit être "aller_simple" ou "aller_retour"' });
    }

    // Vérifier dateArrivee > dateDepart si modifiés
    const newDateDepart = dateDepart ? new Date(dateDepart) : billet.dateDepart;
    const newDateArrivee = dateArrivee ? new Date(dateArrivee) : billet.dateArrivee;
    if (newDateArrivee <= newDateDepart) {
      return res.status(400).json({ message: 'La date d\'arrivée doit être après la date de départ' });
    }

    // Mise à jour des champs autorisés
    if (numeroBillet !== undefined) billet.numeroBillet = numeroBillet;
    if (compagnie !== undefined) billet.compagnie = compagnie;
    if (classe !== undefined) billet.classe = classe;
    if (destination !== undefined) billet.destination = destination;
    if (typeBillet !== undefined) billet.typeBillet = typeBillet;
    if (dateDepart !== undefined) billet.dateDepart = dateDepart;
    if (dateArrivee !== undefined) billet.dateArrivee = dateArrivee;
    if (statut !== undefined) billet.statut = statut;

    await billet.save();
    await billet.populate('clientId', 'nom prenom numeroPasseport');

    return res.status(200).json({
      message: 'Billet modifié avec succès',
      billet,
    });
  } catch (err) {
    console.error('Erreur modification billet:', err);
    return res.status(500).json({ message: 'Erreur lors de la modification du billet' });
  }
});

/**
 * DELETE /api/billets/:id
 * Supprimer ou annuler un billet (passer statut à ANNULE)
 */
router.delete('/:id', async (req, res) => {
  try {
    const billet = await Billet.findById(req.params.id);
    if (!billet) {
      return res.status(404).json({ message: 'Billet non trouvé' });
    }

    // Passer le statut à ANNULE au lieu de supprimer
    billet.statut = 'ANNULE';
    await billet.save();

    return res.status(200).json({
      message: 'Billet annulé avec succès',
      billet: {
        idBillet: billet.idBillet,
        numeroBillet: billet.numeroBillet,
        statut: billet.statut,
      },
    });
  } catch (err) {
    console.error('Erreur suppression billet:', err);
    return res.status(500).json({ message: 'Erreur lors de l\'annulation du billet' });
  }
});

module.exports = router;
