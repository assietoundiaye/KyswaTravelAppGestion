import { useState } from 'react';
import api from '../api/axios';

const features = [
  {
    title: 'Omra',
    description: 'Suivi des dossiers Omra, gestion des groupes, vols et hébergements en un seul endroit.',
  },
  {
    title: 'Hajj',
    description: 'Planification complète des campagnes Hajj avec tableaux de bord pour vos équipes.',
  },
  {
    title: 'Clients',
    description: 'Base clients centralisée, historique des voyages et automatisation de la communication.',
  },
];

const Home = () => {
  const [backendStatus, setBackendStatus] = useState('');

  const testBackend = async () => {
    try {
      console.log('🔄 Test de connexion au backend...');
      const response = await api.get('/test');
      console.log('✅ Réponse backend:', response.data);
      setBackendStatus(response.data.message);
      alert('✅ ' + response.data.message);
    } catch (error) {
      console.error('❌ Erreur détaillée:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      
      let errorMessage = '❌ Erreur connexion backend';
      if (error.code === 'ECONNREFUSED') {
        errorMessage = '❌ Backend non accessible (vérifie qu\'il tourne sur http://localhost:5000)';
      } else if (error.response) {
        errorMessage = `❌ Erreur ${error.response.status}: ${error.response.statusText}`;
      } else if (error.message) {
        errorMessage = `❌ ${error.message}`;
      }
      
      setBackendStatus(errorMessage);
      alert(errorMessage + '\n\nVérifie la console pour plus de détails.');
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-emerald-50 via-white to-emerald-50">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:flex-row md:items-center md:justify-between md:py-20">
        <div className="max-w-xl space-y-6">
          <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Plateforme agences de voyage
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl md:text-5xl">
            Kyswa Travel – Gestion Omra &amp; Hajj
          </h1>
          <p className="text-base text-gray-600 sm:text-lg">
            Plateforme de gestion complète pour agences de voyage spécialisées dans l&apos;Omra et le Hajj :
            centralisez vos dossiers, vos paiements et la communication avec vos groupes.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <button className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600 hover:shadow-lg">
              Commencer
            </button>
            <button className="inline-flex items-center justify-center rounded-lg border border-primary/30 bg-white px-6 py-3 text-sm font-medium text-primary shadow-sm transition hover:border-primary hover:bg-primary/5">
              Voir la démo
            </button>
          </div>

          <button
            onClick={testBackend}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Tester Backend
          </button>
          {backendStatus && (
            <p className="mt-2 text-sm font-medium text-gray-700">{backendStatus}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Suivi temps réel des groupes
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Accessible sur mobile &amp; web
            </span>
          </div>
        </div>

        <div className="grid w-full max-w-md gap-4 rounded-2xl bg-white/70 p-5 shadow-md backdrop-blur md:max-w-sm">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{feature.title}</h3>
                <span className="text-[10px] font-medium uppercase tracking-wide text-primary/80">
                  Module
                </span>
              </div>
              <p className="text-xs text-gray-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Home;

