import { Link } from 'react-router-dom';

const services = [
  {
    title: 'Omra',
    description: 'Gestion complète des dossiers Omra, groupes, vols et hébergements.',
    color: '#00674F',
  },
  {
    title: 'Hajj',
    description: 'Planification des campagnes Hajj avec suivi en temps réel.',
    color: '#0369A1',
  },
  {
    title: 'Billets',
    description: "Émission et suivi des billets d'avion pour vos clients.",
    color: '#7C3AED',
  },
  {
    title: 'Réservations',
    description: 'Centralisez toutes vos réservations et paiements.',
    color: '#EA580C',
  },
];

const stats = [
  { value: '500+', label: 'Clients gérés' },
  { value: '50+', label: 'Packages actifs' },
  { value: '99%', label: 'Satisfaction' },
];

const features = [
  { title: 'Gestion des dossiers', desc: 'Créez et suivez chaque dossier client de A à Z.' },
  { title: 'Paiements & Facturation', desc: 'Enregistrez les paiements et générez des factures PDF.' },
  { title: 'Documents & Visas', desc: 'Centralisez passeports, visas et documents officiels.' },
  { title: 'Suivi en temps réel', desc: 'Notifications et mises à jour instantanées pour votre équipe.' },
  { title: 'Rapports & Statistiques', desc: 'Tableaux de bord et rapports pour piloter votre activité.' },
  { title: 'Multi-rôles', desc: 'Accès différenciés pour chaque membre de votre équipe.' },
];

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #00674F 0%, #004d3a 60%, #003328 100%)',
        color: 'white',
        padding: '80px 24px 120px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Motif géométrique subtil */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)',
          backgroundSize: '24px 24px',
        }} />

        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          {/* Logo */}
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
            <img
              src="/logokyswa.jpg"
              alt="Kyswa Travel"
              style={{ width: 80, height: 80, borderRadius: 20, objectFit: 'cover', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>

          <div style={{
            display: 'inline-block', background: 'rgba(255,255,255,0.15)',
            borderRadius: 100, padding: '6px 20px', fontSize: 11,
            fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 24, backdropFilter: 'blur(8px)',
          }}>
            Plateforme de gestion — Agence de voyage
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 16, letterSpacing: '-0.02em' }}>
            Kyswa Travel
          </h1>
          <p style={{ fontSize: 'clamp(18px, 3vw, 26px)', fontWeight: 400, color: 'rgba(255,255,255,0.8)', marginBottom: 16 }}>
            Gestion Omra, Hajj &amp; Voyages religieux
          </p>
          <p style={{ maxWidth: 560, margin: '0 auto 40px', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
            Centralisez vos dossiers, paiements et communications. Une plateforme complète pour les agences spécialisées dans les voyages religieux.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" style={{
              background: 'white', color: '#00674F',
              padding: '14px 36px', borderRadius: 12,
              fontWeight: 700, fontSize: 14, textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s',
            }}>
              Accéder à la plateforme
            </Link>
            <Link to="/suivi/reservation" style={{
              background: 'rgba(255,255,255,0.12)', color: 'white',
              padding: '14px 36px', borderRadius: 12,
              fontWeight: 600, fontSize: 14, textDecoration: 'none',
              border: '1.5px solid rgba(255,255,255,0.3)',
              backdropFilter: 'blur(8px)',
            }}>
              Suivre ma réservation
            </Link>
          </div>
        </div>

        {/* Wave bas */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 0C1200 50 960 60 720 40C480 20 240 0 0 30L0 60Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Stats */}
      <section style={{ maxWidth: 700, margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, textAlign: 'center' }}>
          {stats.map(s => (
            <div key={s.label} style={{ padding: '24px 16px', borderRadius: 16, background: '#f8faf9', border: '1px solid #e5ede9' }}>
              <p style={{ fontSize: 36, fontWeight: 900, color: '#00674F', lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section style={{ background: '#f9fafb', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', color: '#111827', marginBottom: 8 }}>Nos modules</h2>
          <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 14, marginBottom: 48 }}>Tout ce dont votre agence a besoin en un seul endroit</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {services.map(s => (
              <div key={s.title} style={{
                background: 'white', borderRadius: 16, padding: '28px 24px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ width: 40, height: 4, borderRadius: 4, background: s.color, marginBottom: 16 }} />
                <h3 style={{ fontWeight: 700, fontSize: 16, color: '#111827', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section style={{ padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', color: '#111827', marginBottom: 8 }}>Une plateforme complète</h2>
          <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 14, marginBottom: 48 }}>Conçue pour les agences de voyages religieux</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {features.map(f => (
              <div key={f.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '20px 24px', borderRadius: 12, background: '#f9fafb', border: '1px solid #E5E7EB' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00674F', marginTop: 6, flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 4 }}>{f.title}</p>
                  <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Suivi public */}
      <section style={{ background: '#f0fdf4', padding: '64px 24px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Suivi en ligne</h2>
          <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 40 }}>Consultez votre dossier sans avoir besoin de vous connecter</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <Link to="/suivi/reservation" style={{
              display: 'block', textDecoration: 'none',
              background: 'white', borderRadius: 16, padding: '28px 24px',
              border: '2px solid #bbf7d0', textAlign: 'left',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#00674F'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,103,79,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#bbf7d0'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 4, background: '#00674F', marginBottom: 16 }} />
              <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 }}>Suivre ma réservation</h3>
              <p style={{ fontSize: 13, color: '#6B7280' }}>Entrez votre numéro et votre nom</p>
            </Link>
            <Link to="/suivi/billet" style={{
              display: 'block', textDecoration: 'none',
              background: 'white', borderRadius: 16, padding: '28px 24px',
              border: '2px solid #bfdbfe', textAlign: 'left',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,99,235,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 4, background: '#2563EB', marginBottom: 16 }} />
              <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 }}>Suivre mon billet</h3>
              <p style={{ fontSize: 13, color: '#6B7280' }}>Entrez votre numéro de billet</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ background: '#00674F', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 12 }}>Prêt à gérer votre agence ?</h2>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 15, marginBottom: 32 }}>
            Connectez-vous à votre espace de gestion et pilotez votre activité en toute simplicité.
          </p>
          <Link to="/login" style={{
            display: 'inline-block', background: 'white', color: '#00674F',
            padding: '14px 40px', borderRadius: 12,
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}>
            Se connecter
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#111827', color: '#9CA3AF', textAlign: 'center', padding: '24px', fontSize: 12 }}>
        © {new Date().getFullYear()} Kyswa Travel — Tous droits réservés
      </footer>
    </div>
  );
}
