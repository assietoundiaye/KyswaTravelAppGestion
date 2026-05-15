const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const router = express.Router();
const Client = require('../models/Client');
const { protect, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const { scanPassport, scanCNI, initWorkers } = require('../services/ocrService');
const clientService = require('../services/clientService');

// Pré-chauffer les workers OCR dès le chargement de la route
initWorkers().catch(() => {});

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/tiff'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non accepté (jpg, png, webp, tiff uniquement)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB pour les scans de documents
});

router.use(protect);
router.use(requirePermission(PERMISSIONS.CLIENTS_READ));

/**
 * POST /api/clients/scan-document
 * Scan OCR d'un passeport ou CNI — 100% local, gratuit, illimité
 * Tesseract.js + parseur MRZ ICAO 9303 (tous passeports du monde)
 */
router.post(
  '/scan-document',
  requirePermission(PERMISSIONS.CLIENTS_SCAN_DOCUMENT),
  upload.single('document'),
  async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni' });

    const docType = req.body.type || 'passport'; // 'passport' | 'id_card'

    let result;
    if (docType === 'passport') {
      result = await scanPassport(req.file.buffer);
    } else {
      result = await scanCNI(req.file.buffer);
    }

    // Toujours retourner 200 — même si partiel, l'agent peut compléter manuellement
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('Erreur OCR:', err.message);
    // En cas d'erreur technique (image corrompue, etc.), retourner un résultat vide
    return res.status(200).json({
      success: false,
      data: {
        type: req.body?.type || 'passport',
        nom: '', prenom: '', numeroPasseport: '', numeroCNI: '',
        dateNaissance: '', dateExpirationPasseport: '',
        mrzDetectee: false,
        avertissement: 'Erreur de lecture. Vérifiez la qualité de l\'image ou saisissez manuellement.',
      },
    });
  }
  }
);

/**
 * GET /api/clients
 */
router.get('/', async (req, res) => {
  try {
    const clients = await clientService.listerClients(req.query);
    return res.status(200).json({ count: clients.length, clients });
  } catch (err) {
    console.error('Erreur récupération clients:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur interne' });
  }
});

/**
 * POST /api/clients
 */
router.post(
  '/',
  requirePermission(PERMISSIONS.CLIENTS_CREATE),
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

      const client = await clientService.creerClient(req.body, req.user.id);
      return res.status(201).json({ message: 'Client créé', data: client });
    } catch (err) {
      console.error('Erreur création client:', err);
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0];
        if (field === 'telephone') return res.status(409).json({ message: 'Ce numéro de téléphone est déjà utilisé par un autre client' });
        if (field === 'numeroCNI') return res.status(409).json({ message: 'Ce numéro de CNI est déjà utilisé par un autre client' });
        return res.status(409).json({ message: 'Ce numéro de passeport existe déjà' });
      }
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message).join(', ');
        return res.status(400).json({ message: messages });
      }
      return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur interne' });
    }
  }
);

/**
 * GET /api/clients/:id
 * Détail d'un client avec ses documents
 */
router.get('/:id', async (req, res) => {
  try {
    const { client, documents } = await clientService.getClientAvecDocuments(req.params.id);
    return res.status(200).json({ client, documents });
  } catch (err) {
    console.error('Erreur récupération client:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur lors de la récupération du client' });
  }
});

/**
 * PATCH /api/clients/:id
 * Modifier un client
 */
router.patch('/:id', requirePermission(PERMISSIONS.CLIENTS_UPDATE), async (req, res) => {
  try {
    const client = await clientService.modifierClient(req.params.id, req.body);
    return res.status(200).json({ message: 'Client modifié', client });
  } catch (err) {
    console.error('Erreur modification client:', err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      if (field === 'telephone') return res.status(409).json({ message: 'Ce numéro de téléphone est déjà utilisé par un autre client' });
      if (field === 'numeroCNI') return res.status(409).json({ message: 'Ce numéro de CNI est déjà utilisé par un autre client' });
      return res.status(409).json({ message: 'Ce numéro de passeport existe déjà' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: Object.values(err.errors).map(e => e.message).join(', ') });
    }
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

/**
 * DELETE /api/clients/:id
 * Supprimer un client (uniquement s'il n'a aucune réservation ni billet actif)
 */
router.delete('/:id', requirePermission(PERMISSIONS.CLIENTS_DELETE), async (req, res) => {
  try {
    await clientService.supprimerClient(req.params.id);
    return res.status(200).json({ message: 'Client supprimé' });
  } catch (err) {
    console.error('Erreur suppression client:', err);
    return res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
  }
});

/**
 * POST /api/clients/:id/photo
 * Upload photo de profil du client
 */
router.post('/:id/photo', requirePermission(PERMISSIONS.CLIENTS_UPLOAD_PHOTO), upload.single('photo'), async (req, res) => {
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
