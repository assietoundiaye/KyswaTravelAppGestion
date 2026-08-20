import {
  LayoutDashboard, Users, BarChart2, Package,
  UserCheck, CalendarCheck, Ticket, CreditCard,
  MessageSquare, ShieldCheck,
  AlertTriangle, TrendingDown, Globe, BookOpen,
  Plane, Calculator, ClipboardList, Briefcase,
  Activity, ShoppingBag
} from 'lucide-react';

export const ALL_ROLES = [
  'dg', 'administrateur', 'informatique', 'admin', 'comptable',
  'oumra', 'oumra_ziara', 'commercial', 'secretaire', 'billets',
  'ziara', 'social', 'voitures', 'immobilier', 'assurances'
];

export const ROLES = ALL_ROLES;

export const ROLE_LABELS = {
  dg: 'Directeur Général',
  administrateur: 'Administrateur',
  informatique: 'Informatique (Admin)',
  admin: 'Administrateur',
  comptable: 'Comptable',
  oumra: 'Resp. Oumra / Hajj / Billets',
  oumra_ziara: 'Resp. Oumra / Ziara',
  commercial: 'Commercial',
  secretaire: 'Secrétaire',
  billets: 'Responsable Billets',
  ziara: 'Responsable Ziarra',
  social: 'Social',
  voitures: 'Voitures',
  immobilier: 'Immobilier',
  assurances: 'Assurances',
};

export const ROLE_COLORS = {
  dg: '#7C3AED',
  administrateur: '#6B7280',
  informatique: '#6B7280',
  admin: '#6B7280',
  comptable: '#EA580C',
  oumra: '#059669',
  oumra_ziara: '#059669',
  commercial: '#2563EB',
  secretaire: '#DB2777',
  billets: '#0891B2',
  ziara: '#65A30D',
  social: '#F59E0B',
  voitures: '#2563EB',
  immobilier: '#2563EB',
  assurances: '#2563EB',
};

export const ALL_MENU_ITEMS = [
  { label: 'Dashboard', to: '/dashboard/commercial', icon: LayoutDashboard, module: null },
  { label: 'Utilisateurs', to: '/dashboard/utilisateurs', icon: Users, module: 'utilisateurs' },
  { label: 'Journal audit', to: '/dashboard/audit', icon: ShieldCheck, module: 'audit' },
  { label: 'Métriques OCR', to: '/dashboard/ocr-metrics', icon: Activity, module: 'audit' },
  { label: 'Clients', to: '/dashboard/clients', icon: UserCheck, module: 'clients' },
  { label: 'Inscriptions', to: '/dashboard/reservations', icon: CalendarCheck, module: 'reservations' },
  { label: 'Paiements', to: '/dashboard/paiements', icon: CreditCard, module: 'paiements' },
  { label: 'Visas', to: '/dashboard/visas', icon: Globe, module: 'visas' },
  { label: 'Billets groupe', to: '/dashboard/billets-groupe', icon: Plane, module: 'billets-groupe' },
  { label: 'Billets', to: '/dashboard/billets', icon: Ticket, module: 'billets' },
  { label: 'Réunions', to: '/dashboard/reunions', icon: Users, module: 'reunions' },
  { label: 'Simulateur', to: '/dashboard/simulateur', icon: BookOpen, module: 'simulateur' },
  { label: 'Désistements', to: '/dashboard/desistements', icon: AlertTriangle, module: 'desistements' },
  { label: 'Comptabilité', to: '/dashboard/comptabilite', icon: Calculator, module: 'comptabilite' },
  { label: 'Recouvrement', to: '/dashboard/recouvrement', icon: TrendingDown, module: 'recouvrement' },
  { label: 'Bilan départs', to: '/dashboard/bilan', icon: BarChart2, module: 'rapports' },
  { label: 'Départs', to: '/dashboard/packages', icon: Package, module: 'packages' },
  { label: 'Suppléments', to: '/dashboard/supplements', icon: Package, module: 'supplements' },
  { label: 'Secrétariat', to: '/dashboard/documents', icon: Briefcase, module: 'documents' },
  { label: 'Ziarra', to: '/dashboard/ziarra', icon: Globe, module: 'ziarra' },
  { label: 'Kyswa Shop', to: '/dashboard/shop', icon: ShoppingBag, module: 'shop' },
  { label: 'Statistiques', to: '/dashboard/statistiques', icon: BarChart2, module: 'statistiques' },
  { label: 'Rapports', to: '/dashboard/rapports', icon: ClipboardList, module: 'rapports' },
  { label: 'Messagerie', to: '/dashboard/messages', icon: MessageSquare, module: 'messages' },
];

const menuDG = ALL_MENU_ITEMS.filter(m => !['utilisateurs', 'audit'].includes(m.module));
const menuAdmin = ALL_MENU_ITEMS;
const menuCommercial = ALL_MENU_ITEMS.filter(m => ['clients', 'reservations', 'supplements', 'shop', 'simulateur', 'recouvrement', 'rapports', 'packages', 'messages', null].includes(m.module));
const menuOumra = ALL_MENU_ITEMS.filter(m => ['clients', 'reservations', 'visas', 'billets-groupe', 'billets', 'shop', 'rapports', 'messages', null].includes(m.module));

export const MENU_BY_ROLE = {
  dg: menuDG,
  administrateur: menuAdmin,
  informatique: menuAdmin,
  admin: menuAdmin,
  comptable: ALL_MENU_ITEMS.filter(m => ['clients', 'reservations', 'paiements', 'desistements', 'comptabilite', 'recouvrement', 'rapports', 'packages', 'supplements', 'shop', 'messages', null].includes(m.module)),
  commercial: menuCommercial,
  voitures: menuCommercial,
  immobilier: menuCommercial,
  assurances: menuCommercial,
  oumra: menuOumra,
  oumra_ziara: menuOumra,
  secretaire: ALL_MENU_ITEMS.filter(m => ['clients', 'reservations', 'reunions', 'documents', 'rapports', 'supplements', 'shop', 'messages', null].includes(m.module)),
  billets: ALL_MENU_ITEMS.filter(m => ['clients', 'reservations', 'billets-groupe', 'billets', 'reunions', 'rapports', 'shop', 'messages', null].includes(m.module)),
  ziara: ALL_MENU_ITEMS.filter(m => ['clients', 'reservations', 'ziarra', 'rapports', 'shop', 'messages', null].includes(m.module)),
  social: ALL_MENU_ITEMS.filter(m => ['rapports', 'shop', 'messages', null].includes(m.module)),
};

export const DEFAULT_REDIRECT = {
  dg: '/dashboard/commercial',
  administrateur: '/dashboard/commercial',
  informatique: '/dashboard/commercial',
  admin: '/dashboard/commercial',
  comptable: '/dashboard/commercial',
  oumra: '/dashboard/commercial',
  oumra_ziara: '/dashboard/commercial',
  commercial: '/dashboard/commercial',
  voitures: '/dashboard/commercial',
  immobilier: '/dashboard/commercial',
  assurances: '/dashboard/commercial',
  secretaire: '/dashboard/commercial',
  billets: '/dashboard/commercial',
  ziara: '/dashboard/commercial',
  social: '/dashboard/commercial',
};
