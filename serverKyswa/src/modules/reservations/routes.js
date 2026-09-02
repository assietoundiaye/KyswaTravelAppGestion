/**
 * @fileoverview Routes — Module reservations
 */
const express = require('express');
const ReservationRepository = require('./repositories/ReservationRepository');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

function createReservationsRoutes(dependencies) {
  const router = express.Router();
  const repository = new ReservationRepository();


  // GET liste (paginée)
  router.get('/', protect, checkPermission('reservations', 'view'), async (req, res, next) => {
    try {
      const { page = 1, limit = 50, statut, package_id } = req.query;
      const filter = {};
      if (statut) filter.statut = statut;
      if (package_id) filter.package_id = package_id;
      const lim = parseInt(limit);
      const cur = parseInt(page);
      const result = await repository.findMany(filter, { page: cur, limit: lim });
      const total = result.total || result.data?.length || 0;
      const totalPages = Math.ceil(total / lim) || 1;

      res.json({
        success: true,
        data: result.data,
        total: total,
        reservations: result.data,
        departs: result.data,
        profiles: result.data,
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
  router.get('/:id', protect, checkPermission('reservations', 'view'), async (req, res, next) => {
    try {
      const item = await repository.findById(req.params.id);
      if (!item) return res.status(404).json({ success: false, message: 'Non trouvé' });
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // POST créer
  router.post('/', protect, checkPermission('reservations', 'create'), async (req, res, next) => {
    try {
      // Transform legacy MongoDB data format to Prisma format
      const data = req.body;
      
      // Ensure service field is present - determine from package type if possible
      let service = data.service || 'Oumra'; // Default to 'Oumra' (note: not 'OUMRA')
      
      // TODO: Look up package type to determine service (requires package/depart lookup)
      // For now, we'll use the default 'OUMRA' since this is the most common case
      
      // Map MongoDB field names to Prisma field names
      const transformedData = {
        service: service,
        formule: data.formule || null,
        type_chambre: null, // ECO is comfort level, not room type - room types are Double/Triple/etc
        prix_total: Math.max(0, Math.floor(data.montantTotalDu || 0)),
        acompte: 0, // Default acompte
        statut_paiement: 'En attente',
        statut_client: data.statutClient === 'INSCRIT' ? 'Inscrit' : (data.statutClient || 'Inscrit'),
        notes: data.notes || null,
      };
      
      // Add relationships if IDs are provided
      if (data.clients?.[0]) {
        transformedData.clients = {
          connect: { id: data.clients[0] }
        };
      }
      
      if (data.packageKId) {
        transformedData.departs = {
          connect: { id: data.packageKId }
        };
      }
      
      if (req.user?.id) {
        transformedData.profiles = {
          connect: { id: req.user.id }
        };
      }
      
      console.log('Creating inscription with data:', transformedData);
      
      const item = await repository.create(transformedData);

      // Créer les lignes de suppléments associées si fournies
      const prismaClient = require('../../database/client');
      if (Array.isArray(data.supplements) && data.supplements.length > 0) {
        for (const s of data.supplements) {
          const suppId = s.supplementId || s.supplement_id || s.id;
          const qte = parseInt(s.quantite, 10) || 1;
          const prixUnit = Number(s.prixUnitaire ?? s.prix_unitaire ?? s.prix ?? 0);
          const prixTot = qte * prixUnit;

          if (suppId) {
            try {
              await prismaClient.lignes_supplements.create({
                data: {
                  inscription_id: item.id,
                  client_id: data.clients?.[0] || null,
                  supplement_id: suppId,
                  quantite: qte,
                  prix_unitaire: prixUnit,
                  prix_total: prixTot,
                  created_by: req.user?.id || null,
                }
              });
            } catch (suppErr) {
              console.warn('[Reservations] Erreur création ligne supplément:', suppErr.message);
            }
          }
        }
      }

      // Recharger l'inscription complète avec ses suppléments
      const fullItem = await repository.findById(item.id);

      res.status(201).json({ 
        success: true, 
        data: fullItem || item, 
        reservation: fullItem || item,
        message: 'Inscription créée avec succès'
      });
    } catch (e) { 
      console.error('Error creating inscription:', e);
      next(e); 
    }
  });

  // POST ajouter un supplément à une inscription existante
  router.post('/:id/supplements', protect, checkPermission('reservations', 'edit'), async (req, res, next) => {
    try {
      const { supplementId, supplement_id, quantite = 1, prixUnitaire, prix_unitaire } = req.body;
      const suppId = supplementId || supplement_id;
      const qte = parseInt(quantite, 10) || 1;
      
      const prismaClient = require('../../database/client');
      
      // Récupérer le supplément pour son prix par défaut si non spécifié
      let unitPrice = prixUnitaire ?? prix_unitaire;
      if (unitPrice === undefined || unitPrice === null) {
        const supp = await prismaClient.supplements.findUnique({ where: { id: suppId } });
        unitPrice = supp ? Number(supp.prix) : 0;
      }
      
      const prixTotal = qte * Number(unitPrice);
      
      const inscription = await repository.findById(req.params.id);
      if (!inscription) return res.status(404).json({ success: false, message: 'Inscription non trouvée' });

      const ligne = await prismaClient.lignes_supplements.create({
        data: {
          inscription_id: req.params.id,
          client_id: inscription.client_id || null,
          supplement_id: suppId,
          quantite: qte,
          prix_unitaire: Number(unitPrice),
          prix_total: prixTotal,
          created_by: req.user?.id || null,
        },
        include: {
          supplements: true
        }
      });

      // Mettre à jour le prix_total de l'inscription
      const nouveauPrixTotal = Number(inscription.prix_total || 0) + prixTotal;
      await repository.updateById(req.params.id, { prix_total: nouveauPrixTotal });

      res.status(201).json({ success: true, data: ligne, message: 'Supplément ajouté avec succès' });
    } catch (e) { next(e); }
  });

  // DELETE supprimer un supplément d'une inscription
  router.delete('/:id/supplements/:ligneId', protect, checkPermission('reservations', 'edit'), async (req, res, next) => {
    try {
      const prismaClient = require('../../database/client');
      const ligne = await prismaClient.lignes_supplements.findUnique({ where: { id: req.params.ligneId } });
      
      if (!ligne) return res.status(404).json({ success: false, message: 'Ligne de supplément non trouvée' });
      
      const montantADeduire = Number(ligne.prix_total || 0);
      await prismaClient.lignes_supplements.delete({ where: { id: req.params.ligneId } });

      const inscription = await repository.findById(req.params.id);
      if (inscription) {
        const nouveauPrixTotal = Math.max(0, Number(inscription.prix_total || 0) - montantADeduire);
        await repository.updateById(req.params.id, { prix_total: nouveauPrixTotal });
      }

      res.json({ success: true, message: 'Supplément retiré avec succès' });
    } catch (e) { next(e); }
  });

  // PATCH mettre à jour
  router.patch('/:id', protect, checkPermission('reservations', 'edit'), async (req, res, next) => {
    try {
      const item = await repository.updateById(req.params.id, req.body);
      res.json({ success: true, data: item });
    } catch (e) { next(e); }
  });

  // DELETE supprimer
  router.delete('/:id', protect, checkPermission('reservations', 'delete'), async (req, res, next) => {
    try {
      await repository.deleteById(req.params.id);
      res.json({ success: true, message: 'Supprimé avec succès' });
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = createReservationsRoutes;
