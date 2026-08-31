import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck, CreditCard, Users, FileText,
  Calculator, TrendingDown, Briefcase, Send,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../core/api/axios';
import { useAuth } from '../context/AuthContext';
import { MENU_BY_ROLE } from '../utils/roles';
import usePermissions from '../hooks/usePermissions';

// ── helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};
const isSameDay = (a, b) => {
  if (!a || !b) return false;
  const dateA = new Date(a);
  const dateB = new Date(b);
  return dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate();
};

const MONTH_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAY_FR = ['LUN','MAR','MER','JEU','VEN','SAM','DIM'];

// Helper functions pour les couleurs et badges
const getRoleBadgeColor = (role) => {
  const colors = {
    commercial: { bg: '#EBF8FF', text: '#2563EB' },
    social: { bg: '#F3E8FF', text: '#7C3AED' },
    administrateur: { bg: '#FEF3C7', text: '#D97706' },
    comptable: { bg: '#ECFDF5', text: '#059669' },
    secretaire: { bg: '#FEE2E2', text: '#DC2626' },
    billets: { bg: '#F0F9FF', text: '#0891B2' },
    ziara: { bg: '#FEFCE8', text: '#CA8A04' },
    oumra: { bg: '#F0FDF4', text: '#16A34A' }
  };
  return colors[role] || { bg: '#F3F4F6', text: '#6B7280' };
};

const getStatutColor = (statut) => {
  const colors = {
    PRODUCTIF: { bg: '#DCFCE7', text: '#166534' },
    NORMAL: { bg: '#E0F2FE', text: '#075985' },
    DIFFICILE: { bg: '#FED7D7', text: '#C53030' },
    TELETRAVAIL: { bg: '#E0E7FF', text: '#5B21B6' },
    ABSENT: { bg: '#F3F4F6', text: '#6B7280' }
  };
  return colors[statut] || { bg: '#F3F4F6', text: '#6B7280' };
};

// ── Quick button ──────────────────────────────────────────────────────────────
function QuickBtn({ label, icon: Icon, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'white', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer', transition: 'all 0.18s ease', boxShadow: 'var(--shadow-sm)', textAlign: 'left',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>{label}</span>
    </button>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function MiniCalendar({ reunions = [], packages = [] }) {
  const navigate = useNavigate();
  const today = new Date();
  const [cur, setCur] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState(today);

  const prev = () => setCur(c => { const d = new Date(c.year, c.month - 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const next = () => setCur(c => { const d = new Date(c.year, c.month + 1, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const goToToday = () => { setCur({ year: today.getFullYear(), month: today.getMonth() }); setSelectedDate(today); };

  const firstDay = new Date(cur.year, cur.month, 1);
  const lastDay = new Date(cur.year, cur.month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(cur.year, cur.month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const key = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';

  // Indexer les réunions par jour
  const reunionsByDay = useMemo(() => {
    const map = new Map();
    reunions.forEach(r => {
      const raw = r.dateReunion || r.date_reunion || r.date || r.createdAt || r.created_at;
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const k = key(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return map;
  }, [reunions]);

  // Indexer les départs par jour
  const departsByDay = useMemo(() => {
    const map = new Map();
    packages.forEach(p => {
      const raw = p.date_depart || p.dateDepart || p.date;
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const k = key(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(p);
    });
    return map;
  }, [packages]);

  // Événements du jour sélectionné
  const selKey = selectedDate ? key(selectedDate) : '';
  const dayReunions = (selKey && reunionsByDay.get(selKey)) || [];
  const dayDeparts = (selKey && departsByDay.get(selKey)) || [];
  const totalEventsToday = dayReunions.length + dayDeparts.length;

  // Tous les événements du mois affiché
  const monthEvents = useMemo(() => {
    const list = [];
    reunions.forEach(r => {
      const raw = r.dateReunion || r.date_reunion || r.date || r.createdAt;
      if (!raw) return;
      const d = new Date(raw);
      if (!isNaN(d.getTime()) && d.getFullYear() === cur.year && d.getMonth() === cur.month) {
        list.push({ type: 'reunion', item: r, date: d });
      }
    });
    packages.forEach(p => {
      const raw = p.date_depart || p.dateDepart;
      if (!raw) return;
      const d = new Date(raw);
      if (!isNaN(d.getTime()) && d.getFullYear() === cur.year && d.getMonth() === cur.month) {
        list.push({ type: 'depart', item: p, date: d });
      }
    });
    return list.sort((a, b) => a.date - b.date);
  }, [reunions, packages, cur]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Navigation Mois / Année */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prev} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={16} color="var(--text-muted)" />
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--text-main)' }}>
            {MONTH_FR[cur.month]} {cur.year}
          </span>
          <button onClick={next} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={16} color="var(--text-muted)" />
          </button>
        </div>
        <button onClick={goToToday} style={{ background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: 'var(--primary)', cursor: 'pointer' }}>
          Aujourd'hui
        </button>
      </div>

      {/* Grille des jours */}
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 6 }}>
          {DAY_FR.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', padding: '4px 0', letterSpacing: '0.05em' }}>
              {d}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} style={{ minHeight: 40 }} />;
            const isToday = isSameDay(day, today);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const k = key(day);
            const rList = reunionsByDay.get(k) || [];
            const dList = departsByDay.get(k) || [];
            const hasR = rList.length > 0;
            const hasD = dList.length > 0;

            return (
              <button
                key={k}
                type="button"
                onClick={() => setSelectedDate(day)}
                style={{
                  minHeight: 44,
                  padding: '4px 2px',
                  borderRadius: 10,
                  border: isSelected ? '2px solid var(--primary)' : isToday ? '2px solid #16A34A' : '1px solid transparent',
                  background: isSelected ? 'rgba(0,103,79,0.12)' : isToday ? '#F0FDF4' : 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <span style={{
                  fontSize: 13,
                  fontWeight: isSelected || isToday ? 800 : 500,
                  color: isSelected ? 'var(--primary)' : isToday ? '#16A34A' : 'var(--text-main)'
                }}>
                  {day.getDate()}
                </span>
                {(hasR || hasD) && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 2 }}>
                    {hasR && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} title={`${rList.length} réunion(s)`} />}
                    {hasD && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EA580C', display: 'inline-block' }} title={`${dList.length} départ(s)`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--text-main)', fontWeight: 600 }}>Réunion</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EA580C', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--text-main)', fontWeight: 600 }}>Départ groupe</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/dashboard/reunions')}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
        >
          + Gérer les réunions
        </button>
      </div>

      {/* Détail du jour sélectionné ou prochains événements */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          {selectedDate
            ? `Événements du ${selectedDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })}`
            : 'Événements du mois'}
        </div>

        {totalEventsToday > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dayReunions.map((r, idx) => {
              const raw = r.dateReunion || r.date_reunion || r.date || r.createdAt;
              const time = raw ? new Date(raw).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div
                  key={r._id || r.id || idx}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                    borderRadius: 'var(--radius-md)', background: '#EFF6FF', border: '1px solid rgba(37,99,235,0.2)'
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1E40AF' }}>{r.titre}</div>
                    <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 2 }}>
                      {time && <strong>{time}</strong>} {r.lieu ? `• ${r.lieu}` : ''}
                    </div>
                  </div>
                </div>
              );
            })}

            {dayDeparts.map((p, idx) => (
              <div
                key={p._id || p.id || idx}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                  borderRadius: 'var(--radius-md)', background: '#FFF7ED', border: '1px solid rgba(234,88,12,0.2)'
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EA580C', marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#9A3412' }}>{p.nomReference || p.nom_depart}</div>
                  <div style={{ fontSize: 11, color: '#EA580C', marginTop: 2 }}>
                    Départ groupe • {p.type || p.service || 'Voyage'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : monthEvents.length > 0 ? (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
              Aucun événement ce jour. Prochains événements en {MONTH_FR[cur.month]} :
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
              {monthEvents.slice(0, 4).map((ev, idx) => {
                const isReunion = ev.type === 'reunion';
                const dateStr = ev.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                const timeStr = ev.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const title = isReunion ? ev.item.titre : (ev.item.nomReference || ev.item.nom_depart);
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 8,
                      background: isReunion ? '#EFF6FF' : '#FFF7ED',
                      fontSize: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isReunion ? '#2563EB' : '#EA580C', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, color: isReunion ? '#1E40AF' : '#9A3412', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {title}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                      {dateStr} {timeStr !== '00:00' ? timeStr : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 8px', color: 'var(--text-muted)', fontSize: 12 }}>
            Aucune réunion ni départ prévu pour ce mois.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quick links config per role ───────────────────────────────────────────────
const ALL_QUICK = [
  { label: 'Inscriptions',    icon: CalendarCheck, color: '#2563EB', path: '/dashboard/reservations' },
  { label: 'Paiements',       icon: CreditCard,    color: '#00674F', path: '/dashboard/paiements' },
  { label: 'Comptabilité',    icon: Calculator,    color: '#7C3AED', path: '/dashboard/comptabilite' },
  { label: 'Bilan Départs',   icon: Briefcase,     color: '#EA580C', path: '/dashboard/bilan' },
  { label: 'Clients CRM',     icon: Users,         color: '#0891B2', path: '/dashboard/clients' },
  { label: 'Recouvrement',    icon: TrendingDown,  color: '#DC2626', path: '/dashboard/recouvrement' },
  { label: 'Secrétariat',     icon: FileText,      color: '#6B7280', path: '/dashboard/documents' },
  { label: 'Messages Groupés',icon: Send,          color: '#D97706', path: '/dashboard/messages' },
];

// ── Main exported component ───────────────────────────────────────────────────
export default function DashboardShared() {
  const navigate = useNavigate();
  const { role } = useAuth();

  const [reunions, setReunions]   = useState([]);
  const [packages, setPackages]   = useState([]);
  const [users, setUsers]         = useState([]);
  const [rapports, setRapports]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const [dashboardData, setDashboardData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Utiliser la nouvelle route dashboard optimisée
        const [reunionsRes, packagesRes, dashboardRes] = await Promise.all([
          api.get('/reunions').catch(() => ({ data: { reunions: [] } })),
          api.get('/packages').catch(() => ({ data: { packages: [] } })),
          api.get('/rapports/dashboard').catch(err => {
            console.error('Erreur dashboard route:', err);
            return { data: null };
          })
        ]);

        const pkgArr = packagesRes.data.packages || [];
        setReunions(reunionsRes.data.reunions || []);
        setPackages(pkgArr.filter(p => p.statut === 'OUVERT'));
        setDashboardData(dashboardRes.data);
        
        // Pour compatibilité avec l'ancien code
        if (dashboardRes.data) {
          setRapports(dashboardRes.data.employes
            .filter(e => e.rapport)
            .map(e => ({...e.rapport, agentId: e.employe}))
          );
          setUsers(dashboardRes.data.employes.map(e => e.employe));
        }

      } catch (error) {
        console.error('Erreur lors du chargement du dashboard:', error);
        setDashboardData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Actualisation automatique toutes les 2 minutes
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshKey]);

  // Accès rapide filtré par permissions dynamiques
  const { canViewModule } = usePermissions();
  const isSuper = ['dg', 'administrateur', 'informatique', 'admin'].includes(role?.toLowerCase());
  const quickLinks = ALL_QUICK.filter(l => {
    if (isSuper) return true;
    if (l.module) return canViewModule(l.module);
    return true;
  });

  return (
    <>
      {/* Accès Rapide */}
      {quickLinks.length > 0 && (
        <section>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--text-main)', marginBottom: 14 }}>
            Accès Rapide
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {quickLinks.map(l => (
              <QuickBtn key={l.label} label={l.label} icon={l.icon} color={l.color} onClick={() => navigate(l.path)} />
            ))}
          </div>
        </section>
      )}

      {/* Calendrier + Rapports */}
      <div className="grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20, alignItems: 'start' }}>
        <div className="premium-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginBottom: 18 }}>
            Calendrier des Réunions
          </h2>
          <MiniCalendar reunions={reunions} packages={packages} />
        </div>

        <div className="premium-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>
              Suivi des Rapports du {todayStr()}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                Actualisé: {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button 
                onClick={() => {
                  setRefreshKey(prev => prev + 1);
                }}
                style={{
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: 'white',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                ↻ Actualiser
              </button>
            </div>
          </div>

          {/* Statistiques globales */}
          {dashboardData?.stats && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
              gap: 8, 
              marginBottom: 16,
              padding: 12,
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>
                  {dashboardData.stats.rapportsRendus}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Rendus</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--secondary)' }}>
                  {dashboardData.stats.totalEmployes}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Total</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: dashboardData.stats.tauxCompletion >= 80 ? '#16A34A' : '#FB923C' }}>
                  {dashboardData.stats.tauxCompletion}%
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Taux</div>
              </div>
            </div>
          )}

          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</p>
          ) : !dashboardData ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
              <p style={{ fontSize: 13 }}>Impossible de charger les données des rapports.</p>
              <button 
                onClick={() => setRefreshKey(prev => prev + 1)}
                style={{
                  background: 'var(--primary)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: 'white',
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginTop: 8
                }}
              >
                Réessayer
              </button>
            </div>
          ) : dashboardData.employes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun employé trouvé.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dashboardData.employes.map(employeData => {
                const { employe, rapport, statut } = employeData;
                const submitted = statut === 'RENDU';
                const initials = `${(employe.prenom||'')[0]||''}${(employe.nom||'')[0]||''}`.toUpperCase() || '?';
                
                return (
                  <div 
                    key={employe.id} 
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: submitted ? '#F0FDF4' : '#FFF7ED',
                      borderColor: submitted ? '#16A34A' : '#FB923C',
                      cursor: submitted ? 'pointer' : 'default'
                    }}
                    onClick={submitted ? () => {
                      // TODO: Ouvrir modale de détail du rapport
                      console.log('Ouvrir détails rapport:', rapport);
                    } : undefined}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: submitted ? '#16A34A' : '#FB923C',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, flexShrink: 0,
                    }}>{initials}</div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <p style={{ 
                          fontWeight: 700, fontSize: 13, color: 'var(--text-main)', 
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                        }}>
                          {employe.prenom} {employe.nom}
                        </p>
                        <span style={{
                          fontSize: 10, padding: '2px 6px', borderRadius: 4,
                          background: getRoleBadgeColor(employe.role).bg,
                          color: getRoleBadgeColor(employe.role).text,
                          fontWeight: 600
                        }}>
                          {employe.role.toUpperCase()}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {submitted ? '✅ Rapport rendu' : '⏳ En attente'}
                        </p>
                        
                        {rapport?.statutJournee && (
                          <span style={{
                            fontSize: 10, padding: '1px 4px', borderRadius: 3,
                            background: getStatutColor(rapport.statutJournee).bg,
                            color: getStatutColor(rapport.statutJournee).text
                          }}>
                            {rapport.statutJournee}
                          </span>
                        )}
                        
                        {rapport?.metriques && Object.keys(rapport.metriques).length > 0 && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {Object.entries(rapport.metriques).slice(0, 2).map(([key, value]) => (
                              <span key={key} style={{ fontSize: 10, color: 'var(--primary)' }}>
                                {value} {key}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {rapport?.activites && (
                        <p style={{ 
                          fontSize: 11, color: 'var(--text-muted)', marginTop: 4,
                          fontStyle: 'italic', lineHeight: 1.3
                        }}>
                          "{rapport.activites}"
                        </p>
                      )}
                    </div>
                    
                    {submitted ? <CheckCircle size={20} color="#16A34A" /> : <XCircle size={20} color="#FB923C" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
