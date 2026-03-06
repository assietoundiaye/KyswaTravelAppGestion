const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'http://localhost:3000/api';

let token = '';
let userId = '';
let clientId = '';
let documentId = '';

// Create a test image file in memory as Buffer
const createTestImage = () => {
  // Simple 1x1 red pixel PNG
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x85, 0x1E, 0xFB, 0xBE, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
  ]);
};

async function runTests() {
  console.log('🔍 Test des routes document\n');

  try {
    // 1. Register and authenticate
    console.log('1️⃣  Enregistrement et authentification...');
    const authRes = await axios.post(`${API_URL}/auth/register`, {
      email: `test-doc-${Date.now()}@test.com`,
      password: 'Test1234!@',
      nom: 'Test',
      prenom: 'Document',
      role: 'COMMERCIAL',
    });
    token = authRes.data.token;
    userId = authRes.data.user._id;
    console.log(`✅ Token obtenu, userId: ${userId}\n`);

    // 2. Create a test client
    console.log('2️⃣  Création d\'un client de test...');
    const clientRes = await axios.post(
      `${API_URL}/clients`,
      {
        nomComplet: 'Client Test Documents',
        email: `client-doc-${Date.now()}@test.com`,
        telephone: '+221775555555',
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    clientId = clientRes.data.data._id;
    console.log(`✅ Client créé: ${clientId}\n`);

    // 3. Upload a document
    console.log('3️⃣  Upload d\'un document...');
    const form = new FormData();
    form.append('file', createTestImage(), 'test-document.png');
    form.append('type', 'PASSEPORT');
    form.append('clientId', clientId);

    const uploadRes = await axios.post(`${API_URL}/documents/upload`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${token}`,
      },
    });

    if (uploadRes.status === 201) {
      documentId = uploadRes.data.data._id;
      console.log(`✅ Document uploadé: ${uploadRes.data.message}`);
      console.log(`   ID: ${documentId}`);
      console.log(`   Chemin: ${uploadRes.data.data.cheminFichier.substring(0, 50)}...\n`);
    } else {
      console.log(`❌ Erreur upload: ${uploadRes.status}\n`);
      return;
    }

    // 4. List documents
    console.log('4️⃣  Récupération de la liste des documents...');
    const listRes = await axios.get(`${API_URL}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ ${listRes.data.count} document(s) trouvé(s)\n`);

    // 5. List documents filtered by clientId
    console.log('5️⃣  Récupération des documents du client...');
    const filterRes = await axios.get(`${API_URL}/documents?clientId=${clientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ ${filterRes.data.count} document(s) pour ce client\n`);

    // 6. Get document details
    console.log('6️⃣  Récupération des détails du document...');
    const detailRes = await axios.get(`${API_URL}/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ Document récupéré:`);
    console.log(`   Type: ${detailRes.data.data.type}`);
    console.log(`   Statut: ${detailRes.data.data.statut}\n`);

    // 7. Update document (validate it)
    console.log('7️⃣  Validation du document...');
    const updateRes = await axios.patch(
      `${API_URL}/documents/${documentId}`,
      { statut: 'VALIDE' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`✅ ${updateRes.data.message}`);
    console.log(`   Nouveau statut: ${updateRes.data.data.statut}\n`);

    // 8. Update document type
    console.log('8️⃣  Changement du type de document...');
    const typeRes = await axios.patch(
      `${API_URL}/documents/${documentId}`,
      { type: 'CERTIFICAT' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`✅ Type mis à jour: ${typeRes.data.data.type}\n`);

    // 9. Delete document
    console.log('9️⃣  Suppression du document...');
    const deleteRes = await axios.delete(`${API_URL}/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`✅ ${deleteRes.data.message}\n`);

    // 10. Verify deletion
    console.log('🔟 Vérification de la suppression...');
    try {
      await axios.get(`${API_URL}/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`❌ Le document devrait être supprimé\n`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`✅ Document confirmé supprimé\n`);
      }
    }

    console.log('✅ Tous les tests réussis !');
  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Wait a moment for server to be ready, then run tests
setTimeout(runTests, 2000);
