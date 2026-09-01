/**
 * @fileoverview Routes — Module documents admin
 * Gestion des documents administratifs (table documents_admin) - Prisma/PostgreSQL
 */
const express = require('express');
const multer = require('multer');
const storageService = require('../../core/services/storageService');
const prisma = require('../../database/client');
const { protect } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function createDocumentsRoutes(dependencies) {
  const router = express.Router();

  router.use(protect);

  /**
   * GET /api/documents
   * Lister les documents avec filtres optionnels
   */
  router.get('/', checkPermission('documents', 'view'), async (req, res, next) => {
    try {
      const { categorie, statut, page = 1, limit = 50 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (categorie) where.categorie = categorie;
      if (statut) where.statut = statut;

      const [documents, total] = await Promise.all([
        prisma.documents_admin.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { created_at: 'desc' },
          include: {
            profiles: { select: { nom: true, prenom: true, role: true } }
          }
        }),
        prisma.documents_admin.count({ where })
      ]);

      return res.status(200).json({
        success: true,
        data: documents,
        total,
        count: documents.length,
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/documents/:id
   */
  router.get('/:id', checkPermission('documents', 'view'), async (req, res, next) => {
    try {
      const doc = await prisma.documents_admin.findUnique({
        where: { id: req.params.id },
        include: {
          profiles: { select: { nom: true, prenom: true } }
        }
      });
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document non trouvé' });
      }
      return res.status(200).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/documents
   * Créer un document (avec ou sans fichier)
   */
  router.post('/', checkPermission('documents', 'create'), upload.single('fichier'), async (req, res, next) => {
    try {
      const { titre, categorie, description, date_echeance, statut, notes } = req.body;

      if (!titre || !categorie) {
        return res.status(400).json({ success: false, message: 'titre et categorie sont requis' });
      }

      let fichier_url = null;
      let fichier_nom = null;

      // Upload local sur le disque du serveur si un fichier est fourni
      if (req.file) {
        const saved = await storageService.saveDocument(req.file.buffer, req.file.originalname, 'documents');
        fichier_url = saved.url;
        fichier_nom = req.file.originalname;
      }

      const doc = await prisma.documents_admin.create({
        data: {
          titre,
          categorie,
          description: description || null,
          date_echeance: date_echeance ? new Date(date_echeance) : null,
          statut: statut || 'En cours',
          fichier_url,
          fichier_nom,
          notes: notes || null,
          created_by: req.user.id,
        }
      });

      return res.status(201).json({
        success: true,
        data: doc,
        message: 'Document créé avec succès'
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * PATCH /api/documents/:id
   * Modifier un document
   */
  router.patch('/:id', checkPermission('documents', 'edit'), async (req, res, next) => {
    try {
      const { id, created_by, created_at, ...data } = req.body;

      if (data.date_echeance) {
        data.date_echeance = new Date(data.date_echeance);
      }

      const doc = await prisma.documents_admin.update({
        where: { id: req.params.id },
        data: { ...data, updated_at: new Date() }
      });

      return res.status(200).json({
        success: true,
        data: doc,
        message: 'Document mis à jour'
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * DELETE /api/documents/:id
   */
  router.delete('/:id', checkPermission('documents', 'delete'), async (req, res, next) => {
    try {
      const doc = await prisma.documents_admin.findUnique({ where: { id: req.params.id } });
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document non trouvé' });
      }

      await prisma.documents_admin.delete({ where: { id: req.params.id } });

      return res.status(200).json({ success: true, message: 'Document supprimé' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createDocumentsRoutes;
