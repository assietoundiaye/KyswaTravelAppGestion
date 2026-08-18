/**
 * Routes de gestion du cache
 */

const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const { protect, requireRole } = require('../middleware/auth');

// Protection: Administrateurs seulement
router.use(protect);
router.use(requireRole('administrateur', 'dg'));

/**
 * @swagger
 * /api/cache/stats:
 *   get:
 *     summary: Obtenir les statistiques du cache Redis
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Statistiques du cache
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available:
 *                   type: boolean
 *                 connected:
 *                   type: boolean
 *                 keys:
 *                   type: number
 *                 memory:
 *                   type: string
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    return res.json(stats);
  } catch (err) {
    console.error('Erreur récupération stats cache:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/cache/flush:
 *   delete:
 *     summary: Vider tout le cache Redis
 *     tags: [Cache]
 *     responses:
 *       200:
 *         description: Cache vidé avec succès
 *       500:
 *         description: Erreur serveur
 */
router.delete('/flush', async (req, res) => {
  try {
    const success = await cacheService.flush();
    
    if (success) {
      return res.json({ message: 'Cache vidé avec succès' });
    } else {
      return res.status(500).json({ message: 'Impossible de vider le cache' });
    }
  } catch (err) {
    console.error('Erreur vidage cache:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

/**
 * @swagger
 * /api/cache/invalidate/{pattern}:
 *   delete:
 *     summary: Invalider les clés correspondant à un pattern
 *     tags: [Cache]
 *     parameters:
 *       - in: path
 *         name: pattern
 *         required: true
 *         schema:
 *           type: string
 *         description: Pattern de clés à invalider (ex stats, reservations)
 *     responses:
 *       200:
 *         description: Clés invalidées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deletedKeys:
 *                   type: number
 */
router.delete('/invalidate/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    
    // Sécurité : limiter aux patterns autorisés
    const allowedPatterns = ['stats', 'reservations', 'clients', 'packages', 'paiements', 'reports'];
    if (!allowedPatterns.includes(pattern)) {
      return res.status(400).json({ message: 'Pattern non autorisé' });
    }

    const fullPattern = `${pattern}:*`;
    const deletedKeys = await cacheService.delPattern(fullPattern);
    
    return res.json({
      message: `Pattern ${pattern} invalidé`,
      deletedKeys,
    });
  } catch (err) {
    console.error('Erreur invalidation cache:', err);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;