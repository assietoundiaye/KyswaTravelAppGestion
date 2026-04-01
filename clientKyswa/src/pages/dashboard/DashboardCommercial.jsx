import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck, CreditCard, Users, Plane, FileText,
  Calculator, TrendingDown, Briefcase, Send,
  CheckCircle, XCircle, ChevronLeft, ChevronRight, BarChart2,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { MENU_BY_ROLE } from '../../utils/roles';

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
const MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const DAY_FR = ['LUN','MAR','MER','JEU','VEN','SAM','DIM'];

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, bg }) {
  return (
    <div style={{
      background: bg, borderRadius: 'var(--radius-xl)', padding: '18px 22px', color: 'white',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0,
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color="white" />
      </div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}

// ── Line chart multi-séries ───────────────────────────────────────────────────
const SERIES_COLORS = {
  Clients: '#2563EB',
  Départs: '#EA580C',
  Inscriptions: '#7C3AED',
  Paiements: '#D97706',
};

function LineChart({ seriesData }) {
  const W = 800, H = 180, PAD = { top: 20, right: 20, bottom: 40, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const months = MONTH_SHORT;
  const n = 12;

  // Normaliser les données par mois (index 0=Jan … 11=Dec)
  const normalize = (raw) => {
    const arr = Array(12).fill(0);
    (raw || []).forEach(d => {
      const idx = (d._id?.mois || d.mois || 1) - 1;
      if (idx >= 0 && idx < 12) arr[idx] = d.count || 0;
    });
    return arr;
  };

  const series = Object.entries(seriesData).map(([name, raw]) => ({
    name,
    values: normalize(raw),
    color: SERIES_COLORS[name] || '#6B7280',
  }));

  const allVals = series.flatMap(s => s.values);
  const maxVal = Math.max(...allVals, 1);

  const xPos = (i) => PAD.left + (i / (n - 1)) * innerW;
  const yPos = (v) => PAD.top + innerH - (v / maxVal) * innerH;

  const pathD = (values) => values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(v)}`).join(' ');

  // Y axis ticks
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div className="premium-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <BarChart2 size={16} color="var(--primary)" />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
          Évolution mensuelle — {new Date().getFullYear()}
        </h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 400, height: 'auto' }}>
          {/* Grid lines */}
          {yTicks.map(v => (
            <g key={v}>
              <line x1={PAD.left} y1={yPos(v)} x2={W - PAD.right} y2={yPos(v)}
                stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
              <text x={PAD.left - 6} y={yPos(v) + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">{v}</text>
            </g>
          ))}

          {/* X axis labels */}
          {months.map((m, i) => (
            <text key={m} x={xPos(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#9CA3AF">{m}</text>
          ))}

          {/* Lines + dots */}
          {series.map(s => (
            <g key={s.name}>
              <path d={pathD(s.values)} fill="none" stroke={s.color} strokeWidth="2.5"
                strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) => (
                <circle key={i} cx={xPos(i)} cy={yPos(v)} r="4" fill={s.color} stroke="white" strokeWidth="1.5" />
              ))}
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        {series.map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 3, background: s.color, borderRadius: 2 }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>→ {s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

// ── Quick links config ────────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardCommercial() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  // dg et secretaire voient tous les rapports, les autres voient seulement le leur
  const canSeeAllRapports = ['dg', 'secretaire'].includes(role);

  const [counts, setCounts] = useState({ inscriptions: 0, paiements: 0, clients: 0, departs: 0 });
  const [chartData, setChartData] = useState({});
  const [reunions, setReunions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [users, setUsers] = useState([]);
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reservations').catch(() => ({ data: {} })),
      api.get('/paiements').catch(() => ({ data: {} })),
      api.get('/clients').catch(() => ({ data: {} })),
      api.get('/packages').catch(() => ({ data: {} })),
      api.get('/reunions').catch(() => ({ data: {} })),
      api.get('/rapports').catch(() => ({ data: {} })),
      api.get('/users').catch(() => ({ data: {} })),
      api.get('/stats').catch(() => ({ data: {} })),
    ]).then(([res, pai, cli, pkg, reu, rap, usr, stats]) => {
      const pkgArr = pkg.data.packages || [];
      const ouvert = pkgArr.filter(p => p.statut === 'OUVERT');
      setCounts({
        inscriptions: (res.data.reservations || []).length,
        paiements: (pai.data.paiements || []).length,
        clients: (cli.data.clients || []).length,
        departs: ouvert.length,
      });
      setReunions(reu.data.reunions || []);
      setPackages(ouvert);
      setRapports(rap.data.rapports || []);
      setUsers(usr.data.utilisateurs || []);

      // Données pour le graphique en courbes
      const s = stats.data || {};
      setChartData({
        Clients: s.clientsParMois || [],
        Départs: s.departsParMois || [],
        Inscriptions: s.resaParMois || [],
        Paiements: s.paiementsParMois || [],
      });
    }).finally(() => setLoading(false));
  }, []);

  // Accès rapide filtré par rôle
  const menuPaths = new Set((MENU_BY_ROLE[role] || []).map(m => m.to));
  const quickLinks = ALL_QUICK.filter(l => menuPaths.has(l.path));

  // Suivi rapports du jour
  const today = new Date();
  const rapportsToday = rapports.filter(r => isSameDay(new Date(r.date || r.createdAt), today));
  const submittedIds  = new Set(rapportsToday.map(r => String(r.agentId?._id || r.agentId || r.userId)));

  // Mon propre rapport (pour les rôles non-superviseurs)
  const myRapportToday = rapportsToday.find(r =>
    String(r.agentId?._id || r.agentId || r.userId) === String(user?.id)
  );
  // dg/secretaire : liste de tous les employés
  const staffUsers = canSeeAllRapports
    ? users.filter(u => u.role && u.role !== 'administrateur')
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <KpiCard label="Inscriptions" value={loading ? '…' : counts.inscriptions} icon={CalendarCheck} bg="#2563EB" />
        <KpiCard label="Paiements" value={loading ? '…' : counts.paiements} icon={CreditCard} bg="#00674F" />
        <KpiCard label="Clients CRM" value={loading ? '…' : counts.clients} icon={Users} bg="#7C3AED" />
        <KpiCard label="Départs" value={loading ? '…' : counts.departs} icon={Plane} bg="#EA580C" />
      </div>

      {/* Graphique en courbes */}
      <LineChart seriesData={chartData} />

      {/* Accès Rapide */}
      {quickLinks.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Send size={15} color="var(--primary)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>Accès Rapide</h2>
          </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <CalendarCheck size={15} color="var(--primary)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text-main)' }}>Calendrier des Réunions</h2>
          </div>
          <MiniCalendar reunions={reunions} packages={packages} />
        </div>

        <div className="premium-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: 'var(--text-main)', marginBottom: 18 }}>
            {canSeeAllRapports ? `Suivi des Rapports du ${todayStr()}` : 'Mon rapport du jour'}
          </h2>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</p>
          ) : canSeeAllRapports ? (
            // dg / secrétaire : liste de tous les employés
            staffUsers.length === 0 ? (
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
            )
          ) : (
            // Autres rôles : seulement leur propre rapport
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myRapportToday ? (
                <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: '#F0FDF4', border: '1px solid rgba(22,163,74,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <CheckCircle size={18} color="#16A34A" />
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#16A34A' }}>Rapport soumis aujourd'hui</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{myRapportToday.activites}</p>
                </div>
              ) : (
                <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: '#FFF9F9', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <XCircle size={18} color="#DC2626" />
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 13, color: '#DC2626' }}>Rapport non soumis</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Vous n'avez pas encore soumis votre rapport du jour.</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => navigate('/dashboard/rapports')}
                style={{ background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 8, padding: '10px 16px', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}
              >
                {myRapportToday ? 'Voir / Modifier mon rapport →' : '+ Soumettre mon rapport →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
