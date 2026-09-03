import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
  LayoutDashboard, Users, Building2, UserPlus, Kanban, CheckSquare,
  LogOut, Settings, BarChart3, TrendingUp, Upload, Shield, KeyRound,
  DollarSign, Package, Briefcase, FolderKanban, FileText, Receipt, MapPin,
  Menu, X, ChevronsUpDown, CalendarDays, ScrollText,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { BrandLogo } from '@/Components/BrandLogo';
import { cn } from '@/lib/utils';
import { useCan } from '@/hooks/useCan';
import type { SharedPageProps, SharedUser } from '@/types';

type NavDef = {
  to: string;
  label: string;
  icon: React.ElementType;
  module?: string;
  /** Single permission, or any CRM view.* via resource */
  permission?: string;
  resource?: string;
};

const crmNavItems: NavDef[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contacts', label: 'Contacts', icon: Users, resource: 'contacts' },
  { to: '/accounts', label: 'Accounts', icon: Building2, resource: 'accounts' },
  { to: '/leads', label: 'Leads', icon: UserPlus, resource: 'leads' },
  { to: '/deals', label: 'Pipeline', icon: Kanban, resource: 'deals' },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare, resource: 'tasks' },
  { to: '/reports', label: 'Reports', icon: TrendingUp, permission: 'reports.view' },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, permission: 'analytics.view' },
  { to: '/import', label: 'Import', icon: Upload, permission: 'import.run' },
];

const erpNavItems: NavDef[] = [
  { to: '/finance', label: 'Finance', icon: DollarSign, module: 'finance', permission: 'finance.view' },
  { to: '/inventory', label: 'Inventory', icon: Package, module: 'inventory', permission: 'inventory.view' },
  { to: '/hr', label: 'People', icon: Briefcase, module: 'hr', permission: 'hr.view' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, module: 'projects', permission: 'projects.view' },
  { to: '/contracts', label: 'Contracts', icon: FileText, module: 'crm', permission: 'contracts.view' },
  { to: '/expenses', label: 'Expenses', icon: Receipt, module: 'finance', permission: 'expenses.view' },
  { to: '/areas', label: 'Territories', icon: MapPin, module: 'crm', permission: 'areas.view' },
];

const marketingNavItems: NavDef[] = [
  { to: '/marketing', label: 'Content Calendar', icon: CalendarDays, permission: 'marketing.view' },
];

function isActivePath(currentUrl: string, to: string) {
  const path = currentUrl.split('?')[0];
  return to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`);
}

function NavItem({
  to,
  label,
  icon: Icon,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  onNavigate?: () => void;
}) {
  const { url } = usePage();
  const isActive = isActivePath(url, to);

  return (
    <Link href={to} onClick={onNavigate}>
      <span
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
            : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <Icon size={18} strokeWidth={isActive ? 2.25 : 1.8} />
        {label}
      </span>
    </Link>
  );
}

function NavSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: Array<{ to: string; label: string; icon: React.ElementType }>;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-0.5">
      <p className="px-3 py-2 text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground/40 uppercase">
        {title}
      </p>
      {items.map(({ to, label, icon }) => (
        <NavItem key={to} to={to} label={label} icon={icon} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function SidebarContent({
  user,
  initials,
  logout,
  crmItems,
  marketingItems,
  erpItems,
  adminItems,
  showSettings,
  onNavigate,
  onClose,
  showCloseButton,
}: {
  user: SharedUser | null;
  initials: string;
  logout: () => void;
  crmItems: NavDef[];
  marketingItems: NavDef[];
  erpItems: NavDef[];
  adminItems: NavDef[];
  showSettings: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <BrandLogo size={36} className="size-9 shrink-0 rounded-xl object-cover shadow-lg shadow-black/20" />
          <div>
            <h1 className="font-heading text-base font-semibold tracking-tight text-white">Northstar</h1>
            <p className="text-[10px] tracking-[0.12em] text-sidebar-foreground/45 uppercase">Revenue desk</p>
          </div>
        </div>
        {showCloseButton && onClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </Button>
        )}
      </div>

      <div className="mx-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/65 p-3">
        <div className="flex items-center gap-2.5">
          <Avatar size="sm">
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary-foreground text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/55">{user?.tenant?.name}</p>
          </div>
          <ChevronsUpDown className="ml-auto size-3.5 text-sidebar-foreground/35" />
        </div>
      </div>

      <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Main navigation">
        <NavSection title="CRM" items={crmItems} onNavigate={onNavigate} />
        <NavSection title="Marketing" items={marketingItems} onNavigate={onNavigate} />
        <NavSection title="Operations" items={erpItems} onNavigate={onNavigate} />
        <NavSection title="Admin" items={adminItems} onNavigate={onNavigate} />
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {showSettings && (
          <NavItem to="/settings" label="Settings" icon={Settings} onNavigate={onNavigate} />
        )}
        <Button
          variant="ghost"
          className="mt-1 w-full justify-start gap-2 px-3 text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-white"
          onClick={() => logout()}
        >
          <LogOut size={16} />
          Sign out
        </Button>
      </div>
    </>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const page = usePage<SharedPageProps>();
  const user = page.props.auth?.user ?? null;
  const url = page.url;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { can, canView } = useCan();

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'U';

  const closeSidebar = () => setSidebarOpen(false);
  const logout = () => router.post('/logout');
  const enabledModules = user?.tenant?.enabled_modules;

  const allowed = (item: NavDef) => {
    if (item.module && enabledModules && !enabledModules.includes(item.module)) {
      return false;
    }
    if (item.resource) {
      return canView(item.resource);
    }
    if (item.permission) {
      return can(item.permission);
    }
    return true;
  };

  const visibleCrm = useMemo(() => crmNavItems.filter(allowed), [can, canView, enabledModules]);
  const visibleMarketing = useMemo(() => marketingNavItems.filter(allowed), [can, enabledModules]);
  const visibleErp = useMemo(() => erpNavItems.filter(allowed), [can, enabledModules]);
  const adminItems = useMemo(() => {
    const items: NavDef[] = [];
    if (can('users.view')) {
      items.push({ to: '/admin/users', label: 'Users', icon: Shield });
    }
    if (can('roles.manage')) {
      items.push({ to: '/admin/roles', label: 'Roles & permissions', icon: KeyRound });
    }
    if (can('settings.view')) {
      items.push({ to: '/audit-logs', label: 'Audit logs', icon: ScrollText });
    }
    return items;
  }, [can]);

  const allNavItems = [...visibleCrm, ...visibleMarketing, ...visibleErp, ...adminItems];
  const currentPage = allNavItems.find((item) => isActivePath(url, item.to))?.label
    ?? (isActivePath(url, '/settings') ? 'Settings' : 'Workspace');

  useEffect(() => {
    setSidebarOpen(false);
  }, [url]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-label="Close menu"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:shrink-0 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <SidebarContent
          user={user}
          initials={initials}
          logout={logout}
          crmItems={visibleCrm}
          marketingItems={visibleMarketing}
          erpItems={visibleErp}
          adminItems={adminItems}
          showSettings={can('settings.view')}
          onNavigate={closeSidebar}
          onClose={closeSidebar}
          showCloseButton
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur-xl lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </Button>
          <div className="flex items-center gap-2">
            <BrandLogo size={32} className="size-8 shrink-0 rounded-lg object-cover" />
            <span className="font-heading text-sm font-semibold text-foreground">{currentPage}</span>
          </div>
        </header>

        <header className="hidden h-16 items-center justify-between border-b border-border/70 bg-card/75 px-8 backdrop-blur-xl lg:flex">
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">{currentPage}</p>
            <p className="text-xs text-muted-foreground">{user?.tenant?.name ?? 'Your workspace'}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-success shadow-[0_0_0_3px_color-mix(in_oklch,var(--success)_15%,transparent)]" />
            Workspace live
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
