const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const router = express.Router();
const Client = require('../models/Client');
const Document = require('../models/Document');
const { protect } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non accepté (jpg, png, webp uniquement)'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

/**
 * Neutralise les caractères spéciaux pour éviter les attaques ReDoS
 */
const escapeRegExp = (str) => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

router.use(protect);

/**
 * GET /api/clients
 */
router.get('/', async (req, res) => {
  try {
    const { search, passeport } = req.query;
    const filter = {};

    if (passeport) {
      filter.numeroPasseport = typeof passeport === 'string' ? passeport : String(passeport);
    }

    if (search && typeof search === 'string') {
      const regex = new RegExp(escapeRegExp(search), 'i');
      filter.$or = [
        { nom: regex },
        { prenom: regex },
        { telephone: regex },
        { email: regex },
      ];
    } else if (search) {
      return res.status(400).json({ message: 'Le format de recherche est invalide.' });
    }

    const clients = await Client.find(filter)
      .select('numeroPasseport nom prenom telephone email dateCreation')
      .sort({ dateCreation: -1 })
      .limit(100);

    return res.status(200).json({ count: clients.length, clients });
  } catch (err) {
    console.error('Erreur récupération clients:', err);
    return res.status(500).json({ message: 'Erreur serveur interne' });
  }
});

/**
 * POST /api/clients
 */
router.post(
  '/',
  [
    body('nomComplet').optional().trim().isLength({ min: 3 }).withMessage('nomComplet doit contenir au moins 3 caractères'),
    body('nom').optional().trim().isLength({ min: 2 }).withMessage('nom doit contenir au moins 2 caractères'),
    body('prenom').optional().trim().isLength({ min: 2 }).withMessage('prenom doit contenir au moins 2 caractères'),
    body('telephone').optional().trim(),
    body('email').optional().trim().isEmail().withMessage('Email invalide'),
    body('numeroPasseport').optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let { nomComplet, nom, prenom, telephone, email, numeroPasseport } = req.body;

      if (nomComplet && !nom && !prenom) {
        const parts = nomComplet.trim().split(/\s+/);
        if (parts.length >= 2) {
          nom = parts[0];
          prenom = parts.slice(1).join(' ');
        } else {
          prenom = parts[0];
          nom = 'Client';
        }
      }

      if (!numeroPasseport) {
        numeroPasseport = `PP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      }

      const client = new Client({
        numeroPasseport,
        nom,
        prenom,
        telephone: telephone || undefined,
        email: email || undefined,
        creeParUtilisateurId: req.user.id,
      });

      await client.save();

      return res.status(201).json({ message: 'Client créé', data: client });
    } catch (err) {
      console.error('Erreur création client:', err);
      if (err.code === 11000) {
        return res.status(409).json({ message: 'Ce numéro de passeport existe déjà' });
      }
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message).join(', ');
        return res.status(400).json({ message: messages });
      }
      return res.status(500).json({ message: 'Erreur serveur interne' });
    }
  }
);

/**
 * GET /api/clients/:id
 * Détail d'un client avec ses documents
 */
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }

    const documents = await Document.find({ clientId: req.params.id });

    return res.status(200).json({ client, documents });
  } catch (err) {
    console.error('Erreur récupération client:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération du client' });
  }
});

/**
 * PATCH /api/clients/:id
 * Modifier un client
 */
router.patch('/:id', async (req, res) => {
  try {
    const { nom, prenom, telephone, email, adresse, dateNaissance, lieuNaissance, numeroCNI } = req.body;
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    if (nom) client.nom = nom;
    if (prenom) client.prenom = prenom;
    if (telephone !== undefined) client.telephone = telephone || undefined;
    if (email !== undefined) client.email = email || undefined;
    if (adresse !== undefined) client.adresse = adresse;
    if (dateNaissance !== undefined) client.dateNaissance = dateNaissance;
    if (lieuNaissance !== undefined) client.lieuNaissance = lieuNaissance;
    if (numeroCNI !== undefined) client.numeroCNI = numeroCNI || undefined;
    if (req.body.niveauFidelite) client.niveauFidelite = req.body.niveauFidelite;
    if (req.body.referentId !== undefined) client.referentId = req.body.referentId || undefined;
    if (req.body.dateExpirationPasseport !== undefined) client.dateExpirationPasseport = req.body.dateExpirationPasseport;

    await client.save();
    return res.status(200).json({ message: 'Client modifié', client });
  } catch (err) {
    console.error('Erreur modification client:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(', ') });
    }
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * DELETE /api/clients/:id
 * Supprimer un client (uniquement s'il n'a aucune réservation ni billet actif)
 */
router.delete('/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });

    // Vérifier qu'il n'est lié à aucune réservation
    const Reservation = require('../models/Reservation');
    const Billet = require('../models/Billet');

    const nbReservations = await Reservation.countDocuments({ clients: client._id });
    if (nbReservations > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer : ce client est lié à ${nbReservations} réservation(s). Retirez-le d'abord des réservations.`,
      });
    }

    const nbBillets = await Billet.countDocuments({ clientId: client._id });
    if (nbBillets > 0) {
      return res.status(400).json({
        message: `Impossible de supprimer : ce client a ${nbBillets} billet(s) associé(s). Supprimez-les d'abord.`,
      });
    }

    // Supprimer les documents liés
    await Document.deleteMany({ clientId: client._id });

    await Client.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Client supprimé' });
  } catch (err) {
    console.error('Erreur suppression client:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * POST /api/clients/:id/photo
 * Upload photo de profil du client
 */
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni' });

    // Supprimer l'ancienne photo si elle existe
    if (client.photoPublicId) {
      try { await cloudinary.uploader.destroy(client.photoPublicId); } catch (_) {}
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'kyswa-travel/clients', public_id: `client-${client._id}`, overwrite: true, resource_type: 'image' },
        (err, res) => err ? reject(err) : resolve(res)
      );
      stream.end(req.file.buffer);
    });

    client.photoUrl = result.secure_url;
    client.photoPublicId = result.public_id;
    await client.save();

    return res.status(200).json({ message: 'Photo mise à jour', photoUrl: result.secure_url });
  } catch (err) {
    console.error('Erreur upload photo client:', err);
    return res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
