/**
 * Service Authentification
 * Contient toute la logique métier liée à l'authentification et la gestion des utilisateurs.
 * Version PostgreSQL avec Prisma
 */

const bcrypt = require('bcryptjs');
const prismaService = require('./prismaService');
const { generateToken, generateRefreshToken, verifyToken } = require('../utils/jwt');

/**
 * Enregistrer un nouvel utilisateur
 * @param {Object} userData - Données de l'utilisateur
 * @returns {Promise<Object>} - Token et informations utilisateur
 */
async function register({ nom, prenom, email, telephone, password, role }) {
  // Validation des types
  if (typeof email !== 'string' || typeof password !== 'string' || !nom || !prenom || !role) {
    const err = new Error('Champs requis manquants ou format invalide');
    err.status = 400;
    throw err;
  }

  // Validation du rôle
  const rolesAutorises = ['dg', 'administrateur', 'comptable', 'oumra', 'commercial', 'secretaire', 'billets', 'ziara', 'social'];
  if (!rolesAutorises.includes(role)) {
    const err = new Error('Rôle non autorisé');
    err.status = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase();

  // Vérifier si l'email existe déjà
  const utilisateurExistant = await prismaService.findFirst('profiles', {
    where: { email: normalizedEmail }
  });
  if (utilisateurExistant) {
    const err = new Error('Cet email est déjà utilisé');
    err.status = 400;
    throw err;
  }

  // Vérifier si le téléphone existe déjà
  if (telephone) {
    const utilisateurTelephone = await prismaService.findFirst('profiles', {
      where: { telephone }
    });
    if (utilisateurTelephone) {
      const err = new Error('Ce numéro de téléphone est déjà utilisé');
      err.status = 400;
      throw err;
    }
  }

  // Hacher le mot de passe
  const hashedPassword = await bcrypt.hash(password, 12);

  // Générer un id commun pour `profiles` et la relation `users` (la table profiles référence users.id)
  const { randomUUID } = require('crypto');
  const newId = randomUUID();

  // Créer l'utilisateur (création imbriquée de `users` pour satisfaire la contrainte de relation)
    let utilisateur;
    try {
      utilisateur = await prismaService.create('profiles', {
        nom,
        prenom,
        email: normalizedEmail,
        telephone,
        poste: role || '',
        role,
        actif: true,
        created_at: new Date(),
        users: {
          create: {
            id: newId,
            email: normalizedEmail,
            phone: telephone || null,
            encrypted_password: hashedPassword,
          }
        }
      });
    } catch (e) {
      if (e?.code === 'P2002' && e.message && e.message.includes('email')) {
        const err = new Error('Cet email est déjà utilisé');
        err.status = 400;
        throw err;
      }
      throw e;
    }

  // Générer le token
  const token = generateToken({ id: utilisateur.id });

  return {
    token,
    user: {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email,
      role: utilisateur.role,
    },
  };
}

/**
 * Authentifier un utilisateur
 * @param {Object} credentials - Email/téléphone et mot de passe
 * @returns {Promise<Object>} - Tokens et informations utilisateur
 */
async function login({ email, telephone, password }) {
  // Validation
  if ((!email && !telephone) || !password) {
    const err = new Error('Identifiants et mot de passe requis');
    err.status = 400;
    throw err;
  }

  let utilisateur;

  // Rechercher par email ou téléphone
  if (email && typeof email === 'string') {
    utilisateur = await prismaService.findFirst('profiles', {
      where: { email: email.toLowerCase() }
    });
  } else if (telephone) {
    utilisateur = await prismaService.findFirst('profiles', {
      where: { telephone }
    });
  }

  if (!utilisateur) {
    const err = new Error('Identifiants incorrects');
    err.status = 401;
    throw err;
  }

  // Vérifier le mot de passe
    const userAuth = utilisateur.users || (await prismaService.findFirst('users', { where: { id: utilisateur.id } }));
    const passwordValide = await bcrypt.compare(password, userAuth.encrypted_password || '');
  if (!passwordValide) {
    const err = new Error('Identifiants incorrects');
    err.status = 401;
    throw err;
  }

  // Vérifier que le compte est actif
  if (!utilisateur.actif) {
    const err = new Error('Compte désactivé. Contactez l\'administrateur.');
    err.status = 403;
    throw err;
  }

  // Mettre à jour la date de dernière connexion
    try {
      await prismaService.update('users', { id: utilisateur.id }, { updated_at: new Date() });
    } catch (e) {
      // ignore si la mise à jour échoue
    }

  // Générer les tokens
  const token = generateToken({ id: utilisateur.id });
  const refreshToken = generateRefreshToken({ id: utilisateur.id });

  // Enregistrer dans l'audit (si la table existe)
  try {
    await prismaService.create('audit_logs', {
      user_id: utilisateur.id,
      user_nom: `${utilisateur.prenom} ${utilisateur.nom}`,
      user_role: utilisateur.role,
      action: 'CONNEXION',
      module: 'AUTH',
      details: {
        event: 'SIGNED_IN',
        role: utilisateur.role,
        timestamp: new Date()
      }
    });
  } catch (auditError) {
    // Ne pas faire échouer la connexion si l'audit échoue
    console.warn('Erreur audit login:', auditError.message);
  }

  return {
    token,
    refreshToken,
    user: {
      id: utilisateur.id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      email: utilisateur.email,
      telephone: utilisateur.telephone,
      role: utilisateur.role,
    },
  };
}

/**
 * Renouveler l'access token avec un refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} - Nouveau access token
 */
async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    const err = new Error('Refresh token manquant');
    err.status = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (err) {
    const error = new Error('Refresh token invalide ou expiré');
    error.status = 401;
    throw error;
  }

  // Vérifier que l'utilisateur existe et est actif
  const user = await prismaService.findFirst('profiles', {
    where: { id: decoded.id }
  });

  if (!user || !user.actif) {
    const err = new Error('Compte désactivé ou introuvable');
    err.status = 401;
    throw err;
  }

  // Générer un nouveau token
  const newToken = generateToken({ id: user.id });

  return { token: newToken };
}

module.exports = {
  register,
  login,
  refreshAccessToken,
};
