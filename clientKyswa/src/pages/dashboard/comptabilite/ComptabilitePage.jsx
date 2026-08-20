import { usePermissions } from '../../../hooks/usePermissions';
import PermissionGuard from '../../../components/PermissionGuard';
import { Calculator, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function ComptabilitePage() {
  return (
    <PermissionGuard module="comptabilite" action="view">
      <ComptabilitePageContent />
    </PermissionGuard>
  );
}

function ComptabilitePageContent() {
  const { canCreate, canUpdate, canDelete } = usePermissions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comptabilité</h1>
            <p className="text-sm text-gray-600">Gestion des finances et de la comptabilité</p>
          </div>
        </div>
        {canCreate('comptabilite') && (
          <button className="btn-primary">
            + Nouvelle dépense
          </button>
        )}
      </div>

      {/* Résumé financier */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recettes totales</p>
              <p className="text-2xl font-bold text-green-600">0 FCFA</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dépenses totales</p>
              <p className="text-2xl font-bold text-red-600">0 FCFA</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bénéfice net</p>
              <p className="text-2xl font-bold text-primary">0 FCFA</p>
            </div>
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Marge</p>
              <p className="text-2xl font-bold text-blue-600">0%</p>
            </div>
            <Calculator className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Message d'accès restreint */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 p-2 rounded-full">
            <Calculator className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-800">Module comptabilité</h3>
            <p className="text-sm text-amber-700">
              Seuls le comptable et le directeur général ont accès aux fonctionnalités complètes de ce module.
              Les données financières sensibles sont protégées selon les politiques de l'entreprise.
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder pour les futures fonctionnalités */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fonctionnalités disponibles</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Gestion des dépenses</span>
            <span className="text-sm text-gray-600">
              {canCreate('comptabilite') ? 'Accès complet' : 'Lecture seule'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Rapports financiers</span>
            <span className="text-sm text-gray-600">
              {canCreate('comptabilite') ? 'Accès complet' : 'Lecture seule'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium">Analyse des bénéfices</span>
            <span className="text-sm text-gray-600">
              {canCreate('comptabilite') ? 'Accès complet' : 'Lecture seule'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}