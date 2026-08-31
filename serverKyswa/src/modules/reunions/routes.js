/**
 * @fileoverview Routes — Module reunions (Réunions pré-départ et générales)
 */
const express = require('express');
const crypto = require('crypto');
const prismaClient = require('../../database/client');
const { protect } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

function createReunionsRoutes() {
  const router = express.Router();

  // ── GET / — Lister toutes les réunions ───────────────────────────────────────
  router.get('/', protect, checkPermission('reunions', 'view'), async (req, res, next) => {
    try {
      const reunionsList = await prismaClient.reunions_dg.findMany({
        orderBy: { date_reunion: 'desc' },
        include: {
          profiles: {
            select: { id: true, nom: true, prenom: true, email: true, role: true }
          }
        }
      });

      // Récupérer les départs pour enrichir si package / départ associé
      const departs = await prismaClient.departs.findMany({
        select: { id: true, nom_depart: true, date_depart: true, service: true }
      });
      const departMap = new Map(departs.map(d => [d.id, d]));

      const formatted = reunionsList.map(r => {
        const pArray = Array.isArray(r.participants) ? r.participants : [];
        return {
          _id: r.id,
          id: r.id,
          titre: r.titre,
          dateReunion: r.date_reunion,
          date_reunion: r.date_reunion,
          lieu: r.lieu || '115 Avenue Blaise Diagne, Dakar',
          statut: r.statut || 'Planifiée',
          type: r.type || 'predepart',
          ordreJour: r.ordre_du_jour || '',
          ordre_du_jour: r.ordre_du_jour || '',
          compteRendu: r.compte_rendu || '',
          participants: pArray,
          documentsUrl: r.documents_url || [],
          createdBy: r.profiles ? `${r.profiles.prenom || ''} ${r.profiles.nom || ''}`.trim() : 'Système',
          created_at: r.created_at,
          packageKId: r.lieu && departMap.has(r.lieu) ? {
            _id: r.lieu,
            id: r.lieu,
            nomReference: departMap.get(r.lieu).nom_depart
          } : null
        };
      });

      res.json({
        success: true,
        reunions: formatted,
        data: formatted,
        total: formatted.length
      });
    } catch (e) {
      console.error('[ReunionsRoutes] GET / error:', e);
      next(e);
    }
  });

  // ── GET /:id — Obtenir une réunion spécifique ─────────────────────────────
  router.get('/:id', protect, checkPermission('reunions', 'view'), async (req, res, next) => {
    try {
      const item = await prismaClient.reunions_dg.findUnique({
        where: { id: req.params.id },
        include: {
          profiles: {
            select: { id: true, nom: true, prenom: true, email: true, role: true }
          }
        }
      });
      if (!item) return res.status(404).json({ success: false, message: 'Réunion introuvable' });

      res.json({
        success: true,
        data: {
          _id: item.id,
          id: item.id,
          titre: item.titre,
          dateReunion: item.date_reunion,
          date_reunion: item.date_reunion,
          lieu: item.lieu,
          statut: item.statut,
          type: item.type,
          ordreJour: item.ordre_du_jour,
          compteRendu: item.compte_rendu,
          participants: item.participants,
          documentsUrl: item.documents_url,
          created_at: item.created_at,
        }
      });
    } catch (e) {
      next(e);
    }
  });

  // ── POST / — Créer une nouvelle réunion ─────────────────────────────────────
  router.post('/', protect, checkPermission('reunions', 'create'), async (req, res, next) => {
    try {
      const {
        titre,
        dateReunion,
        date_reunion,
        lieu,
        ordreJour,
        ordre_du_jour,
        participants,
        type = 'predepart',
        packageKId,
        departId,
        depart_id
      } = req.body;

      if (!titre || (!dateReunion && !date_reunion)) {
        return res.status(400).json({
          success: false,
          message: 'Le titre et la date de la réunion sont obligatoires.'
        });
      }

      const rawDate = dateReunion || date_reunion;
      const parsedDate = new Date(rawDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Format de date invalide.'
        });
      }

      // Formatage des participants en tableau de chaînes
      let participantsArray = [];
      if (Array.isArray(participants)) {
        participantsArray = participants.map(p => typeof p === 'object' ? (p._id || p.id || `${p.nom} ${p.prenom}`) : String(p));
      }

      const targetDepartId = packageKId || departId || depart_id || null;

      // Insertion dans reunions_dg
      const newReunion = await prismaClient.reunions_dg.create({
        data: {
          id: crypto.randomUUID(),
          titre: titre.trim(),
          date_reunion: parsedDate,
          lieu: lieu || '115 Avenue Blaise Diagne, Dakar',
          participants: participantsArray,
          ordre_du_jour: ordreJour || ordre_du_jour || null,
          documents_url: [],
          statut: 'Planifiée',
          type: type || 'predepart',
          created_by: req.user?.id || null,
        }
      });

      // Si un départ est ciblé, synchroniser également la table `reunions` pour les pèlerins
      if (targetDepartId) {
        try {
          const existing = await prismaClient.reunions.findUnique({
            where: { depart_id: targetDepartId }
          });
          if (!existing) {
            await prismaClient.reunions.create({
              data: {
                id: crypto.randomUUID(),
                depart_id: targetDepartId,
                date_reunion: parsedDate,
                heure: parsedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                lieu: lieu || '115 Avenue Blaise Diagne, Dakar',
                statut: 'Planifiée',
                notes: ordreJour || ordre_du_jour || null
              }
            });
          }
        } catch (subErr) {
          console.warn('[ReunionsRoutes] Sync depart reunions table note:', subErr.message);
        }
      }

      res.status(201).json({
        success: true,
        message: 'Réunion créée avec succès',
        reunion: newReunion,
        data: newReunion
      });
    } catch (e) {
      console.error('[ReunionsRoutes] POST / error:', e);
      next(e);
    }
  });

  // ── PATCH /:id — Modifier une réunion ──────────────────────────────────────
  router.patch('/:id', protect, checkPermission('reunions', 'edit'), async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        titre,
        dateReunion,
        date_reunion,
        lieu,
        ordreJour,
        ordre_du_jour,
        statut,
        compteRendu,
        compte_rendu,
        participants
      } = req.body;

      const updateData = {};
      if (titre !== undefined) updateData.titre = titre;
      if (dateReunion || date_reunion) {
        const d = new Date(dateReunion || date_reunion);
        if (!isNaN(d.getTime())) updateData.date_reunion = d;
      }
      if (lieu !== undefined) updateData.lieu = lieu;
      if (ordreJour !== undefined || ordre_du_jour !== undefined) {
        updateData.ordre_du_jour = ordreJour !== undefined ? ordreJour : ordre_du_jour;
      }
      if (statut !== undefined) updateData.statut = statut;
      if (compteRendu !== undefined || compte_rendu !== undefined) {
        updateData.compte_rendu = compteRendu !== undefined ? compteRendu : compte_rendu;
      }
      if (participants !== undefined) {
        updateData.participants = Array.isArray(participants)
          ? participants.map(p => typeof p === 'object' ? (p._id || p.id || `${p.nom} ${p.prenom}`) : String(p))
          : [];
      }

      const updated = await prismaClient.reunions_dg.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        message: 'Réunion mise à jour avec succès',
        reunion: updated,
        data: updated
      });
    } catch (e) {
      console.error('[ReunionsRoutes] PATCH /:id error:', e);
      next(e);
    }
  });

  // ── DELETE /:id — Supprimer une réunion ────────────────────────────────────
  router.delete('/:id', protect, checkPermission('reunions', 'delete'), async (req, res, next) => {
    try {
      const { id } = req.params;
      await prismaClient.reunions_dg.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Réunion supprimée avec succès'
      });
    } catch (e) {
      console.error('[ReunionsRoutes] DELETE /:id error:', e);
      next(e);
    }
  });

  return router;
}

module.exports = createReunionsRoutes;

