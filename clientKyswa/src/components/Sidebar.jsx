import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, UserCircle, MessageSquare, ChevronLeft, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MENU_BY_ROLE, ALL_MENU_ITEMS, ROLE_LABELS, ROLE_COLORS } from '../utils/roles';
import { useSocket } from '../hooks/useSocket';
import usePermissions from '../hooks/usePermissions';

export default function Sidebar({ onCollapseChange }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { unreadCount, connected } = useSocket();
  const { canViewModule, loading: permissionsLoading } = usePermissions();

  const toggleCollapse = (val) => {
    const next = val !== undefined ? val : !collapsed;
    setCollapsed(next);
    onCollapseChange?.(next);
  };

  const isSuper = ['dg', 'administrateur', 'informatique', 'admin'].includes(role?.toLowerCase());

  // Filtrer les éléments du menu selon les permissions dynamiques
  const items = isSuper
    ? (MENU_BY_ROLE[role] || ALL_MENU_ITEMS)
    : ALL_MENU_ITEMS.filter(item => {
        if (!item.module) return true; // Liens globaux comme Dashboard
        if (item.module === 'rooming' && ['commercial', 'oumra', 'oumra_ziara', 'dg', 'administrateur', 'informatique', 'admin', 'secretaire'].includes(role?.toLowerCase())) {
          return true;
        }
        return canViewModule(item.module);
      });
  const roleLabel = ROLE_LABELS[role] || role;
  const roleColor = ROLE_COLORS[role] || '#6B7280';
  const initials = user ? `${user.nom?.[0] || ''}${user.prenom?.[0] || ''}`.toUpperCase() : 'U';

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = ({ isMobile = false }) => (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(180deg, #004d3a 0%, #00674F 60%, #007a5e 100%)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: collapsed && !isMobile ? '14px 10px' : '18px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              border: '2px solid rgba(255,255,255,0.15)',
            }}>
              <img src="/logokyswa.jpg" alt="Kyswa" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
            </div>
            {(!collapsed || isMobile) && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 15, color: 'white', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                  Kyswa Travel
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginTop: 2 }}>
                  Management
                </div>
              </div>
            )}
          </div>
          {!isMobile && (
            <button 
              onClick={() => toggleCollapse()} 
              style={{
                background: 'rgba(255,255,255,0.15)', 
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.85)', 
                cursor: 'pointer', 
                padding: 8, 
                display: 'flex',
                transition: 'all 0.2s ease', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: 36,
                height: 36,
                flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
              title={collapsed ? 'Déplier' : 'Plier'}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
        </div>

        {/* Connexion indicator */}
        {(!collapsed || isMobile) && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: connected ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${connected ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
              borderRadius: 6, padding: '4px 10px',
              fontSize: 11, fontWeight: 600, color: connected ? '#86efac' : '#fca5a5',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? '#22c55e' : '#ef4444',
                boxShadow: connected ? '0 0 8px rgba(34,197,94,0.5)' : '0 0 8px rgba(239,68,68,0.5)',
              }} />
              <span>{connected ? 'Connecté' : 'Hors ligne'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: collapsed && !isMobile ? '12px 6px' : '14px 10px', overflowY: 'auto' }}>
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={`${to}-${label}`}
            to={to}
            onClick={() => isMobile && setMobileOpen(false)}
            title={collapsed && !isMobile ? label : undefined}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              gap: collapsed && !isMobile ? 0 : 11,
              padding: collapsed && !isMobile ? '10px 6px' : '8px 12px',
              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
              borderRadius: 8, marginBottom: 4,
              color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
              background: isActive ? 'rgba(255,255,255,0.16)' : 'transparent',
              borderLeft: isActive ? '3px solid rgba(255,255,255,0.4)' : '3px solid transparent',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: isActive ? 600 : 500,
              textDecoration: 'none', transition: 'all 0.18s ease',
              cursor: 'pointer',
            })}
            onMouseEnter={e => { if (!e.currentTarget.style.background.includes('0.16')) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { if (!e.currentTarget.style.background.includes('0.16')) e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon size={18} style={{ flexShrink: 0, opacity: 0.9 }} />
            {(!collapsed || isMobile) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: collapsed && !isMobile ? '10px 6px' : '12px 10px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        {/* Messages with badge */}
        <NavLink
          to="/dashboard/messages"
          onClick={() => isMobile && setMobileOpen(false)}
          title={collapsed && !isMobile ? 'Messages' : undefined}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center',
            gap: collapsed && !isMobile ? 0 : 11,
            padding: collapsed && !isMobile ? '10px 6px' : '8px 12px',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            borderRadius: 8, marginBottom: 4, position: 'relative',
            color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
            background: isActive ? 'rgba(255,255,255,0.16)' : 'transparent',
            borderLeft: isActive ? '3px solid rgba(255,255,255,0.4)' : '3px solid transparent',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
            textDecoration: 'none', transition: 'all 0.18s ease',
          })}
          onMouseEnter={e => { if (!e.currentTarget.style.background.includes('0.16')) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { if (!e.currentTarget.style.background.includes('0.16')) e.currentTarget.style.background = 'transparent'; }}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <MessageSquare size={18} style={{ opacity: 0.9 }} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -8, right: -8,
                background: '#ef4444', color: 'white',
                borderRadius: 10, fontSize: 10, fontWeight: 800,
                padding: '2px 5px', minWidth: 18, textAlign: 'center',
                lineHeight: '14px', boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
              }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
          {(!collapsed || isMobile) && (
            <>
              <span>Messages</span>
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#ef4444', color: 'white',
                  borderRadius: 6, fontSize: 11, fontWeight: 800,
                  padding: '2px 7px', minWidth: 20, textAlign: 'center',
                  boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
                }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
              )}
            </>
          )}
        </NavLink>

        {/* Profil */}
        <NavLink
          to="/dashboard/profil"
          onClick={() => isMobile && setMobileOpen(false)}
          title={collapsed && !isMobile ? 'Mon profil' : undefined}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center',
            gap: collapsed && !isMobile ? 0 : 11,
            padding: collapsed && !isMobile ? '10px 6px' : '8px 12px',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            borderRadius: 8, marginBottom: 4,
            color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
            background: isActive ? 'rgba(255,255,255,0.16)' : 'transparent',
            borderLeft: isActive ? '3px solid rgba(255,255,255,0.4)' : '3px solid transparent',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
            textDecoration: 'none', transition: 'all 0.18s ease',
          })}
          onMouseEnter={e => { if (!e.currentTarget.style.background.includes('0.16')) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseLeave={e => { if (!e.currentTarget.style.background.includes('0.16')) e.currentTarget.style.background = 'transparent'; }}
        >
          <UserCircle size={18} style={{ flexShrink: 0, opacity: 0.9 }} />
          {(!collapsed || isMobile) && <span>Mon profil</span>}
        </NavLink>

        {/* User info */}
        {(!collapsed || isMobile) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', marginBottom: 6,
            background: 'rgba(255,255,255,0.08)', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: roleColor, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'white',
              boxShadow: `0 4px 12px ${roleColor}40`,
            }}>{initials}</div>
            <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.nom} {user?.prenom}
              </div>
              <span style={{
                display: 'inline-block', padding: '2px 8px',
                background: `${roleColor}25`, color: 'rgba(255,255,255,0.9)',
                borderRadius: 4, fontSize: 10, fontWeight: 700,
                border: `1px solid ${roleColor}40`, letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>{roleLabel}</span>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          title={collapsed && !isMobile ? 'Déconnexion' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed && !isMobile ? 0 : 11,
            padding: collapsed && !isMobile ? '10px 6px' : '8px 12px',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            borderRadius: 8, width: '100%',
            color: 'rgba(255,255,255,0.6)', background: 'transparent', border: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={18} style={{ flexShrink: 0, opacity: 0.9 }} />
          {(!collapsed || isMobile) && <span>Déconnexion</span>}
        </button>
      </div>
    </div>
  );

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 z-10"
        style={{ width: sidebarWidth, transition: 'width 0.2s ease' }}>
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-30 md:hidden"
        style={{
          background: 'var(--primary)', border: 'none', borderRadius: 10,
          padding: 8, color: 'white', boxShadow: 'var(--shadow-md)', cursor: 'pointer',
          minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-20 md:hidden"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-30 md:hidden" style={{ width: 260 }}>
            <button
              style={{ position: 'absolute', top: 16, right: 12, background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', zIndex: 1 }}
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
            </button>
            <SidebarContent isMobile />
          </aside>
        </>
      )}
    </>
  );
}
