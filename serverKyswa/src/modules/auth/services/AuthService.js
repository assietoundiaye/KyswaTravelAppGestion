/**
 * @fileoverview Service d'authentification (Supabase & JWT Backend)
 */

const bcrypt = require('bcryptjs');
const {
  AuthenticationException,
  ConflictException,
  NotFoundException,
} = require('../../../shared/exceptions');

class AuthService {
  constructor(authRepository, jwtUtil) {
    this.authRepository = authRepository;
    this.jwtUtil = jwtUtil;
  }

  /**
   * Connexion par Email ou Téléphone + Mot de passe
   * Vérifie le hash bcrypt dans auth.users et le profil dans profiles
   */
  async login(emailOrTelephone, password) {
    // 1. Rechercher par email puis téléphone
    let authData = await this.authRepository.findAuthUserByEmail(emailOrTelephone);
    if (!authData) {
      authData = await this.authRepository.findAuthUserByTelephone(emailOrTelephone);
    }

    if (!authData || !authData.profile || !authData.authUser) {
      throw new AuthenticationException('Email/Téléphone ou mot de passe incorrect');
    }

    const { profile, authUser } = authData;

    // 2. Vérifier si le compte est actif
    if (profile.actif === false) {
      throw new AuthenticationException('Ce compte est désactivé');
    }

    // 3. Vérifier le mot de passe hashé (auth.users.encrypted_password)
    const hash = authUser.encrypted_password;
    if (!hash) {
      throw new AuthenticationException('Mot de passe non configuré pour ce compte');
    }

    const isPasswordValid = await bcrypt.compare(password, hash);
    if (!isPasswordValid) {
      throw new AuthenticationException('Email/Téléphone ou mot de passe incorrect');
    }

    // 4. Générer les tokens JWT
    const accessToken = this.jwtUtil.generateToken({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      nom: profile.nom,
      prenom: profile.prenom,
    });

    const refreshToken = this.jwtUtil.generateRefreshToken({
      id: profile.id,
    });

    return {
      accessToken,
      token: accessToken,
      refreshToken,
      user: profile,
    };
  }

  /**
   * Récupérer le profil par ID
   */
  async getProfile(userId) {
    const profile = await this.authRepository.findProfileById(userId);
    if (!profile) {
      throw new NotFoundException('Profil non trouvé');
    }
    return profile;
  }

  /**
   * Mettre à jour les préférences utilisateur
   */
  async updatePreferences(userId, preferences) {
    const profile = await this.authRepository.findProfileById(userId);
    if (!profile) {
      throw new NotFoundException('Profil non trouvé');
    }
    return await this.authRepository.updatePreferences(userId, preferences);
  }

  /**
   * Renouveler le token via un refreshToken
   */
  async refreshToken(refreshToken) {
    const decoded = this.jwtUtil.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AuthenticationException('Token invalide ou expiré');
    }

    const profile = await this.authRepository.findProfileById(decoded.id);
    if (!profile || profile.actif === false) {
      throw new AuthenticationException('Utilisateur non trouvé ou inactif');
    }

    const accessToken = this.jwtUtil.generateToken({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      nom: profile.nom,
      prenom: profile.prenom,
    });

    return {
      accessToken,
      token: accessToken,
      user: profile,
    };
  }

  /**
   * Vérifier si un email existe déjà
   */
  async emailExists(email) {
    return await this.authRepository.emailExists(email);
  }

  /**
   * Obtenir tous les agents actifs
   */
  async getAllAgents() {
    return await this.authRepository.getAllAgents();
  }
}

module.exports = AuthService;
