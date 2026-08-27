require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const Utilisateur = require('../models/Utilisateur');

const MONGO_URI = process.env.MONGO_URI;

function askQuestion(rl, query) {
  return new Promise((resolve) => rl.question(query, (ans) => resolve(ans.trim())));
}

async function createAdmin() {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI non défini dans .env');
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log('--- 👤 Création d\'un compte utilisateur Kyswa Travel ---');
    
    const prenom = await askQuestion(rl, 'Prénom : ');
    if (!prenom) throw new Error('Le prénom est requis');

    const nom = await askQuestion(rl, 'Nom : ');
    if (!nom) throw new Error('Le nom est requis');

    const email = await askQuestion(rl, 'Email : ');
    if (!email) throw new Error('L\'email est requis');

    const password = await askQuestion(rl, 'Mot de passe : ');
    if (!password) throw new Error('Le mot de passe est requis');

    console.log('Rôles valides : dg, administrateur, comptable, oumra, commercial, secretaire, billets, ziara, social');
    let role = await askQuestion(rl, 'Rôle (défaut: dg) : ');
    if (!role) role = 'dg';

    const validRoles = ['dg', 'administrateur', 'comptable', 'oumra', 'commercial', 'secretaire', 'billets', 'ziara', 'social'];
    if (!validRoles.includes(role)) {
      throw new Error(`Rôle invalide: ${role}. Les rôles valides sont: ${validRoles.join(', ')}`);
    }

    rl.close();

    console.log('⏳ Connexion à MongoDB...');
    await mongoose.connect(MONGO_URI, { family: 4 });
    console.log('✅ Connecté à MongoDB');

    const existing = await Utilisateur.findOne({ email: email.toLowerCase() });
    if (existing) {
      console.log('⚠️ Un compte avec cet email existe déjà (Rôle :', existing.role + ')');
      await mongoose.disconnect();
      return;
    }

    const admin = new Utilisateur({
      nom,
      prenom,
      email,
      password,
      role,
      etat: 'ACTIF',
    });

    await admin.save();
    console.log('✅ Compte créé avec succès !');
    console.log('   Prénom   :', admin.prenom);
    console.log('   Nom      :', admin.nom);
    console.log('   Email    :', admin.email);
    console.log('   Rôle     :', admin.role);

  } catch (err) {
    console.error('❌ Erreur :', err.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

createAdmin();
