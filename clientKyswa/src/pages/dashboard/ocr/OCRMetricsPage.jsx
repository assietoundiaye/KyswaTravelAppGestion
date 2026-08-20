import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, AlertCircle, CheckCircle, Clock, FileText, BarChart3, Download, ShieldCheck } from 'lucide-react';
import axios from '../../../core/api/axios';

const OCRMetricsPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const response = await axios.get('/clients/ocr-metrics');
      setMetrics(response.data.data);
      setLastUpdated(new Date().toLocaleString('fr-FR'));
    } catch (error) {
      console.error('Erreur chargement métriques OCR:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const resetMetrics = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir remettre à zéro toutes les métriques OCR ?')) {
      try {
        await axios.post('/clients/reset-ocr-metrics');
        await fetchMetrics();
        alert('Métriques remises à zéro avec succès');
      } catch (error) {
        console.error('Erreur reset métriques:', error);
        alert('Erreur lors de la remise à zéro des métriques');
      }
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatPercentage = (value) => {
    return value !== undefined && value !== null ? `${Number(value).toFixed(1)}%` : '0%';
  };

  const getSuccessColor = (rate) => {
    if (rate >= 85) return 'text-green-600 bg-green-100';
    if (rate >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const exportPDF = async () => {
    if (!metrics || !metrics.rates) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const rates = metrics.rates;

      // ── En-tête Kyswa Travel ───────────────────────────────────────
      doc.setFillColor(0, 103, 79); // #00674F
      doc.rect(0, 0, 210, 24, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('KYSWA TRAVEL — RAPPORT DE PERFORMANCE OCR', 14, 11);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Système d’Extraction Automatique & Reconnaissance de Passeports / CNI', 14, 18);

      // Sous-titre date
      const dateStr = new Date().toLocaleDateString('fr-FR');
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text(`Rapport généré le ${dateStr} à ${timeStr} | Total scans analysés : ${rates.totalScans}`, 14, 30);

      // ── Tableau 1 : Indicateurs Clés (KPIs) ─────────────────────────
      autoTable(doc, {
        startY: 34,
        head: [['Indicateur Clé', 'Valeur', 'Statut / Cible', 'Détails']],
        body: [
          ['Total de documents scannés', `${rates.totalScans}`, 'Actif', 'Passeports et Cartes Nationales d’Identité'],
          ['Taux de Réussite Global', `${formatPercentage(rates.overallSuccessRate)}`, rates.overallSuccessRate >= 75 ? 'Optimal (≥ 75%)' : 'À surveiller', 'Combinaison extraction MRZ + Textuelle'],
          ['Réussite MRZ Complète', `${formatPercentage(rates.mrzSuccessRate)}`, rates.mrzSuccessRate >= 65 ? 'Excellente' : 'Standard', 'Lecture conforme bande ICAO 9303'],
          ['Extraction Textuelle de secours', `${formatPercentage(rates.partialSuccessRate)}`, 'Actif', 'Fallback OCR automatique si MRZ floue'],
          ['Taux d’échec complet', `${formatPercentage(rates.failureRate)}`, rates.failureRate < 25 ? 'Faible (< 25%)' : 'Élevé', 'Images floues, tronquées ou illisibles'],
          ['Temps Moyen de traitement', `${rates.avgProcessingTimeMs} ms`, rates.avgProcessingTimeMs < 4000 ? 'Rapide (< 4s)' : 'Standard', 'Vitesse d’exécution Tesseract & Prétraitement Sharp']
        ],
        styles: { fontSize: 8.5, cellPadding: 3 },
        headStyles: { fillColor: [0, 103, 79], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 249] },
      });

      // ── Tableau 2 : Réussite par champ extrait ──────────────────────
      const fieldLabels = {
        nom: 'Nom de famille',
        prenom: 'Prénoms',
        numeroPasseport: 'Numéro de passeport',
        numeroCNI: 'Numéro CNI',
        dateNaissance: 'Date de naissance',
        dateExpirationPasseport: 'Date d’expiration',
        photo: 'Photo visage extraite'
      };

      const fieldRows = Object.entries(rates.fieldExtractionRates || {}).map(([key, rate]) => {
        const label = fieldLabels[key] || key;
        const statut = rate >= 80 ? 'Excellent' : (rate >= 60 ? 'Satisfaisant' : 'À améliorer');
        return [label, `${formatPercentage(rate)}`, statut];
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 77, 58);
      const startYFields = doc.lastAutoTable.finalY + 8;
      doc.text('Taux de Réussite par Champ Extrait', 14, startYFields);

      autoTable(doc, {
        startY: startYFields + 3,
        head: [['Champ Analysé', 'Taux de Détection', 'Niveau de Qualité']],
        body: fieldRows,
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' }, // Blue
        alternateRowStyles: { fillColor: [245, 248, 255] },
      });

      // ── Tableau 3 : Répartition documents & Statistiques de confiance ─
      const startYConfidence = doc.lastAutoTable.finalY + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 77, 58);
      doc.text('Répartition & Score de Confiance IA', 14, startYConfidence);

      const confStats = rates.confidenceStats || {};
      const docDist = rates.documentTypeDistribution || {};

      autoTable(doc, {
        startY: startYConfidence + 3,
        head: [['Catégorie', 'Métrique', 'Description']],
        body: [
          ['Type de Document', `Passeports : ${docDist.passport || 0} (${Math.round(((docDist.passport || 0) / (rates.totalScans || 1)) * 100)}%)`, 'Documents internationaux avec MRZ'],
          ['Type de Document', `Cartes d’Identité : ${docDist.id_card || 0} (${Math.round(((docDist.id_card || 0) / (rates.totalScans || 1)) * 100)}%)`, 'Cartes nationales d’identité'],
          ['Score de Confiance', `Score Moyen : ${confStats.average || 0}%`, 'Indice de fiabilité moyen des données'],
          ['Score de Confiance', `Score Médian : ${confStats.median || 0}%`, 'Score médian sur l’échantillon global'],
          ['Score de Confiance', `Plage : [Min ${confStats.min || 0}% - Max ${confStats.max || 0}%]`, 'Étendue des scores de confiance constatés']
        ],
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' }, // Purple
        alternateRowStyles: { fillColor: [250, 247, 255] },
      });

      // ── Rapport Détaillé & Recommandations ──────────────────────────
      if (metrics.detailedReport) {
        const finalY = doc.lastAutoTable.finalY + 8;
        if (finalY < 240) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(0, 77, 58);
          doc.text('Synthèse Technique & Recommandations', 14, finalY);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(60, 60, 60);
          const splitText = doc.splitTextToSize(metrics.detailedReport, 182);
          doc.text(splitText.slice(0, 25), 14, finalY + 5);
        }
      }

      // ── Pied de page ───────────────────────────────────────────────
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(140, 140, 140);
        doc.text('Kyswa Travel Management — Document confidentiel généré automatiquement', 14, 290);
        doc.text(`Page ${i} sur ${pageCount}`, 185, 290);
      }

      doc.save(`Kyswa_Rapport_OCR_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      alert('Erreur lors de la génération du document PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des métriques OCR...</p>
        </div>
      </div>
    );
  }

  const rates = metrics?.rates;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Métriques de Performance OCR
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Surveillance de l'extraction IA des passeports et cartes d'identité
              </p>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Dernière mise à jour : {lastUpdated}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchMetrics}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>

          <button
            onClick={exportPDF}
            disabled={exporting || !rates}
            className="flex items-center px-4 py-2 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50 text-sm"
          >
            <Download className={`w-4 h-4 mr-2 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exportation...' : 'Exporter en PDF'}
          </button>

          <button
            onClick={resetMetrics}
            className="flex items-center px-3.5 py-2 bg-red-50 text-red-700 font-medium rounded-lg hover:bg-red-100 transition-colors text-sm"
          >
            <AlertCircle className="w-4 h-4 mr-1.5" />
            Reset
          </button>
        </div>
      </div>

      {!rates ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-1">Aucune donnée OCR enregistrée</h3>
          <p className="text-sm text-yellow-700 max-w-md mx-auto">
            Dès que vous scannerez des passeports ou des CNI dans le module clients, les statistiques et indicateurs apparaîtront automatiquement ici.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Statistiques générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Scans</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-1">{rates.totalScans}</p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Documents traités par le serveur</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Réussite Globale</p>
                  <p className={`text-3xl font-extrabold mt-1 ${getSuccessColor(rates.overallSuccessRate).split(' ')[0]}`}>
                    {formatPercentage(rates.overallSuccessRate)}
                  </p>
                </div>
                <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">MRZ + Extraction de secours</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">MRZ Détectée</p>
                  <p className={`text-3xl font-extrabold mt-1 ${getSuccessColor(rates.mrzSuccessRate).split(' ')[0]}`}>
                    {formatPercentage(rates.mrzSuccessRate)}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Conforme norme ICAO 9303</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Temps Moyen</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-1">{rates.avgProcessingTimeMs} <span className="text-sm font-medium text-gray-500">ms</span></p>
                </div>
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Clock className="w-6 h-6" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Vitesse moyenne d'analyse</p>
            </div>
          </div>

          {/* Répartition des types de succès */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-emerald-700" />
              Répartition des Résultats
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-2xl font-black text-emerald-700 mb-0.5">
                  {formatPercentage(rates.mrzSuccessRate)}
                </div>
                <div className="text-xs font-semibold text-emerald-900">MRZ Complète</div>
                <p className="text-[11px] text-emerald-700 mt-1">Données 100% validées par checksum</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="text-2xl font-black text-amber-700 mb-0.5">
                  {formatPercentage(rates.partialSuccessRate)}
                </div>
                <div className="text-xs font-semibold text-amber-900">Extraction Partielle</div>
                <p className="text-[11px] text-amber-700 mt-1">Fallback OCR textuel automatique</p>
              </div>
              <div className="text-center p-4 bg-rose-50 rounded-xl border border-rose-100">
                <div className="text-2xl font-black text-rose-700 mb-0.5">
                  {formatPercentage(rates.failureRate)}
                </div>
                <div className="text-xs font-semibold text-rose-900">Échecs / Illisibles</div>
                <p className="text-[11px] text-rose-700 mt-1">Image corrompue ou trop floue</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Taux de réussite par champ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Taux de Réussite par Champ
              </h3>
              <div className="space-y-3.5">
                {Object.entries(rates.fieldExtractionRates || {}).map(([field, rate]) => (
                  <div key={field} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${
                            rate >= 85 ? 'bg-emerald-500' :
                            rate >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-bold w-12 text-right ${getSuccessColor(rate).split(' ')[0]}`}>
                        {formatPercentage(rate)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {/* Types de documents */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">
                  Répartition par Type de Document
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-indigo-50 rounded-xl">
                    <div className="text-3xl font-black text-indigo-600 mb-0.5">
                      {rates.documentTypeDistribution?.passport || 0}
                    </div>
                    <div className="text-xs font-semibold text-indigo-900">Passeports</div>
                  </div>
                  <div className="text-center p-4 bg-teal-50 rounded-xl">
                    <div className="text-3xl font-black text-teal-600 mb-0.5">
                      {rates.documentTypeDistribution?.id_card || 0}
                    </div>
                    <div className="text-xs font-semibold text-teal-900">Cartes d'Identité</div>
                  </div>
                </div>
              </div>

              {/* Statistiques de confiance */}
              {rates.confidenceStats && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-base font-bold text-gray-900 mb-4">
                    Statistiques de Confiance
                  </h3>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {rates.confidenceStats.average?.toFixed(1)}%
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">Moyenne</div>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-emerald-600">
                        {rates.confidenceStats.median}%
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">Médiane</div>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {rates.confidenceStats.max}%
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">Maximum</div>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">
                        {rates.confidenceStats.min}%
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium mt-0.5">Minimum</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rapport détaillé */}
          {metrics.detailedReport && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-bold text-gray-900 mb-3">
                Rapport Détaillé & Recommandations Système
              </h3>
              <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-200 overflow-x-auto leading-relaxed">
                {metrics.detailedReport}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OCRMetricsPage;