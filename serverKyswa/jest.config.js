/**
 * Configuration Jest pour les tests unitaires avec PostgreSQL/Prisma.
 * Mis à jour pour utiliser PostgreSQL au lieu de MongoDB.
 */
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  testMatch: ['**/__tests__/**/*.test.js'],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup-postgresql.js'], // ← Changé pour PostgreSQL
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },
};
