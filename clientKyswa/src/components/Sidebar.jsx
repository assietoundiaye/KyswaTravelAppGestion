import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, UserCircle, MessageSquare, ChevronLeft, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MENU_BY_ROLE, ROLE_LABELS, ROLE_COLORS } from '../utils/roles';
import { useSocket } from '../hooks/useSocket';

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { unreadCount, connected } = useSocket();

  const items = MENU_BY_ROLE[role] || [];
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
      <div style={{ padding: collapsed && !isMobile ? '20px 12px' : '20px 18px 14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}>
              <img src="/logokyswa.jpg" alt="Kyswa" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
            </div>
            {(!collapsed || isMobile) && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'white', whiteSpace: 'nowrap' }}>
                  Kyswa Travel
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                  Gestion interne
                </div>
              </div>
            )}
          </div>
          {!isMobile && (
            <button onClick={() => setCollapsed(c => !c)} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6,
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 4, display: 'flex',
            }}>
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          )}
        </div>

        {/* Connexion indicator */}
        {(!collapsed || isMobile) && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: connected ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${connected ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              borderRadius: 20, padding: '3px 8px',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? '#22c55e' : '#ef4444',
                boxShadow: connected ? '0 0 6px #22c55e' : '0 0 6px #ef4444',
              }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: connected ? '#86efac' : '#fca5a5' }}>
                {connected ? 'Connecté' : 'Hors ligne'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: collapsed && !isMobile ? '10px 8px' : '10px 10px' }}>
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={`${to}-${label}`}
            to={to}
            onClick={() => isMobile && setMobileOpen(false)}
            title={collapsed && !isMobile ? label : undefined}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center',
              gap: collapsed && !isMobile ? 0 : 10,
              padding: collapsed && !isMobile ? '10px 0' : '9px 12px',
              justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
              borderRadius: 8, marginBottom: 2,
              color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
              background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--secondary)' : '3px solid transparent',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: isActive ? 600 : 400,
              textDecoration: 'none', transition: 'all 0.15s ease',
              cursor: 'pointer',
            })}
            onMouseEnter={e => { if (!e.currentTarget.style.background.includes('0.15')) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.paddingLeft = collapsed && !isMobile ? '0' : '16px'; }}
            onMouseLeave={e => { if (!e.currentTarget.style.background.includes('0.15')) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.paddingLeft = collapsed && !isMobile ? '0' : '12px'; }}
          >
            <Icon size={16} style={{ flexShrink: 0 }} />
            {(!collapsed || isMobile) && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: collapsed && !isMobile ? '10px 8px' : '10px 10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Messages with badge */}
        <NavLink
          to="/dashboard/messages"
          onClick={() => isMobile && setMobileOpen(false)}
          title={collapsed && !isMobile ? 'Messages' : undefined}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center',
            gap: collapsed && !isMobile ? 0 : 10,
            padding: collapsed && !isMobile ? '10px 0' : '9px 12px',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            borderRadius: 8, marginBottom: 2, position: 'relative',
            color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
            background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
            borderLeft: isActive ? '3px solid var(--secondary)' : '3px solid transparent',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400,
            textDecoration: 'none', transition: 'all 0.15s ease',
          })}
        >
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <MessageSquare size={16} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: '#ef4444', color: 'white',
                borderRadius: 10, fontSize: 9, fontWeight: 800,
                padding: '1px 4px', minWidth: 16, textAlign: 'center',
                lineHeight: '14px',
              }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
          {(!collapsed || isMobile) && (
            <>
              <span>Messages</span>
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#ef4444', color: 'white',
                  borderRadius: 10, fontSize: 10, fontWeight: 800,
                  padding: '1px 6px', minWidth: 18, textAlign: 'center',
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
            gap: collapsed && !isMobile ? 0 : 10,
            padding: collapsed && !isMobile ? '10px 0' : '9px 12px',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            borderRadius: 8, marginBottom: 2,
            color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
            background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
            borderLeft: isActive ? '3px solid var(--secondary)' : '3px solid transparent',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400,
            textDecoration: 'none', transition: 'all 0.15s ease',
          })}
        >
          <UserCircle size={16} style={{ flexShrink: 0 }} />
          {(!collapsed || isMobile) && <span>Mon profil</span>}
        </NavLink>

        {/* User info */}
        {(!collapsed || isMobile) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', marginBottom: 4,
            background: 'rgba(255,255,255,0.07)', borderRadius: 8,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: roleColor, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white',
            }}>{initials}</div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.nom} {user?.prenom}
              </div>
              <span style={{
                display: 'inline-block', padding: '1px 7px',
                background: `${roleColor}40`, color: 'white',
                borderRadius: 20, fontSize: 9, fontWeight: 700,
                border: `1px solid ${roleColor}60`, letterSpacing: '0.06em', textTransform: 'uppercase',
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
            gap: collapsed && !isMobile ? 0 : 10,
            padding: collapsed && !isMobile ? '10px 0' : '9px 12px',
            justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
            borderRadius: 8, width: '100%',
            color: 'rgba(255,255,255,0.5)', background: 'transparent', border: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
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
