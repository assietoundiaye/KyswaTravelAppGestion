import { Link } from 'react-router-dom';

const services = [
  {
    icon: '🕌',
    title: 'Omra',
    description: 'Gestion complète des dossiers Omra, groupes, vols et hébergements.',
  },
  {
    icon: '🌙',
    title: 'Hajj',
    description: 'Planification des campagnes Hajj avec suivi en temps réel.',
  },
  {
    icon: '✈️',
    title: 'Billets',
    description: 'Émission et suivi des billets d\'avion pour vos clients.',
  },
  {
    icon: '📋',
    title: 'Réservations',
    description: 'Centralisez toutes vos réservations et paiements.',
  },
];

const stats = [
  { value: '500+', label: 'Clients gérés' },
  { value: '50+', label: 'Packages actifs' },
  { value: '99%', label: 'Satisfaction' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white">

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-32 text-center">
          <span className="inline-block rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            Plateforme de gestion — Agence de voyage
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl mb-6 leading-tight">
            Kyswa Travel
            <span className="block text-emerald-200 text-3xl sm:text-4xl mt-2 font-semibold">
              Gestion Omra & Hajj
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-emerald-100 mb-10">
            Centralisez vos dossiers, paiements et communications. Une plateforme complète pour les agences spécialisées dans les voyages religieux.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-emerald-700 shadow-lg hover:bg-emerald-50 transition-all hover:shadow-xl"
            >
              Se connecter →
            </Link>
            <Link
              to="/suivi/reservation"
              className="rounded-xl border-2 border-white/40 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-all backdrop-blur"
            >
              Suivre ma réservation
            </Link>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 0C1200 50 960 60 720 40C480 20 240 0 0 30L0 60Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid grid-cols-3 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-emerald-600">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Nos modules</h2>
          <p className="text-center text-gray-500 text-sm mb-10">Tout ce dont votre agence a besoin en un seul endroit</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s) => (
              <div key={s.title} className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all">
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Suivi public */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Suivi en ligne</h2>
          <p className="text-gray-500 text-sm mb-8">Consultez votre dossier sans avoir besoin de vous connecter</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/suivi/reservation"
              className="rounded-2xl border-2 border-emerald-100 bg-emerald-50 p-6 text-left hover:border-emerald-300 hover:bg-emerald-100 transition-all group"
            >
              <div className="text-2xl mb-2">📋</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700">Suivre ma réservation</h3>
              <p className="text-xs text-gray-500 mt-1">Entrez votre numéro et votre nom</p>
            </Link>
            <Link
              to="/suivi/billet"
              className="rounded-2xl border-2 border-blue-100 bg-blue-50 p-6 text-left hover:border-blue-300 hover:bg-blue-100 transition-all group"
            >
              <div className="text-2xl mb-2">✈️</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-700">Suivre mon billet</h3>
              <p className="text-xs text-gray-500 mt-1">Entrez votre numéro de billet</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 text-center py-6 text-xs">
        © {new Date().getFullYear()} Kyswa Travel — Tous droits réservés
      </footer>
    </div>
  );
}
