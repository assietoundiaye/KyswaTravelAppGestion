/* Script de seed pour tests
   - Connecte mongoose
   - Crée 1 Utilisateur COMMERCIAL
   - Crée 1 Client
   - Crée 1 PackageK HAJJ
   - Crée 1 Reservation liée
   - Crée 1 Paiement
   - Affiche reste à payer et statut
*/

const mongoose = require('mongoose');
const Utilisateur = require('../models/Utilisateur');
const Client = require('../models/Client');
const PackageK = require('../models/PackageK');
const Reservation = require('../models/Reservation');
const Paiement = require('../models/Paiement');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
async function run() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/kyswa-test';

  try {
    console.log('Connexion à MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connecté à', mongoUri);

    // 1. Créer un utilisateur avec le role  COMMERCIAL
    const utilisateur = new Utilisateur({
      nom: 'Dupont',
      prenom: 'Jean',
      email: `commercial_${Date.now()}@example.com`,
      telephone: '771234567',
      password: 'password_test',
      role: 'COMMERCIAL',
    });
    await utilisateur.save();
    console.log('Utilisateur COMMERCIAL créé:', utilisateur._id.toString());

    // 2. Créer un client lié à cet utilisateur
    const client = new Client({
      numeroPasseport: `P-${Date.now()}`,
      numeroCNI: `CNI-${Date.now()}`,
      nom: 'Sarr',
      prenom: 'Aminata',
      dateNaissance: new Date('1990-01-15'),
      lieuNaissance: 'Dakar',
      telephone: '+221771234567',
      email: `client_${Date.now()}@example.com`,
      adresse: 'Quartier X, Dakar',
      creeParUtilisateurId: utilisateur._id,
    });
    await client.save();
    console.log('Client créé:', client._id.toString());

    // 3. Créer un PackageK HAJJ 
    const packageK = new PackageK({
      idPackageK: Date.now(),
      nomReference: 'HAJJ 2026 - Test',
      type: 'HAJJ',
      dateDepart: new Date('2026-06-01'),
      dateRetour: new Date('2026-06-15'),
      prixEco: mongoose.Types.Decimal128.fromString('1200.00'),
      prixCont: mongoose.Types.Decimal128.fromString('1800.00'),
      prixVip: mongoose.Types.Decimal128.fromString('2500.00'),
      quotaMax: 100,
      placesReservees: 0,
      creeParUtilisateurId: utilisateur._id,
    });
    await packageK.save();
    console.log('PackageK HAJJ créé:', packageK._id.toString());

    // 4. Créer une Reservation liée
    const reservation = new Reservation({
      idReservation: Math.floor(Date.now() / 1000),
      nombrePlaces: 1,
      formule: 'LOGEMENT_SEUL',
      niveauConfort: 'ECO',
      dateDepart: packageK.dateDepart,
      dateRetour: packageK.dateRetour,
      montantTotalDu: 1200,
      statut: 'EN_ATTENTE',
      creeParUtilisateurId: utilisateur._id,
      packageKId: packageK._id,
      clients: [client._id],
    });
    await reservation.save();
    console.log('Reservation créée:', reservation._id.toString());

    // 5. Créer un Paiement partiel
    const paiement = new Paiement({
      idPaiement: Math.floor(Date.now() / 1000) + 1,
      montant: mongoose.Types.Decimal128.fromString('300.00'),
      dateReglement: new Date(),
      mode: 'VIREMENT',
      reference: `REF-${Date.now()}`,
      creeParUtilisateurId: utilisateur._id,
    });
    await paiement.save();
    console.log('Paiement créé:', paiement._id.toString());

    // Lier le paiement à la réservation
    reservation.paiements.push(paiement._id);
    await reservation.save();

    // Recalculer reste à payer et statut
    // recharge la reservation avec paiements peuplés
    const reservationPop = await Reservation.findById(reservation._id).populate('paiements');
    const reste = await reservationPop.calculerResteAPayer();
    console.log('Reste à payer:', reste);

    // Mettre à jour le statut en fonction des paiements
    await reservationPop.mettreAJourStatutPaiement();
    console.log('Statut de la réservation après mise à jour:', reservationPop.statut);

    console.log('Seed terminé. Déconnexion...');
    await mongoose.disconnect();
    console.log('Déconnecté.');
  } catch (err) {
    console.error('Erreur lors du seed-test:', err);
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}
