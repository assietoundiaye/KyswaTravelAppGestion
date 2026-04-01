require('dotenv').config();
const mongoose = require('mongoose');
const Utilisateur = require('../models/Utilisateur');

const MONGO_URI = process.env.MONGO_URI;

async function createAdmin() {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI non défini dans .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI, { family: 4 });
  console.log('✅ Connecté à MongoDB');

  const existing = await Utilisateur.findOne({ email: 'admin@kyswa.sn' });
  if (existing) {
    console.log('⚠️  Un compte avec cet email existe déjà :', existing.role);
    await mongoose.disconnect();
    return;
  }

  const admin = new Utilisateur({
    nom: 'Admin',
    prenom: 'Kyswa',
    email: 'admin@kyswa.sn',
    password: 'Admin123!',
    role: 'dg',
    etat: 'ACTIF',
  });

  await admin.save();
  console.log('✅ Compte créé avec succès !');
  console.log('   Email    :', admin.email);
  console.log('   Rôle     :', admin.role);
  console.log('   Mot de passe : Admin123!');

  await mongoose.disconnect();
}

createAdmin().catch(err => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
