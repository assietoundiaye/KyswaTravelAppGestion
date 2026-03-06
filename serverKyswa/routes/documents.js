const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const router = express.Router();

const Document = require('../models/Document');
const Client = require('../models/Client');
const Reservation = require('../models/Reservation');
const Billet = require('../models/Billet');
const { protect, requireRole } = require('../middleware/auth');

// Configure multer for memory storage (files go directly to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Accept common document types
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format de fichier non accepté'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// Protect all routes: COMMERCIAL, COMPTABLE, ADMIN
router.use(protect);
router.use(requireRole('COMMERCIAL', 'COMPTABLE', 'ADMIN'));

/**
 * POST /api/documents/upload
 * Upload a document to Cloudinary and create Document record
 */
router.post(
  '/upload',
  upload.single('file'),
  [
    body('type')
      .trim()
      .notEmpty().withMessage('type est requis')
      .isIn(['PASSEPORT', 'VISA', 'BILLET_ELECTRONIQUE', 'CERTIFICAT', 'AUTRE'])
      .withMessage('type doit être PASSEPORT, VISA, BILLET_ELECTRONIQUE, CERTIFICAT ou AUTRE'),
    body('clientId')
      .optional()
      .trim()
      .isMongoId().withMessage('clientId doit être un ID Mongo valide')
      .custom(async (value) => {
        if (value) {
          const client = await Client.findById(value);
          if (!client) throw new Error('Client non trouvé');
        }
      }),
    body('reservationId')
      .optional()
      .trim()
      .isMongoId().withMessage('reservationId doit être un ID Mongo valide')
      .custom(async (value) => {
        if (value) {
          const reservation = await Reservation.findById(value);
          if (!reservation) throw new Error('Réservation non trouvée');
        }
      }),
    body('billetId')
      .optional()
      .trim()
      .isMongoId().withMessage('billetId doit être un ID Mongo valide')
      .custom(async (value) => {
        if (value) {
          const billet = await Billet.findById(value);
          if (!billet) throw new Error('Billet non trouvé');
        }
      }),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verify exactly one of clientId, reservationId, billetId is provided
      const { clientId, reservationId, billetId } = req.body;
      const count = [clientId, reservationId, billetId].filter(id => !!id).length;
      if (count !== 1) {
        return res.status(400).json({ 
          message: 'Exactement l\'un de clientId, reservationId ou billetId est requis' 
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier fourni' });
      }

      // Upload to Cloudinary from buffer
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'kyswa-travel/documents',
            resource_type: 'auto',
            public_id: `${Date.now()}-${req.file.originalname.split('.')[0]}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      // Generate idDocument
      const latestDoc = await Document.findOne().sort({ idDocument: -1 });
      const nextId = (latestDoc?.idDocument || 0) + 1;

      // Extract association
      const { type } = req.body;

      // Create Document record
      const document = new Document({
        idDocument: nextId,
        type,
        clientId: clientId || undefined,
        reservationId: reservationId || undefined,
        billetId: billetId || undefined,
        cheminFichier: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        statut: 'EN_ATTENTE',
        creeParUtilisateurId: req.user.id,
      });

      await document.save();

      res.status(201).json({
        message: 'Document uploadé',
        data: document,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: error.message || 'Erreur lors de l\'upload' });
    }
  }
);

/**
 * GET /api/documents
 * List all documents with optional filters
 */
router.get(
  '/',
  [
    query('clientId')
      .optional()
      .isMongoId().withMessage('clientId doit être un ID Mongo valide'),
    query('reservationId')
      .optional()
      .isMongoId().withMessage('reservationId doit être un ID Mongo valide'),
    query('billetId')
      .optional()
      .isMongoId().withMessage('billetId doit être un ID Mongo valide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { clientId, reservationId, billetId } = req.query;

      // Build filter
      const filter = {};
      if (clientId) filter.clientId = clientId;
      if (reservationId) filter.reservationId = reservationId;
      if (billetId) filter.billetId = billetId;

      const documents = await Document.find(filter)
        .populate('clientId')
        .populate('reservationId')
        .populate('billetId')
        .populate('creeParUtilisateurId', '-password');

      res.json({
        count: documents.length,
        data: documents,
      });
    } catch (error) {
      console.error('List documents error:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des documents' });
    }
  }
);

/**
 * GET /api/documents/:id
 * Get a specific document
 */
router.get(
  '/:id',
  [
    param('id')
      .isMongoId().withMessage('ID invalide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const document = await Document.findById(req.params.id)
        .populate('clientId')
        .populate('reservationId')
        .populate('billetId')
        .populate('creeParUtilisateurId', '-password');

      if (!document) {
        return res.status(404).json({ message: 'Document non trouvé' });
      }

      res.json({ data: document });
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération du document' });
    }
  }
);

/**
 * PATCH /api/documents/:id
 * Update document (type or statut)
 */
router.patch(
  '/:id',
  [
    param('id')
      .isMongoId().withMessage('ID invalide'),
    body('type')
      .optional()
      .trim()
      .isIn(['PASSEPORT', 'VISA', 'BILLET_ELECTRONIQUE', 'CERTIFICAT', 'AUTRE'])
      .withMessage('type doit être PASSEPORT, VISA, BILLET_ELECTRONIQUE, CERTIFICAT ou AUTRE'),
    body('statut')
      .optional()
      .trim()
      .isIn(['EN_ATTENTE', 'VALIDE', 'REFUSE', 'EXPIREE'])
      .withMessage('statut doit être EN_ATTENTE, VALIDE, REFUSE ou EXPIREE'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { type, statut } = req.body;

      const document = await Document.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ message: 'Document non trouvé' });
      }

      if (type) document.type = type;
      if (statut) {
        document.statut = statut;
      }

      await document.save();

      // Populate before response
      await document.populate('clientId');
      await document.populate('reservationId');
      await document.populate('billetId');
      await document.populate('creeParUtilisateurId', '-password');

      let message = 'Statut mis à jour';
      if (statut === 'VALIDE') {
        message = 'Document validé';
      }

      res.json({
        message,
        data: document,
      });
    } catch (error) {
      console.error('Update document error:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour du document' });
    }
  }
);

/**
 * DELETE /api/documents/:id
 * Delete document and its file from Cloudinary
 */
router.delete(
  '/:id',
  [
    param('id')
      .isMongoId().withMessage('ID invalide'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const document = await Document.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ message: 'Document non trouvé' });
      }

      // Delete from Cloudinary
      if (document.publicId) {
        try {
          await cloudinary.uploader.destroy(document.publicId);
        } catch (cloudinaryError) {
          console.warn('Warning: Could not delete from Cloudinary:', cloudinaryError);
          // Continue with deletion even if Cloudinary fails
        }
      }

      // Delete from MongoDB
      await Document.findByIdAndDelete(req.params.id);

      res.json({ message: 'Document supprimé' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ message: 'Erreur lors de la suppression du document' });
    }
  }
);

module.exports = router;
