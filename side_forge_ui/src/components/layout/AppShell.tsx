import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeftRight,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PauseCircle,
  PowerOff,
  RefreshCw,
  Settings,
  Shield,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';
import { formatRoleLabel, WorkspaceContextOption } from '../../types/auth';
import {
  AccountSettingsModal,
  type AccountSettingsTab,
} from '../account/AccountSettingsModal';
import { UserAvatar } from '../account/UserAvatar';
import {
  OrganizationDeactivatedScreen,
  OrganizationSuspendedBanner,
  SubscriptionSuspendedBanner,
} from '../school/OrganizationStatusBanner';
import { Badge, CounterLabel, RoleTag } from '../ui/Badge';
import { TruncatedText } from '../ui/TruncatedText';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'sideforge.sidebarCollapsed';

export interface NavItemConfig {
  id: string;
  label: string;
  to: string;
  icon: React.ReactNode;
  matchPaths?: string[];
  restricted?: boolean;
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
    activeOrganizationStatus,
    isOrganizationSuspended,
    isOrganizationDeactivated,
    isOrganizationRestricted,
    platformRoles,
    organizationRoles,
    activatePlatformWorkspace,
    selectOrganization,
    refreshSession,
    revalidateAllOrganizationsStatuses,
    logout,
    hasPermission,
    hasFeature,
    pendingInvitationsCount,
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
  const [accountModalOpen, setAccountModalOpen] = useState<boolean>(false);
  const [accountModalTab, setAccountModalTab] =
    useState<AccountSettingsTab>('profile');

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
        opsItems.push({
          id: 'platform-organizations',
          label: 'Organizations',
          to: '/platform/organizations',
          icon: <Building2 className="w-4 h-4 shrink-0" />,
          matchPaths: ['/platform/organizations'],
        });
      }
      if (hasPermission('platform.subscription.view')) {
        opsItems.push({
          id: 'platform-subscriptions',
          label: 'Subscriptions',
          to: '/platform/subscriptions',
          icon: <CreditCard className="w-4 h-4 shrink-0" />,
          matchPaths: ['/platform/subscriptions'],
        });
      }

      const adminItems: NavItemConfig[] = [];
      if (hasPermission('platform.role.manage')) {
        adminItems.push({
          id: 'platform-admins',
          label: 'Platform Admins',
          to: '/platform/admins',
          icon: <Users className="w-4 h-4 shrink-0" />,
          matchPaths: ['/platform/admins'],
        });
      }
      if (hasPermission('platform.audit.view')) {
        adminItems.push({
          id: 'platform-audit-logs',
          label: 'Audit Logs',
          to: '/platform/audit-logs',
          icon: <Activity className="w-4 h-4 shrink-0" />,
          matchPaths: ['/platform/audit-logs'],
        });
      }
      adminItems.push({
        id: 'platform-context',
        label: 'Workspace Overview',
        to: '/platform/context',
        icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
        matchPaths: ['/platform/context'],
      });

      const groups: NavGroupConfig[] = [];
      if (opsItems.length > 0) {
        groups.push({
          groupLabel: 'Platform Operations',
          items: opsItems,
        });
      }
      groups.push({
        groupLabel: 'Administration',
        items: adminItems,
      });
      return groups;
    }

    if (activeWorkspace === 'SCHOOL') {
      // When an organization is DEACTIVATED, do not render normal school operations
      // or module navigation in the sidebar.
      if (isOrganizationDeactivated) {
        return [
          {
            groupLabel: 'Restricted Workspace',
            items: [
              {
                id: 'school-deactivated',
                label: 'Organization Deactivated',
                to: '/app',
                icon: <PowerOff className="w-4 h-4 shrink-0" />,
                matchPaths: ['/app', '/app/dashboard'],
                restricted: true,
              },
            ],
          },
        ];
      }

      const schoolOpsItems: NavItemConfig[] = [
        {
          id: 'school-dashboard',
          label: 'Dashboard',
          to: '/app',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
          matchPaths: ['/app', '/app/dashboard'],
        },
      ];

      const hasAcademicRolePerms =
        hasPermission('academic_session.view') ||
        hasPermission('academic_session.manage') ||
        hasPermission('class.view') ||
        hasPermission('class.manage') ||
        hasPermission('subject.view') ||
        hasPermission('subject.manage') ||
        hasPermission('class_subject.view') ||
        hasPermission('class_subject.manage');

      const canAccessAcademics =
        hasAcademicRolePerms &&
        (hasFeature('ACADEMIC_MANAGEMENT') || isOrganizationRestricted);

      if (canAccessAcademics) {
        schoolOpsItems.push({
          id: 'school-academics',
          label: 'Academic Management',
          to: '/app/academics',
          icon: <Layers className="w-4 h-4 shrink-0" />,
          matchPaths: ['/app/academics'],
          restricted: isOrganizationRestricted,
        });
      }

      const hasStudentRolePerms =
        hasPermission('student.view') ||
        hasPermission('student.create') ||
        hasPermission('student.update') ||
        hasPermission('student.enrollment.manage') ||
        hasPermission('student.guardian.manage');

      const canAccessStudents =
        hasStudentRolePerms &&
        (hasFeature('STUDENT_MANAGEMENT') || isOrganizationRestricted);

      if (canAccessStudents) {
        schoolOpsItems.push({
          id: 'school-students',
          label: 'Student Management',
          to: '/app/students',
          icon: <Users className="w-4 h-4 shrink-0" />,
          matchPaths: ['/app/students'],
          restricted: isOrganizationRestricted,
        });
      }

      const hasStaffRolePerms =
        hasPermission('staff.view') ||
        hasPermission('staff.manage') ||
        hasPermission('teacher.view') ||
        hasPermission('teacher.manage');

      const canAccessStaff =
        hasStaffRolePerms &&
        (hasFeature('STAFF_MANAGEMENT') || isOrganizationRestricted);

      if (canAccessStaff) {
        schoolOpsItems.push({
          id: 'school-staff',
          label: 'Staff & Teachers',
          to: '/app/staff',
          icon: <Briefcase className="w-4 h-4 shrink-0" />,
          matchPaths: ['/app/staff'],
          restricted: isOrganizationRestricted,
        });
      }

      const hasTimetablePerms =
        hasPermission('timetable.view') ||
        hasPermission('timetable.manage') ||
        hasPermission('timetable.publish');

      const canAccessTimetable =
        hasTimetablePerms &&
        (hasFeature('TIMETABLE') || isOrganizationRestricted);

      if (canAccessTimetable) {
        schoolOpsItems.push({
          id: 'school-timetable',
          label: 'Timetable',
          to: '/app/timetable',
          icon: <Clock className="w-4 h-4 shrink-0" />,
          matchPaths: ['/app/timetable'],
          restricted: isOrganizationRestricted,
        });
      }

      return [
        {
          groupLabel: 'School Operations',
          items: schoolOpsItems,
        },
        {
          groupLabel: 'Administration',
          items: [
            {
              id: 'school-invitations',
              label: 'My Invitations',
              to: '/invitations',
              icon: <Mail className="w-4 h-4 shrink-0" />,
              matchPaths: ['/invitations', '/invitations/accept'],
            },
            {
              id: 'school-context',
              label: 'Workspace Overview',
              to: '/app/context',
              icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
              matchPaths: ['/app/context'],
            },
          ],
        },
      ];
    }

    return [];
  }, [
    activeWorkspace,
    hasFeature,
    hasPermission,
    isOrganizationDeactivated,
    isOrganizationRestricted,
  ]);

  const isNavItemActive = (item: NavItemConfig): boolean => {
    const currentPath = location.pathname.replace(/\/$/, '') || '/';
    if (item.matchPaths && item.matchPaths.includes(currentPath)) {
      return true;
    }
    return currentPath === item.to;
  };

  const handleSwitchWorkspaceOption = async (option: WorkspaceContextOption) => {
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
      navigate('/app');
      await selectOrganization(option.organizationId);
      toast.info(
        'Workspace switched',
        `Activated ${option.displayName} (${option.roles.map(formatRoleLabel).join(', ')}).`
      );
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
              'rounded-xl border p-2.5 flex items-center gap-2.5 transition-colors',
              collapsed && 'justify-center p-2',
              isOrganizationSuspended
                ? 'border-amber-300/90 bg-amber-50/60'
                : isOrganizationDeactivated
                ? 'border-rose-200/90 bg-rose-50/40'
                : 'border-slate-200/80 bg-slate-50/70'
            )}
            title={`${workspaceDisplayName} (${primaryRoleLabel})${
              activeWorkspace === 'SCHOOL' && activeOrganizationStatus !== 'ACTIVE'
                ? ` • ${activeOrganizationStatus}`
                : ''
            }`}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white shadow-2xs',
                activeWorkspace === 'PLATFORM'
                  ? 'bg-indigo-600'
                  : isOrganizationSuspended
                  ? 'bg-amber-600'
                  : isOrganizationDeactivated
                  ? 'bg-rose-700'
                  : 'bg-slate-900'
              )}
            >
              {activeWorkspace === 'PLATFORM' ? (
                <Shield className="w-4 h-4" />
              ) : isOrganizationSuspended ? (
                <PauseCircle className="w-4 h-4" />
              ) : isOrganizationDeactivated ? (
                <PowerOff className="w-4 h-4" />
              ) : (
                <Building2 className="w-4 h-4" />
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-1.5">
                  <p
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider truncate',
                      isOrganizationSuspended
                        ? 'text-amber-800'
                        : isOrganizationDeactivated
                        ? 'text-rose-800'
                        : 'text-indigo-600'
                    )}
                  >
                    {activeWorkspace === 'PLATFORM'
                      ? 'Platform Control'
                      : 'School Workspace'}
                  </p>
                  {isOrganizationSuspended && (
                    <Badge variant="warning" className="px-1.5 py-0 text-[9px]">
                      Suspended
                    </Badge>
                  )}
                  {isOrganizationDeactivated && (
                    <Badge variant="danger" className="px-1.5 py-0 text-[9px]">
                      Deactivated
                    </Badge>
                  )}
                </div>
                <TruncatedText
                  text={workspaceDisplayName}
                  as="p"
                  className="text-xs font-bold text-slate-900"
                />
                <TruncatedText
                  text={primaryRoleLabel}
                  as="p"
                  className="text-[11px] text-slate-500"
                />
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
                    title={
                      collapsed
                        ? `${item.label}${item.restricted ? ' (Restricted)' : ''}`
                        : undefined
                    }
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors min-w-0',
                      collapsed && 'justify-center px-2',
                      active
                        ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/70 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
                    )}
                  >
                    <span className={cn('shrink-0', active ? 'text-indigo-600' : 'text-slate-400')}>
                      {item.icon}
                    </span>
                    {!collapsed && <TruncatedText text={item.label} className="flex-1" />}
                    {!collapsed && item.restricted && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-800 text-[10px] font-semibold shrink-0"
                        title="Restricted while organization is suspended or deactivated"
                      >
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
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
                <TruncatedText
                  text={breadcrumbParent || workspaceDisplayName}
                  maxWidthClass="max-w-[180px]"
                  className="hidden sm:inline-block font-medium text-slate-500"
                />
                {isOrganizationSuspended && (
                  <Badge variant="warning" dot className="hidden sm:inline-flex">
                    Suspended
                  </Badge>
                )}
                {isOrganizationDeactivated && (
                  <Badge variant="danger" dot className="hidden sm:inline-flex">
                    Deactivated
                  </Badge>
                )}
                <ChevronRight className="hidden sm:inline-block w-3.5 h-3.5 text-slate-300 shrink-0" />
                <TruncatedText
                  text={pageTitle}
                  maxWidthClass="max-w-[200px] sm:max-w-[280px]"
                  className="font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* Right: Workspace Switcher + User Profile Menu */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Workspace Switcher Dropdown */}
              <div className="relative" ref={workspaceMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsWorkspaceMenuOpen((prev) => {
                      const next = !prev;
                      if (next) {
                        void revalidateAllOrganizationsStatuses();
                      }
                      return next;
                    });
                  }}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition-colors cursor-pointer',
                    isOrganizationSuspended
                      ? 'border-amber-300 bg-amber-50/70 hover:bg-amber-100/70'
                      : isOrganizationDeactivated
                      ? 'border-rose-300 bg-rose-50/60 hover:bg-rose-100/60'
                      : 'border-slate-200/90 bg-slate-50/70 hover:bg-slate-100/80'
                  )}
                  aria-expanded={isWorkspaceMenuOpen}
                  aria-haspopup="true"
                >
                  <Badge
                    variant={
                      activeWorkspace === 'PLATFORM'
                        ? 'primary'
                        : isOrganizationSuspended
                        ? 'warning'
                        : isOrganizationDeactivated
                        ? 'danger'
                        : 'info'
                    }
                    className="px-1.5 py-0 text-[10px]"
                  >
                    {activeWorkspace === 'PLATFORM'
                      ? 'Platform'
                      : isOrganizationSuspended
                      ? 'Suspended'
                      : isOrganizationDeactivated
                      ? 'Deactivated'
                      : 'School'}
                  </Badge>
                  <TruncatedText
                    text={workspaceDisplayName}
                    maxWidthClass="max-w-[150px]"
                    className="font-semibold text-slate-800 hidden md:inline-block"
                  />
                  <span className="hidden lg:inline text-slate-400">•</span>
                  <TruncatedText
                    text={primaryRoleLabel}
                    maxWidthClass="max-w-[140px]"
                    className="hidden lg:inline-block text-slate-500"
                  />
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {isWorkspaceMenuOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200/90 bg-white shadow-xl p-2 z-50 space-y-1.5">
                    <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Available Workspaces
                      </span>
                      <CounterLabel count={availableWorkspaces.length} />
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
                                    : option.organizationStatus === 'SUSPENDED'
                                    ? 'bg-amber-600'
                                    : option.organizationStatus === 'DEACTIVATED'
                                    ? 'bg-rose-700'
                                    : 'bg-slate-900'
                                )}
                              >
                                {option.workspaceType === 'PLATFORM' ? (
                                  <Shield className="w-3.5 h-3.5" />
                                ) : option.organizationStatus === 'SUSPENDED' ? (
                                  <PauseCircle className="w-3.5 h-3.5" />
                                ) : option.organizationStatus === 'DEACTIVATED' ? (
                                  <PowerOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Building2 className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                  <TruncatedText
                                    text={option.displayName}
                                    maxWidthClass="max-w-[140px]"
                                    className="font-semibold text-slate-900"
                                  />
                                  {option.organizationStatus === 'SUSPENDED' ? (
                                    <Badge variant="warning" className="px-1.5 py-0 text-[9px]">
                                      Suspended
                                    </Badge>
                                  ) : option.organizationStatus === 'DEACTIVATED' ? (
                                    <Badge variant="danger" className="px-1.5 py-0 text-[9px]">
                                      Deactivated
                                    </Badge>
                                  ) : (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                                      {option.workspaceType === 'PLATFORM' ? 'Platform' : 'School'}
                                    </span>
                                  )}
                                </div>
                                <TruncatedText
                                  text={option.roles.map(formatRoleLabel).join(', ')}
                                  maxWidthClass="max-w-[200px]"
                                  as="p"
                                  className="text-[11px] text-slate-500 mt-0.5"
                                />
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


              {/* Direct Invitations Inbox Link */}
              <Link
                to="/invitations"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors"
                title="Open Invitations Inbox"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="hidden sm:inline">Invitations</span>
                {pendingInvitationsCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-bold">
                    {pendingInvitationsCount}
                  </span>
                )}
              </Link>

              {/* User Profile Menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs transition-colors cursor-pointer"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <UserAvatar size="xs" />
                  <TruncatedText
                    text={fullName}
                    maxWidthClass="max-w-[130px]"
                    className="hidden sm:inline-block font-medium text-slate-800"
                  />
                  {pendingInvitationsCount > 0 && (
                    <span
                      title={`${pendingInvitationsCount} pending invitation(s)`}
                      className="inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-bold"
                    >
                      {pendingInvitationsCount}
                    </span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200/90 bg-white shadow-xl p-2 z-50 space-y-1.5">
                    <div className="px-3 py-2 border-b border-slate-100 space-y-1">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar size="sm" />
                        <div className="min-w-0 flex-1">
                          <TruncatedText
                            text={fullName}
                            as="p"
                            className="text-xs font-semibold text-slate-900"
                          />
                          <TruncatedText
                            text={user?.email}
                            as="p"
                            className="text-[11px] font-mono text-slate-500"
                          />
                        </div>
                      </div>
                      <div className="pt-1 flex flex-wrap gap-1">
                        {activeRoleCodes.map((rc) => (
                          <RoleTag key={rc} label={formatRoleLabel(rc)} />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-0.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setAccountModalTab('profile');
                          setAccountModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-400" />
                        <span>My Profile &amp; Account Settings</span>
                      </button>

                      <Link
                        to="/invitations"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex items-center gap-2.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>Invitations Inbox</span>
                        </span>
                        <CounterLabel count={pendingInvitationsCount} />
                      </Link>

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

        {/* Organization / Subscription Status Notifications */}
        <OrganizationSuspendedBanner />
        <SubscriptionSuspendedBanner />

        {/* Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isOrganizationDeactivated ? (
            <OrganizationDeactivatedScreen />
          ) : (
            children
          )}
        </main>

        <AccountSettingsModal
          open={accountModalOpen}
          onClose={() => setAccountModalOpen(false)}
          initialTab={accountModalTab}
        />
      </div>
    </div>
  );
};
