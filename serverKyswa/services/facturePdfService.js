const { jsPDF } = require('jspdf');

// Logo embarque en base64
const LOGO_B64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAADM6ADAAQAAAABAAABMAAAAAD/wAARCAEwAzMDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9sAQwACAgICAgIDAgIDBQMDAwUGBQUFBQYIBgYGBgYICggICAgICAoKCgoKCgoKDAwMDAwMDg4ODg4PDw8PDw8PDw8P/9sAQwECAgIEBAQHBAQHEAsJCxAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ/90ABAA0/9oADAMBAAIRAxEAPwD9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKK8S8SfHXwz4Y1648P39ldtNbMFdlRdvPORlgSPegD22iua8L+LtA8Y6eNS0C6W4jBwy9HQ+jL1FdLQAUUUUAFFFFABRRRQAUUUUAFFFFAGZq2s6XoNmdQ1i5S0twQpeQ4GT0FLpWsaVrlqL3SLuO7gJxujYMM+h9DXin7R5I+HygHAN5Dn8mrwj9nzxV/YXjEaJPKfs2rAxY/hEq8oe2Cfu/jj0FA7H3pRRRQIKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/0P38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAr5o/aD8AtqmnJ4y0xT9qsF23AUcvD/eP+76+ntX0vUc0MVxE8E6h45AVZTyCDwQaAPy38NeJdb8Kammr6NcNBOjZI5KSdyrjjK4wQTX3R8N/jFonjaGOxvnSw1gD5oC3D47oT6+nWvkP4peB5/Aviie0RD9guSZbZ+2xs5X6qff9K87ilkt5Y5oXaKVCGR1PzKR0IIoA/WSivzx8IfHz4geHvE1oPE902raBcOkT/u1DwqxAD5xk4zz1/Q1+hUUsc8STQsHSQBlI6EHoaAJKKKKACiiigAooooAKKKKAPn79pGQL4AiU9WvYcfgGNfEtjdz6ffQahA5R4JRIpH3lKHIr7K/aavbeDwRZxyShC97HwSBnCt19q+GJNS0xWKvdoM8feoA/Vrwxrlv4k0Cx1u2OVuolYj+63RlP0ORW9Xx1+zd8TNAW2vfB97qMUciyGe3DuACH++Bn0PavqiXxR4bg/wBdqlsn1mT/ABoG1Y3aK42b4ieBbckS69ZAj/psp/kax5/i/wDDeD72uQNj+7lv5CgLM9Korx+f47/DOAZ/tQyeyROf6Vnv+0L8NlOBc3DH2gagR7hRXgkn7Rnw+QFgLth7Qn/Gq5/aR8CDbm3vPmOP9Wv/AMVQB9B0V4fa/tCfDif/AFtxPbj1eFu/0zXd6R8RvBOuyJBpurwSSycqjNsY/QNigLHa0UAgjI5BooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//0f38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKK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ahCpFwqK6fRn4E/Gz9kL4kfCS+vNRsbJ9f8OknybmDc8ka9vNXJxtHfocc18kHzUZ0Y7ShweuR7AV/VTLFFPE8E6CSNwVZWGQQeoINfBXxw/YT8E+Prm68S+BJf8AhHtYlBZoQA1rM/XJXqp+nFeJi8oTvKmfkHE3hjGTdfA7/wAr/Rn4mjbKGRBtf+I92r7C/Z7/AGvfGXwW+y+GtWiXVvDO8bonY+bCGPLRsMnA/wBrjtnpXzr8Qvhr4w+GHiCfQvF2mzafLCcCV0YRTDOAY32gdsnB4FcKWQNtdcg/lXjQq1KD0Wp+V4LFY7K694y5JLp/mf02/Dz4n+Cfijo66z4M1OK/iAHmIh+eJj/C69RXoFfzN/Df4p+PPhRrf9u+C9UaxlfAljYbklUc7SuR368dcV+0H7Pv7Xngf4t2Vpouu3cWleKCoDQSfu0mYdTGTxnvjNfS4TMIVUl1P6A4X43oY9ezn7s/wfp/kfYlFFFegfcBRRRQAUUUUAFfKvxr/AGRPhf8AGR5dVlibQ9dkH/H7aAAuf+micB/zB96+qqKicFJWkjmxeDpV4OnWipLzPxD8ef8ABPv4xeH5zL4TmtfEdruKrsk8mXbyQWSTC59gW5744r541f8AZ2+N2ivLHqPg7UR5J5ZYGdcexXPTtg4r+kOiuJ5fScua2p8rX4Ky2pVdaVL3n6nL+CtN1zRvCelaV4luo77U7S3SKeeIEJI6jG4A89K6iiiu0+pSsrBRRRQMKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/0f38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/2Q==';

const GREEN = [0, 103, 79];
const GRAY_LIGHT = [245, 245, 245];
const GRAY_TEXT = [100, 100, 100];
const BLACK = [30, 30, 30];
const WHITE = [255, 255, 255];

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR');
  } catch {
    return '—';
  }
}

function fmtMoney(n) {
  const num = typeof n === 'object' && n?.$numberDecimal ? parseFloat(n.$numberDecimal) : Number(n) || 0;
  const parts = Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${parts} FCFA`;
}

function parseMontant(m) {
  if (!m) return 0;
  if (typeof m === 'number') return m;
  if (typeof m === 'string') return parseFloat(m) || 0;
  if (m.$numberDecimal) return parseFloat(m.$numberDecimal) || 0;
  return parseFloat(m.toString()) || 0;
}

function drawHeader(doc, factureNum, dateStr) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, W, 2, 'F');
  try {
    doc.addImage(LOGO_B64, 'JPEG', 10, 6, 22, 22);
  } catch {}
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...GREEN);
  doc.text('KYSWA TRAVEL', 36, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_TEXT);
  doc.text('Agence de voyages | Oumra · Hajj · Ziarra · Billets', 36, 19);
  doc.text('+221 77 661 71 71  ·  +221 76 160 22 22  ·  +221 77 461 12 52', 36, 23.5);
  doc.text('kyswainc@outlook.fr  ·  Centre commercial Keur Khad m, Dakar', 36, 28);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  doc.text(`N° ${factureNum}`, W - 14, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(`Date : ${dateStr}`, W - 14, 19, { align: 'right' });
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.8);
  doc.line(10, 34, W - 10, 34);
  return 38;
}

function drawFooter(doc) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...GREEN);
  doc.rect(0, H - 10, W, 10, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text('Kyswa Travel  —  Ce document tient lieu de reçu officiel', W / 2, H - 4, { align: 'center' });
}

function addConditionsPage(doc, clientNom, factureNum) {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  let y = drawHeader(doc, factureNum, fmtDate(new Date()));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...GREEN);
  doc.text('CONDITIONS GENERALES D\'INSCRIPTION', W / 2, y + 8, { align: 'center' });
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.5);
  doc.line(30, y + 11, W - 30, y + 11);
  y += 20;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_TEXT);
  doc.text('La presente facture constitue un contrat entre l\'agence KYSWA TRAVEL et le client pour les prestations de voyage.', 14, y);
  y += 10;
  const conditions = [
    ['1. RESERVATION ET PAIEMENT', 'La reservation est confirmee apres versement d\'un acompte de 30%. Le solde doit etre regle au plus tard 1 mois avant la date de depart.'],
    ['2. ANNULATION', 'Toute annulation doit etre notifiee par ecrit au moins 2 mois avant le depart. Des frais de dossier sont retenus et le remboursement ne sera jamais integral. Des frais peuvent etre exiges avant certaines demarches (billets, visas, etc.).'],
    ['3. REMBOURSEMENT', 'La procedure de remboursement debute apres le retour des passagers, environ 2 mois apres la date de retour prevue. Aucun remboursement en especes ne sera effectue. Un pourcentage est systematiquement deduit du montant paye.'],
    ['4. OFFRES PROMOTIONNELLES', 'Les packages PROMO ne sont en aucun cas remboursables. Le client peut soit ceder sa place a un proche, soit passer a un package standard en reglant la difference de prix.'],
    ['5. RESPONSABILITE', 'L\'agence KYSWA TRAVEL ne saurait etre tenue responsable des retards, annulations ou modifications imposes par les compagnies aeriennes, les ambassades ou tout cas de force majeure. Le client est seul responsable de la validite de ses documents de voyage (passeport, visa, vaccins obligatoires).'],
    ['6. ACCEPTATION', 'La signature de la presente facture vaut acceptation pleine et entiere de l\'ensemble des conditions generales ci-dessus.'],
  ];
  conditions.forEach(([titre, texte]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    doc.text(`${titre} :`, 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_TEXT);
    const lines = doc.splitTextToSize(texte, W - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4.5 + 3;
  });
  y += 8;
  const colW = (W - 28) / 2;
  const col1X = 14;
  const col2X = 14 + colW + 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text('Signature & Cachet Comptable', col1X + colW / 2, y, { align: 'center' });
  doc.text('Signature Client', col2X + colW / 2, y, { align: 'center' });
  y += 4;
  doc.setDrawColor(...GRAY_TEXT);
  doc.setLineWidth(0.3);
  doc.rect(col1X, y, colW, 30);
  doc.rect(col2X, y, colW, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(clientNom || '', col2X + colW / 2, y + 34, { align: 'center' });
  drawFooter(doc);
}

function drawPaymentsTable(doc, y, rows) {
  const W = doc.internal.pageSize.getWidth();
  const colWidths = [10, 30, 30, 50, 40];
  const tableX = 14;
  const rowH = 7;
  const headers = ['N°', 'Date', 'Mode', 'Reçu', 'Montant'];
  doc.setFillColor(...GREEN);
  doc.rect(tableX, y, W - 28, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  let cx = tableX + 3;
  headers.forEach((h, i) => {
    const align = i === headers.length - 1 ? 'right' : 'left';
    const tx = align === 'right' ? tableX + colWidths.slice(0, i + 1).reduce((a, b) => a + b, 0) - 3 : cx;
    doc.text(h, tx, y + 5, { align });
    cx += colWidths[i];
  });
  y += rowH;
  rows.forEach((row, ri) => {
    doc.setFillColor(ri % 2 === 0 ? 255 : 248, ri % 2 === 0 ? 255 : 250, ri % 2 === 0 ? 255 : 248);
    doc.rect(tableX, y, W - 28, rowH, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    let cx2 = tableX + 3;
    row.forEach((cell, ci) => {
      const isLast = ci === row.length - 1;
      const tx = isLast ? tableX + colWidths.slice(0, ci + 1).reduce((a, b) => a + b, 0) - 3 : cx2;
      doc.text(String(cell), tx, y + 5, { align: isLast ? 'right' : 'left' });
      cx2 += colWidths[ci];
    });
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(tableX, y + rowH, tableX + W - 28, y + rowH);
    y += rowH;
  });
  return y;
}

function drawTotals(doc, y, montantTotal, totalPaye, reste) {
  const W = doc.internal.pageSize.getWidth();
  const totalsX = W - 80;
  const totalsW = 66;
  const drawTotalLine = (label, value, bold = false, color = BLACK) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9.5 : 8.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(label, totalsX, y);
    doc.setTextColor(...color);
    doc.text(value, totalsX + totalsW, y, { align: 'right' });
    if (bold) {
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.4);
      doc.line(totalsX, y + 1.5, totalsX + totalsW, y + 1.5);
    }
    y += bold ? 8 : 6;
  };
  drawTotalLine('Prix total :', fmtMoney(montantTotal));
  drawTotalLine('Montant versé :', fmtMoney(totalPaye), false, [22, 163, 74]);
  drawTotalLine('Solde restant :', fmtMoney(reste), true, reste <= 0 ? [22, 163, 74] : [220, 38, 38]);
  return y;
}

function buildReservationFacturePdf({ reservation, lignesSupp }) {
  const montantTotal = Number(reservation.montantTotalDu || 0);
  const totalPaye = (reservation.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
  const reste = montantTotal - totalPaye;
  const factureNum = `FAC-${reservation.numero || reservation.idReservation || reservation._id.toString().slice(-6)}`;
  const dateStr = fmtDate(new Date());
  const clientPrincipal = reservation.clients?.[0];
  const clientNom = clientPrincipal ? `${clientPrincipal.nom} ${clientPrincipal.prenom}` : '—';
  const pkg = reservation.packageKId || {};

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = drawHeader(doc, factureNum, dateStr);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...GREEN);
  doc.text('FACTURE', W / 2, y + 6, { align: 'center' });
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.5);
  doc.line(60, y + 9, W - 60, y + 9);
  y += 16;

  const blockW = (W - 34) / 2;
  const block1X = 14;
  const block2X = 14 + blockW + 6;

  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(block1X, y, blockW, 38, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...GREEN);
  doc.text('CLIENT', block1X + 4, y + 6);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(block1X + 4, y + 7.5, block1X + 22, y + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  let cy = y + 13;
  if (reservation.clients?.[0]) {
    const c = reservation.clients[0];
    doc.text(`Nom : ${c.nom || '—'}`, block1X + 4, cy); cy += 5;
    doc.text(`Prénom : ${c.prenom || '—'}`, block1X + 4, cy); cy += 5;
    doc.text(`Tél : ${c.telephone || '—'}`, block1X + 4, cy); cy += 5;
    doc.text(`Passeport : ${c.numeroPasseport || '—'}`, block1X + 4, cy);
  }

  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(block2X, y, blockW, 38, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...GREEN);
  doc.text('VOYAGE', block2X + 4, y + 6);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(block2X + 4, y + 7.5, block2X + 22, y + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  let vy = y + 13;
  doc.text(`${pkg.nomReference || '—'}`, block2X + 4, vy); vy += 5;
  doc.text(`Service : ${pkg.type || '—'}`, block2X + 4, vy); vy += 5;
  doc.text(`Départ : ${fmtDate(reservation.dateDepart) || '—'}`, block2X + 4, vy); vy += 5;
  doc.text(`Retour : ${fmtDate(reservation.dateRetour) || '—'}`, block2X + 4, vy);
  y += 44;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(`Chambre : ${reservation.typeChambre || '—'}`, 14, y);
  doc.text(`Formule : ${reservation.formule || 'Standard'}`, 14, y + 5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(`Réf : ${reservation.numero || reservation.idReservation || '—'}`, W - 14, y, { align: 'right' });
  y += 14;

  const rows = (reservation.paiements || []).map((p, i) => [
    String(i + 1),
    fmtDate(p.dateReglement),
    p.mode || '—',
    p.reference || '—',
    fmtMoney(parseMontant(p.montant)),
  ]);
  if (rows.length === 0) rows.push(['—', '—', '—', '—', '0 FCFA']);
  y = drawPaymentsTable(doc, y, rows);
  y += 10;
  y = drawTotals(doc, y, montantTotal, totalPaye, reste);

  if (lignesSupp?.length) {
    y += 10;
    const suppColW = [60, 30, 20, 30, 36];
    const suppHeaders = ['Désignation', 'Client', 'Qté', 'Prix unitaire', 'Total'];
    const suppRowH = 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    doc.text('Suppléments :', 14, y);
    y += 5;
    doc.setFillColor(...GREEN);
    doc.rect(14, y, W - 28, suppRowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    let scx = 17;
    suppHeaders.forEach((h, i) => {
      const isLast = i === suppHeaders.length - 1;
      const tx = isLast ? 14 + suppColW.slice(0, i + 1).reduce((a, b) => a + b, 0) - 3 : scx;
      doc.text(h, tx, y + 5, { align: isLast ? 'right' : 'left' });
      scx += suppColW[i];
    });
    y += suppRowH;
    lignesSupp.forEach((ls, ri) => {
      doc.setFillColor(ri % 2 === 0 ? 255 : 248, ri % 2 === 0 ? 255 : 250, ri % 2 === 0 ? 255 : 248);
      doc.rect(14, y, W - 28, suppRowH, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BLACK);
      const nom = ls.supplementId?.nom || 'Supplément';
      const client = ls.clientId ? `${ls.clientId.nom} ${ls.clientId.prenom}` : '—';
      const qte = String(ls.quantite || 1);
      const pu = fmtMoney(ls.prixUnitaire || 0);
      const total = fmtMoney((ls.prixUnitaire || 0) * (ls.quantite || 1));
      const row = [nom, client, qte, pu, total];
      let scx2 = 17;
      row.forEach((cell, ci) => {
        const isLast = ci === row.length - 1;
        const tx = isLast ? 14 + suppColW.slice(0, ci + 1).reduce((a, b) => a + b, 0) - 3 : scx2;
        doc.text(String(cell), tx, y + 5, { align: isLast ? 'right' : 'left' });
        scx2 += suppColW[ci];
      });
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(14, y + suppRowH, 14 + W - 28, y + suppRowH);
      y += suppRowH;
    });
  }

  drawFooter(doc);
  addConditionsPage(doc, clientNom, factureNum);
  return { buffer: Buffer.from(doc.output('arraybuffer')), factureNum };
}

function buildBilletFacturePdf({ billet }) {
  const montantTotal = Number(billet.prix || 0);
  const totalPaye = (billet.paiements || []).reduce((s, p) => s + parseMontant(p.montant), 0);
  const reste = montantTotal - totalPaye;
  const factureNum = `FAC-BIL-${billet.numeroBillet || billet._id.toString().slice(-6)}`;
  const dateStr = fmtDate(new Date());
  const c = billet.clientId || {};
  const clientNom = `${c.nom || ''} ${c.prenom || ''}`.trim() || '—';

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = drawHeader(doc, factureNum, dateStr);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...GREEN);
  doc.text('FACTURE', W / 2, y + 6, { align: 'center' });
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.5);
  doc.line(60, y + 9, W - 60, y + 9);
  y += 16;
  const blockW = (W - 34) / 2;
  const block1X = 14;
  const block2X = 14 + blockW + 6;
  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(block1X, y, blockW, 38, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...GREEN);
  doc.text('CLIENT', block1X + 4, y + 6);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(block1X + 4, y + 7.5, block1X + 22, y + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  let cy = y + 13;
  doc.text(`Nom : ${c.nom || '—'}`, block1X + 4, cy); cy += 5;
  doc.text(`Prénom : ${c.prenom || '—'}`, block1X + 4, cy); cy += 5;
  doc.text(`Tél : ${c.telephone || '—'}`, block1X + 4, cy); cy += 5;
  doc.text(`Passeport : ${c.numeroPasseport || '—'}`, block1X + 4, cy);
  doc.setFillColor(...GRAY_LIGHT);
  doc.rect(block2X, y, blockW, 38, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...GREEN);
  doc.text('BILLET', block2X + 4, y + 6);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(block2X + 4, y + 7.5, block2X + 22, y + 7.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  let vy = y + 13;
  doc.text(`N° : ${billet.numeroBillet || '—'}`, block2X + 4, vy); vy += 5;
  doc.text(`Compagnie : ${billet.compagnie || '—'}`, block2X + 4, vy); vy += 5;
  doc.text(`Départ : ${fmtDate(billet.dateDepart)}`, block2X + 4, vy); vy += 5;
  doc.text(`Destination : ${billet.destination || '—'}`, block2X + 4, vy);
  y += 44;

  const rows = (billet.paiements || []).map((p, i) => [
    String(i + 1),
    fmtDate(p.dateReglement),
    p.mode || '—',
    p.reference || '—',
    fmtMoney(parseMontant(p.montant)),
  ]);
  if (!rows.length) rows.push(['—', '—', '—', '—', '0 FCFA']);
  y = drawPaymentsTable(doc, y, rows);
  y += 10;
  drawTotals(doc, y, montantTotal, totalPaye, reste);
  drawFooter(doc);
  addConditionsPage(doc, clientNom, factureNum);
  return { buffer: Buffer.from(doc.output('arraybuffer')), factureNum };
}

module.exports = {
  buildReservationFacturePdf,
  buildBilletFacturePdf,
};
