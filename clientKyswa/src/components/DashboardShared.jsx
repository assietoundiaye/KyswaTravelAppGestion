import { useEffect, useState } from 'react';
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
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
