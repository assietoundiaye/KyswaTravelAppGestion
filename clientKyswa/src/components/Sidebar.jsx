import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BarChart2,
  Package,
  PlusCircle,
  UserCheck,
  CalendarCheck,
  Ticket,
  CreditCard,
  FileText,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const menuByRole = {
  ADMIN: [
    { label: 'Utilisateurs', to: '/dashboard/utilisateurs', icon: Users },
    { label: 'Statistiques', to: '/dashboard/statistiques', icon: BarChart2 },
  ],
  GESTIONNAIRE: [
    { label: 'Dashboard', to: '/dashboard/gestionnaire', icon: LayoutDashboard },
    { label: 'Packages', to: '/dashboard/packages', icon: Package },
    { label: 'Suppléments', to: '/dashboard/supplements', icon: PlusCircle },
  ],
  COMMERCIAL: [
    { label: 'Dashboard', to: '/dashboard/commercial', icon: LayoutDashboard },
    { label: 'Clients', to: '/dashboard/clients', icon: UserCheck },
    { label: 'Réservations', to: '/dashboard/reservations', icon: CalendarCheck },
    { label: 'Billets', to: '/dashboard/billets', icon: Ticket },
    { label: 'Paiements', to: '/dashboard/paiements', icon: CreditCard },
  ],
  COMPTABLE: [
    { label: 'Dashboard', to: '/dashboard/comptable', icon: LayoutDashboard },
    { label: 'Paiements', to: '/dashboard/paiements', icon: CreditCard },
    { label: 'Reste à payer', to: '/dashboard/reste-a-payer', icon: FileText },
    { label: 'Factures', to: '/dashboard/factures', icon: FileText },
  ],
};

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

export default function Sidebar() {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const items = menuByRole[role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
          K
        </div>
        <span className="font-semibold text-gray-900 text-sm">Kyswa Travel</span>
      </div>

      {/* Role badge */}
      <div className="px-4 py-3">
        <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-primary uppercase tracking-wide">
          {role}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 pb-4">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-100 px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-gray-200 z-10">
        <SidebarContent />
      </aside>

      {/* Mobile toggle button */}
      <button
        className="fixed top-4 left-4 z-30 md:hidden rounded-lg bg-white border border-gray-200 p-2 shadow-sm"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/30 md:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-30 w-56 bg-white border-r border-gray-200 md:hidden">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
