/**
 * Service de métriques OCR
 * Mesure les taux de réussite et la qualité de l'extraction OCR
 */

const fs = require('fs').promises;
const path = require('path');

class OCRMetricsService {
  constructor() {
    this.metricsFile = path.join(__dirname, '../../data/ocr-metrics.json');
    this.sessionMetrics = {
      totalScans: 0,
      successfulMrz: 0,
      textualExtractionFallback: 0,
      completeFailures: 0,
      confidenceScores: [],
      processingTimes: [],
      documentTypes: { passport: 0, id_card: 0 },
      fieldExtractionSuccess: {
        nom: 0,
        prenom: 0,
        numeroPasseport: 0,
        numeroCNI: 0,
        dateNaissance: 0,
        dateExpirationPasseport: 0,
        photo: 0
      }
    };
  }

  /**
   * Enregistre les métriques d'une extraction OCR
   */
  async recordOCRAttempt(extractionData) {
    const startTime = Date.now();
    
    try {
      // Charger les métriques existantes
      await this.loadMetrics();
      
      const {
        result,
        processingTimeMs,
        documentType,
        imageQuality,
        mrzLinesFound,
        textualFallbackUsed,
        extractedFields
      } = extractionData;

      // Incrémenter les compteurs
      this.sessionMetrics.totalScans++;
      this.sessionMetrics.documentTypes[documentType]++;
      
      // Analyser le type de succès
      if (result.mrzDetectee) {
        this.sessionMetrics.successfulMrz++;
      } else if (result.nom || result.numeroPasseport || result.numeroCNI) {
        this.sessionMetrics.textualExtractionFallback++;
      } else {
        this.sessionMetrics.completeFailures++;
      }

      // Calculer le score de confiance
      const confidenceScore = this.calculateConfidenceScore(result, mrzLinesFound, imageQuality);
      this.sessionMetrics.confidenceScores.push(confidenceScore);
      
      // Enregistrer le temps de traitement
      if (processingTimeMs) {
        this.sessionMetrics.processingTimes.push(processingTimeMs);
      }

      // Analyser la réussite par champ
      this.analyzeFieldSuccess(result);

      // Sauvegarder les métriques
      await this.saveMetrics();

      return {
        success: true,
        confidence: confidenceScore,
        metrics: this.getSuccessRates()
      };

    } catch (error) {
      console.error('Erreur enregistrement métriques OCR:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Calcule un score de confiance basé sur plusieurs critères
   */
  calculateConfidenceScore(result, mrzLinesFound = 0, imageQuality = null) {
    let score = 0;
    let maxScore = 100;

    // MRZ détectée (40 points)
    if (result.mrzDetectee) {
      score += 40;
      
      // Bonus si toutes les lignes MRZ sont trouvées
      if (mrzLinesFound >= 2) {
        score += 10;
      }
    }

    // Champs critiques détectés (20 points chacun)
    if (result.nom && result.nom.length > 1) score += 15;
    if (result.prenom && result.prenom.length > 1) score += 10;
    
    // Numéro de document (15 points)
    const docNumber = result.numeroPasseport || result.numeroCNI;
    if (docNumber && docNumber.length >= 6) {
      score += 15;
    }

    // Dates valides (10 points chacune)
    if (this.isValidDate(result.dateNaissance)) score += 10;
    if (this.isValidDate(result.dateExpirationPasseport)) score += 10;

    // Photo extraite (5 points bonus pour passeports)
    if (result.photo && result.type === 'passport') {
      score += 5;
    }

    // Qualité d'image (jusqu'à 5 points)
    if (imageQuality) {
      if (imageQuality.sharpness > 0.7) score += 2;
      if (imageQuality.brightness > 0.4 && imageQuality.brightness < 0.8) score += 2;
      if (imageQuality.contrast > 0.3) score += 1;
    }

    return Math.min(score, maxScore);
  }

  /**
   * Analyse la réussite d'extraction par champ
   */
  analyzeFieldSuccess(result) {
    const fields = this.sessionMetrics.fieldExtractionSuccess;

    if (result.nom && result.nom.length > 1) fields.nom++;
    if (result.prenom && result.prenom.length > 1) fields.prenom++;
    if (result.numeroPasseport && result.numeroPasseport.length >= 6) fields.numeroPasseport++;
    if (result.numeroCNI && result.numeroCNI.length >= 6) fields.numeroCNI++;
    if (this.isValidDate(result.dateNaissance)) fields.dateNaissance++;
    if (this.isValidDate(result.dateExpirationPasseport)) fields.dateExpirationPasseport++;
    if (result.photo) fields.photo++;
  }

  /**
   * Valide qu'une date est dans un format correct
   */
  isValidDate(dateStr) {
    if (!dateStr) return false;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) return false;
    
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Calcule les taux de réussite globaux
   */
  async getSuccessRates() {
    await this.loadMetrics();
    const total = this.sessionMetrics.totalScans;
    if (total === 0) return null;

    const mrzSuccessRate = (this.sessionMetrics.successfulMrz / total) * 100;
    const partialSuccessRate = (this.sessionMetrics.textualExtractionFallback / total) * 100;
    const failureRate = (this.sessionMetrics.completeFailures / total) * 100;
    
    // Taux de réussite par champ
    const fieldRates = {};
    Object.keys(this.sessionMetrics.fieldExtractionSuccess).forEach(field => {
      fieldRates[field] = (this.sessionMetrics.fieldExtractionSuccess[field] / total) * 100;
    });

    // Statistiques de confiance
    const confidenceStats = this.calculateConfidenceStats();

    // Temps de traitement moyen
    const avgProcessingTime = this.sessionMetrics.processingTimes.length > 0
      ? this.sessionMetrics.processingTimes.reduce((a, b) => a + b, 0) / this.sessionMetrics.processingTimes.length
      : 0;

    return {
      totalScans: total,
      overallSuccessRate: mrzSuccessRate + partialSuccessRate,
      mrzSuccessRate: Math.round(mrzSuccessRate * 100) / 100,
      partialSuccessRate: Math.round(partialSuccessRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      fieldExtractionRates: fieldRates,
      confidenceStats,
      avgProcessingTimeMs: Math.round(avgProcessingTime),
      documentTypeDistribution: this.sessionMetrics.documentTypes
    };
  }

  /**
   * Calcule les statistiques de confiance
   */
  calculateConfidenceStats() {
    const scores = this.sessionMetrics.confidenceScores;
    if (scores.length === 0) return null;

    scores.sort((a, b) => a - b);
    
    return {
      average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
      median: scores[Math.floor(scores.length / 2)],
      min: scores[0],
      max: scores[scores.length - 1],
      standardDeviation: this.calculateStandardDeviation(scores)
    };
  }

  /**
   * Calcule l'écart type
   */
  calculateStandardDeviation(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Génère un rapport détaillé
   */
  async generateDetailedReport() {
    const rates = await this.getSuccessRates();
    if (!rates) return "Aucune donnée OCR disponible";

    const report = `
=== RAPPORT DE PERFORMANCE OCR ===
Date: ${new Date().toLocaleDateString('fr-FR')}
Période d'analyse: Session courante

📊 STATISTIQUES GLOBALES
• Total de scans: ${rates.totalScans}
• Taux de réussite global: ${rates.overallSuccessRate.toFixed(1)}%
• Réussite MRZ complète: ${rates.mrzSuccessRate}%
• Extraction textuelle de secours: ${rates.partialSuccessRate}%
• Échecs complets: ${rates.failureRate}%

⚡ PERFORMANCE
• Temps de traitement moyen: ${rates.avgProcessingTimeMs}ms
• Score de confiance moyen: ${rates.confidenceStats?.average || 'N/A'}%

📝 RÉUSSITE PAR CHAMP
• Nom: ${rates.fieldExtractionRates.nom?.toFixed(1) || 0}%
• Prénom: ${rates.fieldExtractionRates.prenom?.toFixed(1) || 0}%
• N° Passeport: ${rates.fieldExtractionRates.numeroPasseport?.toFixed(1) || 0}%
• N° CNI: ${rates.fieldExtractionRates.numeroCNI?.toFixed(1) || 0}%
• Date naissance: ${rates.fieldExtractionRates.dateNaissance?.toFixed(1) || 0}%
• Date expiration: ${rates.fieldExtractionRates.dateExpirationPasseport?.toFixed(1) || 0}%
• Photo extraite: ${rates.fieldExtractionRates.photo?.toFixed(1) || 0}%

📋 TYPES DE DOCUMENTS
• Passeports: ${rates.documentTypeDistribution.passport}
• Cartes d'identité: ${rates.documentTypeDistribution.id_card}

${this.generateRecommendations(rates)}
`;

    return report;
  }

  /**
   * Génère des recommandations basées sur les métriques
   */
  generateRecommendations(rates) {
    const recommendations = [];

    if (rates.mrzSuccessRate < 70) {
      recommendations.push("⚠️  Taux MRZ faible - Vérifier la qualité des images d'entrée");
    }

    if (rates.fieldExtractionRates.nom < 80) {
      recommendations.push("⚠️  Extraction nom faible - Améliorer le nettoyage des artefacts OCR");
    }

    if (rates.avgProcessingTimeMs > 5000) {
      recommendations.push("🐌 Temps de traitement élevé - Optimiser les workers Tesseract");
    }

    if (rates.confidenceStats && rates.confidenceStats.average < 70) {
      recommendations.push("📉 Score de confiance faible - Revoir les critères de qualité d'image");
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ Performances OCR excellentes - Continuer la surveillance");
    }

    return `\n🎯 RECOMMANDATIONS\n${recommendations.map(r => `• ${r}`).join('\n')}`;
  }

  /**
   * Charge les métriques depuis le fichier
   */
  async loadMetrics() {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf-8');
      const savedMetrics = JSON.parse(data);
      
      // Remplacer au lieu de merger pour éviter l'accumulation excessive
      this.sessionMetrics = { ...savedMetrics };
    } catch (error) {
      // Fichier n'existe pas encore, on garde les métriques de session vides
      console.log('Initialisation nouvelles métriques OCR');
    }
  }

  /**
   * Sauvegarde les métriques dans le fichier
   */
  async saveMetrics() {
    try {
      // S'assurer que le dossier data existe
      const dataDir = path.dirname(this.metricsFile);
      await fs.mkdir(dataDir, { recursive: true });
      
      await fs.writeFile(this.metricsFile, JSON.stringify(this.sessionMetrics, null, 2));
    } catch (error) {
      console.error('Erreur sauvegarde métriques:', error);
    }
  }

  /**
   * Remet à zéro les métriques
   */
  async resetMetrics() {
    this.sessionMetrics = {
      totalScans: 0,
      successfulMrz: 0,
      textualExtractionFallback: 0,
      completeFailures: 0,
      confidenceScores: [],
      processingTimes: [],
      documentTypes: { passport: 0, id_card: 0 },
      fieldExtractionSuccess: {
        nom: 0,
        prenom: 0,
        numeroPasseport: 0,
        numeroCNI: 0,
        dateNaissance: 0,
        dateExpirationPasseport: 0,
        photo: 0
      }
    };
    
    await this.saveMetrics();
  }
}

module.exports = new OCRMetricsService();