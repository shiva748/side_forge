import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Award,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  Layers,
  Megaphone,
  PlusCircle,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api-client';
import { schoolDashboardApi } from '../services/schoolDashboardApi';
import { classifyOrganizationAccessError, formatRoleLabel } from '../types/auth';
import { formatCurrencyINR } from '../types/platformSubscription';
import {
  AcademicSessionResponse,
  AccountantDashboardResponse,
  AdminDashboardResponse,
  AnnouncementItem,
  DailyAttendanceSnapshot,
  formatExamTypeLabel,
  getAcademicSessionStatusBadgeMeta,
  getExamStatusBadgeMeta,
  PrincipalDashboardResponse,
  PublishedExamResultOverview,
  SchoolNoticeResponse,
  StaffSummaryItem,
  StudentSummaryItem,
  TeacherDashboardResponse,
  UpcomingExaminationSummary,
} from '../types/schoolDashboard';
import { AppShell } from '../components/layout/AppShell';
import { formatOnboardingDate } from '../components/platform/OnboardingRequestDetailsModal';
import { SuspendedOrganizationWorkspaceView } from '../components/school/OrganizationStatusBanner';
import { Badge, CounterLabel, IdLabel, RoleTag } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/FormControls';
import { PageHeader } from '../components/ui/PageHeader';
import {
  EmptyState,
  ErrorState,
  InlineAlert,
  LoadingState,
} from '../components/ui/StateViews';
import { TruncatedText } from '../components/ui/TruncatedText';

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export const SchoolDashboardPage: React.FC = () => {
  const {
    activeOrganizationId,
    activeOrganization,
    isOrganizationSuspended,
    isOrganizationRestricted,
    organizationRoles,
    revalidateOrganizationStatus,
    hasPermission,
    hasFeature,
  } = useAuth();
  const navigate = useNavigate();

  // Strictly evaluate school-scoped permissions & feature entitlements
  const hasDashboardFeature = hasFeature('DASHBOARD_AND_REPORTS');
  const hasAcademicFeature = hasFeature('ACADEMIC_MANAGEMENT');
  const hasStudentFeature = hasFeature('STUDENT_MANAGEMENT');
  const hasStaffFeature = hasFeature('STAFF_MANAGEMENT');
  const hasAttendanceFeature = hasFeature('ATTENDANCE');
  const hasTimetableFeature = hasFeature('TIMETABLE');
  const hasExamFeature = hasFeature('EXAMINATION_AND_RESULTS');
  const hasFeesFeature = hasFeature('FEES_AND_FINANCE');
  const hasHomeworkFeature = hasFeature('HOMEWORK_AND_ASSIGNMENTS');
  const hasCommunicationFeature = hasFeature('COMMUNICATION_AND_NOTIFICATIONS');

  const canViewDashboard = hasPermission('dashboard.view');
  const isAdminOrPrincipalCapable =
    canViewDashboard &&
    (hasPermission('school.update') ||
      hasPermission('class.manage') ||
      hasPermission('staff.manage') ||
      hasPermission('academic_session.manage'));

  const canViewFinancialReport =
    hasPermission('fees.report.view') &&
    (hasPermission('fees.view') || hasPermission('fees.report.view'));

  const isTeacherRole =
    organizationRoles.has('TEACHER') || hasPermission('homework.evaluate');

  const canViewSessions = hasAcademicFeature && hasPermission('academic_session.view');
  const canViewStudents = hasStudentFeature && hasPermission('student.view');
  const canViewStaff = hasStaffFeature && hasPermission('staff.view');
  const canViewAnnouncements =
    hasCommunicationFeature && hasPermission('communication.view');

  // Selected session filter (optional)
  const [selectedSessionId, setSelectedSessionId] = useState<number | undefined>(
    undefined
  );

  // Dashboard data state
  const [adminDash, setAdminDash] = useState<AdminDashboardResponse | null>(null);
  const [principalDash, setPrincipalDash] = useState<PrincipalDashboardResponse | null>(
    null
  );
  const [accountantDash, setAccountantDash] =
    useState<AccountantDashboardResponse | null>(null);
  const [teacherDash, setTeacherDash] = useState<TeacherDashboardResponse | null>(null);

  const [sessions, setSessions] = useState<AcademicSessionResponse[]>([]);
  const [recentStudents, setRecentStudents] = useState<StudentSummaryItem[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number | null>(null);
  const [recentStaff, setRecentStaff] = useState<StaffSummaryItem[]>([]);
  const [totalStaffCount, setTotalStaffCount] = useState<number | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchoolDashboard = useCallback(
    async (isManualRefresh = false) => {
      if (!activeOrganizationId) return;

      if (isOrganizationRestricted) {
        setAdminDash(null);
        setPrincipalDash(null);
        setAccountantDash(null);
        setTeacherDash(null);
        setSessions([]);
        setRecentStudents([]);
        setTotalStudentsCount(null);
        setRecentStaff([]);
        setTotalStaffCount(null);
        setAnnouncements([]);
        setError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        if (isManualRefresh) {
          await revalidateOrganizationStatus();
        }
        return;
      }

      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const queryOpts = selectedSessionId
        ? { academicSessionId: selectedSessionId }
        : undefined;

      try {
        const tasks: Promise<void>[] = [];

        if (hasDashboardFeature && isAdminOrPrincipalCapable) {
          tasks.push(
            schoolDashboardApi
              .getAdminDashboard(activeOrganizationId, queryOpts)
              .then((res) => setAdminDash(res))
              .catch((err) => {
                if (err instanceof ApiError && err.status === 403) {
                  setAdminDash(null);
                  return;
                }
                throw err;
              })
          );
          tasks.push(
            schoolDashboardApi
              .getPrincipalDashboard(activeOrganizationId, queryOpts)
              .then((res) => setPrincipalDash(res))
              .catch(() => setPrincipalDash(null))
          );
        } else {
          setAdminDash(null);
          setPrincipalDash(null);
        }

        if (hasDashboardFeature && canViewFinancialReport) {
          tasks.push(
            schoolDashboardApi
              .getAccountantDashboard(activeOrganizationId, queryOpts)
              .then((res) => setAccountantDash(res))
              .catch(() => setAccountantDash(null))
          );
        } else {
          setAccountantDash(null);
        }

        if (hasDashboardFeature && canViewDashboard && isTeacherRole) {
          tasks.push(
            schoolDashboardApi
              .getTeacherDashboard(activeOrganizationId, queryOpts)
              .then((res) => setTeacherDash(res))
              .catch(() => setTeacherDash(null))
          );
        } else {
          setTeacherDash(null);
        }

        if (canViewSessions) {
          tasks.push(
            schoolDashboardApi
              .getAcademicSessions(activeOrganizationId)
              .then((res) => setSessions(res || []))
              .catch(() => setSessions([]))
          );
        } else {
          setSessions([]);
        }

        if (canViewStudents) {
          tasks.push(
            schoolDashboardApi
              .getRecentStudents(activeOrganizationId, 5)
              .then((res) => {
                setRecentStudents(res.content || []);
                setTotalStudentsCount(res.totalElements ?? 0);
              })
              .catch(() => {
                setRecentStudents([]);
                setTotalStudentsCount(null);
              })
          );
        } else {
          setRecentStudents([]);
          setTotalStudentsCount(null);
        }

        if (canViewStaff) {
          tasks.push(
            schoolDashboardApi
              .getRecentStaff(activeOrganizationId, 5)
              .then((res) => {
                setRecentStaff(res.content || []);
                setTotalStaffCount(res.totalElements ?? 0);
              })
              .catch(() => {
                setRecentStaff([]);
                setTotalStaffCount(null);
              })
          );
        } else {
          setRecentStaff([]);
          setTotalStaffCount(null);
        }

        if (canViewAnnouncements) {
          tasks.push(
            schoolDashboardApi
              .getVisibleAnnouncements(activeOrganizationId)
              .then((res) => setAnnouncements((res || []).slice(0, 6)))
              .catch(() => setAnnouncements([]))
          );
        } else {
          setAnnouncements([]);
        }

        await Promise.all(tasks);
      } catch (err) {
        const classified = classifyOrganizationAccessError(err);
        if (
          classified.kind === 'ORG_SUSPENDED' ||
          classified.kind === 'ORG_DEACTIVATED'
        ) {
          setError(null);
          return;
        }
        setError(classified.userMessage);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      activeOrganizationId,
      canViewAnnouncements,
      canViewDashboard,
      canViewFinancialReport,
      canViewSessions,
      canViewStaff,
      canViewStudents,
      hasDashboardFeature,
      isAdminOrPrincipalCapable,
      isOrganizationRestricted,
      isTeacherRole,
      revalidateOrganizationStatus,
      selectedSessionId,
    ]
  );

  useEffect(() => {
    void loadSchoolDashboard(false);
  }, [loadSchoolDashboard]);


  // Reset selected session when switching organization
  useEffect(() => {
    setSelectedSessionId(undefined);
  }, [activeOrganizationId]);


  // Resolve active academic session across available endpoints
  const currentSessionObj = useMemo(() => {
    if (selectedSessionId) {
      return sessions.find((s) => s.id === selectedSessionId) || null;
    }
    return (
      sessions.find((s) => s.status === 'ACTIVE' || s.status === 'CURRENT') ||
      sessions[0] ||
      null
    );
  }, [selectedSessionId, sessions]);

  const activeSessionName =
    adminDash?.currentAcademicSessionName ||
    principalDash?.academicSessionName ||
    accountantDash?.academicSessionName ||
    teacherDash?.academicSessionName ||
    currentSessionObj?.name ||
    null;

  const activeSessionStatus =
    adminDash?.currentAcademicSessionStatus ||
    currentSessionObj?.status ||
    (activeSessionName ? 'CURRENT' : null);

  const sessionBadgeMeta = getAcademicSessionStatusBadgeMeta(activeSessionStatus);

  const referenceDate =
    adminDash?.referenceDate ||
    principalDash?.referenceDate ||
    accountantDash?.referenceDate ||
    teacherDash?.referenceDate ||
    null;

  const studentAttendanceSnap: DailyAttendanceSnapshot | null =
    adminDash?.todayStudentAttendance || null;
  const staffAttendanceSnap: DailyAttendanceSnapshot | null =
    adminDash?.todayStaffAttendance || principalDash?.todayStaffAttendance || null;

  const upcomingExams: UpcomingExaminationSummary[] = useMemo(() => {
    if (adminDash?.upcomingExaminations?.length) {
      return adminDash.upcomingExaminations;
    }
    if (principalDash?.upcomingExaminations?.length) {
      return principalDash.upcomingExaminations;
    }
    if (teacherDash?.upcomingExaminations?.length) {
      return teacherDash.upcomingExaminations;
    }
    return [];
  }, [adminDash, principalDash, teacherDash]);

  const publishedResults: PublishedExamResultOverview[] = useMemo(() => {
    if (adminDash?.recentlyPublishedResults?.length) {
      return adminDash.recentlyPublishedResults;
    }
    if (principalDash?.examinationPerformanceOverview?.length) {
      return principalDash.examinationPerformanceOverview;
    }
    return [];
  }, [adminDash, principalDash]);

  const dashboardNotices: SchoolNoticeResponse[] = useMemo(() => {
    if (adminDash?.announcements?.length) return adminDash.announcements;
    if (principalDash?.importantSchoolNotices?.length) {
      return principalDash.importantSchoolNotices;
    }
    if (teacherDash?.importantSchoolNotices?.length) {
      return teacherDash.importantSchoolNotices;
    }
    return [];
  }, [adminDash, principalDash, teacherDash]);

  const financialTotals = useMemo(() => {
    if (accountantDash) {
      return {
        demanded: Number(accountantDash.totalFeeDemands || 0),
        collected: Number(accountantDash.totalCollection || 0),
        outstanding: Number(accountantDash.outstandingFees || 0),
        overdue: Number(accountantDash.overdueFees || 0),
      };
    }
    if (adminDash?.financialSummary) {
      return {
        demanded: Number(adminDash.financialSummary.totalFeesDemanded || 0),
        collected: Number(adminDash.financialSummary.totalFeesCollected || 0),
        outstanding: Number(adminDash.financialSummary.outstandingFeeAmount || 0),
        overdue: Number(adminDash.financialSummary.overdueFeeAmount || 0),
      };
    }
    return null;
  }, [accountantDash, adminDash]);


  const permittedQuickActions = useMemo(() => {
    const items: {
      id: string;
      label: string;
      permissionHint: string;
      icon: React.ReactNode;
    }[] = [];

    if (hasStudentFeature && hasPermission('student.create')) {
      items.push({
        id: 'add-student',
        label: 'Add Student',
        permissionHint: 'Student Management (Upcoming)',
        icon: <UserPlus className="w-3.5 h-3.5" />,
      });
    }
    if (hasStaffFeature && hasPermission('staff.manage')) {
      items.push({
        id: 'add-staff',
        label: 'Add Staff',
        permissionHint: 'Staff Management (Upcoming)',
        icon: <PlusCircle className="w-3.5 h-3.5" />,
      });
    }
    if (
      hasAttendanceFeature &&
      (hasPermission('attendance.mark') ||
        hasPermission('attendance.update') ||
        hasPermission('attendance.view'))
    ) {
      items.push({
        id: 'manage-attendance',
        label: 'Manage Attendance',
        permissionHint: 'Attendance Module (Upcoming)',
        icon: <ClipboardCheck className="w-3.5 h-3.5" />,
      });
    }
    if (
      hasTimetableFeature &&
      (hasPermission('timetable.manage') || hasPermission('timetable.view'))
    ) {
      items.push({
        id: 'manage-timetable',
        label: 'Manage Timetable',
        permissionHint: 'Timetable Module (Upcoming)',
        icon: <Calendar className="w-3.5 h-3.5" />,
      });
    }
    if (hasCommunicationFeature && hasPermission('communication.manage')) {
      items.push({
        id: 'create-announcement',
        label: 'Create Announcement',
        permissionHint: 'Communication Module (Upcoming)',
        icon: <Megaphone className="w-3.5 h-3.5" />,
      });
    }
    if (
      hasHomeworkFeature &&
      (hasPermission('homework.manage') ||
        hasPermission('homework.evaluate') ||
        hasPermission('homework.view'))
    ) {
      items.push({
        id: 'manage-homework',
        label: 'Manage Homework',
        permissionHint: 'Homework Module (Upcoming)',
        icon: <BookOpen className="w-3.5 h-3.5" />,
      });
    }

    return items;
  }, [
    hasAttendanceFeature,
    hasCommunicationFeature,
    hasHomeworkFeature,
    hasPermission,
    hasStaffFeature,
    hasStudentFeature,
    hasTimetableFeature,
  ]);

  const resolvedStudentsCount =
    adminDash != null ? adminDash.totalActiveStudents : totalStudentsCount;
  const resolvedStaffCount =
    adminDash != null ? adminDash.totalActiveStaffAndTeachers : totalStaffCount;

  const activeRolesList = Array.from(organizationRoles);

  return (
    <AppShell
      pageTitle="Dashboard"
      breadcrumbParent={
        activeOrganization?.organizationName || 'School Administration'
      }
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow={
            activeOrganization?.organizationName
              ? `${activeOrganization.organizationName} • School Administration`
              : 'School Administration'
          }
          title="School Administration Dashboard"
          description="Daily academic operations, attendance overview, upcoming examinations, fee collections, and recent school activity."
          badge={
            <div className="flex flex-wrap items-center gap-2">
              {isOrganizationSuspended ? (
                <Badge variant="warning" dot>
                  Organization Suspended
                </Badge>
              ) : activeSessionName ? (
                <Badge variant={sessionBadgeMeta.variant} dot>
                  {activeSessionName} ({sessionBadgeMeta.label})
                </Badge>
              ) : (
                <Badge variant="neutral">No Active Session</Badge>
              )}
              {activeRolesList.map((role) => (
                <RoleTag key={role} label={formatRoleLabel(role)} />
              ))}
            </div>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {!isOrganizationSuspended && sessions.length > 0 && (
                <Select
                  aria-label="Select Academic Session"
                  value={selectedSessionId ? String(selectedSessionId) : ''}
                  onChange={(e) =>
                    setSelectedSessionId(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="h-9 text-xs w-44"
                >
                  <option value="">Current / Default Session</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </Select>
              )}
              <Button
                variant="outline"
                size="sm"
                isLoading={isRefreshing}
                onClick={() => void loadSchoolDashboard(true)}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
            </div>
          }
        />

        {isOrganizationSuspended ? (
          <SuspendedOrganizationWorkspaceView />
        ) : isLoading ? (
          <LoadingState label="Loading school dashboard..." />
        ) : error ? (
          <ErrorState
            title="Unable to load school dashboard"
            message={error}
            onRetry={() => void loadSchoolDashboard(true)}
          />
        ) : (
          <>
            {adminDash?.emptyState && adminDash.emptyStateMessage && (
              <InlineAlert variant="info" title="New School Workspace">
                {adminDash.emptyStateMessage}
              </InlineAlert>
            )}

            {/* 1. Dashboard Overview — Focused School-Level KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Active Academic Session */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Active Academic Session
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="min-w-0">
                  <TruncatedText
                    text={activeSessionName || 'No Active Session'}
                    as="p"
                    className="text-xl font-bold tracking-tight text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    {currentSessionObj
                      ? `${currentSessionObj.startDate} → ${currentSessionObj.endDate}`
                      : referenceDate
                      ? `Reference date: ${referenceDate}`
                      : 'Configure session in Academic Management'}
                  </p>
                </div>
              </div>

              {/* Total Students (if permitted) */}
              {resolvedStudentsCount !== null && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      Total Students
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {resolvedStudentsCount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {adminDash != null
                        ? `Across ${adminDash.totalClasses} active class(es)`
                        : 'Registered student profiles'}
                    </p>
                  </div>
                </div>
              )}

              {/* Total Teaching & Non-Teaching Staff (if permitted) */}
              {resolvedStaffCount !== null && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      Staff &amp; Teachers
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {resolvedStaffCount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {adminDash != null
                        ? `${adminDash.totalActiveTeachers} teaching • ${adminDash.totalActiveNonTeachingStaff} non-teaching`
                        : 'Active school employees'}
                    </p>
                  </div>
                </div>
              )}

              {/* Financial Overview OR Upcoming Examinations KPI Card */}
              {financialTotals ? (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      Pending Fee Collections
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {formatCurrencyINR(financialTotals.outstanding)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Collected: {formatCurrencyINR(financialTotals.collected)}
                      {financialTotals.overdue > 0
                        ? ` • ${formatCurrencyINR(financialTotals.overdue)} overdue`
                        : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      Upcoming Examinations
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {upcomingExams.length}
                    </p>
                    <TruncatedText
                      text={
                        upcomingExams[0]
                          ? `Next: ${upcomingExams[0].examinationName} (${
                              upcomingExams[0].startDate || 'TBD'
                            })`
                          : 'No scheduled upcoming exams'
                      }
                      as="p"
                      className="text-[11px] text-slate-500 mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Quick Actions Bar (Strictly Filtered by User Permissions & Entitlements) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Quick Actions
                </h2>
                <p className="text-xs text-slate-500">
                  Authorized shortcuts for your school roles and module entitlements.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {hasAcademicFeature && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate('/app/academics')}
                    leftIcon={<Calendar className="w-3.5 h-3.5" />}
                  >
                    Academic Management
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/app/context')}
                  leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                >
                  Workspace &amp; RBAC Context
                </Button>

                {permittedQuickActions.map((action) => (
                  <span
                    key={action.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500 select-none"
                    title={action.permissionHint}
                  >
                    <span className="text-indigo-600">{action.icon}</span>
                    <span>{action.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* 3. Today's Attendance Overview */}
            {(studentAttendanceSnap ||
              staffAttendanceSnap ||
              (teacherDash && teacherDash.todayAttendanceTasks.length > 0)) && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ClipboardCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Today&apos;s Attendance Overview
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        {studentAttendanceSnap?.date
                          ? `Attendance summary for ${studentAttendanceSnap.date}`
                          : referenceDate
                          ? `Attendance summary for ${referenceDate}`
                          : 'Daily student and staff attendance status'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {adminDash != null && adminDash.overallStudentAttendancePercentage > 0 && (
                      <Badge variant="primary">
                        Session Avg: {adminDash.overallStudentAttendancePercentage.toFixed(1)}%
                      </Badge>
                    )}
                    <span className="text-[11px] font-medium text-slate-400">
                      Attendance Module (Upcoming)
                    </span>
                  </div>
                </div>

                {studentAttendanceSnap && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/40">
                    <div className="p-4">
                      <p className="text-xs font-medium text-slate-500">Students Present</p>
                      <p className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
                        {studentAttendanceSnap.presentCount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {studentAttendanceSnap.lateCount > 0 ||
                        studentAttendanceSnap.halfDayCount > 0
                          ? `+ ${studentAttendanceSnap.lateCount} late • ${studentAttendanceSnap.halfDayCount} half-day`
                          : 'Marked present today'}
                      </p>
                    </div>

                    <div className="p-4">
                      <p className="text-xs font-medium text-slate-500">Students Absent</p>
                      <p className="text-xl font-bold text-rose-700 mt-1 tabular-nums">
                        {studentAttendanceSnap.absentCount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Unexcused absences</p>
                    </div>

                    <div className="p-4">
                      <p className="text-xs font-medium text-slate-500">On Leave / Excused</p>
                      <p className="text-xl font-bold text-amber-700 mt-1 tabular-nums">
                        {studentAttendanceSnap.leaveOrExcusedCount.toLocaleString('en-IN')}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Approved student leave</p>
                    </div>

                    <div className="p-4">
                      <p className="text-xs font-medium text-slate-500">Marked Progress</p>
                      <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
                        {studentAttendanceSnap.markedCount} / {studentAttendanceSnap.totalCount}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {studentAttendanceSnap.markedCount === 0
                          ? 'Attendance not marked yet'
                          : 'Enrolled students recorded'}
                      </p>
                    </div>

                    <div className="p-4 col-span-2 sm:col-span-1">
                      <p className="text-xs font-medium text-slate-500">Attendance Rate</p>
                      {studentAttendanceSnap.markedCount > 0 ? (
                        <>
                          <p className="text-xl font-bold text-indigo-700 mt-1 tabular-nums">
                            {studentAttendanceSnap.attendancePercentage.toFixed(1)}%
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Of marked students today
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-slate-600 mt-1.5">
                            Not Marked Yet
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Awaiting daily roll call
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {staffAttendanceSnap && (
                  <div className="px-5 py-3 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-medium text-slate-700">Today&apos;s Staff Attendance:</span>
                      <span>
                        <strong className="text-emerald-700">
                          {staffAttendanceSnap.presentCount}
                        </strong>{' '}
                        present •{' '}
                        <strong className="text-rose-700">
                          {staffAttendanceSnap.absentCount}
                        </strong>{' '}
                        absent •{' '}
                        <strong className="text-amber-700">
                          {staffAttendanceSnap.leaveOrExcusedCount}
                        </strong>{' '}
                        on leave ({staffAttendanceSnap.markedCount}/{staffAttendanceSnap.totalCount}{' '}
                        marked)
                      </span>
                    </div>
                    {staffAttendanceSnap.markedCount > 0 && (
                      <Badge variant="success" dot>
                        Staff Rate: {staffAttendanceSnap.attendancePercentage.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                )}

                {teacherDash && teacherDash.todayAttendanceTasks.length > 0 && (
                  <div className="px-5 py-4 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Your Assigned Class Attendance Tasks Today
                      </span>
                      <CounterLabel count={teacherDash.todayAttendanceTasks.length} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {teacherDash.todayAttendanceTasks.map((task) => (
                        <div
                          key={task.classId}
                          className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <TruncatedText
                                text={task.className}
                                maxWidthClass="max-w-[140px]"
                                className="font-semibold text-slate-900"
                              />
                              {task.classTeacher && (
                                <Badge variant="primary">Class Teacher</Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Marked: {task.markedCount}/{task.totalEnrolledStudents} (
                              {task.pendingCount} pending)
                            </p>
                          </div>
                          <Badge variant={task.completed ? 'success' : 'warning'} dot>
                            {task.completed ? 'Done' : 'Pending'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Teacher's Today's Timetable (Shown when TeacherDashboardResponse is available) */}
            {teacherDash && teacherDash.todayTimetable.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Your Teaching Timetable Today ({teacherDash.referenceDate})
                    </h2>
                  </div>
                  <CounterLabel
                    count={teacherDash.todayTimetable.length}
                    label={teacherDash.todayTimetable.length === 1 ? 'Period' : 'Periods'}
                  />
                </div>
                <div className="divide-y divide-slate-100">
                  {teacherDash.todayTimetable.map((slot) => (
                    <div
                      key={slot.id}
                      className="px-5 py-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <IdLabel>{slot.periodName}</IdLabel>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {slot.subjectName} ({slot.className})
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {slot.startTime} – {slot.endTime}
                            {slot.room ? ` • Room ${slot.room}` : ''}
                          </p>
                        </div>
                      </div>
                      <Badge variant="info">{slot.subjectCode}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Academic Overview — Upcoming Examinations & Published Results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Examinations */}
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Upcoming &amp; Active Examinations
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Scheduled assessments for {activeSessionName || 'the active session'}
                      </p>
                    </div>
                  </div>
                  <CounterLabel count={upcomingExams.length} />
                </div>

                <div className="flex-1 divide-y divide-slate-100">
                  {upcomingExams.length === 0 ? (
                    <EmptyState
                      title="No upcoming examinations"
                      description="Scheduled or active examinations for the current academic session will appear here."
                      className="py-10"
                    />
                  ) : (
                    upcomingExams.slice(0, 6).map((exam) => {
                      const statusMeta = getExamStatusBadgeMeta(exam.status);
                      return (
                        <div
                          key={exam.examinationId}
                          className="px-5 py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <TruncatedText
                                text={exam.examinationName}
                                maxWidthClass="max-w-[200px]"
                                className="font-semibold text-slate-900 text-sm"
                              />
                              <Badge variant="neutral">
                                {formatExamTypeLabel(exam.examType)}
                              </Badge>
                            </div>
                            <p className="text-slate-500">
                              Class: <strong className="text-slate-700">{exam.className}</strong> •{' '}
                              {exam.startDate
                                ? `${exam.startDate}${
                                    exam.endDate ? ` → ${exam.endDate}` : ''
                                  }`
                                : 'Dates TBD'}{' '}
                              • {exam.scheduledSubjectsCount} subject(s)
                            </p>
                          </div>
                          <Badge variant={statusMeta.variant} dot>
                            {statusMeta.label}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Recently Published Examination Results */}
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Published Examination Results
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Recent official results and class pass rates
                      </p>
                    </div>
                  </div>
                  <CounterLabel count={publishedResults.length} />
                </div>

                <div className="flex-1 divide-y divide-slate-100">
                  {publishedResults.length === 0 ? (
                    <EmptyState
                      title="No published examination results yet"
                      description="Once examination marks are finalized and published, class result summaries will appear here."
                      className="py-10"
                    />
                  ) : (
                    publishedResults.slice(0, 6).map((res) => {
                      const statusMeta = getExamStatusBadgeMeta(res.status);
                      return (
                        <div
                          key={res.examinationId}
                          className="px-5 py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <TruncatedText
                                text={res.examinationName}
                                maxWidthClass="max-w-[200px]"
                                className="font-semibold text-slate-900 text-sm"
                              />
                              <span className="text-[11px] font-medium text-slate-500">
                                {res.className}
                              </span>
                            </div>
                            <p className="text-slate-500">
                              Evaluated: <strong className="text-slate-700">{res.totalEvaluatedStudents}</strong> •{' '}
                              <span className="text-emerald-700 font-medium">
                                {res.passedCount} passed
                              </span>{' '}
                              ({res.passPercentage.toFixed(1)}%) • Avg:{' '}
                              <strong className="text-slate-700">
                                {Number(res.classAveragePercentage || 0).toFixed(1)}%
                              </strong>
                            </p>
                          </div>
                          <Badge variant={statusMeta.variant} dot>
                            {statusMeta.label}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>


            {/* School Notices & Announcements */}
            {(announcements.length > 0 || dashboardNotices.length > 0) && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Recent School Announcements &amp; Circulars
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Active notices published for your school organization
                      </p>
                    </div>
                  </div>
                  <CounterLabel
                    count={
                      announcements.length > 0
                        ? announcements.length
                        : dashboardNotices.length
                    }
                  />
                </div>

                <div className="divide-y divide-slate-100">
                  {announcements.length > 0
                    ? announcements.slice(0, 5).map((ann) => (
                        <div
                          key={ann.id}
                          className="px-5 py-3.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/60"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <TruncatedText
                                text={ann.title}
                                maxWidthClass="max-w-[280px] sm:max-w-[420px]"
                                className="font-semibold text-slate-900 text-sm"
                              />
                              {ann.important && (
                                <Badge variant="warning" dot>
                                  Important
                                </Badge>
                              )}
                              <Badge variant="neutral">{ann.targetAudience}</Badge>
                            </div>
                            <p className="text-slate-600 line-clamp-2">{ann.description}</p>
                          </div>
                          <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                            {formatShortDate(ann.publicationDate || ann.createdAt)}
                          </span>
                        </div>
                      ))
                    : dashboardNotices.slice(0, 5).map((notice) => (
                        <div
                          key={notice.id}
                          className="px-5 py-3.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/60"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <TruncatedText
                                text={notice.title}
                                maxWidthClass="max-w-[280px] sm:max-w-[420px]"
                                className="font-semibold text-slate-900 text-sm"
                              />
                              {notice.important && (
                                <Badge variant="warning" dot>
                                  Important
                                </Badge>
                              )}
                              <Badge variant="neutral">{notice.audience}</Badge>
                            </div>
                            <p className="text-slate-600 line-clamp-2">{notice.content}</p>
                          </div>
                          <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">
                            {formatShortDate(notice.publishedDate)}
                          </span>
                        </div>
                      ))}
                </div>
              </div>
            )}

            {/* 5. Recent Activities — Recently Added Students & Staff */}
            {(canViewStudents || canViewStaff) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recently Added Students */}
                {canViewStudents && (
                  <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                        <h2 className="text-sm font-semibold text-slate-900">
                          Recently Added Students
                        </h2>
                      </div>
                      <CounterLabel count={recentStudents.length} />
                    </div>

                    <div className="flex-1 divide-y divide-slate-100">
                      {recentStudents.length === 0 ? (
                        <EmptyState
                          title="No students registered yet"
                          description="Newly registered students will appear here."
                          className="py-10"
                        />
                      ) : (
                        recentStudents.map((st) => {
                          const fullName = [st.firstName, st.middleName, st.lastName]
                            .filter(Boolean)
                            .join(' ');
                          return (
                            <div
                              key={st.id}
                              className="px-5 py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <TruncatedText
                                    text={fullName}
                                    maxWidthClass="max-w-[200px]"
                                    className="font-semibold text-slate-900 text-sm"
                                  />
                                  <IdLabel>{st.admissionNumber}</IdLabel>
                                </div>
                                <p className="text-slate-500">
                                  Admitted: {st.admissionDate || formatShortDate(st.createdAt)}
                                </p>
                              </div>
                              <Badge
                                variant={st.status === 'ACTIVE' ? 'success' : 'neutral'}
                                dot
                              >
                                {st.status}
                              </Badge>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Recently Added Staff */}
                {canViewStaff && (
                  <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs flex flex-col overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                        <h2 className="text-sm font-semibold text-slate-900">
                          Recently Added Staff &amp; Teachers
                        </h2>
                      </div>
                      <CounterLabel count={recentStaff.length} />
                    </div>

                    <div className="flex-1 divide-y divide-slate-100">
                      {recentStaff.length === 0 ? (
                        <EmptyState
                          title="No staff members registered yet"
                          description="Newly added teaching and non-teaching staff will appear here."
                          className="py-10"
                        />
                      ) : (
                        recentStaff.map((emp) => {
                          const fullName = [emp.firstName, emp.middleName, emp.lastName]
                            .filter(Boolean)
                            .join(' ');
                          return (
                            <div
                              key={emp.id}
                              className="px-5 py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <TruncatedText
                                    text={fullName}
                                    maxWidthClass="max-w-[190px]"
                                    className="font-semibold text-slate-900 text-sm"
                                  />
                                  <IdLabel>{emp.employeeId}</IdLabel>
                                  <Badge variant={emp.teachingStaff ? 'primary' : 'neutral'}>
                                    {emp.teachingStaff ? 'Teaching' : 'Non-Teaching'}
                                  </Badge>
                                </div>
                                <p className="text-slate-500">
                                  {emp.designation}
                                  {emp.department ? ` • ${emp.department}` : ''}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  emp.employmentStatus === 'ACTIVE' ? 'success' : 'neutral'
                                }
                                dot
                              >
                                {emp.employmentStatus}
                              </Badge>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent Fee Transactions (Shown when AccountantDashboardResponse has receipts) */}
            {accountantDash && accountantDash.recentPaymentReceipts.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Receipt className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Recent Student Fee Transactions
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Latest recorded student fee payment receipts for the active session
                      </p>
                    </div>
                  </div>
                  <CounterLabel count={accountantDash.recentPaymentReceipts.length} />
                </div>

                <div className="divide-y divide-slate-100">
                  {accountantDash.recentPaymentReceipts.slice(0, 6).map((rcp) => (
                    <div
                      key={rcp.id}
                      className="px-5 py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/60"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <TruncatedText
                            text={rcp.studentName}
                            maxWidthClass="max-w-[200px]"
                            className="font-semibold text-slate-900 text-sm"
                          />
                          <IdLabel>{rcp.receiptNumber}</IdLabel>
                          <span className="font-mono text-[11px] text-slate-500">
                            ({rcp.admissionNumber})
                          </span>
                        </div>
                        <p className="text-slate-500">
                          {rcp.paymentDate} • {rcp.paymentMethod}
                        </p>
                      </div>
                      <div className="text-right space-y-0.5 shrink-0">
                        <div className="font-semibold text-slate-900 tabular-nums">
                          {formatCurrencyINR(rcp.totalAmount, true)}
                        </div>
                        <Badge
                          variant={
                            rcp.status === 'COMPLETED'
                              ? 'success'
                              : rcp.status === 'PARTIALLY_REFUNDED'
                              ? 'warning'
                              : 'danger'
                          }
                          dot
                        >
                          {rcp.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent School Audit Activity Stream (Attendance & Fee Audit Logs) */}
            {adminDash && (
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">
                        Recent Operational Audit Activity
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Recorded attendance corrections and financial audit events
                      </p>
                    </div>
                  </div>
                  <CounterLabel count={(adminDash.recentActivities || []).length} />
                </div>

                {!adminDash.recentActivities || adminDash.recentActivities.length === 0 ? (
                  <EmptyState
                    title="No recent audit events recorded"
                    description="Attendance adjustments and fee transactions recorded in this school workspace will appear here."
                    className="py-10"
                  />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {adminDash.recentActivities.map((act, idx) => (
                      <div
                        key={`${act.activityType}-${act.occurredAt}-${idx}`}
                        className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/60"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={act.module === 'FEES' ? 'primary' : 'info'}
                            >
                              {act.module}
                            </Badge>
                            <span className="font-semibold text-slate-800">
                              {act.activityType.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <p className="text-slate-600">{act.summary}</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatOnboardingDate(act.occurredAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

