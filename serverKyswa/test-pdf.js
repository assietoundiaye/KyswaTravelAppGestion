const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api';

async function testPDF() {
  try {
    console.log('🔍 Test des routes de facturation PDF\n');

    // 1. Login
    console.log('1️⃣  Création d\'un utilisateur de test (role COMMERCIAL) et authentification...');
    const testEmail = `test2_commercial_${Date.now()}@example.com`;
    let token;
    try {
      const regRes = await axios.post(`${API_URL}/auth/register`, {
        nom: 'NDIAYE', prenom: 'Amy', email: testEmail, password: 'kywavoyage', role: 'COMMERCIAL'
      });
      token = regRes.data.token;
      console.log('✅ Utilisateur enregistré et token obtenu\n');
    } catch (err) {
      // si l'enregistrement échoue, tenter un login sur un compte existant
      console.log('⚠️ Enregistrement test échoué, tentative de login existant...');
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: 'gestion@kyswa.sn',
        password: 'kywavoyageassietou'
      });
      token = loginRes.data.token;
      console.log('✅ Token obtenu via login existant\n');
    }

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Get first reservation
    console.log('2️⃣  Récupération des réservations...');
    const resRes = await axios.get(`${API_URL}/reservations`, { headers });
    const reservations = resRes.data.reservations || [];
    if (reservations.length === 0) {
      console.log('❌ Aucune réservation trouvée\n');
      return;
    }
    const reservation = reservations[0];
    const resId = reservation._id;
    console.log(`✅ Réservation trouvée : ${resId}\n`);

    // 3. Get first billet
    console.log('3️⃣  Récupération des billets...');
    const billRes = await axios.get(`${API_URL}/billets`, { headers });
    const billets = billRes.data.billets || [];
    if (billets.length === 0) {
      console.log('❌ Aucun billet trouvé\n');
      return;
    }
    const billet = billets[0];
    const billId = billet._id;
    console.log(`✅ Billet trouvé : ${billId}\n`);

    // 4. Test facture réservation (solde)
    console.log('4️⃣  Génération facture réservation (solde)...');
    const pdfResSolde = await axios.get(`${API_URL}/factures/reservation/${resId}?type=solde`, {
      headers,
      responseType: 'arraybuffer'
    });
    const pdfResPath = path.join(__dirname, `test-facture-reservation-solde.pdf`);
    fs.writeFileSync(pdfResPath, pdfResSolde.data);
    console.log(`✅ PDF généré : ${pdfResPath}\n`);

    // 5. Test facture réservation (acompte)
    console.log('5️⃣  Génération facture réservation (acompte)...');
    const pdfResAcompte = await axios.get(`${API_URL}/factures/reservation/${resId}?type=acompte`, {
      headers,
      responseType: 'arraybuffer'
    });
    const pdfResAcomptePath = path.join(__dirname, `test-facture-reservation-acompte.pdf`);
    fs.writeFileSync(pdfResAcomptePath, pdfResAcompte.data);
    console.log(`✅ PDF généré : ${pdfResAcomptePath}\n`);

    // 6. Test facture billet
    console.log('6️⃣  Génération facture billet...');
    const pdfBill = await axios.get(`${API_URL}/factures/billet/${billId}`, {
      headers,
      responseType: 'arraybuffer'
    });
    const pdfBillPath = path.join(__dirname, `test-facture-billet.pdf`);
    fs.writeFileSync(pdfBillPath, pdfBill.data);
    console.log(`✅ PDF généré : ${pdfBillPath}\n`);

    console.log('✅ Tous les tests réussis !');
    console.log(`📄 Fichiers PDF générés :
  - ${pdfResPath}
  - ${pdfResAcomptePath}
  - ${pdfBillPath}`);

    process.exit(0);
  } catch (err) {
    const respData = err.response?.data;
    let out = err.message;
    if (respData) {
      try {
        if (Buffer.isBuffer(respData)) {
          const s = respData.toString();
          out = JSON.parse(s);
        } else {
          out = respData;
        }
      } catch (e) {
        out = respData.toString ? respData.toString() : String(respData);
      }
    }
    console.error('❌ Erreur:', out);
    process.exit(1);
  }
}

testPDF();
