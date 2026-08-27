/**
 * @fileoverview Routes — Module recouvrement
 * Calcul en temps réel des impayés et gestion des relances clients
 */
const express = require('express');
const prisma = require('../../database/client');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

function createRecouvrementRoutes(dependencies) {
  const router = express.Router();

  /**
   * GET /api/recouvrement
   * Impayés prioritaires (départs proches) + autres impayés + remboursements en attente + stats
   */
  router.get('/', protect, checkPermission('recouvrement', 'view'), async (req, res, next) => {
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      // 1. Récupérer toutes les inscriptions actives
      const inscriptions = await prisma.inscriptions.findMany({
        where: {
          statut_client: { notIn: ['DESISTE', 'Desiste', 'ANNULE', 'Annule'] },
        },
        include: {
          clients: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true,
              email: true,
              n_passeport: true,
            },
          },
          departs: {
            select: {
              id: true,
              nom_depart: true,
              service: true,
              date_depart: true,
              date_retour: true,
            },
          },
          paiements: {
            select: {
              id: true,
              montant: true,
              date_paiement: true,
              mode_paiement: true,
            },
          },
        },
        orderBy: { date_inscription: 'desc' },
      });

      // 2. Calculer les impayés pour chaque inscription
      const tousImpayes = [];

      for (const insc of inscriptions) {
        const montantTotalDu = Number(insc.prix_total || 0);
        const totalPaye = (insc.paiements || []).reduce(
          (sum, p) => sum + Number(p.montant || 0n),
          0
        );
        const resteAPayer = Math.max(0, montantTotalDu - totalPaye);

        if (resteAPayer > 0) {
          const dateDepartRaw = insc.departs?.date_depart || insc.date_inscription;
          let joursAvantDepart = null;
          if (dateDepartRaw) {
            const departDate = new Date(dateDepartRaw);
            departDate.setHours(0, 0, 0, 0);
            joursAvantDepart = Math.floor((departDate - now) / (1000 * 60 * 60 * 24));
          }

          const clientItem = insc.clients
            ? [
                {
                  _id: insc.clients.id,
                  id: insc.clients.id,
                  nom: insc.clients.nom || '',
                  prenom: insc.clients.prenom || '',
                  telephone: insc.clients.telephone || '',
                  email: insc.clients.email || '',
                },
              ]
            : [];

          tousImpayes.push({
            _id: insc.id,
            id: insc.id,
            numero: insc.numero || `#${insc.id.slice(0, 8)}`,
            idReservation: insc.numero || insc.id,
            service: insc.service,
            statut_paiement: insc.statut_paiement,
            statut_client: insc.statut_client,
            clients: clientItem,
            packageKId: insc.departs
              ? {
                  _id: insc.departs.id,
                  id: insc.departs.id,
                  nomReference: insc.departs.nom_depart,
                  type: insc.departs.service,
                  dateDepart: insc.departs.date_depart,
                  dateRetour: insc.departs.date_retour,
                }
              : null,
            dateDepart: dateDepartRaw,
            joursAvantDepart,
            montantTotalDu,
            totalPaye,
            resteAPayer,
            created_at: insc.created_at,
          });
        }
      }

      // Impayés prioritaires (départ <= 30 jours, y compris départs passés)
      const impayes = tousImpayes
        .filter((r) => r.joursAvantDepart !== null && r.joursAvantDepart <= 30)
        .sort((a, b) => {
          if (a.joursAvantDepart !== b.joursAvantDepart) return a.joursAvantDepart - b.joursAvantDepart;
          return b.resteAPayer - a.resteAPayer;
        });

      // Impayés autres (départ > 30 jours ou sans date)
      const impayesAutres = tousImpayes
        .filter((r) => r.joursAvantDepart === null || r.joursAvantDepart > 30)
        .sort((a, b) => {
          const jA = a.joursAvantDepart ?? 9999;
          const jB = b.joursAvantDepart ?? 9999;
          if (jA !== jB) return jA - jB;
          return b.resteAPayer - a.resteAPayer;
        });

      // 3. Récupérer les remboursements de désistements en attente
      const desistementsEnAttente = await prisma.desistements.findMany({
        where: {
          statut: { in: ['EN_ATTENTE', 'En attente', 'en_attente'] },
        },
        include: {
          clients: {
            select: { id: true, nom: true, prenom: true, telephone: true },
          },
          inscriptions: {
            select: { id: true, numero: true },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      const remboursements = desistementsEnAttente.map((d) => ({
        _id: d.id,
        id: d.id,
        clientId: d.clients
          ? {
              _id: d.clients.id,
              nom: d.clients.nom,
              prenom: d.clients.prenom,
              telephone: d.clients.telephone,
            }
          : null,
        reservationId: d.inscriptions
          ? {
              _id: d.inscriptions.id,
              numero: d.inscriptions.numero,
              idReservation: d.inscriptions.numero,
            }
          : null,
        montantRembourse: Number(d.montant_rembourser || 0n),
        tauxRemboursement: Number(d.pct_remboursement || 0),
        statut: d.statut,
        created_at: d.created_at,
      }));

      // 4. Statistiques globales
      const totalImpaye = tousImpayes.reduce((s, r) => s + r.resteAPayer, 0);
      const urgents = impayes.filter((r) => r.joursAvantDepart !== null && r.joursAvantDepart <= 7).length;
      const prochains = impayes.filter(
        (r) => r.joursAvantDepart !== null && r.joursAvantDepart > 7 && r.joursAvantDepart <= 30
      ).length;

      res.status(200).json({
        success: true,
        count: impayes.length,
        'impayés': impayes,
        'impayésAutres': impayesAutres,
        remboursements,
        stats: {
          totalImpaye,
          urgents,
          prochains,
          total: tousImpayes.length,
        },
      });
    } catch (e) {
      next(e);
    }
  });

  /**
   * POST /api/recouvrement/relancer
   * Enregistrer une relance pour une réservation
   */
  router.post('/relancer', protect, checkPermission('recouvrement', 'create'), async (req, res, next) => {
    try {
      const { reservationId, clientId, notes, resultat, dateProchaineRelance } = req.body;

      if (!reservationId) {
        return res.status(400).json({ success: false, message: 'reservationId est requis' });
      }

      // Récupérer le solde actuel de l'inscription
      const insc = await prisma.inscriptions.findUnique({
        where: { id: reservationId },
        include: { paiements: { select: { montant: true } } },
      });

      if (!insc) {
        return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
      }

      const totalPaye = (insc.paiements || []).reduce((sum, p) => sum + Number(p.montant || 0n), 0);
      const reste = Math.max(0, Number(insc.prix_total || 0) - totalPaye);

      // Compter le nombre de relances déjà effectuées
      const prevCount = await prisma.recouvrement.count({
        where: { inscription_id: reservationId },
      });

      const relance = await prisma.recouvrement.create({
        data: {
          inscription_id: reservationId,
          client_id: clientId || insc.client_id || null,
          agent_id: req.user?.id || null,
          type: 'RELANCE',
          montant_du: Math.round(reste),
          notes: notes || '',
          statut: resultat || 'JOINT',
          date_derniere_relance: new Date(),
          nb_relances: prevCount + 1,
        },
        include: {
          profiles: {
            select: { id: true, nom: true, prenom: true },
          },
        },
      });

      const formatted = {
        _id: relance.id,
        id: relance.id,
        reservationId: relance.inscription_id,
        clientId: relance.client_id,
        notes: relance.notes,
        resultat: relance.statut,
        dateRelance: relance.created_at,
        dateProchaineRelance: dateProchaineRelance || null,
        agentId: relance.profiles
          ? {
              _id: relance.profiles.id,
              nom: relance.profiles.nom,
              prenom: relance.profiles.prenom,
            }
          : null,
      };

      res.status(201).json({
        success: true,
        message: 'Relance enregistrée avec succès',
        relance: formatted,
      });
    } catch (e) {
      next(e);
    }
  });

  /**
   * GET /api/recouvrement/relances/:reservationId
   * Historique des relances pour une réservation
   */
  router.get('/relances/:reservationId', protect, checkPermission('recouvrement', 'view'), async (req, res, next) => {
    try {
      const relancesRaw = await prisma.recouvrement.findMany({
        where: { inscription_id: req.params.reservationId },
        include: {
          profiles: {
            select: { id: true, nom: true, prenom: true },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      const relances = relancesRaw.map((r) => ({
        _id: r.id,
        id: r.id,
        reservationId: r.inscription_id,
        clientId: r.client_id,
        notes: r.notes || '',
        resultat: r.statut || 'JOINT',
        dateRelance: r.created_at,
        agentId: r.profiles
          ? {
              _id: r.profiles.id,
              nom: r.profiles.nom,
              prenom: r.profiles.prenom,
            }
          : null,
      }));

      res.status(200).json({
        success: true,
        count: relances.length,
        relances,
      });
    } catch (e) {
      next(e);
    }
  });

  return router;
}

module.exports = createRecouvrementRoutes;
