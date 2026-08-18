/**
 * @fileoverview Contrôleur d'authentification
 */

const { ValidationException } = require('../../../shared/exceptions');

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  /**
   * Connexion
   * POST /api/auth/login
   * Body: { email, password } OU { emailOrTelephone, password }
   */
  async login(req, res, next) {
    try {
      const emailOrTelephone = req.body.email || req.body.emailOrTelephone || req.body.telephone;
      const password = req.body.password;

      // Validation
      if (!emailOrTelephone || !password) {
        throw new ValidationException('Email/Téléphone et mot de passe requis');
      }

      const result = await this.authService.login(emailOrTelephone, password);

      // Cookie refreshToken
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      // Format hybride compatible frontend legacy et nouveau
      res.status(200).json({
        success: true,
        token: result.accessToken,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
        data: {
          token: result.accessToken,
          accessToken: result.accessToken,
          user: result.user,
        },
        message: 'Connecté avec succès',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Renouveler le token
   * POST /api/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        throw new ValidationException('Refresh token requis');
      }

      const result = await this.authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        token: result.accessToken,
        accessToken: result.accessToken,
        user: result.user,
        data: {
          token: result.accessToken,
          accessToken: result.accessToken,
          user: result.user,
        },
        message: 'Token renouvelé',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir le profil de l'utilisateur connecté
   * GET /api/auth/me
   */
  async me(req, res, next) {
    try {
      const userId = req.user.id;
      const profile = await this.authService.getProfile(userId);
      res.status(200).json({
        success: true,
        data: profile,
        user: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Déconnexion
   * POST /api/auth/logout
   */
  logout(req, res) {
    res.clearCookie('refreshToken');
    res.status(200).json({
      success: true,
      message: 'Déconnecté avec succès',
    });
  }
}

module.exports = AuthController;
