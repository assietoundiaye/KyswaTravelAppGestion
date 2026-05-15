import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Clock, CreditCard, TrendingUp, BarChart2,
  Plus, List, Search, ChevronDown, Trash2, X,
} from 'lucide-react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const CATEGORIES = ['LOYER','SALAIRES','FOURNITURES','TRANSPORT','COMMUNICATION','MARKETING','TAXES','AUTRE'];

const CAT_COLORS = {
  LOYER:         { bg: '#EFF6FF', color: '#2563EB',  bar: '#2563EB' },
  SALAIRES:      { bg: '#F0FDF4', color: '#16A34A',  bar: '#16A34A' },
  FOURNITURES:   { bg: '#FFFBEB', color: '#D97706',  bar: '#D97706' },
  TRANSPORT:     { bg: '#F5F3FF', color: '#7C3AED',  bar: '#7C3AED' },
  COMMUNICATION: { bg: '#FFF1F2', color: '#E11D48',  bar: '#E11D48' },
  MARKETING:     { bg: '#FEF3C7', color: '#92400E',  bar: '#B45309' },
  TAXES:         { bg: '#FEF2F2', color: '#DC2626',  bar: '#DC2626' },
  AUTRE:         { bg: '#F3F4F6', color: '#6B7280',  bar: '#9CA3AF' },
};

// Retourne "2026-05" pour le mois courant
function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(str) {
  if (!str) return 'Tous';
  const [y, m] = str.split('-');
  return `${MOIS_FR[parseInt(m, 10) - 1]} ${y}`;
}

// ── Carte KPI ────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, iconColor, label, value }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 'var(--radius-lg)',
      border: '1.5px solid var(--border)',
      padding: '28px 24px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      flex: '1 1 200px',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${iconColor}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={24} color={iconColor} />
      </div>
      <div>
        <p style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>{label}</p>
        <p style={{
          fontSize: 22, fontWeight: 800, color: 'var(--text-main)',
          lineHeight: 1, fontFamily: 'var(--font-display)',
        }}>{value}</p>
      </div>
    </div>
  );
}

export default function ComptabilitePage() {
  const today = new Date();
  const [moisSelectionne, setMoisSelectionne] = useState(currentMonthStr());
  const [voirTout, setVoirTout] = useState(false); // false = mois, true = historique total

  const [depenses, setDepenses] = useState([]);
  const [solde, setSolde] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    categorie: 'AUTRE', montant: '', description: '',
    dateDepense: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  // Mois actif pour les requêtes
  const moisParam = voirTout ? '' : moisSelectionne;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = moisParam ? { mois: moisParam } : {};
      const [d, s] = await Promise.all([
        api.get('/comptabilite/depenses', { params }),
        api.get('/comptabilite/solde', { params }),
      ]);
      setDepenses(d.data.depenses || []);
      setSolde(s.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [moisParam]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/comptabilite/depenses', { ...form, montant: Number(form.montant) });
      toast('Dépense enregistrée');
      setShowForm(false);
      setForm({ categorie: 'AUTRE', montant: '', description: '', dateDepense: new Date().toISOString().slice(0, 10) });
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/comptabilite/depenses/${confirmDeleteId}`);
      toast('Dépense supprimée');
      setConfirmDeleteId(null);
      fetchAll();
    } catch (e) {
      toast(e.response?.data?.message || 'Erreur', 'error');
    }
  };

  // Dépenses filtrées (recherche + catégorie)
  const depensesFiltrees = useMemo(() => {
    let result = depenses;
    if (filterCat) result = result.filter(d => d.categorie === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d =>
        (d.description || '').toLowerCase().includes(q) ||
        (d.categorie || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [depenses, search, filterCat]);

  // Répartition par catégorie (depuis les dépenses filtrées par mois)
  const parCategorie = useMemo(() => {
    const map = {};
    depenses.forEach(d => { map[d.categorie] = (map[d.categorie] || 0) + Number(d.montant || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [depenses]);

  const maxCat = parCategorie[0]?.[1] || 1;

  // Générer les options de mois (12 derniers mois)
  const moisOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      opts.push({ val, label: monthLabel(val) });
    }
    return opts;
  }, []);

  const marge = solde?.marge ?? 0;
  const margeColor = marge >= 50 ? '#16A34A' : marge >= 20 ? '#D97706' : '#DC2626';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={22} color="var(--primary)" /> Comptabilité
        </h1>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sélecteur de mois */}
          {!voirTout && (
            <div style={{ position: 'relative' }}>
              <select
                value={moisSelectionne}
                onChange={e => setMoisSelectionne(e.target.value)}
                className="premium-input"
                style={{ paddingRight: 32, appearance: 'none', minWidth: 160 }}
              >
                {moisOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
            </div>
          )}

          {/* Bouton Historique total / Retour mois */}
          <button
            onClick={() => setVoirTout(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: voirTout ? 'var(--primary)' : 'white',
              color: voirTout ? 'white' : 'var(--text-main)',
              border: '1.5px solid var(--border)', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <List size={15} />
            {voirTout ? 'Vue mensuelle' : 'Historique total'}
          </button>

          {/* Nouvelle dépense */}
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Plus size={15} /> Nouvelle dépense
          </button>
        </div>
      </div>

      {/* Titre période */}
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -8 }}>
        {voirTout ? 'Toutes les périodes confondues' : `Période : ${monthLabel(moisSelectionne)}`}
      </p>

      {/* ── 4 Cartes KPI ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <KpiCard
          icon={Clock} iconColor="#16A34A"
          label="Recettes ce mois"
          value={fmt(solde?.totalEncaisse || 0)}
        />
        <KpiCard
          icon={CreditCard} iconColor="#DC2626"
          label="Dépenses ce mois"
          value={fmt(solde?.totalDepenses || 0)}
        />
        <KpiCard
          icon={TrendingUp} iconColor={solde?.beneficeNet >= 0 ? '#16A34A' : '#DC2626'}
          label="Bénéfice net"
          value={fmt(solde?.beneficeNet || 0)}
        />
        {/* Marge opérationnelle */}
        <div style={{
          background: 'white', borderRadius: 'var(--radius-lg)',
          border: '1.5px solid var(--border)', padding: '28px 24px',
          boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 18,
          flex: '1 1 200px',
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: `${margeColor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BarChart2 size={24} color={margeColor} />
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Marge opérationnelle
            </p>
            <span style={{
              display: 'inline-block',
              background: `${margeColor}18`, color: margeColor,
              borderRadius: 8, padding: '4px 14px',
              fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)',
            }}>
              {marge}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Ligne du bas : Dépenses par catégorie + Historique ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, alignItems: 'start' }}>

        {/* Dépenses par catégorie */}
        <div className="premium-card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={14} color="var(--primary)" /> Dépenses par catégorie
          </h2>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</p>
          ) : parCategorie.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucune dépense</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {parCategorie.map(([cat, total]) => {
                const s = CAT_COLORS[cat] || CAT_COLORS.AUTRE;
                const pct = Math.round((total / maxCat) * 100);
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{cat}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{fmt(total)}</span>
                    </div>
                    <div style={{ height: 6, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: s.bar, borderRadius: 4,
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Historique des dépenses */}
        <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <List size={14} color="var(--primary)" /> Historique des dépenses
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>({depensesFiltrees.length})</span>
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Recherche */}
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher..."
                  className="premium-input"
                  style={{ paddingLeft: 30, fontSize: 13 }}
                />
              </div>
              {/* Filtre catégorie */}
              <div style={{ position: 'relative' }}>
                <select
                  value={filterCat}
                  onChange={e => setFilterCat(e.target.value)}
                  className="premium-input"
                  style={{ paddingRight: 28, appearance: 'none', minWidth: 120, fontSize: 13 }}
                >
                  <option value="">Toutes</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
              </div>
              {/* Effacer filtres */}
              {(search || filterCat) && (
                <button onClick={() => { setSearch(''); setFilterCat(''); }}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Chargement...</div>
            ) : depensesFiltrees.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Aucune dépense</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Catégorie</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Description</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Montant</th>
                    <th style={{ padding: '10px 16px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {depensesFiltrees.map((d, i) => {
                    const s = CAT_COLORS[d.categorie] || CAT_COLORS.AUTRE;
                    return (
                      <tr key={d._id} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(d.dateDepense)}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ background: s.bg, color: s.color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{d.categorie}</span>
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-main)' }}>{d.description || '—'}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700, color: '#DC2626', whiteSpace: 'nowrap' }}>{fmt(d.montant)}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <button onClick={() => setConfirmDeleteId(d._id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', display: 'flex', alignItems: 'center', padding: 4 }}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Total */}
                <tfoot>
                  <tr style={{ background: '#F9FAFB', borderTop: '2px solid var(--border)' }}>
                    <td colSpan={3} style={{ padding: '10px 16px', fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>
                      Total ({depensesFiltrees.length} dépense{depensesFiltrees.length > 1 ? 's' : ''})
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#DC2626' }}>
                      {fmt(depensesFiltrees.reduce((s, d) => s + Number(d.montant || 0), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal nouvelle dépense ── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle dépense">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="input-label">Catégorie *</label>
              <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} className="premium-input">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Montant (FCFA) *</label>
              <input type="number" min="0" value={form.montant}
                onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                className="premium-input" required placeholder="0" />
            </div>
            <div>
              <label className="input-label">Date *</label>
              <input type="date" value={form.dateDepense}
                onChange={e => setForm(f => ({ ...f, dateDepense: e.target.value }))}
                className="premium-input" required />
            </div>
            <div>
              <label className="input-label">Description</label>
              <input value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="premium-input" placeholder="Détail de la dépense..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Supprimer cette dépense ? Cette action est irréversible."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
