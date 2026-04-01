import {
  LayoutDashboard, Users, BarChart2, Package,
  UserCheck, CalendarCheck, Ticket, CreditCard, FileText,
  MessageSquare, ShieldCheck,
  AlertTriangle, TrendingDown, Globe, BookOpen,
  Plane, Calculator, ClipboardList, Briefcase,
} from 'lucide-react';

export const ROLES = ['dg', 'administrateur', 'comptable', 'oumra', 'commercial', 'secretaire', 'billets', 'ziara', 'social'];

export const ROLE_LABELS = {
  dg: 'Directeur Général',
  administrateur: 'Administrateur',
  comptable: 'Comptable',
  oumra: 'Responsable Oumra',
  commercial: 'Commercial',
  secretaire: 'Secrétaire',
  billets: 'Responsable Billets',
  ziara: 'Responsable Ziarra',
  social: 'Social',
};

export const ROLE_COLORS = {
  dg: '#7C3AED',
  administrateur: '#6B7280',
  comptable: '#EA580C',
  oumra: '#059669',
  commercial: '#2563EB',
  secretaire: '#DB2777',
  billets: '#0891B2',
  ziara: '#65A30D',
  social: '#F59E0B',
};

const menuDG = [
  { label: 'Dashboard', to: '/dashboard/commercial', icon: LayoutDashboard },
  { label: 'Clients', to: '/dashboard/clients', icon: UserCheck },
  { label: 'Inscriptions', to: '/dashboard/reservations', icon: CalendarCheck },
  { label: 'Paiements', to: '/dashboard/paiements', icon: CreditCard },
  { label: 'Visas', to: '/dashboard/visas', icon: Globe },
  { label: 'Billets groupe', to: '/dashboard/billets-groupe', icon: Plane },
  { label: 'Billets', to: '/dashboard/billets', icon: Ticket },
  { label: 'Réunions', to: '/dashboard/reunions', icon: Users },
  { label: 'Simulateur', to: '/dashboard/simulateur', icon: BookOpen },
  { label: 'Désistements', to: '/dashboard/desistements', icon: AlertTriangle },
  { label: 'Comptabilité', to: '/dashboard/comptabilite', icon: Calculator },
  { label: 'Recouvrement', to: '/dashboard/recouvrement', icon: TrendingDown },
  { label: 'Bilan départs', to: '/dashboard/bilan', icon: BarChart2 },
  { label: 'Départs', to: '/dashboard/packages', icon: Package },
  { label: 'Ziarra', to: '/dashboard/ziarra', icon: Globe },
  { label: 'Messagerie', to: '/dashboard/messages', icon: MessageSquare },
  { label: 'Rapports', to: '/dashboard/rapports', icon: ClipboardList },
];

export const MENU_BY_ROLE = {
  dg: menuDG,
  administrateur: [
    { label: 'Dashboard', to: '/dashboard/commercial', icon: LayoutDashboard },
    { label: 'Utilisateurs', to: '/dashboard/utilisateurs', icon: Users },
    { label: 'Journal audit', to: '/dashboard/audit', icon: ShieldCheck },
    { label: 'Départs', to: '/dashboard/packages', icon: Package },
    { label: 'Statistiques', to: '/dashboard/statistiques', icon: BarChart2 },
    { label: 'Rapports', to: '/dashboard/rapports', icon: ClipboardList },
    { label: 'Messagerie', to: '/dashboard/messages', icon: MessageSquare },
  ],
  comptable: [
    { label: 'Dashboard', to: '/dashboard/commercial', icon: LayoutDashboard },
    { label: 'Rapports', to: '/dashboard/rapports', icon: ClipboardList },
    { label: 'Inscriptions', to: '/dashboard/reservations', icon: CalendarCheck },
    { label: 'Paiements', to: '/dashboard/paiements', icon: CreditCard },
    { label: 'Désistements', to: '/dashboard/desistements', icon: AlertTriangle },
    { label: 'Comptabilité', to: '/dashboard/comptabilite', icon: Calculator },
    { label: 'Recouvrement', to: '/dashboard/recouvrement', icon: TrendingDown },
    { label: 'Clients', to: '/dashboard/clients', icon: UserCheck },
    { label: 'Bilan départs', to: '/dashboard/bilan', icon: BarChart2 },
    { label: 'Messagerie', to: '/dashboard/messages', icon: MessageSquare },
  ],
  commercial: [
    { label: 'Dashboard', to: '/dashboard/commercial', icon: LayoutDashboard },
    { label: 'Rapports', to: '/dashboard/rapports', icon: ClipboardList },
    { label: 'Inscriptions', to: '/dashboard/reservations', icon: CalendarCheck },
    { label: 'Clients', to: '/dashboard/clients', icon: UserCheck },
    { label: 'Simulateur', to: '/dashboard/simulateur', icon: BookOpen },
    { label: 'Recouvrement', to: '/dashboard/recouvrement', icon: AlertTriangle },
    { label: 'Départs', to: '/dashboard/packages', icon: Package },
    { label: 'Messagerie', to: '/dashboard/messages', icon: MessageSquare },
  ],
  oumra: [
    { label: 'Dashboard', to: '/dashboard/commercial', icon: LayoutDashboard },
    { label: 'Rapports', to: '/dashboard/rapports', icon: ClipboardList },
    { label: 'Inscriptions', to: '/dashboard/reservations', icon: CalendarCheck },
    { label: 'Paiements', to: '/dashboard/paiements', icon: CreditCard },
    { label: 'Visas', to: '/dashboard/visas', icon: Globe },
    { label: 'Billets groupe', to: '/dashboard/billets-groupe', icon: Plane },
    { label: 'Réunions', to: '/dashboard/reunions', icon: Users },
    { label: 'Messagerie', to: '/dashboard/messages', icon: MessageSquare },
  ],
  secretaire: [
    { label: 'Dashboard', to: '/dashboard/commercial', icon: LayoutDashboard },
    { label: 'Rapports', to: '/dashboard/rapports', icon: ClipboardList },
    { label: 'Inscriptions', to: '/dashboard/reservations', icon: CalendarCheck },
    { label: 'Réunions', to: '/dashboard/reunions', icon: Users },
    { label: 'Secrétariat', to: '/dashboard/documents', icon: Briefcase },
    { label: 'Messagerie', to: '/dashboard/messages', icon: MessageSquare },
  ],
  billets: [
    { label: 'Dashboard', to: '/dashboard/commercial', icon: LayoutDashboard },
    { label: 'Rapports', to: '/dashboard/rapports', icon: ClipboardList },
    { label: 'Billets groupe', to: '/dashboard/billets-groupe', icon: Plane },
    { label: 'Billets', to: '/dashboard/billets', icon: Ticket },
    { label: 'Inscriptions', to: '/dashboard/reservations', icon: CalendarCheck },
    { label: 'Réunions', to: '/dashboard/reunions', icon: Users },
    { label: 'Clients', to: '/dashboard/clients', icon: UserCheck },
    { label: 'Messagerie', to: '/dashboard/messages', icon: MessageSquare },
  ],
  ziara: [
    { label: 'Dashboard', to: '/dashboard/commercial', icon: LayoutDashboard },
    { label: 'Rapports', to: '/dashboard/rapports', icon: ClipboardList },
    { label: 'Ziarra', to: '/dashboard/ziarra', icon: Globe },
    { label: 'Inscriptions', to: '/dashboard/reservations', icon: CalendarCheck },
    { label: 'Messagerie', to: '/dashboard/messages', icon: MessageSquare },
  ],
  social: [
    { label: 'Dashboard', to: '/dashboard/commercial', icon: LayoutDashboard },
    { label: 'Rapports', to: '/dashboard/rapports', icon: ClipboardList },
    { label: 'Messagerie', to: '/dashboard/messages', icon: MessageSquare },
  ],
};

export const DEFAULT_REDIRECT = {
  dg: '/dashboard/commercial',
  administrateur: '/dashboard/commercial',
  comptable: '/dashboard/commercial',
  oumra: '/dashboard/commercial',
  commercial: '/dashboard/commercial',
  secretaire: '/dashboard/commercial',
  billets: '/dashboard/commercial',
  ziara: '/dashboard/commercial',
  social: '/dashboard/commercial',
};

export const ALL_ROLES = Object.keys(MENU_BY_ROLE);
