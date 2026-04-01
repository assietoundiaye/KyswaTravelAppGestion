const express = require('express');
const { jsPDF } = require('jspdf');
const { autoTable } = require('jspdf-autotable');
const router = express.Router();

const Reservation = require('../models/Reservation');
const Billet = require('../models/Billet');
const LigneSupplement = require('../models/LigneSupplement');
// s'assurer que le modèle Paiement est enregistré pour les populates
require('../models/Paiement');
const { protect, requireRole } = require('../middleware/auth');

function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleString('fr-FR'); } catch (e) { return String(d); }
}

function formatMoney(n) {
  const num = Number(n) || 0;
  return num.toFixed(2) + ' FCFA';
}

/**
 * GET /api/factures/reservation/:id
 */
router.get('/reservation/:id', protect, requireRole('commercial', 'comptable', 'administrateur', 'dg'), async (req, res) => {
  try {
    const factureType = req.query.type === 'acompte' ? 'acompte' : 'solde';

    const reservation = await Reservation.findById(req.params.id)
      .populate('clients')
      .populate('packageKId')
      .populate('paiements');

    if (!reservation) return res.status(404).json({ message: 'Réservation introuvable' });

    const lignesSupp = await LigneSupplement.find({ reservationId: reservation._id }).populate('supplementId').populate('clientId', 'nom prenom');

    // calculs
    const montantTotal = Number(reservation.montantTotalDu || 0);
    const totalPaye = (reservation.paiements || []).reduce((s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0), 0);
    const reste = montantTotal - totalPaye;

    const doc = new jsPDF();
    let y = 12;

    // Logo (env var KYSWA_LOGO_BASE64 ou placeholder)
    const logoBase64 = process.env.KYSWA_LOGO_BASE64 || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    try { doc.addImage(logoBase64, 'PNG', 150, 8, 40, 18); } catch (e) { /* ignore if unsupported */ }

    doc.setFontSize(14);
    const title = factureType === 'acompte' ? 'Acompte reçu' : 'Facture solde';
    doc.text(`Facture KYSWA TRAVEL - Réservation n° ${reservation.idReservation || reservation._id}`, 14, y);
    doc.setFontSize(11);
    doc.text(title, 14, y + 8);
    y += 20;

    doc.setFontSize(11);
    doc.text('Client(s):', 14, y); y += 6;
    (reservation.clients || []).forEach((c) => {
      doc.text(`- ${c.nom || ''} ${c.prenom || ''} / Passeport: ${c.numeroPasseport || ''} / Tél: ${c.telephone || ''}`, 16, y);
      y += 6;
    });

    y += 4;
    doc.text('Détails du package:', 14, y); y += 6;
    const pkg = reservation.packageKId || {};
    doc.text(`Référence: ${pkg.nomReference || ''}  Type: ${pkg.type || ''}`, 16, y); y += 6;
    doc.text(`Dates: ${formatDate(reservation.dateDepart)} → ${formatDate(reservation.dateRetour)}`, 16, y); y += 6;
    doc.text(`Formule: ${reservation.formule || '-'}  Niveau: ${reservation.niveauConfort || '-'}`, 16, y); y += 8;

    // Table suppléments par client
    if (lignesSupp && lignesSupp.length) {
      const byClient = {};
      lignesSupp.forEach((ls) => {
        const cid = (ls.clientId && ls.clientId._id) ? ls.clientId._id.toString() : 'unknown';
        if (!byClient[cid]) byClient[cid] = { client: ls.clientId || null, items: [] };
        byClient[cid].items.push({ nom: (ls.supplementId && ls.supplementId.nom) || 'Supplément', quantite: ls.quantite || 1, prix: ls.prixUnitaire || 0 });
      });

      const suppRows = Object.values(byClient).map((entry) => {
        const clientName = entry.client ? `${entry.client.nom || ''} ${entry.client.prenom || ''}` : 'Client';
        const itemsStr = entry.items.map(it => `${it.nom} x${it.quantite}`).join('; ');
        const total = entry.items.reduce((s, it) => s + (Number(it.prix || 0) * (it.quantite || 1)), 0);
        return [clientName, itemsStr, formatMoney(total)];
      });

      doc.text('Suppléments par client:', 14, y); y += 6;
      autoTable(doc, { head: [['Client', 'Suppléments', 'Total']], body: suppRows, startY: y });
      y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : y + 40;
    }

    // Paiements (si acompte on affiche les paiements existants mais label différent)
    const paymentsToShow = reservation.paiements || [];
    const payments = paymentsToShow.map((p) => [formatDate(p.dateReglement), p.mode || '', p.idPaiement || p._id || '', formatMoney(p.montant ? parseFloat(p.montant.toString()) : 0)]);
    autoTable(doc, { head: [['Date', 'Mode', 'Référence', 'Montant']], body: payments, startY: y });
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : y + 40;

    // Totaux en gros
    doc.setFontSize(16);
    doc.text(`Total dû: ${formatMoney(montantTotal)}`, 14, y); y += 8;
    doc.text(`Total payé: ${formatMoney(totalPaye)}`, 14, y); y += 8;
    doc.text(`Reste à payer: ${formatMoney(reste)}`, 14, y); y += 12;

    // Pied de page
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    const footerY = pageHeight - 24;
    doc.text('KYSWA TRAVEL – Agence de voyages religieux – Dakar', 14, footerY);
    doc.text(`Généré le: ${formatDate(new Date())}`, 14, footerY + 6);
    doc.text('Merci pour votre confiance', 14, footerY + 12);

    const arrayBuf = doc.output('arraybuffer');
    const buffer = Buffer.from(arrayBuf);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-reservation-${reservation.idReservation || reservation._id}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Erreur génération facture réservation:', err);
    return res.status(500).json({ message: 'Erreur lors de la génération de la facture' });
  }
});


/**
 * GET /api/factures/billet/:id
 */
router.get('/billet/:id', protect, requireRole('commercial', 'comptable', 'administrateur', 'dg'), async (req, res) => {
  try {
    const billet = await Billet.findById(req.params.id).populate('clientId').populate('paiements');
    if (!billet) return res.status(404).json({ message: 'Billet introuvable' });

    const montant = Number(billet.prix || 0);
    const totalPaye = (billet.paiements || []).reduce((s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0), 0);
    const reste = montant - totalPaye;

    const doc = new jsPDF();
    let y = 12;

    // Logo
    const logoBase64 = process.env.KYSWA_LOGO_BASE64 || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    try { doc.addImage(logoBase64, 'PNG', 150, 8, 40, 18); } catch (e) { /* ignore if unsupported */ }

    // En-tête
    doc.setFontSize(14);
    doc.text(`Facture Billet KYSWA TRAVEL – n° ${billet.numeroBillet || billet.idBillet || billet._id}`, 14, y);
    y += 20;

    // Client
    doc.setFontSize(11);
    const c = billet.clientId || {};
    doc.text('Client:', 14, y); y += 6;
    doc.text(`${c.nom || ''} ${c.prenom || ''}`, 16, y); y += 6;
    if (c.numeroPasseport) {
      doc.text(`Passeport: ${c.numeroPasseport}`, 16, y); y += 6;
    }
    doc.text(`Téléphone: ${c.telephone || '-'}`, 16, y); y += 8;

    // Détails du billet
    doc.text('Détails du billet:', 14, y); y += 6;
    doc.text(`Compagnie: ${billet.compagnie || '-'}  Classe: ${billet.classe || '-'}`, 16, y); y += 6;
    doc.text(`Type: ${billet.typeBillet || '-'}`, 16, y); y += 6;
    if (billet.destination) {
      doc.text(`Destination: ${billet.destination}`, 16, y); y += 6;
    }
    doc.text(`Départ: ${formatDate(billet.dateDepart)}`, 16, y); y += 6;
    doc.text(`Arrivée: ${formatDate(billet.dateArrivee)}`, 16, y); y += 6;
    doc.text(`Prix: ${formatMoney(montant)}`, 16, y); y += 8;

    // Paiements
    const payments = (billet.paiements || []).map((p) => [formatDate(p.dateReglement), p.mode || '', p.idPaiement || p._id || '', formatMoney(p.montant ? parseFloat(p.montant.toString()) : 0)]);
    if (payments.length > 0) {
      autoTable(doc, { head: [['Date', 'Mode', 'Référence', 'Montant']], body: payments, startY: y });
      y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : y + 40;
    }

    // Totaux en gros
    doc.setFontSize(16);
    doc.text(`Total: ${formatMoney(montant)}`, 14, y); y += 8;
    doc.text(`Payé: ${formatMoney(totalPaye)}`, 14, y); y += 8;
    doc.text(`Reste: ${formatMoney(reste)}`, 14, y); y += 12;

    // Pied de page
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    const footerY = pageHeight - 24;
    doc.text('KYSWA TRAVEL – Agence de voyages religieux – Dakar', 14, footerY);
    doc.text(`Généré le: ${formatDate(new Date())}`, 14, footerY + 6);
    doc.text('Merci pour votre confiance', 14, footerY + 12);

    const arrayBuf = doc.output('arraybuffer');
    const buffer = Buffer.from(arrayBuf);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-billet-${billet.numeroBillet || billet._id}.pdf"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Erreur génération facture billet:', err);
    return res.status(500).json({ message: 'Erreur lors de la génération de la facture' });
  }
});

module.exports = router;
