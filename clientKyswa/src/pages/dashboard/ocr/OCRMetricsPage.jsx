import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, AlertCircle, CheckCircle, Clock, FileText, BarChart3 } from 'lucide-react';
import axios from '../../../core/api/axios';

const OCRMetricsPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
        await fetchMetrics(); // Recharger après reset
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
    return value ? `${value.toFixed(1)}%` : '0%';
  };

  const getSuccessColor = (rate) => {
    if (rate >= 85) return 'text-green-600 bg-green-100';
    if (rate >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des métriques OCR...</p>
        </div>
      </div>
    );
  }

  const rates = metrics?.rates;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Métriques de Performance OCR
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={fetchMetrics}
              disabled={refreshing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
            <button
              onClick={resetMetrics}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Reset
            </button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-sm text-gray-500 mt-2">
            Dernière mise à jour : {lastUpdated}
          </p>
        )}
      </div>

      {!rates ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Aucune donnée OCR</h3>
          <p className="text-yellow-700">
            Commencez à scanner des documents pour voir les statistiques de performance.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Statistiques générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Scans</p>
                  <p className="text-2xl font-bold text-gray-900">{rates.totalScans}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Taux de Réussite Global</p>
                  <p className={`text-2xl font-bold ${getSuccessColor(rates.overallSuccessRate).split(' ')[0]}`}>
                    {formatPercentage(rates.overallSuccessRate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-indigo-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">MRZ Détectée</p>
                  <p className={`text-2xl font-bold ${getSuccessColor(rates.mrzSuccessRate).split(' ')[0]}`}>
                    {formatPercentage(rates.mrzSuccessRate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Temps Moyen</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {rates.avgProcessingTimeMs}ms
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Répartition des types de succès */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Répartition des Résultats
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {formatPercentage(rates.mrzSuccessRate)}
                </div>
                <div className="text-sm text-gray-600">MRZ Complète</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-1">
                  {formatPercentage(rates.partialSuccessRate)}
                </div>
                <div className="text-sm text-gray-600">Extraction Partielle</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {formatPercentage(rates.failureRate)}
                </div>
                <div className="text-sm text-gray-600">Échecs</div>
              </div>
            </div>
          </div>

          {/* Taux de réussite par champ */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Taux de Réussite par Champ
            </h3>
            <div className="space-y-4">
              {Object.entries(rates.fieldExtractionRates).map(([field, rate]) => (
                <div key={field} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {field.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          rate >= 85 ? 'bg-green-500' :
                          rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-medium w-12 text-right ${getSuccessColor(rate).split(' ')[0]}`}>
                      {formatPercentage(rate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistiques de confiance */}
          {rates.confidenceStats && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Statistiques de Confiance
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {rates.confidenceStats.average.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Moyenne</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {rates.confidenceStats.median}%
                  </div>
                  <div className="text-sm text-gray-600">Médiane</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {rates.confidenceStats.max}%
                  </div>
                  <div className="text-sm text-gray-600">Maximum</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {rates.confidenceStats.min}%
                  </div>
                  <div className="text-sm text-gray-600">Minimum</div>
                </div>
              </div>
            </div>
          )}

          {/* Types de documents */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Répartition par Type de Document
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 mb-1">
                  {rates.documentTypeDistribution.passport}
                </div>
                <div className="text-sm text-gray-600">Passeports</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-600 mb-1">
                  {rates.documentTypeDistribution.id_card}
                </div>
                <div className="text-sm text-gray-600">Cartes d'Identité</div>
              </div>
            </div>
          </div>

          {/* Rapport détaillé */}
          {metrics.detailedReport && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Rapport Détaillé
              </h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-4 overflow-x-auto">
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