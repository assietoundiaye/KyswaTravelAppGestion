/**
 * @fileoverview Routes pour les Clients
 * Injection de dépendances & intégration OCR & Cloudinary
 */

const express = require('express');
const multer = require('multer');
const ClientController = require('./controllers/ClientController');
const ClientRepository = require('./repositories/ClientRepository');
const ClientService = require('./services/ClientService');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');
const cloudinary = require('../../../config/cloudinary');
const { scanPassport, scanCNI } = require('../../services/ocrService');
const ocrMetrics = require('../../services/ocrMetricsService');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/tiff'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Format non accepté (jpg, png, webp, tiff uniquement)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function saveExtractedPhoto(photoData, fullDocumentBuffer, clientInfo) {
  try {
    const zonePhotoBuffer = photoData?.zonePhoto?.buffer;
    if (!zonePhotoBuffer || !Buffer.isBuffer(zonePhotoBuffer) || zonePhotoBuffer.length === 0) {
      return null;
    }

    const documentBuffer = fullDocumentBuffer || photoData?.documentComplet;
    const timestamp = Date.now();
    const cleanName = (clientInfo.nom || 'client')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toLowerCase();
    const baseFilename = `passport_${cleanName}_${timestamp}`;

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
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(documentPhotoBuffer);
    });

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
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(zonePhotoBuffer);
    });

    const [fullPhoto, profilePhoto] = await Promise.allSettled([fullPhotoUpload, profilePhotoUpload]);
    let result = {};

    if (fullPhoto.status === 'fulfilled') {
      result.documentPhotoUrl = fullPhoto.value.secure_url;
      result.documentPhotoPublicId = fullPhoto.value.public_id;
    }
    if (profilePhoto.status === 'fulfilled') {
      result.photoUrl = profilePhoto.value.secure_url;
      result.photoPublicId = profilePhoto.value.public_id;
    }

    if (result.photoUrl || result.documentPhotoUrl) {
      result.extractedFrom = 'passport';
      result.extractedAt = new Date().toISOString();
      return result;
    }
    return null;
  } catch (error) {
    console.error('Erreur sauvegarde photo OCR:', error.message);
    return null;
  }
}

/**
 * Factory fonction : créer les routes avec DI
 * @param {Object} dependencies - {clientModel, auditService}
 * @returns {express.Router}
 */
function createClientRoutes(dependencies) {
  const { clientModel, auditService } = dependencies;
  const router = express.Router();

  const repository = new ClientRepository();
  const service = new ClientService(repository, auditService);
  const controller = new ClientController(service);

  // ─────────────────────────────────────────────────────
  // ROUTES OCR & SCAN (placées avant les routes paramétrées)
  // ─────────────────────────────────────────────────────

  // POST scan document (Passeport / CNI)
  router.post(
    '/scan-document',
    protect,
    checkPermission('clients', 'create'),
    upload.single('document'),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ message: 'Aucun fichier fourni' });

        const docType = req.body.type || 'passport';
        let result;

        if (docType === 'passport') {
          result = await scanPassport(req.file.buffer);
        } else {
          result = await scanCNI(req.file.buffer);
        }

        if (result.photo && docType === 'passport') {
          try {
            const photoInfo = await saveExtractedPhoto(result.photo, req.file.buffer, result);
            if (photoInfo) {
              result.photoUrl = photoInfo.photoUrl;
              result.photoPublicId = photoInfo.photoPublicId;
              result.documentPhotoUrl = photoInfo.documentPhotoUrl;
              result.documentPhotoPublicId = photoInfo.documentPhotoPublicId;
              result.extractedAt = photoInfo.extractedAt;
            }
          } catch (photoError) {
            console.warn('Photo extraction warning:', photoError.message);
            result.avertissement = (result.avertissement || '') + ' Photo non sauvegardée.';
          }
          delete result.photo;
        }

        return res.status(200).json({ success: true, data: result });
      } catch (err) {
        console.error('Erreur OCR:', err.message);
        return res.status(200).json({
          success: false,
          data: {
            type: req.body?.type || 'passport',
            nom: '', prenom: '', numeroPasseport: '', numeroCNI: '',
            dateNaissance: '', dateExpirationPasseport: '',
            mrzDetectee: false,
            avertissement: 'Erreur de lecture. Vérifiez la qualité de l image ou saisissez manuellement.',
          },
        });
      }
    }
  );

  // GET métriques OCR
  router.get('/ocr-metrics', protect, checkPermission('clients', 'view'), async (req, res) => {
    try {
      const rates = await ocrMetrics.getSuccessRates();
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
      console.error('Erreur métriques OCR:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des métriques OCR'
      });
    }
  });

  // POST reset métriques OCR
  router.post('/reset-ocr-metrics', protect, requireRole('dg', 'administrateur'), async (req, res) => {
    try {
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

  // ─────────────────────────────────────────────────────
  // ROUTES LECTURE STANDARD
  // ─────────────────────────────────────────────────────

  // GET tous les clients
  router.get('/', protect, checkPermission('clients', 'view'), (req, res, next) => controller.getAll(req, res, next));

  // GET clients par agent
  router.get('/agent/:agentId', protect, checkPermission('clients', 'view'), (req, res, next) =>
    controller.getByAgent(req, res, next)
  );

  // GET un client par ID
  router.get('/id/:id', protect, checkPermission('clients', 'view'), (req, res, next) => controller.getById(req, res, next));

  // GET statistiques
  router.get('/stats', protect, checkPermission('clients', 'view'), (req, res, next) => controller.getStats(req, res, next));

  // GET recherche
  router.get('/search', protect, checkPermission('clients', 'view'), (req, res, next) => controller.search(req, res, next));

  // GET un client par ID (route standard)
  router.get('/:id', protect, checkPermission('clients', 'view'), (req, res, next) => controller.getById(req, res, next));

  // ─────────────────────────────────────────────────────
  // ROUTES ÉCRITURE STANDARD
  // ─────────────────────────────────────────────────────

  // POST créer client
  router.post('/', protect, checkPermission('clients', 'create'), (req, res, next) => controller.create(req, res, next));

  // PATCH modifier client
  router.patch('/:id', protect, checkPermission('clients', 'edit'), (req, res, next) => controller.update(req, res, next));

  // DELETE client (soft delete)
  router.delete('/:id', protect, checkPermission('clients', 'delete'), (req, res, next) =>
    controller.delete(req, res, next)
  );

  // ─────────────────────────────────────────────────────
  // ROUTES FIDÉLITÉ & VISAS
  // ─────────────────────────────────────────────────────

  router.post('/:id/loyalty/promote', protect, requireRole('commercial', 'dg', 'administrateur'), (req, res, next) =>
    controller.promoteLoyalty(req, res, next)
  );

  router.post('/:id/loyalty/demote', protect, requireRole('commercial', 'dg', 'administrateur'), (req, res, next) =>
    controller.demoteLoyalty(req, res, next)
  );

  router.post('/:id/visa', protect, (req, res, next) => controller.addVisa(req, res, next));
  router.post('/:id/voyage', protect, (req, res, next) => controller.addVoyage(req, res, next));

  return router;
}

module.exports = createClientRoutes;
