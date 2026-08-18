const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const router = express.Router();
const prismaService = require('../services/prismaService');
const { protect, requirePermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const { scanPassport, scanCNI, initWorkers } = require('../services/ocrService');
const clientService = require('../services/clientService');
const path = require('path');
const fs = require('fs').promises;

// Pré-chauffer les workers OCR dès le chargement de la route
initWorkers().catch(() => {});

/**
 * Créer un document avec la photo complète du passeport
 */
async function createPassportPhotoDocument(clientId, photoInfo, userId) {
  try {
    const document = await prismaService.create('documents', {
      client_id: clientId,
      type_document: 'PASSEPORT_PHOTO',
      nom_fichier: 'Photo passeport extraite automatiquement',
      description: 'Photo complète du passeport extraite lors du scan OCR',
      url: photoInfo.documentPhotoUrl,
      cloudinary_public_id: photoInfo.documentPhotoPublicId,
      taille: 0,
      statut: 'VALIDE',
      cree_par_utilisateur_id: userId,
      date_upload: new Date(),
      metadonnees: {
        source: 'OCR_EXTRACTION',
        extractedAt: photoInfo.extractedAt,
        type: 'passport_photo'
      }
    });

    console.log(`Document photo passeport créé pour client ${clientId}`);
    return document;
  } catch (error) {
    console.error('Erreur création document photo:', error);
    return null;
  }
}

/*
 * Sauvegarder les photos extraites d'un passeport:
 * 1. Photo complète du document comme document lié au client
 * 2. Zone photo seule comme photo de profil
 */
async function saveExtractedPhoto(photoData, fullDocumentBuffer, clientInfo) {
  try {
    // Nouveau format: photoData.zonePhoto et photoData.documentComplet
    const zonePhotoBuffer = photoData?.zonePhoto?.buffer;
    if (!zonePhotoBuffer) {
      console.warn('Aucune donnée zone photo à sauvegarder');
      return null;
    }

    // Validation du buffer zone photo
    if (!Buffer.isBuffer(zonePhotoBuffer) || zonePhotoBuffer.length === 0) {
      console.warn('Buffer zone photo invalide ou vide');
      return null;
    }

    // Utiliser le document complet fourni en paramètre OU celui dans photoData
    const documentBuffer = fullDocumentBuffer || photoData?.documentComplet;
    if (!documentBuffer) {
      console.warn('Aucun buffer document complet disponible');
    }

    const timestamp = Date.now();
    const cleanName = (clientInfo.nom || 'client')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toLowerCase();
    const baseFilename = `passport_${cleanName}_${timestamp}`;

    // 1. Sauvegarder la photo complète comme document (utiliser l'image complète ou la zone photo comme fallback)
    const documentPhotoBuffer = documentBuffer || zonePhotoBuffer;
    const fullPhotoUpload = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: `clients/documents/${baseFilename}_full`,
          folder: 'clients/documents',
          transformation: [{ quality: 'auto:good' }],
        },
        (error, result) => {
          if (error) {
            console.error('Erreur upload photo complète:', error);
            reject(error);
          } else {
            console.log('Photo complète uploadée:', result.secure_url);
            resolve(result);
          }
        }
      );
      uploadStream.end(documentPhotoBuffer);
    });

    // 2. Créer la photo de profil (moitié gauche recadrée)
    // crop: 'fill' pour remplir 400x400, gravity: 'east' pour recentrer sur le visage (gauche)
    const profilePhotoUpload = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: `clients/photos/${baseFilename}_profile`,
          folder: 'clients/photos',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'west', quality: 'auto:good' },
          ],
        },
        (error, result) => {
          if (error) {
            console.error('Erreur upload photo profil:', error);
            reject(error);
          } else {
            console.log('Photo profil uploadée:', result.secure_url);
            resolve(result);
          }
        }
      );
      uploadStream.end(zonePhotoBuffer);
    });

    // Attendre les deux uploads avec gestion d'erreurs séparée
    try {
      const [fullPhoto, profilePhoto] = await Promise.allSettled([fullPhotoUpload, profilePhotoUpload]);

      let result = {};

      // Traiter le résultat de la photo complète (document)
      if (fullPhoto.status === 'fulfilled') {
        result.documentPhotoUrl = fullPhoto.value.secure_url;
        result.documentPhotoPublicId = fullPhoto.value.public_id;
        console.log('✅ Document complet sauvegardé:', fullPhoto.value.secure_url);
      } else {
        console.warn('❌ Échec upload document:', fullPhoto.reason?.message);
      }

      // Traiter le résultat de la photo de profil
      if (profilePhoto.status === 'fulfilled') {
        result.photoUrl = profilePhoto.value.secure_url;
        result.photoPublicId = profilePhoto.value.public_id;
        console.log('✅ Photo de profil créée:', profilePhoto.value.secure_url);
      } else {
        console.warn('❌ Échec upload photo profil:', profilePhoto.reason?.message);
      }

      // Si au moins une photo a été uploadée, retourner le résultat
      if (result.photoUrl || result.documentPhotoUrl) {
        result.extractedFrom = 'passport';
        result.extractedAt = new Date().toISOString();
        return result;
      } else {
        console.error('❌ Échec upload des deux photos');
        return null;
      }
    } catch (error) {
      console.error('❌ Erreur générale upload photos:', error);
      return null;
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la photo:', error);
    return null;
  }
}

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

    // Traiter la photo si elle existe (seulement pour les passeports)
    if (result.photo && docType === 'passport') {
      try {
        // Passer aussi le buffer complet pour le document
        const photoInfo = await saveExtractedPhoto(result.photo, req.file.buffer, result);
        if (photoInfo) {
          // Photo de profil (zone photo seule)
          result.photoUrl = photoInfo.photoUrl;
          result.photoPublicId = photoInfo.photoPublicId;

          // Document complet (photo du passeport entier)
          result.documentPhotoUrl = photoInfo.documentPhotoUrl;
          result.documentPhotoPublicId = photoInfo.documentPhotoPublicId;
          result.extractedAt = photoInfo.extractedAt;

          console.log('Photo extraite: profil + document sauvegardés');
        }
      } catch (photoError) {
        console.warn('Erreur lors de la sauvegarde de la photo, continuons sans photo:', photoError.message);
        result.avertissement = (result.avertissement || '') + ' Photo non sauvegardée.';
      }
      
      // Supprimer les données binaires de la réponse (trop lourdes)
      delete result.photo;
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
 * GET /api/clients/ocr-metrics
 * Statistiques de performance OCR
 */
router.get('/ocr-metrics', requirePermission(PERMISSIONS.CLIENTS_READ), async (req, res) => {
  try {
    const ocrMetrics = require('../services/ocrMetricsService');
    const rates = ocrMetrics.getSuccessRates();
    const detailedReport = await ocrMetrics.generateDetailedReport();

    return res.status(200).json({
      success: true,
      data: {
        rates,
        detailedReport,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('Erreur récupération métriques OCR:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des métriques OCR'
    });
  }
});

/**
 * POST /api/clients/reset-ocr-metrics
 * Remet à zéro les métriques OCR
 */
router.post('/reset-ocr-metrics', requirePermission(PERMISSIONS.CLIENTS_MANAGE), async (req, res) => {
  try {
    const ocrMetrics = require('../services/ocrMetricsService');
    await ocrMetrics.resetMetrics();

    return res.status(200).json({
      success: true,
      message: 'Métriques OCR remises à zéro'
    });
  } catch (err) {
    console.error('Erreur reset métriques OCR:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la remise à zéro des métriques'
    });
  }
});

/**
 * Rechercher des clients
 * GET /api/clients/search?q=...
 */
router.get('/search', requirePermission(PERMISSIONS.CLIENTS_READ), async (req, res) => {
  try {
    const { q: search } = req.query;
    
    if (!search || search.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Le terme de recherche doit contenir au moins 2 caractères'
      });
    }

    console.log(`🔍 Recherche clients avec terme: "${search}"`);

    // Utiliser le service pour rechercher les clients
    const clients = await clientService.listerClients({ search });
    
    console.log(`✅ ${clients.length} clients trouvés`);
    
    return res.status(200).json({
      success: true,
      data: {
        clients,
        count: clients.length
      }
    });

  } catch (error) {
    console.error('❌ Erreur recherche clients:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la recherche de clients'
    });
  }
});

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
    const { client, documents, reservations } = await clientService.getClientAvecDocuments(req.params.id);
    return res.status(200).json({ client, documents, reservations });
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
    const clientId = parseInt(req.params.id);
    const client = await prismaService.findUnique('clients', {
      where: { id: clientId }
    });
    if (!client) return res.status(404).json({ message: 'Client non trouvé' });
    if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni' });

    // Supprimer l'ancienne photo si elle existe
    if (client.photo_public_id) {
      try { await cloudinary.uploader.destroy(client.photo_public_id); } catch (_) {}
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'kyswa-travel/clients', public_id: `client-${clientId}`, overwrite: true, resource_type: 'image' },
        (err, res) => err ? reject(err) : resolve(res)
      );
      stream.end(req.file.buffer);
    });

    await prismaService.update('clients',
      { id: clientId },
      {
        photo_url: result.secure_url,
        photo_public_id: result.public_id
      }
    );

    return res.status(200).json({ message: 'Photo mise à jour', photoUrl: result.secure_url });
  } catch (err) {
    console.error('Erreur upload photo client:', err);
    return res.status(500).json({ message: err.message || 'Erreur serveur' });
  }
});

module.exports = router;
