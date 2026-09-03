import { useEffect, useState, type ReactNode } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
  LayoutDashboard, Users, Building2, UserPlus, Kanban, CheckSquare,
  LogOut, Settings, BarChart3, TrendingUp, Upload, Shield,
  DollarSign, Package, Briefcase, FolderKanban, FileText, Receipt, MapPin,
  Menu, X, ChevronsUpDown, CalendarDays,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { cn } from '@/lib/utils';
import type { SharedPageProps, SharedUser } from '@/types';

const crmNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/accounts', label: 'Accounts', icon: Building2 },
  { to: '/leads', label: 'Leads', icon: UserPlus },
  { to: '/deals', label: 'Pipeline', icon: Kanban },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/reports', label: 'Reports', icon: TrendingUp },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/import', label: 'Import', icon: Upload },
];

const erpNavItems = [
  { to: '/finance', label: 'Finance', icon: DollarSign, module: 'finance' },
  { to: '/inventory', label: 'Inventory', icon: Package, module: 'inventory' },
  { to: '/hr', label: 'People', icon: Briefcase, module: 'hr' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, module: 'projects' },
  { to: '/contracts', label: 'Contracts', icon: FileText, module: 'finance' },
  { to: '/expenses', label: 'Expenses', icon: Receipt, module: 'finance' },
  { to: '/areas', label: 'Territories', icon: MapPin, module: 'crm' },
];

const marketingNavItems = [
  { to: '/marketing', label: 'Content Calendar', icon: CalendarDays },
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
  visibleErpNavItems,
  onNavigate,
  onClose,
  showCloseButton,
}: {
  user: SharedUser | null;
  initials: string;
  logout: () => void;
  visibleErpNavItems: Array<{ to: string; label: string; icon: React.ElementType }>;
  onNavigate?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="relative flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground shadow-lg shadow-black/10">
            <span className="relative z-10">N</span>
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-emerald-300" />
          </div>
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
        <NavSection title="CRM" items={crmNavItems} onNavigate={onNavigate} />
        <NavSection title="Marketing" items={marketingNavItems} onNavigate={onNavigate} />
        {visibleErpNavItems.length > 0 && (
          <NavSection title="Operations" items={visibleErpNavItems} onNavigate={onNavigate} />
        )}
        {user?.role === 'admin' && (
          <div className="space-y-0.5">
            <p className="px-3 py-2 text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground/40 uppercase">
              Admin
            </p>
            <NavItem to="/admin/users" label="Users" icon={Shield} onNavigate={onNavigate} />
          </div>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <NavItem to="/settings" label="Settings" icon={Settings} onNavigate={onNavigate} />
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

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? 'U';

  const closeSidebar = () => setSidebarOpen(false);
  const logout = () => router.post('/logout');
  const enabledModules = user?.tenant?.enabled_modules;
  const visibleErpNavItems = erpNavItems.filter(
    (item) => !enabledModules || enabledModules.includes(item.module)
  );
  const allNavItems = [...crmNavItems, ...marketingNavItems, ...visibleErpNavItems];
  const currentPage = allNavItems.find((item) => isActivePath(url, item.to))?.label ?? 'Workspace';

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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar — drawer on mobile, fixed on desktop */}
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
          visibleErpNavItems={visibleErpNavItems}
          onNavigate={closeSidebar}
          onClose={closeSidebar}
          showCloseButton
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
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
            <div className="relative flex size-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              N
              <span className="absolute right-1 top-1 size-1 rounded-full bg-emerald-300" />
            </div>
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
