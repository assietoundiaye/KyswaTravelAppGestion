/**
 * Service Cache
 * Gestion du cache Redis avec fallback gracieux
 */

const { getRedisClient, isRedisAvailable } = require('../config/redis');

/**
 * Durées de cache par défaut (en secondes)
 */
const CACHE_DURATIONS = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 heure
  VERY_LONG: 86400, // 24 heures
};

/**
 * Préfixes pour les clés de cache
 */
const CACHE_PREFIXES = {
  STATS: 'stats:',
  RESERVATIONS: 'reservations:',
  CLIENTS: 'clients:',
  PACKAGES: 'packages:',
  PAIEMENTS: 'paiements:',
  REPORTS: 'reports:',
};

/**
 * Obtenir une valeur du cache
 * @param {string} key - Clé du cache
 * @returns {Promise<any|null>} - Valeur ou null si non trouvée
 */
async function get(key) {
  try {
    if (!(await isRedisAvailable())) {
      return null;
    }

    const client = getRedisClient();
    const value = await client.get(key);
    
    if (value) {
      return JSON.parse(value);
    }
    
    return null;
  } catch (err) {
    console.error('Erreur cache GET:', err.message);
    return null;
  }
}

/**
 * Définir une valeur dans le cache
 * @param {string} key - Clé du cache
 * @param {any} value - Valeur à cacher
 * @param {number} ttl - Durée de vie en secondes (optionnel)
 * @returns {Promise<boolean>} - Succès de l'opération
 */
async function set(key, value, ttl = CACHE_DURATIONS.MEDIUM) {
  try {
    if (!(await isRedisAvailable())) {
      return false;
    }

    const client = getRedisClient();
    const serializedValue = JSON.stringify(value);
    
    if (ttl > 0) {
      await client.setex(key, ttl, serializedValue);
    } else {
      await client.set(key, serializedValue);
    }
    
    return true;
  } catch (err) {
    console.error('Erreur cache SET:', err.message);
    return false;
  }
}

/**
 * Supprimer une ou plusieurs clés du cache
 * @param {string|string[]} keys - Clé(s) à supprimer
 * @returns {Promise<number>} - Nombre de clés supprimées
 */
async function del(keys) {
  try {
    if (!(await isRedisAvailable())) {
      return 0;
    }

    const client = getRedisClient();
    const keysArray = Array.isArray(keys) ? keys : [keys];
    
    return await client.del(...keysArray);
  } catch (err) {
    console.error('Erreur cache DEL:', err.message);
    return 0;
  }
}

/**
 * Supprimer toutes les clés correspondant à un pattern
 * @param {string} pattern - Pattern de clés (ex: "stats:*")
 * @returns {Promise<number>} - Nombre de clés supprimées
 */
async function delPattern(pattern) {
  try {
    if (!(await isRedisAvailable())) {
      return 0;
    }

    const client = getRedisClient();
    const keys = await client.keys(pattern);
    
    if (keys.length > 0) {
      return await client.del(...keys);
    }
    
    return 0;
  } catch (err) {
    console.error('Erreur cache DEL_PATTERN:', err.message);
    return 0;
  }
}

/**
 * Vérifier si une clé existe dans le cache
 * @param {string} key - Clé à vérifier
 * @returns {Promise<boolean>} - Existence de la clé
 */
async function exists(key) {
  try {
    if (!(await isRedisAvailable())) {
      return false;
    }

    const client = getRedisClient();
    const result = await client.exists(key);
    
    return result === 1;
  } catch (err) {
    console.error('Erreur cache EXISTS:', err.message);
    return false;
  }
}

/**
 * Obtenir ou définir une valeur (pattern cache-aside)
 * @param {string} key - Clé du cache
 * @param {Function} fetchFunction - Fonction pour récupérer la valeur si pas en cache
 * @param {number} ttl - Durée de vie en secondes
 * @returns {Promise<any>} - Valeur (du cache ou fraîche)
 */
async function getOrSet(key, fetchFunction, ttl = CACHE_DURATIONS.MEDIUM) {
  try {
    // Essayer de récupérer du cache
    let value = await get(key);
    
    if (value !== null) {
      return value;
    }

    // Si pas en cache, récupérer la valeur fraîche
    value = await fetchFunction();
    
    // Mettre en cache pour la prochaine fois
    await set(key, value, ttl);
    
    return value;
  } catch (err) {
    console.error('Erreur cache GET_OR_SET:', err.message);
    // En cas d'erreur, exécuter quand même la fonction
    return await fetchFunction();
  }
}

/**
 * Incrémenter une valeur numérique
 * @param {string} key - Clé du cache
 * @param {number} increment - Valeur à ajouter (défaut: 1)
 * @returns {Promise<number>} - Nouvelle valeur
 */
async function incr(key, increment = 1) {
  try {
    if (!(await isRedisAvailable())) {
      return increment;
    }

    const client = getRedisClient();
    
    if (increment === 1) {
      return await client.incr(key);
    } else {
      return await client.incrby(key, increment);
    }
  } catch (err) {
    console.error('Erreur cache INCR:', err.message);
    return increment;
  }
}

/**
 * Définir une expiration sur une clé existante
 * @param {string} key - Clé du cache
 * @param {number} ttl - Durée de vie en secondes
 * @returns {Promise<boolean>} - Succès de l'opération
 */
async function expire(key, ttl) {
  try {
    if (!(await isRedisAvailable())) {
      return false;
    }

    const client = getRedisClient();
    const result = await client.expire(key, ttl);
    
    return result === 1;
  } catch (err) {
    console.error('Erreur cache EXPIRE:', err.message);
    return false;
  }
}

/**
 * Obtenir des informations sur le cache
 * @returns {Promise<Object>} - Statistiques du cache
 */
async function getStats() {
  try {
    if (!(await isRedisAvailable())) {
      return {
        available: false,
        connected: false,
      };
    }

    const client = getRedisClient();
    const info = await client.info('memory');
    const dbsize = await client.dbsize();
    
    return {
      available: true,
      connected: true,
      keys: dbsize,
      memory: info,
    };
  } catch (err) {
    console.error('Erreur cache STATS:', err.message);
    return {
      available: false,
      connected: false,
      error: err.message,
    };
  }
}

/**
 * Vider tout le cache
 * @returns {Promise<boolean>} - Succès de l'opération
 */
async function flush() {
  try {
    if (!(await isRedisAvailable())) {
      return false;
    }

    const client = getRedisClient();
    await client.flushdb();
    
    return true;
  } catch (err) {
    console.error('Erreur cache FLUSH:', err.message);
    return false;
  }
}

module.exports = {
  // Opérations de base
  get,
  set,
  del,
  delPattern,
  exists,
  getOrSet,
  incr,
  expire,
  
  // Utilitaires
  getStats,
  flush,
  
  // Constantes
  CACHE_DURATIONS,
  CACHE_PREFIXES,
};