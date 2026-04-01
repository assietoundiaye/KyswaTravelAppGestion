import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

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
};

function getTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Handle dynamic routes like /dashboard/clients/:id
  const base = '/' + pathname.split('/').slice(1, 3).join('/');
  return PAGE_TITLES[base] || 'Dashboard';
}

export default function DashboardLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const title = getTitle(location.pathname);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Listen to sidebar collapse state via CSS variable trick
  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Sidebar onCollapseChange={setSidebarCollapsed} />

      <main
        className="md:transition-all"
        style={{ paddingLeft: `${sidebarWidth}px` }}
      >
        {/* Top header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 9,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,103,79,0.08)',
          padding: '0 24px',
          height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800,
            color: 'var(--text-main)', letterSpacing: '-0.02em',
          }}>{title}</h1>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'capitalize' }}>
            {today}
          </span>
        </header>

        <div style={{ padding: '28px 24px' }} className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
