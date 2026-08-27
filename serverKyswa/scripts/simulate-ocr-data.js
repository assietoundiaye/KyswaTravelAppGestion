#!/usr/bin/env node

/**
 * Script de simulation de données OCR pour tester le système de métriques
 * Usage: node scripts/simulate-ocr-data.js [nombre_simulations]
 */

require('dotenv').config();
const ocrMetrics = require('../services/ocrMetricsService');

// Données de simulation réalistes
const SIMULATION_DATA = {
  // Résultats typiques de réussite MRZ
  successfulMrzResults: [
    {
      type: 'passport',
      nom: 'MARTIN',
      prenom: 'PIERRE',
      numeroPasseport: 'FR7891234',
      dateNaissance: '1985-03-15',
      dateExpirationPasseport: '2029-03-15',
      nationalite: 'SEN',
      mrzDetectee: true,
      photo: { buffer: Buffer.alloc(1024) }
    },
    {
      type: 'passport', 
      nom: 'DIOP',
      prenom: 'FATOU',
      numeroPasseport: 'SN1234567',
      dateNaissance: '1992-07-22',
      dateExpirationPasseport: '2027-07-22',
      nationalite: 'SEN',
      mrzDetectee: true,
      photo: { buffer: Buffer.alloc(1024) }
    },
    {
      type: 'id_card',
      nom: 'FALL',
      prenom: 'MAMADOU',
      numeroCNI: '1398512076789',
      dateNaissance: '1978-11-08',
      mrzDetectee: true
    }
  ],

  // Résultats d'extraction partielle (MRZ échouée mais texte récupéré)
  partialResults: [
    {
      type: 'passport',
      nom: 'NIANG',
      prenom: 'AMINATA',
      numeroPasseport: 'SN9876543',
      dateNaissance: '1990-12-03',
      dateExpirationPasseport: '',
      mrzDetectee: false,
      avertissement: 'MRZ non détectée — extraction partielle. Vérifiez les champs.'
    },
    {
      type: 'id_card',
      nom: 'SECK',
      prenom: 'OMAR',
      numeroCNI: '',
      dateNaissance: '1983-05-17',
      mrzDetectee: false,
      avertissement: 'Extraction partielle — vérifiez les champs.'
    }
  ],

  // Résultats d'échec complet
  failedResults: [
    {
      type: 'passport',
      nom: '',
      prenom: '',
      numeroPasseport: '',
      dateNaissance: '',
      dateExpirationPasseport: '',
      mrzDetectee: false,
      avertissement: 'Document non lisible. Vérifiez la qualité de l\'image ou saisissez manuellement.'
    },
    {
      type: 'id_card',
      nom: '',
      prenom: '',
      numeroCNI: '',
      dateNaissance: '',
      mrzDetectee: false,
      avertissement: 'Peu de champs détectés. Vérifiez la qualité de l\'image.'
    }
  ]
};

/**
 * Génère une qualité d'image aléatoire réaliste
 */
function generateRandomImageQuality() {
  return {
    brightness: 0.3 + Math.random() * 0.5, // 0.3 à 0.8
    contrast: 0.2 + Math.random() * 0.6,   // 0.2 à 0.8
    sharpness: 0.4 + Math.random() * 0.6,  // 0.4 à 1.0
    size: 50000 + Math.random() * 200000   // 50KB à 250KB
  };
}

/**
 * Génère un temps de traitement aléatoire réaliste
 */
function generateRandomProcessingTime() {
  // Distribution réaliste : majorité entre 1.5-3s, quelques outliers
  const base = 1500 + Math.random() * 1500; // 1.5s à 3s
  const outlier = Math.random() < 0.1 ? Math.random() * 3000 : 0; // 10% d'outliers
  return Math.round(base + outlier);
}

/**
 * Sélectionne aléatoirement un résultat selon des probabilités réalistes
 */
function selectRandomResult() {
  const rand = Math.random();
  
  if (rand < 0.70) {
    // 70% de réussite MRZ complète
    return SIMULATION_DATA.successfulMrzResults[
      Math.floor(Math.random() * SIMULATION_DATA.successfulMrzResults.length)
    ];
  } else if (rand < 0.85) {
    // 15% d'extraction partielle
    return SIMULATION_DATA.partialResults[
      Math.floor(Math.random() * SIMULATION_DATA.partialResults.length)
    ];
  } else {
    // 15% d'échec complet
    return SIMULATION_DATA.failedResults[
      Math.floor(Math.random() * SIMULATION_DATA.failedResults.length)
    ];
  }
}

/**
 * Simule un scan OCR et enregistre les métriques
 */
async function simulateOcrScan() {
  const result = { ...selectRandomResult() }; // Copie pour éviter les mutations
  const documentType = result.type;
  const imageQuality = generateRandomImageQuality();
  const processingTime = generateRandomProcessingTime();
  
  // Déterminer les champs extraits
  const extractedFields = Object.keys(result).filter(key => 
    result[key] && 
    result[key] !== '' && 
    !['type', 'mrzDetectee', 'avertissement'].includes(key)
  );

  // Ajouter quelques variations pour rendre plus réaliste
  if (Math.random() < 0.1) {
    // 10% du temps, ajouter une adresse ou lieu de naissance
    if (result.type === 'id_card' && Math.random() < 0.5) {
      result.lieuNaissance = 'DAKAR';
      extractedFields.push('lieuNaissance');
    }
  }

  const mrzLinesFound = result.mrzDetectee 
    ? (documentType === 'passport' ? 2 : 3) 
    : 0;

  // Enregistrer dans les métriques
  await ocrMetrics.recordOCRAttempt({
    result,
    processingTimeMs: processingTime,
    documentType,
    imageQuality,
    mrzLinesFound,
    textualFallbackUsed: !result.mrzDetectee && extractedFields.length > 0,
    extractedFields
  });

  return {
    success: extractedFields.length > 0,
    result,
    processingTime,
    extractedFields: extractedFields.length,
    confidence: result.mrzDetectee ? 85 + Math.random() * 15 : 45 + Math.random() * 25
  };
}

/**
 * Lance une simulation complète
 */
async function runSimulation(numberOfScans = 50) {
  console.log('🧪 Démarrage de la simulation OCR');
  console.log(`📊 Génération de ${numberOfScans} scans simulés...`);

  // Réinitialiser les métriques pour la simulation
  await ocrMetrics.resetMetrics();

  const startTime = Date.now();
  const results = [];

  for (let i = 0; i < numberOfScans; i++) {
    if (i % 10 === 0) {
      console.log(`   Progression: ${i}/${numberOfScans} (${Math.round(i/numberOfScans*100)}%)`);
    }

    const scanResult = await simulateOcrScan();
    results.push(scanResult);

    // Petite pause pour simuler un traitement réel
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  const totalTime = Date.now() - startTime;
  console.log(`✅ Simulation terminée en ${totalTime}ms\n`);

  // Générer le rapport
  const report = await ocrMetrics.generateDetailedReport();
  console.log(report);

  // Statistiques de la simulation
  const successful = results.filter(r => r.success);
  const avgProcessingTime = successful.reduce((sum, r) => sum + r.processingTime, 0) / successful.length;
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  console.log('\n📈 VALIDATION DE LA SIMULATION');
  console.log('════════════════════════════════');
  console.log(`• Documents générés: ${results.length}`);
  console.log(`• Succès simulés: ${successful.length} (${(successful.length/results.length*100).toFixed(1)}%)`);
  console.log(`• Temps moyen simulé: ${Math.round(avgProcessingTime)}ms`);
  console.log(`• Confiance moyenne: ${avgConfidence.toFixed(1)}%`);

  // Obtenir les vraies métriques calculées par le service
  const metrics = ocrMetrics.getSuccessRates();
  if (metrics) {
    console.log('\n🎯 MÉTRIQUES CALCULÉES PAR LE SERVICE');
    console.log('═══════════════════════════════════════');
    console.log(`• Total enregistré: ${metrics.totalScans}`);
    console.log(`• Taux de réussite global: ${metrics.overallSuccessRate.toFixed(1)}%`);
    console.log(`• MRZ détectée: ${metrics.mrzSuccessRate.toFixed(1)}%`);
    console.log(`• Temps de traitement: ${metrics.avgProcessingTimeMs}ms`);
    
    if (metrics.confidenceStats) {
      console.log(`• Score de confiance moyen: ${metrics.confidenceStats.average}%`);
    }
  }

  console.log('\n🌐 ACCÈS WEB');
  console.log('═════════════');
  console.log('Consultez les métriques dans le dashboard :');
  console.log('→ http://localhost:3000/dashboard/ocr-metrics');
  console.log('\nOu via l\'API :');
  console.log('→ GET http://localhost:5000/api/clients/ocr-metrics');

  return results;
}

/**
 * Point d'entrée principal
 */
async function main() {
  const numberOfScans = parseInt(process.argv[2]) || 50;

  if (numberOfScans < 1 || numberOfScans > 1000) {
    console.error('❌ Nombre de simulations doit être entre 1 et 1000');
    process.exit(1);
  }

  try {
    await runSimulation(numberOfScans);
  } catch (error) {
    console.error('❌ Erreur durant la simulation:', error.message);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runSimulation, simulateOcrScan };