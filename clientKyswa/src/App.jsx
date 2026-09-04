import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { DEFAULT_REDIRECT, ALL_ROLES, MENU_BY_ROLE } from './utils/roles';

// Layouts
import DashboardLayout from './components/DashboardLayout';
import AppInitializer from './components/AppInitializer';

// Public pages
import Login from './pages/Login';
import SuiviReservation from './pages/public/SuiviReservation';
import SuiviBillet from './pages/public/SuiviBillet';

// Dashboard pages
import DashboardCommercial from './pages/dashboard/DashboardCommercial';
import DashboardGestionnaire from './pages/dashboard/DashboardGestionnaire';
import DashboardComptable from './pages/dashboard/DashboardComptable';
import DashboardAdmin from './pages/dashboard/DashboardAdmin';
import ClientsPage from './pages/dashboard/clients/ClientsPage';
import ClientDetail from './pages/dashboard/clients/ClientDetail';
import ReservationsPage from './pages/dashboard/reservations/ReservationsPage';
import ReservationDetail from './pages/dashboard/reservations/ReservationDetail';
import BilletsPage from './pages/dashboard/billets/BilletsPage';
import PaiementsPage from './pages/dashboard/paiements/PaiementsPage';
import PackagesPage from './pages/dashboard/packages/PackagesPage';
import SupplementsPage from './pages/dashboard/supplements/SupplementsPage';
import DocumentsPage from './pages/dashboard/documents/DocumentsPage';
import FacturesPage from './pages/dashboard/factures/FacturesPage';
import UtilisateursPage from './pages/dashboard/utilisateurs/UtilisateursPage';
import ProfilPage from './pages/dashboard/profil/ProfilPage';
import MessagesPage from './pages/dashboard/messages/MessagesPage';
import AuditPage from './pages/dashboard/audit/AuditPage';
import StatistiquesPage from './pages/dashboard/statistiques/StatistiquesPage';
import RechercheAvancee from './pages/dashboard/clients/RechercheAvancee';
import VisasPage from './pages/dashboard/visas/VisasPage';
import DesistementsPage from './pages/dashboard/desistements/DesistementsPage';
import RecouvrementPage from './pages/dashboard/recouvrement/RecouvrementPage';
import ReunionsPage from './pages/dashboard/reunions/ReunionsPage';
import BilletsGroupePage from './pages/dashboard/billetsGroupe/BilletsGroupePage';
import SimulateurPage from './pages/dashboard/simulateur/SimulateurPage';
import ZiarraPage from './pages/dashboard/ziarra/ZiarraPage';
import ComptabilitePage from './pages/dashboard/comptabilite/ComptabilitePage';
import RapportsPage from './pages/dashboard/rapports/RapportsPage';
import BilanPage from './pages/dashboard/bilan/BilanPage';
import OCRMetricsPage from './pages/dashboard/ocr/OCRMetricsPage';
import ShopPage from './pages/dashboard/shop/ShopPage';
import RoomingPage from './pages/dashboard/rooming/RoomingPage';

// Route guards
import { PrivateRoute, PublicOnlyRoute } from './components/PrivateRoute';
import './App.css';

function DashboardRedirect() {
  const { role } = useAuth();
  return <Navigate to={DEFAULT_REDIRECT[role] || '/dashboard'} replace />;
}

const PATH_ROLES = Object.entries(MENU_BY_ROLE).reduce((acc, [role, entries]) => {
  entries.forEach(({ to }) => {
    const relativePath = to.replace('/dashboard/', '');
    if (!relativePath) return;
    if (!acc[relativePath]) {
      acc[relativePath] = new Set();
    }
    acc[relativePath].add(role);
  });
  return acc;
}, {});

const EXPLICIT_ROUTE_ROLES = {
  profil: ALL_ROLES,
  messages: ALL_ROLES,
  'dashboard/commercial': ALL_ROLES,
  'dashboard/gestionnaire': ['dg', 'administrateur', 'oumra', 'billets', 'ziara'],
  'dashboard/comptable': ['dg', 'administrateur', 'comptable'],
  'dashboard/admin': ['dg', 'administrateur'],
  'clients/:id': PATH_ROLES.clients ? Array.from(PATH_ROLES.clients) : ALL_ROLES,
  recherche: PATH_ROLES.clients ? Array.from(PATH_ROLES.clients) : ALL_ROLES,
  'reservations/:id': PATH_ROLES.reservations ? Array.from(PATH_ROLES.reservations) : ALL_ROLES,
  'reste-a-payer': ['dg', 'comptable'], // Seuls DG et comptable
  paiements: ['dg', 'comptable'], // Seuls DG et comptable
  comptabilite: ['dg', 'comptable'], // Seuls DG et comptable
  shop: PATH_ROLES.shop ? Array.from(PATH_ROLES.shop) : ['commercial', 'oumra', 'billets', 'ziara'],
  rooming: ['commercial', 'oumra', 'oumra_ziara', 'dg', 'administrateur', 'informatique', 'admin', 'secretaire'],
};

const rolesFor = (path) => {
  if (EXPLICIT_ROUTE_ROLES[path]) return EXPLICIT_ROUTE_ROLES[path];
  const dynamicRoles = PATH_ROLES[path];
  if (dynamicRoles) return Array.from(dynamicRoles);
  return ALL_ROLES;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Page d'initialisation - gère le chargement intelligemment */}
        <Route path="/" element={<AppInitializer />} />

        {/* Pages publiques — sans Navbar */}
        <Route path="/suivi/reservation" element={<SuiviReservation />} />
        <Route path="/suivi/billet" element={<SuiviBillet />} />
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

        {/* Dashboard — protégé */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<DashboardRedirect />} />

          {/* Profil + Messages — tous les rôles */}
          <Route path="profil" element={<PrivateRoute roles={rolesFor('profil')}><ProfilPage /></PrivateRoute>} />
          <Route path="messages" element={<PrivateRoute roles={rolesFor('messages')}><MessagesPage /></PrivateRoute>} />

          {/* Dashboards */}
          <Route path="commercial" element={<PrivateRoute roles={rolesFor('dashboard/commercial')}><DashboardCommercial /></PrivateRoute>} />
          <Route path="gestionnaire" element={<PrivateRoute roles={rolesFor('dashboard/gestionnaire')}><DashboardGestionnaire /></PrivateRoute>} />
          <Route path="comptable" element={<PrivateRoute roles={rolesFor('dashboard/comptable')}><DashboardComptable /></PrivateRoute>} />
          <Route path="admin" element={<PrivateRoute roles={rolesFor('dashboard/admin')}><DashboardAdmin /></PrivateRoute>} />

          {/* Clients */}
          <Route path="clients" element={<PrivateRoute module="clients" roles={rolesFor('clients')}><ClientsPage /></PrivateRoute>} />
          <Route path="clients/:id" element={<PrivateRoute module="clients" roles={rolesFor('clients/:id')}><ClientDetail /></PrivateRoute>} />
          <Route path="recherche" element={<PrivateRoute module="clients" roles={rolesFor('recherche')}><RechercheAvancee /></PrivateRoute>} />

          {/* Inscriptions / Réservations */}
          <Route path="reservations" element={<PrivateRoute module="reservations" roles={rolesFor('reservations')}><ReservationsPage /></PrivateRoute>} />
          <Route path="reservations/:id" element={<PrivateRoute module="reservations" roles={rolesFor('reservations/:id')}><ReservationDetail /></PrivateRoute>} />

          {/* Billets */}
          <Route path="billets" element={<PrivateRoute module="billets" roles={rolesFor('billets')}><BilletsPage /></PrivateRoute>} />
          <Route path="billets-groupe" element={<PrivateRoute module="billets-groupe" roles={rolesFor('billets-groupe')}><BilletsGroupePage /></PrivateRoute>} />

          {/* Paiements */}
          <Route path="paiements" element={<PrivateRoute module="paiements" roles={rolesFor('paiements')}><PaiementsPage /></PrivateRoute>} />
          <Route path="reste-a-payer" element={<PrivateRoute module="paiements" roles={rolesFor('reste-a-payer')}><PaiementsPage /></PrivateRoute>} />

          {/* Packages / Départs & Rooming */}
          <Route path="packages" element={<PrivateRoute module="packages" roles={rolesFor('packages')}><PackagesPage /></PrivateRoute>} />
          <Route path="rooming" element={<PrivateRoute module="rooming" roles={rolesFor('rooming')}><RoomingPage /></PrivateRoute>} />
          <Route path="supplements" element={<PrivateRoute module="supplements" roles={rolesFor('supplements')}><SupplementsPage /></PrivateRoute>} />

          {/* Documents */}
          <Route path="documents" element={<PrivateRoute module="documents" roles={rolesFor('documents')}><DocumentsPage /></PrivateRoute>} />

          {/* Factures */}
          <Route path="factures" element={<PrivateRoute module="factures" roles={rolesFor('factures')}><FacturesPage /></PrivateRoute>} />

          {/* Nouveaux modules métier */}
          <Route path="visas" element={<PrivateRoute module="visas" roles={rolesFor('visas')}><VisasPage /></PrivateRoute>} />
          <Route path="desistements" element={<PrivateRoute module="desistements" roles={rolesFor('desistements')}><DesistementsPage /></PrivateRoute>} />
          <Route path="recouvrement" element={<PrivateRoute module="recouvrement" roles={rolesFor('recouvrement')}><RecouvrementPage /></PrivateRoute>} />
          <Route path="reunions" element={<PrivateRoute module="reunions" roles={rolesFor('reunions')}><ReunionsPage /></PrivateRoute>} />
          <Route path="simulateur" element={<PrivateRoute module="simulateur" roles={rolesFor('simulateur')}><SimulateurPage /></PrivateRoute>} />
          <Route path="ziarra" element={<PrivateRoute module="ziarra" roles={rolesFor('ziarra')}><ZiarraPage /></PrivateRoute>} />
          <Route path="comptabilite" element={<PrivateRoute module="comptabilite" roles={rolesFor('comptabilite')}><ComptabilitePage /></PrivateRoute>} />
          <Route path="rapports" element={<PrivateRoute module="rapports" roles={rolesFor('rapports')}><RapportsPage /></PrivateRoute>} />
          <Route path="bilan" element={<PrivateRoute module="rapports" roles={rolesFor('bilan')}><BilanPage /></PrivateRoute>} />
          
          {/* Kyswa Shop */}
          <Route path="shop" element={<PrivateRoute module="shop" roles={rolesFor('shop')}><ShopPage /></PrivateRoute>} />
          
          {/* Métriques OCR */}
          <Route path="ocr-metrics" element={<PrivateRoute module="audit" roles={rolesFor('admin')}><OCRMetricsPage /></PrivateRoute>} />

          {/* Admin / Informatique */}
          <Route path="utilisateurs" element={<PrivateRoute module="utilisateurs" roles={rolesFor('utilisateurs')}><UtilisateursPage /></PrivateRoute>} />
          <Route path="statistiques" element={<PrivateRoute module="statistiques" roles={rolesFor('statistiques')}><StatistiquesPage /></PrivateRoute>} />
          <Route path="audit" element={<PrivateRoute module="audit" roles={rolesFor('audit')}><AuditPage /></PrivateRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
