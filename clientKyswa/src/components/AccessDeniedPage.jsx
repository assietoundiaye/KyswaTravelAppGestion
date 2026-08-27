import { useNavigate } from 'react-router-dom';
import { Lock, AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../utils/roles';

const AccessDeniedPage = ({ module = 'ce module' }) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const roleLabel = ROLE_LABELS[role] || role;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header avec icône */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white bg-opacity-20 rounded-full mb-4">
              <Lock size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Accès restreint</h1>
            <p className="text-red-100 mt-2">Permissions insuffisantes</p>
          </div>

          {/* Contenu */}
          <div className="p-6">
            <div className="flex items-start gap-3 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 mb-1">Accès non autorisé</h3>
                <p className="text-sm text-amber-700">
                  Vous n'avez pas les permissions nécessaires pour accéder à {module}.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Informations de votre compte</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rôle actuel :</span>
                    <span className="font-medium">{roleLabel}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Politique de sécurité</h4>
                    <p className="text-sm text-blue-800">
                      L'accès aux modules de comptabilité et de paiements est restreint au comptable et au directeur général pour des raisons de sécurité et de confidentialité des données financières.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Demander l'accès</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Si vous pensez avoir besoin d'accéder à ce module dans le cadre de vos fonctions, contactez :
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Votre responsable hiérarchique</li>
                  <li>• Le directeur général</li>
                  <li>• L'administrateur système</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft size={16} />
                Retour
              </button>
              <button 
                onClick={() => navigate('/dashboard/commercial')}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Aller au tableau de bord
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;