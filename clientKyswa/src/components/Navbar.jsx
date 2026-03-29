import { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 bg-white shadow-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/logokyswa.jpg" alt="Kyswa Travel" className="h-8 w-8 rounded-lg object-cover" onError={(e) => { e.target.style.display='none'; }} />
          <span className="text-lg font-semibold tracking-tight text-gray-900">Kyswa Travel</span>
        </Link>

        {/* Mobile hamburger */}
        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Ouvrir le menu"
        >
          <div className="space-y-1.5">
            <span className="block h-0.5 w-6 bg-gray-800" />
            <span className="block h-0.5 w-6 bg-gray-800" />
            <span className="block h-0.5 w-6 bg-gray-800" />
          </div>
        </button>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link className="text-sm font-medium text-gray-700 hover:text-primary transition-colors" to="/">
            Accueil
          </Link>
          <Link className="text-sm font-medium text-gray-700 hover:text-primary transition-colors" to="/suivi/reservation">
            Suivre ma réservation
          </Link>
          <Link className="text-sm font-medium text-gray-700 hover:text-primary transition-colors" to="/suivi/billet">
            Suivre mon billet
          </Link>
          <Link
            to="/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <div className="space-y-1 px-4 py-3">
            <Link to="/" className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary" onClick={() => setOpen(false)}>
              Accueil
            </Link>
            <Link to="/suivi/reservation" className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary" onClick={() => setOpen(false)}>
              Suivre ma réservation
            </Link>
            <Link to="/suivi/billet" className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary" onClick={() => setOpen(false)}>
              Suivre mon billet
            </Link>
            <Link to="/login" className="block rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5" onClick={() => setOpen(false)}>
              Se connecter
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
