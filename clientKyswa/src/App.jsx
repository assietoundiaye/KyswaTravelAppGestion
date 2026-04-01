import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { DEFAULT_REDIRECT, ALL_ROLES } from './utils/roles';

// Layouts
import DashboardLayout from './components/DashboardLayout';
import PublicLayout from './components/PublicLayout';

// Public pages
import Home from './pages/Home';
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

// Route guards
import { PrivateRoute, PublicOnlyRoute } from './components/PrivateRoute';
import './App.css';

function DashboardRedirect() {
  const { role } = useAuth();
  return <Navigate to={DEFAULT_REDIRECT[role] || '/dashboard'} replace />;
}

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public — avec Navbar */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
        </Route>

        {/* Pages publiques — sans Navbar */}
        <Route path="/suivi/reservation" element={<SuiviReservation />} />
        <Route path="/suivi/billet" element={<SuiviBillet />} />
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

        {/* Dashboard — protégé */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route index element={<DashboardRedirect />} />

          {/* Profil + Messages — tous les rôles */}
          <Route path="profil" element={<PrivateRoute><ProfilPage /></PrivateRoute>} />
          <Route path="messages" element={<PrivateRoute><MessagesPage /></PrivateRoute>} />

          {/* Dashboards */}
          <Route path="commercial" element={<PrivateRoute><DashboardCommercial /></PrivateRoute>} />
          <Route path="gestionnaire" element={<PrivateRoute><DashboardGestionnaire /></PrivateRoute>} />
          <Route path="comptable" element={<PrivateRoute><DashboardComptable /></PrivateRoute>} />
          <Route path="admin" element={<PrivateRoute><DashboardAdmin /></PrivateRoute>} />

          {/* Clients */}
          <Route path="clients" element={<PrivateRoute><ClientsPage /></PrivateRoute>} />
          <Route path="clients/:id" element={<PrivateRoute><ClientDetail /></PrivateRoute>} />
          <Route path="recherche" element={<PrivateRoute><RechercheAvancee /></PrivateRoute>} />

          {/* Inscriptions / Réservations */}
          <Route path="reservations" element={<PrivateRoute><ReservationsPage /></PrivateRoute>} />
          <Route path="reservations/:id" element={<PrivateRoute><ReservationDetail /></PrivateRoute>} />

          {/* Billets */}
          <Route path="billets" element={<PrivateRoute><BilletsPage /></PrivateRoute>} />

          {/* Paiements */}
          <Route path="paiements" element={<PrivateRoute><PaiementsPage /></PrivateRoute>} />
          <Route path="reste-a-payer" element={<PrivateRoute><PaiementsPage /></PrivateRoute>} />

          {/* Packages / Départs */}
          <Route path="packages" element={<PrivateRoute><PackagesPage /></PrivateRoute>} />
          <Route path="supplements" element={<PrivateRoute roles={['GESTIONNAIRE', 'ADMIN']}><SupplementsPage /></PrivateRoute>} />

          {/* Documents */}
          <Route path="documents" element={<PrivateRoute><DocumentsPage /></PrivateRoute>} />

          {/* Factures */}
          <Route path="factures" element={<PrivateRoute><FacturesPage /></PrivateRoute>} />

          {/* Nouveaux modules métier */}
          <Route path="visas" element={<PrivateRoute><VisasPage /></PrivateRoute>} />
          <Route path="desistements" element={<PrivateRoute><DesistementsPage /></PrivateRoute>} />
          <Route path="recouvrement" element={<PrivateRoute><RecouvrementPage /></PrivateRoute>} />
          <Route path="reunions" element={<PrivateRoute><ReunionsPage /></PrivateRoute>} />
          <Route path="billets-groupe" element={<PrivateRoute><BilletsGroupePage /></PrivateRoute>} />
          <Route path="simulateur" element={<PrivateRoute><SimulateurPage /></PrivateRoute>} />
          <Route path="ziarra" element={<PrivateRoute><ZiarraPage /></PrivateRoute>} />
          <Route path="comptabilite" element={<PrivateRoute><ComptabilitePage /></PrivateRoute>} />
          <Route path="rapports" element={<PrivateRoute><RapportsPage /></PrivateRoute>} />
          <Route path="bilan" element={<PrivateRoute><BilanPage /></PrivateRoute>} />

          {/* Admin / Informatique */}
          <Route path="utilisateurs" element={<PrivateRoute><UtilisateursPage /></PrivateRoute>} />
          <Route path="statistiques" element={<PrivateRoute><StatistiquesPage /></PrivateRoute>} />
          <Route path="audit" element={<PrivateRoute><AuditPage /></PrivateRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
