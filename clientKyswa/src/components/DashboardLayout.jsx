import { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import usePermissions from '../hooks/usePermissions';
import LoadingScreen from './LoadingScreen';

const PAGE_TITLES = {
  '/dashboard/commercial': 'Dashboard',
  '/dashboard/gestionnaire': 'Dashboard',
  '/dashboard/comptable': 'Dashboard',
  '/dashboard/statistiques': 'Statistiques',
  '/dashboard/clients': 'Clients',
  '/dashboard/reservations': 'Inscriptions',
  '/dashboard/billets': 'Billets',
  '/dashboard/billets-groupe': 'Billets Groupe',
  '/dashboard/paiements': 'Paiements',
  '/dashboard/reste-a-payer': 'Reste à Payer',
  '/dashboard/packages': 'Départs',
  '/dashboard/supplements': 'Suppléments',
  '/dashboard/documents': 'Documents',
  '/dashboard/factures': 'Factures',
  '/dashboard/visas': 'Visas',
  '/dashboard/desistements': 'Désistements',
  '/dashboard/recouvrement': 'Recouvrement',
  '/dashboard/reunions': 'Réunions',
  '/dashboard/simulateur': 'Simulateur',
  '/dashboard/ziarra': 'Ziarra Fès',
  '/dashboard/comptabilite': 'Comptabilité',
  '/dashboard/rapports': 'Rapports',
  '/dashboard/bilan': 'Bilan Départs',
  '/dashboard/messages': 'Messagerie',
  '/dashboard/profil': 'Mon Profil',
  '/dashboard/utilisateurs': 'Utilisateurs',
  '/dashboard/audit': 'Journal d\'Audit',
  '/dashboard/recherche': 'Recherche Avancée',
  '/dashboard/shop': 'Kyswa Shop',
  '/dashboard/ocr-metrics': 'Métriques OCR'
};

// Mapping des routes vers les modules de permissions  
const ROUTE_TO_MODULE = {
  '/dashboard/clients': 'clients',
  '/dashboard/reservations': 'reservations',
  '/dashboard/billets': 'billets',
  '/dashboard/billets-groupe': 'billets-groupe',
  '/dashboard/paiements': 'paiements',
  '/dashboard/packages': 'packages',
  '/dashboard/supplements': 'supplements',
  '/dashboard/documents': 'documents',
  '/dashboard/factures': 'factures',
  '/dashboard/visas': 'visas',
  '/dashboard/desistements': 'desistements',
  '/dashboard/comptabilite': 'comptabilite',
  '/dashboard/rapports': 'rapports',
  '/dashboard/reunions': 'reunions',
  '/dashboard/recouvrement': 'recouvrement',
  '/dashboard/utilisateurs': 'utilisateurs',
  '/dashboard/audit': 'audit',
  '/dashboard/shop': 'shop',
  '/dashboard/ziarra': 'ziarra',
  '/dashboard/statistiques': 'statistiques',
  '/dashboard/bilan': 'rapports',
  '/dashboard/simulateur': 'simulateur',
  '/dashboard/ocr-metrics': 'audit'
};

function getTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const base = '/' + pathname.split('/').slice(1, 3).join('/');
  return PAGE_TITLES[base] || 'Dashboard';
}

export default function DashboardLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { canViewModule, loading: permissionsLoading } = usePermissions();
  const title = getTitle(location.pathname);

  // Détection responsive automatique (resize listener)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Vérifier si l'utilisateur a accès à la page actuelle
  const currentModule = ROUTE_TO_MODULE[location.pathname];
  const hasAccess = !currentModule || canViewModule(currentModule);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? 64 : 240);

  // Afficher un spinner pendant le chargement des permissions
  if (permissionsLoading) {
    return <LoadingScreen />;
  }

  // Rediriger si pas d'accès à la page
  if (!hasAccess) {
    return <Navigate to="/dashboard/commercial" replace />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Sidebar onCollapseChange={setSidebarCollapsed} />

      <main
        style={{
          paddingLeft: `${sidebarWidth}px`,
          transition: 'padding-left 0.2s ease',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          maxWidth: '100vw',
          overflowX: 'hidden',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Top header responsive */}
        <header
          style={{
            position: 'sticky', top: 0, zIndex: 9,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(0,103,79,0.08)',
            paddingLeft: isMobile ? '68px' : (sidebarCollapsed ? '24px' : '32px'),
            paddingRight: isMobile ? '16px' : '32px',
            paddingTop: '12px',
            paddingBottom: '12px',
            minHeight: 64,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
            transition: 'padding 0.2s ease',
            maxWidth: '100vw',
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: isMobile ? 16 : 18, fontWeight: 800,
            color: 'var(--text-main)', letterSpacing: '-0.02em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {title}
          </h1>
          <span style={{ fontSize: isMobile ? 11 : 12, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'capitalize', flexShrink: 0, marginLeft: 8 }}>
            {today}
          </span>
        </header>

        {/* Contenu principal adaptatif */}
        <div
          style={{
            padding: isMobile ? '16px 12px' : '24px 32px',
            maxWidth: '1600px',
            margin: '0 auto',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            flex: 1,
          }}
          className="animate-fade-in"
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
