const mongoose = require('mongoose');

const Utilisateur = require('../models/Utilisateur');
const Client = require('../models/Client');
const PackageK = require('../models/PackageK');
const Reservation = require('../models/Reservation');
const Paiement = require('../models/Paiement');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
// Compteurs de tests
let passed = 0;
let failed = 0;

function success(msg) { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg)    { console.log(`  ❌ ${msg}`); failed++; }
function titre(msg)   { console.log(`\n📌 ${msg}`); }

// ============================================================
// TEST 1 — Utilisateur
// ============================================================
async function testUtilisateur() {
  titre('TEST 1 : Utilisateur');
  let utilisateur = null;

  // 1a. Créer un utilisateur valide
  try {
    utilisateur = new Utilisateur({
      nom: 'Dupont',
      prenom: 'Jean',
      email: `test_user_${Date.now()}@example.com`,
      telephone: '771234567',
      password: 'password123',
      role: 'COMMERCIAL',
    });
    await utilisateur.save();
    success('Utilisateur créé avec succès');
  } catch (err) {
    fail(`Création utilisateur : ${err.message}`);
  }

  // 1b. Tester seConnecter()
  try {
    await utilisateur.seConnecter();
    if (utilisateur.dateDerniereConnexion) {
      success('seConnecter() met à jour dateDerniereConnexion');
    } else {
      fail('seConnecter() n\'a pas mis à jour dateDerniereConnexion');
    }
  } catch (err) {
    fail(`seConnecter() : ${err.message}`);
  }

  // 1c. Tester modifierProfil()
  try {
    await utilisateur.modifierProfil({ nom: 'DupontModifié', telephone: '781234567' });
    if (utilisateur.nom === 'DupontModifié' && utilisateur.telephone === '781234567') {
      success('modifierProfil() modifie bien nom et telephone');
    } else {
      fail('modifierProfil() n\'a pas modifié correctement');
    }
  } catch (err) {
    fail(`modifierProfil() : ${err.message}`);
  }

  // 1d. Tester detailsModif()
  try {
    const details = utilisateur.detailsModif({ nom: 'NouveauNom' });
    if (details.nom && details.nom.nouvelle === 'NouveauNom') {
      success('detailsModif() retourne bien les détails');
    } else {
      fail('detailsModif() ne retourne pas les bons détails');
    }
  } catch (err) {
    fail(`detailsModif() : ${err.message}`);
  }

  // 1e. Email manquant (doit échouer)
  try {
    await new Utilisateur({ nom: 'T', prenom: 'T', password: '123', role: 'ADMIN' }).save();
    fail('Utilisateur sans email a été sauvegardé');
  } catch (err) {
    success('Utilisateur sans email rejeté correctement');
  }

  // 1f. Role invalide (doit échouer)
  try {
    await new Utilisateur({
      nom: 'T', prenom: 'T',
      email: `role_inv_${Date.now()}@test.com`,
      password: '123', role: 'INVALID',
    }).save();
    fail('Role invalide a été accepté');
  } catch (err) {
    success('Role invalide rejeté correctement');
  }

  return utilisateur;
}

// ============================================================
// TEST 2 — Client
// ============================================================
async function testClient(utilisateur) {
  titre('TEST 2 : Client');
  let client = null;

  // 2a. Client valide
  try {
    client = new Client({
      numeroPasseport: `P-${Date.now()}`,
      numeroCNI: `CNI-${Date.now()}`,
      nom: 'Sarr',
      prenom: 'Aminata',
      dateNaissance: new Date('1990-01-15'),
      lieuNaissance: 'Dakar',
      telephone: '+221771234567',
      email: `client_${Date.now()}@example.com`,
      adresse: 'Quartier X, Dakar',
      creeParUtilisateurId: utilisateur?._id,
    });
    await client.save();
    success('Client créé avec succès');
  } catch (err) {
    fail(`Création client : ${err.message}`);
  }

  // 2b. Client sans nom (doit échouer)
  try {
    await new Client({ numeroPasseport: `P-${Date.now()+1}`, prenom: 'Test' }).save();
    fail('Client sans nom a été sauvegardé');
  } catch (err) {
    success('Client sans nom rejeté correctement');
  }

  // 2c. Téléphone invalide (doit échouer)
  try {
    await new Client({
      numeroPasseport: `P-${Date.now()+2}`,
      nom: 'Test', prenom: 'Test',
      telephone: '0000000000',
    }).save();
    fail('Téléphone invalide a été accepté');
  } catch (err) {
    success('Téléphone invalide rejeté correctement');
  }

  // 2d. Email invalide (doit échouer)
  try {
    await new Client({
      numeroPasseport: `P-${Date.now()+3}`,
      nom: 'Test', prenom: 'Test',
      email: 'email-invalide',
    }).save();
    fail('Email invalide a été accepté');
  } catch (err) {
    success('Email invalide rejeté correctement');
  }

  return client;
}

// ============================================================
// TEST 3 — PackageK
// ============================================================
async function testPackageK(utilisateur) {
  titre('TEST 3 : PackageK');
  let pkg = null;

  // 3a. Package valide
  try {
    pkg = new PackageK({
      idPackageK: Date.now(),
      nomReference: 'HAJJ 2026 - Test',
      type: 'HAJJ',
      dateDepart: new Date('2026-06-01'),
      dateRetour: new Date('2026-06-15'),
      prixEco: mongoose.Types.Decimal128.fromString('1200.00'),
      prixCont: mongoose.Types.Decimal128.fromString('1800.00'),
      prixVip: mongoose.Types.Decimal128.fromString('2500.00'),
      quotaMax: 100,
      placesReservees: 40,
      creeParUtilisateurId: utilisateur?._id,
    });
    await pkg.save();
    success('PackageK créé avec succès');
  } catch (err) {
    fail(`Création PackageK : ${err.message}`);
  }

  // 3b. verifierDispo() — 60 places disponibles
  if (pkg.verifierDispo(50)) {
    success('verifierDispo(50) retourne true (60 places dispo)');
  } else {
    fail('verifierDispo(50) devrait retourner true');
  }

  if (!pkg.verifierDispo(70)) {
    success('verifierDispo(70) retourne false (pas assez)');
  } else {
    fail('verifierDispo(70) devrait retourner false');
  }

  // 3c. calculerPlacesRestantes()
  const places = pkg.calculerPlacesRestantes();
  if (places === 60) {
    success(`calculerPlacesRestantes() = ${places} (correct)`);
  } else {
    fail(`calculerPlacesRestantes() = ${places}, attendu 60`);
  }

  // 3d. Type invalide (doit échouer)
  try {
    await new PackageK({
      idPackageK: Date.now()+1,
      nomReference: 'Test',
      type: 'INVALID_TYPE',
      dateDepart: new Date('2026-06-01'),
      dateRetour: new Date('2026-06-15'),
      quotaMax: 50,
    }).save();
    fail('Type invalide a été accepté');
  } catch (err) {
    success('Type invalide rejeté correctement');
  }

  return pkg;
}

// ============================================================
// TEST 4 — Reservation
// ============================================================
async function testReservation(utilisateur, client, packageK) {
  titre('TEST 4 : Reservation');

  // 4a. Réservation valide
  try {
    const res = new Reservation({
      idReservation: Math.floor(Date.now() / 1000),
      nombrePlaces: 2,
      formule: 'DEMI_PENSION',
      niveauConfort: 'CONFORT',
      dateDepart: new Date('2026-06-01'),
      dateRetour: new Date('2026-06-15'),
      montantTotalDu: 3600,
      packageKId: packageK?._id,
      clients: client ? [client._id] : [],
      creeParUtilisateurId: utilisateur?._id,
    });
    await res.save();
    success('Reservation créée avec succès');
  } catch (err) {
    fail(`Création Reservation : ${err.message}`);
  }

  // 4b. Formule invalide (doit échouer)
  try {
    await new Reservation({
      idReservation: Math.floor(Date.now() / 1000) + 1,
      nombrePlaces: 1,
      formule: 'FORMULE_INVALIDE',
      dateDepart: new Date('2026-06-01'),
      dateRetour: new Date('2026-06-15'),
      montantTotalDu: 1000,
      packageKId: packageK?._id,
    }).save();
    fail('Formule invalide a été acceptée');
  } catch (err) {
    success('Formule invalide rejetée correctement');
  }

  // 4c. nombrePlaces = 0 (doit échouer)
  try {
    await new Reservation({
      idReservation: Math.floor(Date.now() / 1000) + 2,
      nombrePlaces: 0,
      dateDepart: new Date('2026-06-01'),
      dateRetour: new Date('2026-06-15'),
      montantTotalDu: 1000,
      packageKId: packageK?._id,
    }).save();
    fail('nombrePlaces = 0 a été accepté');
  } catch (err) {
    success('nombrePlaces = 0 rejeté correctement');
  }
}

// ============================================================
// TEST 5 — Paiement
// ============================================================
async function testPaiement(utilisateur) {
  titre('TEST 5 : Paiement');

  // 5a. Paiement valide
  try {
    const paiement = new Paiement({
      idPaiement: Math.floor(Date.now() / 1000),
      montant: mongoose.Types.Decimal128.fromString('1500.00'),
      dateReglement: new Date(),
      mode: 'WAVE',
      reference: `REF-${Date.now()}`,
      creeParUtilisateurId: utilisateur?._id,
    });
    await paiement.save();
    success('Paiement créé avec succès');

    // 5b. genererFacture()
    const facture = paiement.genererFacture();
    if (facture && facture.statut === 'GENEREE' && facture.numeroPaiement === paiement.idPaiement) {
      success('genererFacture() génère une facture correcte');
    } else {
      fail('genererFacture() ne retourne pas une facture valide');
    }
  } catch (err) {
    fail(`Création Paiement : ${err.message}`);
  }

  // 5c. Mode invalide (doit échouer)
  try {
    await new Paiement({
      idPaiement: Math.floor(Date.now() / 1000) + 1,
      montant: mongoose.Types.Decimal128.fromString('100.00'),
      dateReglement: new Date(),
      mode: 'MODE_INVALIDE',
    }).save();
    fail('Mode invalide a été accepté');
  } catch (err) {
    success('Mode invalide rejeté correctement');
  }
}

// ============================================================
// TEST 6 — Reste à payer + mise à jour statut
// ============================================================
async function testCalculResteAPayer(utilisateur, client, packageK) {
  titre('TEST 6 : Reste à payer & statut automatique');

  try {
    // Réservation de 2000
    const reservation = new Reservation({
      idReservation: Math.floor(Date.now() / 1000) + 100,
      nombrePlaces: 1,
      formule: 'LOGEMENT_SEUL',
      niveauConfort: 'ECO',
      dateDepart: new Date('2026-07-01'),
      dateRetour: new Date('2026-07-10'),
      montantTotalDu: 2000,
      packageKId: packageK?._id,
      clients: client ? [client._id] : [],
      creeParUtilisateurId: utilisateur?._id,
    });
    await reservation.save();

    // Paiement partiel : 800
    const p1 = new Paiement({
      idPaiement: Math.floor(Date.now() / 1000) + 200,
      montant: mongoose.Types.Decimal128.fromString('800.00'),
      dateReglement: new Date(),
      mode: 'ESPECES',
      reference: `REF-P1-${Date.now()}`,
      creeParUtilisateurId: utilisateur?._id,
    });
    await p1.save();
    reservation.paiements.push(p1._id);
    await reservation.save();

    // Vérifier reste = 1200
    const reste1 = await reservation.calculerResteAPayer();
    if (reste1 === 1200) {
      success(`Reste après 800 payé : ${reste1} (attendu 1200)`);
    } else {
      fail(`Reste après 800 payé : ${reste1}, attendu 1200`);
    }

    // Statut doit être CONFIRMEE
    await reservation.mettreAJourStatutPaiement();
    if (reservation.statut === 'CONFIRMEE') {
      success('Statut → CONFIRMEE (paiement partiel)');
    } else {
      fail(`Statut : ${reservation.statut}, attendu CONFIRMEE`);
    }

    // Paiement solde : 1200
    const p2 = new Paiement({
      idPaiement: Math.floor(Date.now() / 1000) + 201,
      montant: mongoose.Types.Decimal128.fromString('1200.00'),
      dateReglement: new Date(),
      mode: 'CARTE_BANCAIRE',
      reference: `REF-P2-${Date.now()}`,
      creeParUtilisateurId: utilisateur?._id,
    });
    await p2.save();
    reservation.paiements.push(p2._id);
    await reservation.save();

    // Vérifier reste = 0
    const reste2 = await reservation.calculerResteAPayer();
    if (reste2 === 0) {
      success(`Reste après solde : ${reste2} (attendu 0)`);
    } else {
      fail(`Reste après solde : ${reste2}, attendu 0`);
    }

    // Statut doit être PAYEE
    await reservation.mettreAJourStatutPaiement();
    if (reservation.statut === 'PAYEE') {
      success('Statut → PAYEE (totalement payé)');
    } else {
      fail(`Statut final : ${reservation.statut}, attendu PAYEE`);
    }
  } catch (err) {
    fail(`Erreur reste à payer : ${err.message}`);
  }
}

// ============================================================
// MAIN
// ============================================================
async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/kyswa-test';

  try {
    console.log('\n🔄 Connexion à MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB');

    const utilisateur = await testUtilisateur();
    const client       = await testClient(utilisateur);
    const packageK     = await testPackageK(utilisateur);
                         await testReservation(utilisateur, client, packageK);
                         await testPaiement(utilisateur);
                         await testCalculResteAPayer(utilisateur, client, packageK);

    // ── Résumé ──
    console.log('\n' + '='.repeat(45));
    console.log(`  📊 RÉSULTAT : ${passed} passés | ${failed} échoués`);
    console.log('='.repeat(45) + '\n');

    await mongoose.disconnect();
    console.log('🔒 Déconnecté de MongoDB\n');
  } catch (err) {
    console.error('❌ Erreur fatale :', err.message);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

run();