import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Calculator, TrendingUp, TrendingDown, DollarSign,
  Plus, Trash2, RefreshCw, Filter, X, ChevronDown,
  Receipt, AlertCircle, BarChart3, Wallet
} from 'lucide-react';
import api from '../../../core/api/axios';
import PermissionGuard from '../../../components/PermissionGuard';
import ConfirmDialog from '../../../components/ConfirmDialog';
import Modal from '../../../components/Modal';
import Pagination from '../../../components/Pagination';
import { toast } from '../../../components/Toast';
import { usePermissions } from '../../../hooks/usePermissions';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const currentMonth = () => new Date().toISOString().slice(0, 7); // "2026-08"

const CATEGORIES = [
  'Transport', 'Loyer', 'Salaires', 'Publicité', 'Fournitures',
  'Téléphone', 'Internet', 'Repas', 'Impôts', 'Assurance', 'Autres',
];
const MODES = ['Espèces', 'Virement', 'Chèque', 'Orange Money', 'Wave'];

// ─── Composant principal ──────────────────────────────────────────────────────
export default function ComptabilitePage() {
  return (
    <PermissionGuard module="comptabilite" action="view">
      <ComptabilitePageContent />
    </PermissionGuard>
  );
}

function ComptabilitePageContent() {
  const { canCreate, canDelete: checkCanDelete } = usePermissions();
  const canAdd    = canCreate('comptabilite');
  const canRemove = checkCanDelete('comptabilite');

  // ── State ──────────────────────────────────────────────────────────────────
  const [stats, setStats]       = useState(null);
  const [solde, setSolde]       = useState(null);
  const [depenses, setDepenses] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [moisFilter, setMoisFilter] = useState('');           // "" = tout
  const [moisSolde,  setMoisSolde]  = useState('');           // "" = tout
  const [catFilter,  setCatFilter]  = useState('');

  const [showForm,   setShowForm]   = useState(false);
  const [confirmId,  setConfirmId]  = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [form, setForm] = useState({
    categorie: 'Autres',
    montant: '',
    description: '',
    dateDepense: new Date().toISOString().split('T')[0],
    mode_paiement: 'Espèces',
    beneficiaire: '',
  });

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, soldeRes, depRes] = await Promise.all([
        api.get('/comptabilite/stats'),
        api.get(`/comptabilite/solde${moisSolde ? `?mois=${moisSolde}` : ''}`),
        api.get(`/comptabilite/depenses${moisFilter ? `?mois=${moisFilter}` : ''}`),
      ]);
      setStats(statsRes.data);
      setSolde(soldeRes.data);
      setDepenses(depRes.data.depenses || depRes.data.data || []);
    } catch (e) {
      setError('Erreur lors du chargement des données comptables');
    } finally {
      setLoading(false);
    }
  }, [moisFilter, moisSolde]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Pagination des dépenses ───────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const depensesFiltrees = useMemo(() => {
    return depenses.filter(d => {
      if (catFilter && d.categorie !== catFilter) return false;
      return true;
    });
  }, [depenses, catFilter]);

  const paginatedDepenses = useMemo(() => {
    const start = (page - 1) * limit;
    return depensesFiltrees.slice(start, start + limit);
  }, [depensesFiltrees, page, limit]);

  const totalPages = Math.ceil(depensesFiltrees.length / limit) || 1;

  const totalDepFiltrees = depensesFiltrees.reduce((sum, d) => sum + (Number(d.montant) || 0), 0);

  // ── Ajout dépense ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.montant || isNaN(+form.montant) || +form.montant <= 0) {
      toast.error('Montant invalide');
      return;
    }
    setSaving(true);
    try {
      await api.post('/comptabilite/depenses', {
        ...form,
        montant: parseInt(form.montant, 10),
      });
      toast.success('Dépense ajoutée avec succès');
      setShowForm(false);
      setForm({
        categorie: 'Autres', montant: '', description: '',
        dateDepense: new Date().toISOString().split('T')[0],
        mode_paiement: 'Espèces', beneficiaire: '',
      });
      fetchAll();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  // ── Suppression ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await api.delete(`/comptabilite/depenses/${confirmId}`);
      toast.success('Dépense supprimée');
      setConfirmId(null);
      fetchAll();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl">
            <Calculator className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Comptabilité</h1>
            <p className="text-sm text-gray-500">Suivi financier en temps réel</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAll}
            className="btn-outline flex items-center gap-2 text-sm"
            title="Actualiser"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          {canAdd && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouvelle dépense
            </button>
          )}
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* ── KPI Globaux (toujours sur tout) ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Vue globale
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Recettes totales"
            value={loading ? '…' : fmt(stats?.totalEncaisse)}
            icon={<TrendingUp className="w-5 h-5" />}
            color="green"
            sub={loading ? '' : `${stats?.nbPaiements || 0} paiements`}
          />
          <KpiCard
            label="Dépenses totales"
            value={loading ? '…' : fmt(stats?.totalDepenses)}
            icon={<TrendingDown className="w-5 h-5" />}
            color="red"
            sub={loading ? '' : `${stats?.nbDepenses || 0} entrées`}
          />
          <KpiCard
            label="Bénéfice net"
            value={loading ? '…' : fmt(stats?.beneficeNet)}
            icon={<DollarSign className="w-5 h-5" />}
            color={(stats?.beneficeNet || 0) >= 0 ? 'primary' : 'red'}
            sub=""
          />
          <KpiCard
            label="Marge nette"
            value={loading ? '…' : `${stats?.marge ?? 0} %`}
            icon={<BarChart3 className="w-5 h-5" />}
            color="blue"
            sub="sur recettes"
          />
        </div>
      </div>

      {/* ── Solde par mois ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-gray-800">Solde par période</h2>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Mois&nbsp;:</label>
            <input
              type="month"
              value={moisSolde}
              onChange={e => setMoisSolde(e.target.value)}
              className="input text-sm py-1.5 px-2"
            />
            {moisSolde && (
              <button onClick={() => setMoisSolde('')} className="text-gray-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="h-16 flex items-center justify-center text-gray-400 text-sm">Chargement…</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SoldeItem label="Encaissé" value={fmt(solde?.totalEncaisse)} color="text-green-600" />
            <SoldeItem label="Dépenses" value={fmt(solde?.totalDepenses)} color="text-red-600" />
            <SoldeItem
              label="Bénéfice net"
              value={fmt(solde?.beneficeNet)}
              color={(solde?.beneficeNet || 0) >= 0 ? 'text-primary' : 'text-red-600'}
            />
            <SoldeItem label="Marge" value={`${solde?.marge ?? 0} %`} color="text-blue-600" />
          </div>
        )}
      </div>

      {/* ── Liste des dépenses ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Header + filtres */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-800">
              Dépenses
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({depensesFiltrees.length} entrée{depensesFiltrees.length !== 1 ? 's' : ''})
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtre mois */}
            <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="month"
                value={moisFilter}
                onChange={e => setMoisFilter(e.target.value)}
                className="text-sm border-none outline-none bg-transparent"
                placeholder="Tous"
              />
              {moisFilter && (
                <button onClick={() => setMoisFilter('')} className="text-gray-400 hover:text-red-500 ml-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtre catégorie */}
            <div className="relative flex items-center border border-gray-200 rounded-lg px-3 py-1.5">
              <select
                value={catFilter}
                onChange={e => setCatFilter(e.target.value)}
                className="text-sm border-none outline-none bg-transparent appearance-none pr-5"
              >
                <option value="">Toutes catégories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tableau */}
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Chargement des dépenses…
          </div>
        ) : depensesFiltrees.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Aucune dépense pour cette période</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Catégorie</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Description</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Bénéficiaire</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-600">Mode</th>
                    <th className="text-right px-5 py-3 font-semibold text-gray-600">Montant</th>
                    {canRemove && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginatedDepenses.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{fmtDate(d.dateDepense || d.date_depense)}</td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {d.categorie}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-700 max-w-xs truncate" title={d.description}>
                        {d.description || <span className="text-gray-300 italic">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-500 max-w-xs truncate" title={d.beneficiaire}>
                        {d.beneficiaire || '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{d.mode_paiement || 'Espèces'}</td>
                      <td className="px-5 py-3 text-right font-semibold text-red-600 whitespace-nowrap">
                        {fmt(d.montant)}
                      </td>
                      {canRemove && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setConfirmId(d.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination & Total filtré */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={depensesFiltrees.length}
              itemsPerPage={limit}
              onPageChange={setPage}
              onLimitChange={(l) => { setLimit(l); setPage(1); }}
            />

            <div className="flex justify-end items-center gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <span className="text-sm text-gray-500">Total affiché :</span>
              <span className="font-bold text-red-600 text-base">{fmt(totalDepFiltrees)}</span>
            </div>
          </>
        )}
      </div>

      {/* ── Modal Nouvelle Dépense ── */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nouvelle dépense"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Catégorie *</label>
              <select
                required
                className="input"
                value={form.categorie}
                onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Montant (FCFA) *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="Ex: 50000"
                className="input"
                value={form.montant}
                onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              rows={2}
              className="input resize-none"
              placeholder="Objet de la dépense…"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                required
                className="input"
                value={form.dateDepense}
                onChange={e => setForm(f => ({ ...f, dateDepense: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Mode de paiement</label>
              <select
                className="input"
                value={form.mode_paiement}
                onChange={e => setForm(f => ({ ...f, mode_paiement: e.target.value }))}
              >
                {MODES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Bénéficiaire</label>
            <input
              type="text"
              className="input"
              placeholder="Nom du fournisseur / personne…"
              value={form.beneficiaire}
              onChange={e => setForm(f => ({ ...f, beneficiaire: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirmation suppression ── */}
      <ConfirmDialog
        isOpen={!!confirmId}
        title="Supprimer cette dépense ?"
        message="Cette action est irréversible. La dépense sera définitivement supprimée."
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color, sub }) {
  const colors = {
    green:   { bg: 'bg-green-50',   icon: 'bg-green-100 text-green-600',   text: 'text-green-700'  },
    red:     { bg: 'bg-red-50',     icon: 'bg-red-100 text-red-600',       text: 'text-red-700'    },
    primary: { bg: 'bg-primary/5',  icon: 'bg-primary/15 text-primary',    text: 'text-primary'    },
    blue:    { bg: 'bg-blue-50',    icon: 'bg-blue-100 text-blue-600',     text: 'text-blue-700'   },
  };
  const c = colors[color] || colors.primary;

  return (
    <div className={`${c.bg} rounded-xl p-5 border border-white shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={`${c.icon} p-2 rounded-lg`}>{icon}</div>
      </div>
      <p className={`text-xl font-bold ${c.text} leading-tight`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SoldeItem({ label, value, color }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}