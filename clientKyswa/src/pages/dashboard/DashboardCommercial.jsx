import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck, CreditCard, Users, Plane, FileText,
  Calculator, TrendingDown, Briefcase, Send,
  CheckCircle, XCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../../core/api/axios';
import { useAuth } from '../../context/AuthContext';
import { MENU_BY_ROLE } from '../../utils/roles';
import usePermissions from '../../hooks/usePermissions';

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

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, bg }) {
  return (
    <div style={{
      background: bg, 
      borderRadius: 'var(--radius-xl)', 
      padding: '32px 28px', 
      color: 'white',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)',
      display: 'flex', 
      alignItems: 'center', 
      gap: 20, 
      flex: 1, 
      minWidth: 0,
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.16), 0 6px 12px rgba(0,0,0,0.1)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0px)';
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08)';
    }}
    >
      <div style={{ 
        width: 56, 
        height: 56, 
        borderRadius: 16, 
        background: 'rgba(255,255,255,0.2)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexShrink: 0,
        backdropFilter: 'blur(10px)'
      }}>
        <Icon size={28} color="white" />
      </div>
      <div>
        <p style={{ 
          fontSize: 12, 
          fontWeight: 700, 
          opacity: 0.9, 
          textTransform: 'uppercase', 
          letterSpacing: '0.08em', 
          marginBottom: 8 
        }}>{label}</p>
        <p style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: 38, 
          fontWeight: 900, 
          lineHeight: 1 
        }}>{value}</p>
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
  const departDates  = new Set(packages.map(p => { const d = new Date(p.date_depart || p.dateDepart); return key(d); }));

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
  { label: 'Inscriptions',    icon: CalendarCheck, color: '#2563EB', path: '/dashboard/reservations', module: 'reservations' },
  { label: 'Paiements',       icon: CreditCard,    color: '#00674F', path: '/dashboard/paiements', module: 'paiements' },
  { label: 'Comptabilité',    icon: Calculator,    color: '#7C3AED', path: '/dashboard/comptabilite', module: 'comptabilite' },
  { label: 'Bilan Départs',   icon: Briefcase,     color: '#EA580C', path: '/dashboard/bilan', module: 'rapports' },
  { label: 'Clients CRM',     icon: Users,         color: '#0891B2', path: '/dashboard/clients', module: 'clients' },
  { label: 'Recouvrement',    icon: TrendingDown,  color: '#DC2626', path: '/dashboard/recouvrement', module: 'recouvrement' },
  { label: 'Secrétariat',     icon: FileText,      color: '#6B7280', path: '/dashboard/documents', module: 'documents' },
  { label: 'Messages Groupés',icon: Send,          color: '#D97706', path: '/dashboard/messages', module: null }, // Messages accessible à tous
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardCommercial() {
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const { canViewModule } = usePermissions();
  // dg et secretaire voient tous les rapports, les autres voient seulement le leur
  const canSeeAllRapports = ['dg', 'secretaire'].includes(role);

  const [counts, setCounts] = useState({ inscriptions: 0, paiements: 0, clients: 0, departs: 0 });
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
      api.get('/rapports/dashboard').catch(() => ({ data: { employes: [], stats: {} } })),
      api.get('/users').catch(() => ({ data: {} })),
    ]).then(([res, pai, cli, pkg, reu, rap, usr]) => {
      const pkgArr = pkg.data.packages || pkg.data.data || [];
      const departures = pkgArr.filter(p => p.statut === 'OUVERT' || p.actif !== false);
      setCounts({
        inscriptions: res.data.total !== undefined ? res.data.total : (res.data.reservations || res.data.data || []).length,
        paiements: pai.data.total !== undefined ? pai.data.total : (pai.data.paiements || pai.data.data || []).length,
        clients: cli.data.total !== undefined ? cli.data.total : (cli.data.clients || cli.data.data || []).length,
        departs: pkg.data.total !== undefined ? pkg.data.total : departures.length,
      });
      setReunions(reu.data.reunions || reu.data.data || []);
      setPackages(departures);
      
      // Traitement des données de rapports depuis la nouvelle route dashboard
      if (rap.data && rap.data.employes) {
        if (canSeeAllRapports) {
          // Pour les admins: afficher tous les employés avec leur statut de rapport
          setRapports(rap.data.employes);
        } else {
          // Pour les utilisateurs normaux: afficher seulement leurs données
          const userEmploye = rap.data.employes.find(e => 
            (e.employe && (e.employe.id === user?.id || e.employe._id === user?.id)) ||
            (e.agentId && (e.agentId.id === user?.id || e.agentId._id === user?.id)) ||
            e.id === user?.id || e._id === user?.id
          ) || (rap.data.employes.length > 0 ? rap.data.employes[0] : null);
          setRapports(userEmploye ? [userEmploye] : []);
        }
      } else {
        setRapports([]);
      }
      
      setUsers(usr.data.utilisateurs || []);
    }).finally(() => setLoading(false));
  }, []);

  // Accès rapide filtré par permissions dynamiques
  const isSuper = ['dg', 'administrateur', 'informatique', 'admin'].includes(role?.toLowerCase());
  const quickLinks = ALL_QUICK.filter(l => {
    if (isSuper) return true;
    if (l.module) return canViewModule(l.module);
    return true;
  });

  // KPI filtrés selon les permissions
  const kpiData = [
    { module: 'reservations', label: 'Inscriptions', value: counts.inscriptions, icon: CalendarCheck, bg: '#2563EB' },
    { module: 'paiements', label: 'Paiements', value: counts.paiements, icon: CreditCard, bg: '#00674F' },
    { module: 'clients', label: 'Clients CRM', value: counts.clients, icon: Users, bg: '#7C3AED' },
    { module: 'packages', label: 'Départs', value: counts.departs, icon: Plane, bg: '#EA580C' }
  ].filter(kpi => canViewModule(kpi.module));

  // Suivi rapports du jour - Logique résiliente
  const rapportsToday = canSeeAllRapports ? rapports : rapports.filter(r => (r.employe?.id === user?.id || r.agentId?._id === user?.id || r.id === user?.id));
  const myRapportToday = canSeeAllRapports ? null : (rapports.length > 0 ? rapports[0] : null);
  // Pour les admins: utiliser les données du serveur
  const staffUsers = canSeeAllRapports ? rapports : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingTop: 24 }}>

      {/* Section "Vue d'ensemble" avec titre */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: '50%', 
            background: 'var(--primary)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,103,79,0.2)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h2 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: 20, 
            fontWeight: 800, 
            color: 'var(--text-main)',
            margin: 0,
            letterSpacing: '-0.01em'
          }}>
            Vue d'ensemble
          </h2>
        </div>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
          {kpiData.map(kpi => (
            <KpiCard 
              key={kpi.module}
              label={kpi.label} 
              value={loading ? '…' : kpi.value} 
              icon={kpi.icon} 
              bg={kpi.bg} 
            />
          ))}
        </div>
      </div>

      {/* Accès Rapide */}
      {quickLinks.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: '50%', 
              background: 'var(--primary)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,103,79,0.2)'
            }}>
              <Send size={20} color="white" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>Accès Rapide</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {quickLinks.map(l => (
              <QuickBtn key={l.label} label={l.label} icon={l.icon} color={l.color} onClick={() => navigate(l.path)} />
            ))}
          </div>
        </section>
      )}

      {/* Calendrier + Rapports */}
      <div className="grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 24, alignItems: 'start' }}>
        <div className="premium-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: '50%', 
              background: 'var(--primary)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,103,79,0.2)'
            }}>
              <CalendarCheck size={20} color="white" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>Calendrier des Réunions</h2>
          </div>
          <MiniCalendar reunions={reunions} packages={packages} />
        </div>

        <div className="premium-card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ 
              width: 40, height: 40, borderRadius: '50%', 
              background: 'var(--primary)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,103,79,0.2)'
            }}>
              <FileText size={20} color="white" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
              {canSeeAllRapports ? `Suivi des Rapports du ${todayStr()}` : 'Mon rapport du jour'}
            </h2>
          </div>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</p>
          ) : canSeeAllRapports ? (
            // dg / secrétaire : liste de tous les employés
            staffUsers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Aucun employé trouvé pour aujourd'hui.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {staffUsers.map(employe => {
                  const submitted = employe.statut === 'RENDU';
                  const initials = `${(employe.employe.prenom||'')[0]||''}${(employe.employe.nom||'')[0]||''}`.toUpperCase() || '?';
                  return (
                    <div key={employe.employe.id} style={{
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
                          {employe.employe.prenom} {employe.employe.nom}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                          {employe.employe.role} - {submitted ? 'Rapport soumis' : 'Aucun rapport soumis'}
                        </p>
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
              {myRapportToday && myRapportToday.statut === 'RENDU' ? (
                <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-md)', background: '#F0FDF4', border: '1px solid rgba(22,163,74,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <CheckCircle size={18} color="#16A34A" />
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#16A34A' }}>Rapport soumis aujourd'hui</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                    {myRapportToday.rapport?.activites || 'Activités du jour...'}
                  </p>
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
                {myRapportToday && myRapportToday.statut === 'RENDU' ? 'Voir / Modifier mon rapport' : '+ Soumettre mon rapport'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
