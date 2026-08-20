/**
 * @fileoverview Routes — Module visas
 */
const express = require('express');
const VisaRepository = require('./repositories/VisaRepository');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

function createVisasRoutes(dependencies) {
  const router = express.Router();
  const repository = new VisaRepository();

  // GET liste (paginée ou filtrée)
  router.get('/', protect, checkPermission('visas', 'view'), async (req, res, next) => {
    try {
      const { page = 1, limit = 50, statut } = req.query;
      const lim = parseInt(limit);
      const cur = parseInt(page);
      const result = await repository.findMany({}, { page: cur, limit: lim });

      let list = (result.data || []).map(v => {
        let currentStatut = v.statut;
        if (!currentStatut) {
          if (v.visa_recu) currentStatut = 'VISA_RECU';
          else if (v.motif_rejet) currentStatut = 'REFUSE';
          else if (v.envoye_nusuk) currentStatut = 'ENVOYE_PLATEFORME';
          else if (v.passeport_collecte) currentStatut = 'PASSEPORT_RECU';
          else currentStatut = 'EN_ATTENTE_PASSEPORT';
        }

        const clientObj = v.clients || {};
        const inscObj = v.inscriptions || {};

        return {
          ...v,
          _id: v.id,
          statut: currentStatut,
          dateEnvoi: v.date_envoi || v.created_at,
          dateReception: v.date_reception,
          clientId: {
            nom: clientObj.nom || '',
            prenom: clientObj.prenom || '',
            numeroPasseport: clientObj.n_passeport || clientObj.numeroPasseport || '',
          },
          reservationId: {
            numero: inscObj.numero || (inscObj.id ? inscObj.id.slice(0, 8) : ''),
            idReservation: inscObj.numero || (inscObj.id ? inscObj.id.slice(0, 8) : ''),
          }
        };
      });

      if (statut) {
        list = list.filter(v => v.statut === statut);
      }

      const total = result.total || list.length;
      const totalPages = Math.ceil(total / lim) || 1;

      res.json({
        success: true,
        data: list,
        visas: list,
        total: total,
        pagination: {
          current: cur,
          page: cur,
          limit: lim,
          total: total,
          pages: totalPages,
          totalPages: totalPages,
        }
      });
    } catch (e) { next(e); }
  });

  // GET par ID
  router.get('/:id', protect, checkPermission('visas', 'view'), async (req, res, next) => {
    try {
      const item = await repository.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Non trouvé' });
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // POST créer
  router.post('/', protect, checkPermission('visas', 'create'), async (req, res, next) => {
    try {
      const item = await repository.create(req.body);
      res.status(201).json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // PATCH mettre à jour
  router.patch('/:id', protect, checkPermission('visas', 'edit'), async (req, res, next) => {
    try {
      const { statut, dateEnvoi, dateReception, motifRefus } = req.body;
      const dataToUpdate = { ...req.body };

      if (statut === 'PASSEPORT_RECU') {
        dataToUpdate.passeport_collecte = true;
        dataToUpdate.date_collecte = new Date();
      } else if (statut === 'ENVOYE_PLATEFORME') {
        dataToUpdate.envoye_nusuk = true;
        dataToUpdate.date_envoi = dateEnvoi ? new Date(dateEnvoi) : new Date();
      } else if (statut === 'VISA_RECU') {
        dataToUpdate.visa_recu = true;
        dataToUpdate.date_reception = dateReception ? new Date(dateReception) : new Date();
      } else if (statut === 'REFUSE') {
        dataToUpdate.motif_rejet = motifRefus || 'Refusé';
      }

      const item = await repository.updateById(req.params.id, dataToUpdate);
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // DELETE supprimer
  router.delete('/:id', protect, checkPermission('visas', 'delete'), async (req, res, next) => {
    try {
      await repository.deleteById(req.params.id);
      res.json({ success: true, message: 'Supprimé avec succès' });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = createVisasRoutes;
