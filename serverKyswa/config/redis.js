/**
 * Configuration Redis pour le cache
 */

const Redis = require('ioredis');

let redisClient = null;
let redisAvailable = false;
let devWarningShown = false;

/**
 * Initialiser la connexion Redis
 */
function initRedis() {
  // Permettre de désactiver Redis complètement
  if (process.env.DISABLE_REDIS === 'true') {
    console.log('⚠️  Redis désactivé via DISABLE_REDIS=true');
    return null;
  }

  if (redisClient) return redisClient;

  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 5000,
    // Réduire les tentatives de reconnexion en dev
    retryDelayOnClusterDown: process.env.NODE_ENV === 'development' ? 1000 : 300,
    maxRetriesPerRequest: process.env.NODE_ENV === 'development' ? 1 : 3,
  };

  redisClient = new Redis(redisConfig);

  redisClient.on('connect', () => {
    redisAvailable = true;
    console.log('✅ Redis connecté');
  });

  redisClient.on('ready', () => {
    redisAvailable = true;
  });

  redisClient.on('error', (err) => {
    redisAvailable = false;
    // En développement, ne logger qu'une seule fois
    if (process.env.NODE_ENV === 'development') {
      if (!devWarningShown) {
        console.log('⚠️  Redis non disponible - Fonctionnement sans cache');
        devWarningShown = true;
      }
    } else {
      console.error('❌ Erreur Redis:', err.message);
    }
  });

  redisClient.on('close', () => {
    redisAvailable = false;
    if (process.env.NODE_ENV !== 'development') {
      console.log('🔌 Connexion Redis fermée');
    }
  });

  return redisClient;
}

/**
 * Obtenir le client Redis
 */
function getRedisClient() {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Fermer la connexion Redis
 */
async function closeRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (error) {
      // Ignorer les erreurs de fermeture
    }
    redisClient = null;
    redisAvailable = false;
    if (process.env.NODE_ENV !== 'development') {
      console.log('🔌 Redis déconnecté');
    }
  }
}

/**
 * Vérifier si Redis est disponible
 */
async function isRedisAvailable() {
  if (process.env.DISABLE_REDIS === 'true') {
    return false;
  }
  
  if (!redisClient || !redisAvailable) {
    return false;
  }

  try {
    const client = getRedisClient();
    if (!client) return false;
    await client.ping();
    return true;
  } catch (err) {
    redisAvailable = false;
    return false;
  }
}

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis,
  isRedisAvailable,
};