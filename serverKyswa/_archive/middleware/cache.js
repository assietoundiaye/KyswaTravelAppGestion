/**
 * Middleware de cache pour les routes
 */

const cacheService = require('../services/cacheService');

/**
 * Middleware de cache pour les réponses GET
 * @param {number} ttl - Durée de vie du cache en secondes
 * @param {string} keyPrefix - Préfixe pour la clé de cache
 * @param {Function} keyGenerator - Fonction pour générer la clé (optionnel)
 * @returns {Function} - Middleware Express
 */
function cacheMiddleware(ttl = cacheService.CACHE_DURATIONS.MEDIUM, keyPrefix = '', keyGenerator = null) {
  return async (req, res, next) => {
    // Ne cacher que les requêtes GET
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Générer la clé de cache
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === 'function') {
        cacheKey = keyGenerator(req);
      } else {
        // Clé par défaut basée sur l'URL et les paramètres
        const baseKey = `${keyPrefix}${req.originalUrl}`;
        const queryString = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : '';
        cacheKey = `${baseKey}:${Buffer.from(queryString).toString('base64')}`;
      }

      // Essayer de récupérer du cache
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData) {
        // Ajouter un header pour indiquer que c'est du cache
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Si pas en cache, intercepter la réponse
      const originalJson = res.json;
      res.json = function(data) {
        // Mettre en cache seulement si la réponse est un succès
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, data, ttl).catch(err => {
            console.error('Erreur mise en cache:', err.message);
          });
        }
        
        // Ajouter des headers de cache
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        
        // Appeler la méthode json originale
        return originalJson.call(this, data);
      };

      next();
    } catch (err) {
      console.error('Erreur middleware cache:', err.message);
      next();
    }
  };
}

/**
 * Middleware pour invalider le cache après une modification
 * @param {string|string[]} patterns - Pattern(s) de clés à invalider
 * @returns {Function} - Middleware Express
 */
function invalidateCacheMiddleware(patterns) {
  return async (req, res, next) => {
    // Intercepter la réponse pour invalider après succès
    const originalJson = res.json;
    res.json = function(data) {
      // Invalider seulement si la réponse est un succès
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
        
        patternsArray.forEach(pattern => {
          cacheService.delPattern(pattern).catch(err => {
            console.error('Erreur invalidation cache:', err.message);
          });
        });
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Middleware de cache spécialisé pour les statistiques
 */
const cacheStats = cacheMiddleware(
  cacheService.CACHE_DURATIONS.SHORT,
  cacheService.CACHE_PREFIXES.STATS
);

/**
 * Middleware de cache spécialisé pour les listes de réservations
 */
const cacheReservations = cacheMiddleware(
  cacheService.CACHE_DURATIONS.MEDIUM,
  cacheService.CACHE_PREFIXES.RESERVATIONS
);

/**
 * Middleware de cache spécialisé pour les listes de clients
 */
const cacheClients = cacheMiddleware(
  cacheService.CACHE_DURATIONS.LONG,
  cacheService.CACHE_PREFIXES.CLIENTS
);

/**
 * Middleware de cache spécialisé pour les packages
 */
const cachePackages = cacheMiddleware(
  cacheService.CACHE_DURATIONS.LONG,
  cacheService.CACHE_PREFIXES.PACKAGES
);

/**
 * Middleware de cache spécialisé pour les rapports
 */
const cacheReports = cacheMiddleware(
  cacheService.CACHE_DURATIONS.VERY_LONG,
  cacheService.CACHE_PREFIXES.REPORTS
);

/**
 * Middlewares d'invalidation pour les modifications
 */
const invalidateReservations = invalidateCacheMiddleware([
  `${cacheService.CACHE_PREFIXES.RESERVATIONS}*`,
  `${cacheService.CACHE_PREFIXES.STATS}*`,
]);

const invalidateClients = invalidateCacheMiddleware([
  `${cacheService.CACHE_PREFIXES.CLIENTS}*`,
  `${cacheService.CACHE_PREFIXES.STATS}*`,
]);

const invalidatePackages = invalidateCacheMiddleware([
  `${cacheService.CACHE_PREFIXES.PACKAGES}*`,
  `${cacheService.CACHE_PREFIXES.STATS}*`,
]);

const invalidatePaiements = invalidateCacheMiddleware([
  `${cacheService.CACHE_PREFIXES.PAIEMENTS}*`,
  `${cacheService.CACHE_PREFIXES.RESERVATIONS}*`,
  `${cacheService.CACHE_PREFIXES.STATS}*`,
]);

module.exports = {
  // Middleware générique
  cacheMiddleware,
  invalidateCacheMiddleware,
  
  // Middlewares spécialisés pour le cache
  cacheStats,
  cacheReservations,
  cacheClients,
  cachePackages,
  cacheReports,
  
  // Middlewares d'invalidation
  invalidateReservations,
  invalidateClients,
  invalidatePackages,
  invalidatePaiements,
};