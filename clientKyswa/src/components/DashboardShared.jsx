import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck, CreditCard, Users, FileText,
  Calculator, TrendingDown, Briefcase, Send,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { MENU_BY_ROLE } from '../utils/roles';

// ── helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const MONTH_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAY_FR = ['LUN','MAR','MER','JEU','VEN','SAM','DIM'];

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
function MiniCalendar({ reunions, packages }) {
  const today = new Date();
  const [cur, setCur] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const prev = () => setCur(c => { const d = new Date(c.year, c.month-1, 1); return { year: d.getFullYear(), month: d.getMonth() }; });
  const next = () => setCur(c => { const d = new Date(c.year, c.month+1, 1); return { year: d.getFullYear(), month: d.getMonth() }; });

  const firstDay = new Date(cur.year, cur.month, 1);
  const lastDay  = new Date(cur.year, cur.month+1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(cur.year, cur.month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const key = d => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const reunionDates = new Set(reunions.map(r => { const d = new Date(r.date || r.dateReunion || r.createdAt); return key(d); }));
  const departDates  = new Set(packages.map(p => { const d = new Date(p.dateDepart); return key(d); }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prev} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={16} color="var(--text-muted)" />
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{MONTH_FR[cur.month]} {cur.year}</span>
        <button onClick={next} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={16} color="var(--text-muted)" />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_FR.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0', letterSpacing: '0.05em' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const isToday = isSameDay(day, today);
          const hasR = reunionDates.has(key(day));
          const hasD = departDates.has(key(day));
          return (
            <div key={key(day)} style={{ textAlign: 'center', padding: '6px 2px', borderRadius: 8, border: isToday ? '2px solid #16A34A' : '2px solid transparent', background: isToday ? '#F0FDF4' : 'transparent' }}>
              <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? '#16A34A' : 'var(--text-main)' }}>{day.getDate()}</span>
              {(hasR || hasD) && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                  {hasR && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />}
                  {hasD && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EA580C', display: 'inline-block' }} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Réunion</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EA580C', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Pré-Départ</span>
        </div>
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

  useEffect(() => {
    Promise.all([
      api.get('/reunions').catch(() => ({ data: {} })),
      api.get('/packages').catch(() => ({ data: {} })),
      api.get('/rapports').catch(() => ({ data: {} })),
      api.get('/users').catch(() => ({ data: {} })),
    ]).then(([reu, pkg, rap, usr]) => {
      const pkgArr = pkg.data.packages || [];
      setReunions(reu.data.reunions || []);
      setPackages(pkgArr.filter(p => p.statut === 'OUVERT'));
      setRapports(rap.data.rapports || []);
      setUsers(usr.data.utilisateurs || []);
    }).finally(() => setLoading(false));
  }, []);

  // Filter quick links to only those accessible by this role
  const menuPaths = new Set((MENU_BY_ROLE[role] || []).map(m => m.to));
  const quickLinks = ALL_QUICK.filter(l => menuPaths.has(l.path));

  // Today's rapports
  const today = new Date();
  const rapportsToday = rapports.filter(r => isSameDay(new Date(r.date || r.createdAt), today));
  const submittedIds  = new Set(rapportsToday.map(r => String(r.agentId?._id || r.agentId || r.userId)));
  const staffUsers    = users.filter(u => u.role && u.role !== 'administrateur');

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        <div className="premium-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginBottom: 18 }}>
            Calendrier des Réunions
          </h2>
          <MiniCalendar reunions={reunions} packages={packages} />
        </div>

        <div className="premium-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginBottom: 18 }}>
            Suivi des Rapports du {todayStr()}
          </h2>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</p>
          ) : staffUsers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun employé trouvé.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {staffUsers.map(u => {
                const uid = String(u._id || u.id);
                const submitted = submittedIds.has(uid);
                const initials = `${(u.prenom||'')[0]||''}${(u.nom||'')[0]||''}`.toUpperCase() || '?';
                return (
                  <div key={uid} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: submitted ? '#F0FDF4' : '#FFF9F9',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: submitted ? '#16A34A' : '#DC2626',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 13, flexShrink: 0,
                    }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {u.prenom} {u.nom}
                      </p>
                      {!submitted && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Aucun rapport soumis pour le moment.</p>}
                    </div>
                    {submitted ? <CheckCircle size={20} color="#16A34A" /> : <XCircle size={20} color="#DC2626" />}
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
