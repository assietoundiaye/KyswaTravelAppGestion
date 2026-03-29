import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import DashboardLayout from './components/DashboardLayout';
import Navbar from './components/Navbar';
import PublicLayout from './components/PublicLayout';

// Public pages
import Home from './pages/Home';
import Login from './pages/Login';
import SuiviReservation from './pages/public/SuiviReservation';
import SuiviBillet from './pages/public/SuiviBillet';

// Dashboard pages
import DashboardHome from './pages/dashboard/DashboardHome';
import DashboardCommercial from './pages/dashboard/DashboardCommercial';
import DashboardGestionnaire from './pages/dashboard/DashboardGestionnaire';
import DashboardComptable from './pages/dashboard/DashboardComptable';
import DashboardAdmin from './pages/dashboard/DashboardAdmin';

// Route guards
import { PrivateRoute, PublicOnlyRoute } from './components/PrivateRoute';

import './App.css';

// Redirige /dashboard vers la section selon le rôle
function DashboardRedirect() {
  const { role } = useAuth();
  const map = {
    ADMIN: '/dashboard/utilisateurs',
    GESTIONNAIRE: '/dashboard/gestionnaire',
    COMMERCIAL: '/dashboard/commercial',
    COMPTABLE: '/dashboard/comptable',
  };
  return <Navigate to={map[role] || '/dashboard'} replace />;
}

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public — avec Navbar */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/suivi/reservation" element={<SuiviReservation />} />
          <Route path="/suivi/billet" element={<SuiviBillet />} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        </Route>

        {/* Dashboard — protégé */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<DashboardRedirect />} />

          {/* ADMIN */}
          <Route path="admin" element={<PrivateRoute roles={['ADMIN']}><DashboardAdmin /></PrivateRoute>} />
          <Route path="utilisateurs" element={<PrivateRoute roles={['ADMIN']}><DashboardAdmin /></PrivateRoute>} />
          <Route path="statistiques" element={<PrivateRoute roles={['ADMIN']}><DashboardHome /></PrivateRoute>} />

          {/* GESTIONNAIRE */}
          <Route path="gestionnaire" element={<PrivateRoute roles={['GESTIONNAIRE']}><DashboardGestionnaire /></PrivateRoute>} />
          <Route path="packages" element={<PrivateRoute roles={['GESTIONNAIRE', 'ADMIN']}><DashboardGestionnaire /></PrivateRoute>} />
          <Route path="supplements" element={<PrivateRoute roles={['GESTIONNAIRE', 'ADMIN']}><DashboardGestionnaire /></PrivateRoute>} />

          {/* COMMERCIAL */}
          <Route path="commercial" element={<PrivateRoute roles={['COMMERCIAL']}><DashboardCommercial /></PrivateRoute>} />
          <Route path="clients" element={<PrivateRoute roles={['COMMERCIAL', 'GESTIONNAIRE', 'COMPTABLE', 'ADMIN']}><DashboardCommercial /></PrivateRoute>} />
          <Route path="reservations" element={<PrivateRoute roles={['COMMERCIAL', 'GESTIONNAIRE', 'COMPTABLE', 'ADMIN']}><DashboardCommercial /></PrivateRoute>} />
          <Route path="billets" element={<PrivateRoute roles={['COMMERCIAL', 'GESTIONNAIRE', 'COMPTABLE', 'ADMIN']}><DashboardCommercial /></PrivateRoute>} />
          <Route path="paiements" element={<PrivateRoute roles={['COMMERCIAL', 'COMPTABLE', 'ADMIN']}><DashboardComptable /></PrivateRoute>} />

          {/* COMPTABLE */}
          <Route path="comptable" element={<PrivateRoute roles={['COMPTABLE']}><DashboardComptable /></PrivateRoute>} />
          <Route path="reste-a-payer" element={<PrivateRoute roles={['COMPTABLE', 'ADMIN']}><DashboardComptable /></PrivateRoute>} />
          <Route path="factures" element={<PrivateRoute roles={['COMPTABLE', 'ADMIN']}><DashboardComptable /></PrivateRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
