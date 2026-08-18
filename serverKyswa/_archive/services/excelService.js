/**
 * Service Export Excel
 * Génération de fichiers Excel avancés avec ExcelJS
 */

const ExcelJS = require('exceljs');

/**
 * Créer un workbook Excel avec style Kyswa
 * @returns {ExcelJS.Workbook} - Workbook configuré
 */
function createWorkbook() {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Kyswa Travel';
  workbook.lastModifiedBy = 'Kyswa Travel';
  workbook.created = new Date();
  workbook.modified = new Date();
  
  return workbook;
}

/**
 * Appliquer le style d'en-tête Kyswa
 * @param {ExcelJS.Row} headerRow - Ligne d'en-tête
 */
function applyHeaderStyle(headerRow) {
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' }, // Bleu Kyswa
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 12,
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

/**
 * Exporter les clients en Excel
 * @param {Array} clients - Liste des clients
 * @returns {Promise<Buffer>} - Fichier Excel en buffer
 */
async function exportClients(clients) {
  const workbook = createWorkbook();
  const worksheet = workbook.addWorksheet('Clients');

  // En-têtes
  const headers = [
    'ID', 'Nom', 'Prénom', 'Email', 'Téléphone', 
    'Date de naissance', 'Lieu de naissance', 'Nationalité',
    'N° Passeport', 'Date création', 'Nb réservations'
  ];
  
  const headerRow = worksheet.addRow(headers);
  applyHeaderStyle(headerRow);

  // Données
  clients.forEach(client => {
    worksheet.addRow([
      client._id.toString(),
      client.nom,
      client.prenom,
      client.email,
      client.telephone || '',
      client.dateNaissance ? new Date(client.dateNaissance).toLocaleDateString('fr-FR') : '',
      client.lieuNaissance || '',
      client.nationalite || '',
      client.numeroPasseport || '',
      new Date(client.createdAt).toLocaleDateString('fr-FR'),
      client.reservations?.length || 0,
    ]);
  });

  // Auto-ajuster les colonnes
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Exporter les réservations en Excel
 * @param {Array} reservations - Liste des réservations
 * @returns {Promise<Buffer>} - Fichier Excel en buffer
 */
async function exportReservations(reservations) {
  const workbook = createWorkbook();
  const worksheet = workbook.addWorksheet('Réservations');

  // En-têtes
  const headers = [
    'N° Réservation', 'Package', 'Client(s)', 'Nb Places',
    'Montant Total', 'Montant Payé', 'Reste à Payer',
    'Statut', 'Statut Client', 'Date Création'
  ];
  
  const headerRow = worksheet.addRow(headers);
  applyHeaderStyle(headerRow);

  // Données
  reservations.forEach(reservation => {
    const clientsNoms = reservation.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ') || '';
    const totalPaye = reservation.paiements?.reduce((s, p) => s + parseFloat(p.montant.toString()), 0) || 0;
    const resteAPayer = (reservation.montantTotalDu || 0) - totalPaye;

    const row = worksheet.addRow([
      reservation.idReservation,
      reservation.packageKId?.nomReference || '',
      clientsNoms,
      reservation.nombrePlaces,
      reservation.montantTotalDu,
      totalPaye,
      resteAPayer,
      reservation.statut,
      reservation.statutClient,
      new Date(reservation.createdAt).toLocaleDateString('fr-FR'),
    ]);

    // Colorer selon le statut
    if (resteAPayer > 0) {
      row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFECACA' } };
    } else {
      row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    }
  });

  // Auto-ajuster les colonnes
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Exporter les paiements en Excel
 * @param {Array} paiements - Liste des paiements
 * @returns {Promise<Buffer>} - Fichier Excel en buffer
 */
async function exportPaiements(paiements) {
  const workbook = createWorkbook();
  const worksheet = workbook.addWorksheet('Paiements');

  // En-têtes
  const headers = [
    'ID Paiement', 'Montant', 'Mode', 'Date Règlement',
    'Référence', 'Réservation', 'Billet', 'Créé le'
  ];
  
  const headerRow = worksheet.addRow(headers);
  applyHeaderStyle(headerRow);

  // Données
  paiements.forEach(paiement => {
    worksheet.addRow([
      paiement.idPaiement,
      parseFloat(paiement.montant.toString()),
      paiement.mode,
      new Date(paiement.dateReglement).toLocaleDateString('fr-FR'),
      paiement.reference || '',
      paiement.reservationId?.idReservation || '',
      paiement.billetId?.numeroBillet || '',
      new Date(paiement.createdAt).toLocaleDateString('fr-FR'),
    ]);
  });

  // Formater la colonne montant
  worksheet.getColumn(2).numFmt = '#,##0 "FCFA"';

  // Auto-ajuster les colonnes
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Exporter un rapport financier complet
 * @param {Object} data - Données du rapport
 * @returns {Promise<Buffer>} - Fichier Excel en buffer
 */
async function exportRapportFinancier(data) {
  const workbook = createWorkbook();
  
  // Feuille de synthèse
  const synthese = workbook.addWorksheet('Synthèse');
  
  synthese.addRow(['RAPPORT FINANCIER KYSWA TRAVEL']);
  synthese.getRow(1).font = { size: 16, bold: true };
  synthese.addRow([]);
  
  synthese.addRow(['Période:', data.periode || 'Toutes']);
  synthese.addRow(['Généré le:', new Date().toLocaleDateString('fr-FR')]);
  synthese.addRow([]);
  
  // Métriques principales
  synthese.addRow(['MÉTRIQUES PRINCIPALES']);
  const metriquesHeader = synthese.addRow(['Indicateur', 'Valeur']);
  applyHeaderStyle(metriquesHeader);
  
  synthese.addRow(['Total Encaissé', `${data.totalEncaisse?.toLocaleString('fr-FR') || 0} FCFA`]);
  synthese.addRow(['Reste à Encaisser', `${data.resteAEncaisser?.toLocaleString('fr-FR') || 0} FCFA`]);
  synthese.addRow(['Nombre de Réservations', data.nombreReservations || 0]);
  synthese.addRow(['Nombre de Paiements', data.nombrePaiements || 0]);
  
  // Feuilles détaillées
  if (data.reservations) {
    const reservationsSheet = workbook.addWorksheet('Détail Réservations');
    // Ajouter les données de réservations...
  }
  
  if (data.paiements) {
    const paiementsSheet = workbook.addWorksheet('Détail Paiements');
    // Ajouter les données de paiements...
  }

  return await workbook.xlsx.writeBuffer();
}

module.exports = {
  exportClients,
  exportReservations,
  exportPaiements,
  exportRapportFinancier,
};