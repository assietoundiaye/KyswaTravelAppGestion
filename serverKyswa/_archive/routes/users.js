const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prismaService = require('../services/prismaService');
const { protect, requireRole } = require('../middleware/auth');

// Protéger toutes les routes : authentification requise.
// En lecture, les rôles métier peuvent consulter les utilisateurs pour l'interface ;
// les mutations restent réservées aux administrateurs.
router.use(protect);

router.get('/', async (req, res) => {
  try {
    const utilisateurs = await prismaService.findMany('profiles', {
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        date_creation: true,
      },
      orderBy: { date_creation: 'desc' },
    });

    return res.status(200).json({
      count: utilisateurs.length,
      utilisateurs,
    });
  } catch (err) {
    console.error('Erreur récupération utilisateurs:', err);
    return res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
});

router.post('/', requireRole('administrateur'), async (req, res) => {
  try {
    const { nom, prenom, email, telephone, password, role } = req.body;

    // Validation des champs requis et des types pour éviter les crashs (CWE-1287)
    if (typeof email !== 'string' || typeof password !== 'string' || !nom || !prenom || !role) {
      return res.status(400).json({ message: 'Données invalides ou manquantes' });
    }

    const rolesAutorises = ['dg', 'administrateur', 'comptable', 'oumra', 'commercial', 'secretaire', 'billets', 'ziara', 'social'];
    if (!rolesAutorises.includes(role)) {
      return res.status(400).json({ message: 'Rôle non autorisé' });
    }

    // Normalisation sécurisée
    const normalizedEmail = email.toLowerCase();

    const utilisateurEmail = await prismaService.findFirst('profiles', {
      where: { email: normalizedEmail }
    });
    if (utilisateurEmail) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    if (telephone) {
      const utilisateurTelephone = await prismaService.findFirst('profiles', {
        where: { telephone }
      });
      if (utilisateurTelephone) {
        return res.status(400).json({ message: 'Ce numéro de téléphone est déjà utilisé' });
      }
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    const utilisateur = await prismaService.create('profiles', {
      nom,
      prenom,
      email: normalizedEmail,
      telephone,
      password_hash: hashedPassword,
      role,
      actif: true,
      date_creation: new Date(),
    });

    // Ne pas retourner le password_hash
    const { password_hash, ...utilisateurResponse } = utilisateur;

    return res.status(201).json({
      message: 'Utilisateur créé avec succès',
      utilisateur: utilisateurResponse,
    });
  } catch (err) {
    console.error('Erreur création:', err);
    return res.status(500).json({ message: 'Erreur lors de la création' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const utilisateur = await prismaService.findUnique('profiles', {
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        date_creation: true,
        date_derniere_connexion: true,
      }
    });

    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.status(200).json({ utilisateur });
  } catch (err) {
    console.error('Erreur récupération utilisateur:', err);
    return res.status(500).json({ message: 'Erreur récupération utilisateur' });
  }
});

router.patch('/:id', requireRole('administrateur'), async (req, res) => {
  try {
    const { nom, prenom, email, telephone, role } = req.body;
    const userId = parseInt(req.params.id);
    
    const utilisateur = await prismaService.findUnique('profiles', {
      where: { id: userId }
    });

    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const updateData = {};

    if (role) {
      const rolesAutorises = ['dg', 'administrateur', 'comptable', 'oumra', 'commercial', 'secretaire', 'billets', 'ziara', 'social'];
      if (!rolesAutorises.includes(role)) {
        return res.status(400).json({ message: 'Rôle invalide' });
      }
      updateData.role = role;
    }

    // Validation de type avant modification d'email (CWE-1287)
    if (email && typeof email === 'string') {
      const normalizedEmail = email.toLowerCase();
      if (normalizedEmail !== utilisateur.email) {
        const emailPris = await prismaService.findFirst('profiles', {
          where: { email: normalizedEmail, NOT: { id: userId } }
        });
        if (emailPris) return res.status(400).json({ message: 'Email déjà utilisé' });
        updateData.email = normalizedEmail;
      }
    }

    if (telephone && telephone !== utilisateur.telephone) {
      const telPris = await prismaService.findFirst('profiles', {
        where: { telephone, NOT: { id: userId } }
      });
      if (telPris) return res.status(400).json({ message: 'Téléphone déjà utilisé' });
      updateData.telephone = telephone;
    }

    if (nom) updateData.nom = nom;
    if (prenom) updateData.prenom = prenom;

    const utilisateurUpdated = await prismaService.update('profiles', 
      { id: userId }, 
      updateData
    );

    // Ne pas retourner le password_hash
    const { password_hash, ...resObj } = utilisateurUpdated;

    return res.status(200).json({ message: 'Modifié avec succès', utilisateur: resObj });
  } catch (err) {
    console.error('Erreur modification:', err);
    return res.status(500).json({ message: 'Erreur modification' });
  }
});

router.delete('/:id', requireRole('administrateur'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Sécurité : comparaison robuste des IDs
    if (req.user.id === userId) {
      return res.status(400).json({ message: 'Suppression de votre propre compte impossible' });
    }

    const utilisateur = await prismaService.delete('profiles', { id: userId });
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    return res.status(200).json({ message: 'Supprimé avec succès' });
  } catch (err) {
    console.error('Erreur suppression:', err);
    return res.status(500).json({ message: 'Erreur suppression' });
  }
});

router.patch('/:id/toggle-status', requireRole('administrateur'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (req.user.id === userId) {
      return res.status(403).json({ message: 'Modification de votre propre statut impossible' });
    }

    const utilisateur = await prismaService.findUnique('profiles', {
      where: { id: userId }
    });
    if (!utilisateur) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const nouvelEtat = !utilisateur.actif;
    await prismaService.update('profiles', 
      { id: userId }, 
      { actif: nouvelEtat }
    );

    return res.status(200).json({ 
      message: 'Statut mis à jour', 
      actif: nouvelEtat,
      etat: nouvelEtat ? 'ACTIF' : 'INACTIF'
    });
  } catch (err) {
    console.error('Erreur statut:', err);
    return res.status(500).json({ message: 'Erreur statut' });
  }
});

module.exports = router;