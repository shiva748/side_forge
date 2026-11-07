import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Shield,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';
import { formatRoleLabel, WorkspaceContextOption } from '../../types/auth';
import { Badge } from '../ui/Badge';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'sideforge.sidebarCollapsed';

export interface NavItemConfig {
  id: string;
  label: string;
  to: string;
  icon: React.ReactNode;
  matchPaths?: string[];
}

export interface NavGroupConfig {
  groupLabel: string;
  items: NavItemConfig[];
}

export interface AppShellProps {
  pageTitle: string;
  breadcrumbParent?: string;
  children: React.ReactNode;
}
export const AppShell: React.FC<AppShellProps> = ({
  pageTitle,
  breadcrumbParent,
  children,
}) => {
  const {
    user,
    activeWorkspace,
    activeWorkspaceOption,
    availableWorkspaces,
    hasMultipleWorkspaces,
    activeOrganization,
    platformRoles,
    organizationRoles,
    activatePlatformWorkspace,
    selectOrganization,
    refreshSession,
    logout,
    hasPermission,
  } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(event.target as Node)
      ) {
        setIsWorkspaceMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebarCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  // Build workspace-specific navigation strictly from active workspace & actual permissions
  const navGroups = useMemo<NavGroupConfig[]>(() => {
    if (activeWorkspace === 'PLATFORM') {
      const opsItems: NavItemConfig[] = [];
      if (hasPermission('platform.dashboard.view')) {
        opsItems.push({
          id: 'platform-dashboard',
          label: 'Dashboard',
          to: '/platform',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
          matchPaths: ['/platform', '/platform/dashboard'],
        });
      }
      if (hasPermission('platform.organization.view')) {
        opsItems.push({
          id: 'platform-onboarding',
          label: 'Onboarding Requests',
          to: '/platform/onboarding',
          icon: <ClipboardCheck className="w-4 h-4 shrink-0" />,
          matchPaths: ['/platform/onboarding'],
        });
      }

      const groups: NavGroupConfig[] = [];
      if (opsItems.length > 0) {
        groups.push({
          groupLabel: 'Platform Operations',
          items: opsItems,
        });
      }
      groups.push({
        groupLabel: 'Administration',
        items: [
          {
            id: 'platform-context',
            label: 'Workspace Overview',
            to: '/platform/context',
            icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
            matchPaths: ['/platform/context'],
          },
        ],
      });
      return groups;
    }

    if (activeWorkspace === 'SCHOOL') {
      return [
        {
          groupLabel: 'School Administration',
          items: [
            {
              id: 'school-overview',
              label: 'Workspace Overview',
              to: '/app',
              icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
              matchPaths: ['/app'],
            },
          ],
        },
      ];
    }

    return [];
  }, [activeWorkspace, hasPermission]);

  const isNavItemActive = (item: NavItemConfig): boolean => {
    const currentPath = location.pathname.replace(/\/$/, '') || '/';
    if (item.matchPaths && item.matchPaths.includes(currentPath)) {
      return true;
    }
    return currentPath === item.to;
  };


  const handleSwitchWorkspaceOption = (option: WorkspaceContextOption) => {
    setIsWorkspaceMenuOpen(false);
    if (option.workspaceType === 'PLATFORM') {
      activatePlatformWorkspace();
      toast.info(
        'Workspace switched',
        `Activated Platform Administration (${option.roles.map(formatRoleLabel).join(', ')}).`
      );
      navigate('/platform');
      return;
    }
    if (option.workspaceType === 'SCHOOL' && option.organizationId) {
      selectOrganization(option.organizationId);
      toast.info(
        'Workspace switched',
        `Activated ${option.displayName} (${option.roles.map(formatRoleLabel).join(', ')}).`
      );
      navigate('/app');
    }
  };

  const handleRefreshSession = async () => {
    setIsRefreshing(true);
    try {
      await refreshSession();
      toast.info('Session refreshed', 'Updated your latest roles and workspace permissions.');
    } finally {
      setIsRefreshing(false);
      setIsUserMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    toast.info('Signed out', 'Your session has been closed.');
    navigate('/login', { replace: true });
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'User';
  const initials = useMemo(() => {
    const first = user?.firstName?.trim()?.[0] || '';
    const last = user?.lastName?.trim()?.[0] || '';
    const combined = (first + last).toUpperCase();
    return combined || (user?.email?.[0]?.toUpperCase() ?? 'U');
  }, [user]);

  const workspaceDisplayName =
    activeWorkspace === 'PLATFORM'
      ? 'Platform Administration'
      : activeOrganization?.organizationName || 'School Workspace';

  const activeRoleCodes =
    activeWorkspace === 'PLATFORM'
      ? platformRoles.length > 0
        ? platformRoles
        : ['PLATFORM_USER']
      : Array.from(organizationRoles);

  const primaryRoleLabel =
    activeRoleCodes.length > 0
      ? activeRoleCodes.map(formatRoleLabel).join(', ')
      : 'Member';

  const renderSidebarContent = (mobile = false) => {
    const collapsed = !mobile && isCollapsed;

    return (
      <div className="flex flex-col h-full bg-white border-r border-slate-200/80 select-none">
        {/* Brand Header */}
        <div
          className={cn(
            'h-16 flex items-center border-b border-slate-200/80 px-4',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          <Link
            to="/"
            className="flex items-center gap-2.5 text-slate-900 min-w-0"
            title="SchoolForge Home"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-2xs shrink-0">
              <span className="font-extrabold text-sm tracking-tight">SF</span>
            </div>
            {!collapsed && (
              <span className="text-base font-bold tracking-tight text-slate-900 truncate">
                School<span className="text-indigo-600">Forge</span>
              </span>
            )}
          </Link>

          {mobile ? (
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close navigation menu"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            !collapsed && (
              <button
                type="button"
                onClick={toggleSidebarCollapsed}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {/* Active Workspace Identity Block */}
        <div className="p-3 border-b border-slate-100">
          <div
            className={cn(
              'rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 flex items-center gap-2.5',
              collapsed && 'justify-center p-2'
            )}
            title={`${workspaceDisplayName} (${primaryRoleLabel})`}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white shadow-2xs',
                activeWorkspace === 'PLATFORM' ? 'bg-indigo-600' : 'bg-slate-900'
              )}
            >
              {activeWorkspace === 'PLATFORM' ? (
                <Shield className="w-4 h-4" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 truncate">
                  {activeWorkspace === 'PLATFORM' ? 'Platform Control' : 'School Workspace'}
                </p>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {workspaceDisplayName}
                </p>
                <p className="text-[11px] text-slate-500 truncate">{primaryRoleLabel}</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              {!collapsed && (
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.groupLabel}
                </p>
              )}
              {group.items.map((item) => {
                const active = isNavItemActive(item);
                return (
                  <Link
                    key={item.id}
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors',
                      collapsed && 'justify-center px-2',
                      active
                        ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/70 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
                    )}
                  >
                    <span className={cn(active ? 'text-indigo-600' : 'text-slate-400')}>
                      {item.icon}
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200/80 space-y-1.5">
          {hasMultipleWorkspaces && (
            <Link
              to="/workspaces?stay=1"
              title={collapsed ? 'Switch Workspace' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors',
                collapsed && 'justify-center px-2'
              )}
            >
              <ArrowLeftRight className="w-4 h-4 text-slate-400 shrink-0" />
              {!collapsed && (
                <span className="truncate">
                  Switch Workspace ({availableWorkspaces.length})
                </span>
              )}
            </Link>
          )}

          {!mobile && collapsed && (
            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="w-full flex items-center justify-center rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50/50 text-slate-900 flex">
      {/* Desktop Left Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 sticky top-0 h-screen transition-all duration-200 z-30',
          isCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] h-full shadow-xl">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Column: Top Bar + Page Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Minimal Top Navigation Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
          <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            {/* Left: Mobile Menu Button + Breadcrumb / Page Title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                aria-label="Open navigation menu"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
                <span className="hidden sm:inline-block font-medium text-slate-500 truncate max-w-[200px]">
                  {breadcrumbParent || workspaceDisplayName}
                </span>
                <ChevronRight className="hidden sm:inline-block w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span className="font-semibold text-slate-900 truncate">{pageTitle}</span>
              </div>
            </div>

            {/* Right: Workspace Switcher + User Profile Menu */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Workspace Switcher Dropdown */}
              <div className="relative" ref={workspaceMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsWorkspaceMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-100/80 px-3 py-1.5 text-xs transition-colors cursor-pointer"
                  aria-expanded={isWorkspaceMenuOpen}
                  aria-haspopup="true"
                >
                  <Badge
                    variant={activeWorkspace === 'PLATFORM' ? 'primary' : 'info'}
                    className="px-2 py-0 text-[10px]"
                  >
                    {activeWorkspace === 'PLATFORM' ? 'Platform' : 'School'}
                  </Badge>
                  <span className="font-semibold text-slate-800 max-w-[150px] truncate hidden md:inline">
                    {workspaceDisplayName}
                  </span>
                  <span className="hidden lg:inline text-slate-400">•</span>
                  <span className="hidden lg:inline text-slate-500 max-w-[140px] truncate">
                    {primaryRoleLabel}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isWorkspaceMenuOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200/90 bg-white shadow-xl p-2 z-50 space-y-1.5">
                    <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Available Workspaces ({availableWorkspaces.length})
                      </span>
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1 py-1">
                      {availableWorkspaces.map((option) => {
                        const isCurrent = activeWorkspaceOption?.key === option.key;
                        return (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => handleSwitchWorkspaceOption(option)}
                            className={cn(
                              'w-full text-left flex items-start justify-between gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer',
                              isCurrent
                                ? 'bg-indigo-50/80 text-indigo-950 border border-indigo-200/70'
                                : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                            )}
                          >
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div
                                className={cn(
                                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white mt-0.5',
                                  option.workspaceType === 'PLATFORM'
                                    ? 'bg-indigo-600'
                                    : 'bg-slate-900'
                                )}
                              >
                                {option.workspaceType === 'PLATFORM' ? (
                                  <Shield className="w-3.5 h-3.5" />
                                ) : (
                                  <Building2 className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-slate-900 truncate">
                                    {option.displayName}
                                  </span>
                                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                    {option.workspaceType === 'PLATFORM' ? 'Platform' : 'School'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                  {option.roles.map(formatRoleLabel).join(', ')}
                                </p>
                              </div>
                            </div>
                            {isCurrent && (
                              <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 border-t border-slate-100">
                      <Link
                        to="/workspaces?stay=1"
                        onClick={() => setIsWorkspaceMenuOpen(false)}
                        className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50/60 transition-colors"
                      >
                        <span>Open Full Workspace Selector</span>
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>


              {/* User Profile Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs transition-colors cursor-pointer"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <span className="hidden sm:inline font-medium text-slate-800 max-w-[130px] truncate">
                    {fullName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200/90 bg-white shadow-xl p-2 z-50 space-y-1.5">
                    <div className="px-3 py-2 border-b border-slate-100 space-y-0.5">
                      <p className="text-xs font-semibold text-slate-900 truncate">{fullName}</p>
                      <p className="text-[11px] font-mono text-slate-500 truncate">
                        {user?.email}
                      </p>
                      <div className="pt-1 flex flex-wrap gap-1">
                        {activeRoleCodes.map((rc) => (
                          <span
                            key={rc}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                          >
                            {formatRoleLabel(rc)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-0.5 py-0.5">
                      <Link
                        to="/workspaces?stay=1"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Switch Workspace / Role</span>
                      </Link>
                      <button
                        type="button"
                        disabled={isRefreshing}
                        onClick={() => void handleRefreshSession()}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw
                          className={cn(
                            'w-3.5 h-3.5 text-slate-400',
                            isRefreshing && 'animate-spin'
                          )}
                        />
                        <span>Refresh Access &amp; Permissions</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
};
