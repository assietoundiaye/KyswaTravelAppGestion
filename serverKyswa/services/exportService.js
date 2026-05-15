/**
 * Service Export
 * Génération de fichiers CSV pour les différentes entités.
 */

const Client = require('../models/Client');
const Reservation = require('../models/Reservation');
const Billet = require('../models/Billet');

/**
 * Convertit des données en CSV avec BOM UTF-8 pour Excel
 */
function toCSV(headers, rows) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };
  const lines = [headers.join(',')];
  rows.forEach((row) => lines.push(row.map(escape).join(',')));
  return '\uFEFF' + lines.join('\n'); // BOM pour Excel
}

/**
 * Exporter les clients en CSV
 */
async function exporterClients() {
  const clients = await Client.find().sort({ dateCreation: -1 });
  const headers = ['Nom', 'Prénom', 'Passeport', 'CNI', 'Téléphone', 'Email', 'Adresse', 'Niveau Fidélité', 'Date Création'];
  const rows = clients.map((c) => [
    c.nom,
    c.prenom,
    c.numeroPasseport,
    c.numeroCNI || '',
    c.telephone || '',
    c.email || '',
    c.adresse || '',
    c.niveauFidelite || 'BRONZE',
    c.dateCreation ? new Date(c.dateCreation).toLocaleDateString('fr-FR') : '',
  ]);
  return toCSV(headers, rows);
}

/**
 * Exporter les réservations en CSV
 */
async function exporterReservations() {
  const reservations = await Reservation.find()
    .populate('clients', 'nom prenom')
    .populate('packageKId', 'nomReference type')
    .populate('paiements', 'montant')
    .sort({ createdAt: -1 });

  const headers = [
    'N° Réservation', 'Package', 'Type', 'Clients', 'Statut',
    'Formule', 'Confort', 'Type Chambre', 'Date Départ', 'Date Retour',
    'Montant Total', 'Total Payé', 'Reste',
  ];
  const rows = reservations.map((r) => {
    const totalPaye = (r.paiements || []).reduce(
      (s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0),
      0
    );
    return [
      r.idReservation,
      r.packageKId?.nomReference || '',
      r.packageKId?.type || '',
      (r.clients || []).map((c) => `${c.nom} ${c.prenom}`).join(' | '),
      r.statut,
      r.formule || '',
      r.niveauConfort || '',
      r.typeChambre || '',
      r.dateDepart ? new Date(r.dateDepart).toLocaleDateString('fr-FR') : '',
      r.dateRetour ? new Date(r.dateRetour).toLocaleDateString('fr-FR') : '',
      r.montantTotalDu,
      totalPaye,
      r.montantTotalDu - totalPaye,
    ];
  });
  return toCSV(headers, rows);
}

/**
 * Exporter les billets en CSV
 */
async function exporterBillets() {
  const billets = await Billet.find()
    .populate('clientId', 'nom prenom')
    .populate('paiements', 'montant')
    .sort({ dateDepart: -1 });

  const headers = [
    'N° Billet', 'Client', 'Compagnie', 'Classe', 'Destination', 'Type',
    'Date Départ', 'Date Arrivée', 'Prix', 'Total Payé', 'Reste', 'Statut',
  ];
  const rows = billets.map((b) => {
    const totalPaye = (b.paiements || []).reduce(
      (s, p) => s + (p.montant ? parseFloat(p.montant.toString()) : 0),
      0
    );
    return [
      b.numeroBillet,
      b.clientId ? `${b.clientId.nom} ${b.clientId.prenom}` : '',
      b.compagnie,
      b.classe,
      b.destination,
      b.typeBillet,
      b.dateDepart ? new Date(b.dateDepart).toLocaleDateString('fr-FR') : '',
      b.dateArrivee ? new Date(b.dateArrivee).toLocaleDateString('fr-FR') : '',
      b.prix,
      totalPaye,
      b.prix - totalPaye,
      b.statut,
    ];
  });
  return toCSV(headers, rows);
}

module.exports = {
  exporterClients,
  exporterReservations,
  exporterBillets,
};
