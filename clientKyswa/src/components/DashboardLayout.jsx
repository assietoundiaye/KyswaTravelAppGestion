import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logokyswa.jpg';

export default function DashboardLayout() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="md:pl-56 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 pl-10 md:pl-0">
            <img src={logo} alt="Kyswa Travel" className="h-8 w-auto rounded" />
            <span className="hidden sm:block font-semibold text-gray-900 text-sm">Kyswa Travel</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user?.prenom || ''} {user?.nom || ''}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
