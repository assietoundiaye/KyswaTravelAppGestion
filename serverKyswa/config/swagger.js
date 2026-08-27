/**
 * Configuration Swagger pour la documentation API
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kyswa Travel API',
      version: '2.1.0',
      description: 'API REST pour la gestion d\'une agence de voyages religieux (Oumra, Hajj, Ziarra)',
      contact: {
        name: 'Kyswa Travel',
        email: 'contact@kyswa.sn',
      },
      license: {
        name: 'Usage interne',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Serveur de développement',
      },
      {
        url: 'https://api.kyswa.sn',
        description: 'Serveur de production',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenu via /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message d\'erreur',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID de l\'utilisateur',
            },
            nom: {
              type: 'string',
              description: 'Nom de famille',
            },
            prenom: {
              type: 'string',
              description: 'Prénom',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Adresse email',
            },
            telephone: {
              type: 'string',
              description: 'Numéro de téléphone',
            },
            role: {
              type: 'string',
              enum: ['dg', 'administrateur', 'comptable', 'oumra', 'commercial', 'secretaire', 'billets', 'ziara', 'social'],
              description: 'Rôle de l\'utilisateur',
            },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID de la réservation',
            },
            idReservation: {
              type: 'number',
              description: 'Numéro de réservation',
            },
            packageKId: {
              type: 'string',
              description: 'ID du package',
            },
            clients: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'IDs des clients',
            },
            nombrePlaces: {
              type: 'number',
              description: 'Nombre de places réservées',
            },
            montantTotalDu: {
              type: 'number',
              description: 'Montant total dû en FCFA',
            },
            statut: {
              type: 'string',
              enum: ['EN_ATTENTE', 'INSCRIT', 'CONFIRME', 'PARTIEL', 'SOLDE', 'ANNULEE', 'PAYEE', 'DESISTE', 'PARTI', 'RENTRE'],
              description: 'Statut de la réservation',
            },
            statutClient: {
              type: 'string',
              enum: ['INSCRIT', 'CONFIRME', 'DESISTE', 'PARTI', 'RENTRE', 'ANNULE'],
              description: 'Statut client',
            },
          },
        },
        Paiement: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID du paiement',
            },
            idPaiement: {
              type: 'number',
              description: 'Numéro de paiement',
            },
            montant: {
              type: 'number',
              description: 'Montant du paiement en FCFA',
            },
            dateReglement: {
              type: 'string',
              format: 'date-time',
              description: 'Date du règlement',
            },
            mode: {
              type: 'string',
              enum: ['CARTE_BANCAIRE', 'VIREMENT', 'CHEQUE', 'ORANGE_MONEY', 'WAVE', 'MONEY', 'ESPECES', 'AUTRE'],
              description: 'Mode de paiement',
            },
            reference: {
              type: 'string',
              description: 'Référence du paiement',
            },
            reservationId: {
              type: 'string',
              description: 'ID de la réservation liée',
            },
            billetId: {
              type: 'string',
              description: 'ID du billet lié',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentification',
        description: 'Endpoints d\'authentification et gestion des tokens',
      },
      {
        name: 'Réservations',
        description: 'Gestion des inscriptions et réservations',
      },
      {
        name: 'Paiements',
        description: 'Gestion des paiements et versements',
      },
      {
        name: 'Clients',
        description: 'Gestion du CRM clients',
      },
      {
        name: 'Packages',
        description: 'Gestion des offres de voyage',
      },
      {
        name: 'Billets',
        description: 'Gestion des billets individuels et groupe',
      },
      {
        name: 'Visas',
        description: 'Suivi des dossiers visa',
      },
      {
        name: 'Statistiques',
        description: 'Statistiques et rapports',
      },
    ],
  },
  apis: ['./routes/*.js', './services/*.js'], // Chemins vers les fichiers contenant les annotations
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
