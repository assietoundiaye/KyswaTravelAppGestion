/**
 * @fileoverview Routes — Module désistements
 * Gestion des désistements, calcul du barème de remboursement et génération de reçu PDF
 */
const express = require('express');
const { jsPDF } = require('jspdf');
const prisma = require('../../database/client');
const { protect, requireRole } = require('../../core/middleware/auth');
const { checkPermission } = require('../../core/middleware/checkPermission');

/**
 * Calcul du barème d'annulation Kyswa :
 *   - >= 60 jours avant départ : 100% remboursé
 *   - >= 30 jours avant départ : 80% remboursé
 *   - >= 15 jours avant départ : 50% remboursé
 *   - > 0 jours avant départ  : 25% remboursé
 *   - <= 0 (départ passé)     : 0% remboursé
 */
function calculerBareme(dateDepart, dateAnnulation = new Date()) {
  if (!dateDepart) {
    return { joursAvantDepart: null, tauxRemboursement: 0 };
  }

  const today = new Date(dateAnnulation);
  today.setHours(0, 0, 0, 0);
  const depart = new Date(dateDepart);
  depart.setHours(0, 0, 0, 0);

  const diffTime = depart.getTime() - today.getTime();
  const jours = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  let taux = 0;
  if (jours >= 60) taux = 100;
  else if (jours >= 30) taux = 80;
  else if (jours >= 15) taux = 50;
  else if (jours > 0) taux = 25;
  else taux = 0;

  return { joursAvantDepart: jours, tauxRemboursement: taux };
}

function createDesistementsRoutes(dependencies) {
  const router = express.Router();

  /**
   * GET /api/desistements
   * Liste des désistements avec clients et réservations associées
   */
  router.get('/', protect, checkPermission('desistements', 'view'), async (req, res, next) => {
    try {
      const desistementsRaw = await prisma.desistements.findMany({
        include: {
          clients: {
            select: {
              id: true,
              nom: true,
              prenom: true,
              telephone: true,
              n_passeport: true,
            },
          },
          inscriptions: {
            select: {
              id: true,
              numero: true,
              service: true,
              statut_client: true,
              statut_paiement: true,
              prix_total: true,
              departs: {
                select: {
                  id: true,
                  nom_depart: true,
                  service: true,
                  date_depart: true,
                  date_retour: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      const desistements = desistementsRaw.map((d) => ({
        _id: d.id,
        id: d.id,
        clientId: d.clients
          ? {
              _id: d.clients.id,
              id: d.clients.id,
              nom: d.clients.nom || '',
              prenom: d.clients.prenom || '',
              telephone: d.clients.telephone || '',
              numeroPasseport: d.clients.n_passeport || '',
            }
          : null,
        reservationId: d.inscriptions
          ? {
              _id: d.inscriptions.id,
              id: d.inscriptions.id,
              numero: d.inscriptions.numero,
              idReservation: d.inscriptions.numero,
              statut: d.inscriptions.statut_client,
              statutClient: d.inscriptions.statut_client,
              montantTotalDu: Number(d.inscriptions.prix_total || 0),
              packageKId: d.inscriptions.departs
                ? {
                    nomReference: d.inscriptions.departs.nom_depart,
                    type: d.inscriptions.departs.service,
                  }
                : null,
            }
          : null,
        dateAnnulation: d.date_annulation,
        dateDepart: d.inscriptions?.departs?.date_depart || null,
        joursAvantDepart: d.jours_avant_depart,
        tauxRemboursement: Number(d.pct_remboursement || 0),
        montantPaye: Number(d.total_paye || 0n),
        montantRembourse: Number(d.montant_rembourser || 0n),
        montantRetenu: Number(d.montant_retenu || 0n),
        motif: d.motif || '',
        statut: d.statut || 'EN_ATTENTE',
        dateRemboursement: d.date_remboursement,
        created_at: d.created_at,
      }));

      res.status(200).json({
        success: true,
        count: desistements.length,
        desistements,
      });
    } catch (e) {
      next(e);
    }
  });

  /**
   * POST /api/desistements
   * Créer un nouveau désistement avec calcul automatique du remboursement
   */
  router.post('/', protect, checkPermission('desistements', 'create'), async (req, res, next) => {
    try {
      const { reservationId, clientId, motif, dateDepart } = req.body;

      if (!reservationId) {
        return res.status(400).json({ success: false, message: 'La réservation est requise' });
      }

      // 1. Récupérer l'inscription avec ses paiements et son départ
      const inscription = await prisma.inscriptions.findUnique({
        where: { id: reservationId },
        include: {
          paiements: { select: { montant: true } },
          departs: { select: { date_depart: true } },
        },
      });

      if (!inscription) {
        return res.status(404).json({ success: false, message: 'Réservation non trouvée' });
      }

      if (['DESISTE', 'Desiste', 'ANNULE', 'Annule'].includes(inscription.statut_client)) {
        return res.status(400).json({ success: false, message: 'Cette réservation est déjà annulée ou désistée' });
      }

      // 2. Calculer le total payé
      const totalPaye = (inscription.paiements || []).reduce(
        (sum, p) => sum + Number(p.montant || 0n),
        0
      );

      // 3. Calculer les jours avant départ et le taux de remboursement
      const effectiveDepart = dateDepart || inscription.departs?.date_depart || inscription.date_inscription;
      const { joursAvantDepart, tauxRemboursement } = calculerBareme(effectiveDepart, new Date());

      const montantRembourse = Math.round((totalPaye * tauxRemboursement) / 100);
      const montantRetenu = totalPaye - montantRembourse;

      // 4. Transaction : création du désistement + mise à jour du statut de l'inscription
      const result = await prisma.$transaction(async (tx) => {
        const d = await tx.desistements.create({
          data: {
            inscription_id: reservationId,
            client_id: clientId || inscription.client_id || null,
            agent_id: req.user?.id || null,
            date_annulation: new Date(),
            motif: motif || '',
            total_paye: BigInt(totalPaye),
            jours_avant_depart: joursAvantDepart,
            pct_remboursement: tauxRemboursement,
            montant_rembourser: BigInt(montantRembourse),
            montant_retenu: BigInt(montantRetenu),
            statut: 'En attente',
          },
          include: {
            clients: { select: { id: true, nom: true, prenom: true, telephone: true } },
            inscriptions: { select: { id: true, numero: true } },
          },
        });

        // Mettre à jour le statut de l'inscription
        await tx.inscriptions.update({
          where: { id: reservationId },
          data: {
            statut_client: 'Desiste',
            statut_paiement: 'Desiste',
          },
        });

        return d;
      });

      const formatted = {
        _id: result.id,
        id: result.id,
        dateAnnulation: result.date_annulation,
        joursAvantDepart: result.jours_avant_depart,
        tauxRemboursement: Number(result.pct_remboursement || 0),
        montantPaye: Number(result.total_paye || 0n),
        montantRembourse: Number(result.montant_rembourser || 0n),
        montantRetenu: Number(result.montant_retenu || 0n),
        motif: result.motif,
        statut: result.statut,
      };

      res.status(201).json({
        success: true,
        message: 'Désistement enregistré avec succès',
        desistement: formatted,
        tauxRemboursement,
        montantRembourse,
      });
    } catch (e) {
      next(e);
    }
  });

  /**
   * PATCH /api/desistements/:id/rembourser
   * Valider le remboursement du désistement
   */
  router.patch('/:id/rembourser', protect, checkPermission('desistements', 'edit'), async (req, res, next) => {
    try {
      const desistement = await prisma.desistements.findUnique({
        where: { id: req.params.id },
      });

      if (!desistement) {
        return res.status(404).json({ success: false, message: 'Désistement non trouvé' });
      }

      if (desistement.statut?.includes('Remboursé') || desistement.statut === 'REMBOURSE') {
        return res.status(400).json({ success: false, message: 'Ce désistement est déjà remboursé' });
      }

      const updated = await prisma.desistements.update({
        where: { id: req.params.id },
        data: {
          statut: 'Remboursé totalement',
          date_remboursement: new Date(),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Remboursement validé avec succès',
        desistement: { ...updated, _id: updated.id },
      });
    } catch (e) {
      next(e);
    }
  });

  /**
   * PATCH /api/desistements/:id
   * Modifier la date de départ (recalcul automatique du taux) ou le motif
   */
  router.patch('/:id', protect, checkPermission('desistements', 'edit'), async (req, res, next) => {
    try {
      const { dateDepart, motif } = req.body;

      const desistement = await prisma.desistements.findUnique({
        where: { id: req.params.id },
      });

      if (!desistement) {
        return res.status(404).json({ success: false, message: 'Désistement non trouvé' });
      }

      if (desistement.statut === 'REMBOURSE') {
        return res.status(400).json({ success: false, message: 'Impossible de modifier un désistement déjà remboursé' });
      }

      const updates = {};
      if (motif !== undefined) updates.motif = motif;

      if (dateDepart) {
        const { joursAvantDepart, tauxRemboursement } = calculerBareme(dateDepart, desistement.date_annulation);
        const totalPaye = Number(desistement.total_paye || 0n);
        const montantRembourse = Math.round((totalPaye * tauxRemboursement) / 100);
        const montantRetenu = totalPaye - montantRembourse;

        updates.jours_avant_depart = joursAvantDepart;
        updates.pct_remboursement = tauxRemboursement;
        updates.montant_rembourser = BigInt(montantRembourse);
        updates.montant_retenu = BigInt(montantRetenu);
      }

      const updated = await prisma.desistements.update({
        where: { id: req.params.id },
        data: updates,
      });

      res.status(200).json({
        success: true,
        message: 'Désistement mis à jour',
        desistement: { ...updated, _id: updated.id },
        joursAvantDepart: updated.jours_avant_depart,
        tauxRemboursement: Number(updated.pct_remboursement || 0),
        montantRembourse: Number(updated.montant_rembourser || 0n),
      });
    } catch (e) {
      next(e);
    }
  });

  /**
   * DELETE /api/desistements/:id
   * Supprimer un désistement et remettre la réservation en INSCRIT
   */
  router.delete('/:id', protect, checkPermission('desistements', 'delete'), async (req, res, next) => {
    try {
      const desistement = await prisma.desistements.findUnique({
        where: { id: req.params.id },
      });

      if (!desistement) {
        return res.status(404).json({ success: false, message: 'Désistement non trouvé' });
      }

      await prisma.$transaction(async (tx) => {
        // Remettre l'inscription à 'Inscrit'
        if (desistement.inscription_id) {
          await tx.inscriptions.update({
            where: { id: desistement.inscription_id },
            data: {
              statut_client: 'Inscrit',
              statut_paiement: 'Partiel',
            },
          });
        }

        // Supprimer le désistement
        await tx.desistements.delete({
          where: { id: req.params.id },
        });
      });

      res.status(200).json({
        success: true,
        message: 'Désistement supprimé et réservation rétablie avec succès',
      });
    } catch (e) {
      next(e);
    }
  });

  /**
   * GET /api/desistements/:id/recu
   * Génération du reçu officiel de désistement au format PDF
   */
  router.get('/:id/recu', protect, async (req, res, next) => {
    try {
      const desistement = await prisma.desistements.findUnique({
        where: { id: req.params.id },
        include: {
          clients: true,
          inscriptions: {
            include: { departs: true },
          },
        },
      });

      if (!desistement) {
        return res.status(404).json({ success: false, message: 'Désistement non trouvé' });
      }

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();

      const GREEN = [0, 103, 79];
      const GRAY = [100, 100, 100];
      const BLACK = [30, 30, 30];
      const WHITE = [255, 255, 255];

      const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');
      const fmtMoney = (n) => {
        const num = Number(n) || 0;
        return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
      };

      const c = desistement.clients || {};
      const insc = desistement.inscriptions || {};
      const pkg = insc.departs || {};
      const refNum = `DES-${desistement.id.slice(0, 8).toUpperCase()}`;

      // En-tête bandeau
      doc.setFillColor(...GREEN);
      doc.rect(0, 0, W, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...GREEN);
      doc.text('KYSWA TRAVEL', 14, 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text('Agence de voyages | Oumra · Hajj · Ziarra · Billets', 14, 19);
      doc.text('+221 77 661 71 71  ·  +221 76 160 22 22  ·  +221 77 461 12 52', 14, 23.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...BLACK);
      doc.text(`N° ${refNum}`, W - 14, 14, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...GRAY);
      doc.text(`Date : ${fmtDate(new Date())}`, W - 14, 19, { align: 'right' });

      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.8);
      doc.line(10, 30, W - 10, 30);

      let y = 38;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...GREEN);
      doc.text('REÇU DE DÉSISTEMENT', W / 2, y, { align: 'center' });
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.5);
      doc.line(55, y + 3, W - 55, y + 3);
      y += 14;

      const isRembourse = desistement.statut === 'REMBOURSE';
      doc.setFillColor(...(isRembourse ? [22, 163, 74] : [217, 119, 6]));
      doc.roundedRect(W / 2 - 28, y - 5, 56, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...WHITE);
      doc.text(isRembourse ? 'REMBOURSÉ' : 'EN ATTENTE DE REMBOURSEMENT', W / 2, y, { align: 'center' });
      y += 14;

      const blockW = (W - 34) / 2;
      const b1X = 14;
      const b2X = 14 + blockW + 6;

      doc.setFillColor(245, 245, 245);
      doc.rect(b1X, y, blockW, 34, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...GREEN);
      doc.text('CLIENT', b1X + 4, y + 6);
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.4);
      doc.line(b1X + 4, y + 7.5, b1X + 20, y + 7.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...BLACK);
      let cy = y + 13;
      doc.text(`${c.nom || '—'} ${c.prenom || ''}`, b1X + 4, cy); cy += 5;
      doc.text(`Tél : ${c.telephone || '—'}`, b1X + 4, cy); cy += 5;
      doc.text(`Passeport : ${c.n_passeport || '—'}`, b1X + 4, cy);

      doc.setFillColor(245, 245, 245);
      doc.rect(b2X, y, blockW, 34, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...GREEN);
      doc.text('RÉSERVATION', b2X + 4, y + 6);
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.4);
      doc.line(b2X + 4, y + 7.5, b2X + 28, y + 7.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...BLACK);
      let vy = y + 13;
      doc.text(`Réf : ${insc.numero || '—'}`, b2X + 4, vy); vy += 5;
      doc.text(`Package : ${pkg.nom_depart || '—'}`, b2X + 4, vy); vy += 5;
      doc.text(`Départ prévu : ${fmtDate(pkg.date_depart)}`, b2X + 4, vy);

      y += 44;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...GREEN);
      doc.text('Détails du désistement', 14, y);
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.3);
      doc.line(14, y + 2, 80, y + 2);
      y += 8;

      const details = [
        ["Date d'annulation", fmtDate(desistement.date_annulation)],
        ['Jours avant départ', `${desistement.jours_avant_depart ?? '—'} jour(s)`],
        ['Taux de remboursement', `${desistement.pct_remboursement ?? 0}%`],
        ['Total payé par le client', fmtMoney(desistement.total_paye)],
        ['Montant retenu (pénalité)', fmtMoney(desistement.montant_retenu)],
        ['Montant à rembourser', fmtMoney(desistement.montant_rembourser)],
        ['Motif', desistement.motif || '—'],
      ];

      details.forEach(([label, value]) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY);
        doc.text(label + ' :', 14, y);
        doc.setTextColor(...BLACK);
        doc.setFont('helvetica', 'bold');
        doc.text(value, 80, y);
        y += 6;
      });

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=recu-desistement-${refNum}.pdf`);
      res.send(pdfBuffer);
    } catch (e) {
      next(e);
    }
  });

  return router;
}

module.exports = createDesistementsRoutes;
