import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import {
  OrganizationDeactivatedScreen,
  SubscriptionSuspendedBanner,
  SuspendedOrganizationWorkspaceView,
} from '../components/school/OrganizationStatusBanner';
import {
  StaffDetailModal,
  type StaffDetailTab,
} from '../components/school/StaffDetailModal';
import {
  AssignTeacherClassModal,
  AssignTeacherSubjectModal,
  StaffFormModal,
  StaffInvitationModal,
  StaffStatusModal,
  TeacherProfileModal,
} from '../components/school/StaffManagementDialogs';
import { Badge, CounterLabel, IdLabel } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import {
  Input as TextInput,
  Select as SelectInput,
} from '../components/ui/FormControls';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, InlineAlert } from '../components/ui/StateViews';
import { useAuth } from '../context/AuthContext';
import { academicManagementApi } from '../services/academicManagementApi';
import { staffManagementApi } from '../services/staffManagementApi';
import { normalizeInvitationLinkForFrontend } from '../types/accountAndInvitations';
import type {
  AcademicSessionResponse,
  SchoolClassResponse,
  SubjectResponse,
} from '../types/academicManagement';
import {
  classifyOrganizationAccessError,
  type OrganizationRoleDto,
} from '../types/auth';
import {
  EMPLOYMENT_STATUS_META,
  EMPLOYMENT_TYPE_LABELS,
  INVITATION_STATUS_META,
  formatStaffFullName,
  formatStaffInitials,
  formatTeacherAssignmentName,
  getEmploymentStatusBadge,
  getInvitationStatusBadge,
  isTerminalEmploymentStatus,
  type AssignTeacherClassRequest,
  type AssignTeacherSubjectRequest,
  type ChangeStaffStatusRequest,
  type CreateInvitationRequest,
  type CreateStaffRequest,
  type CreateTeacherRequest,
  type EmploymentStatus,
  type EmploymentType,
  type InvitationDispatchResponse,
  type InvitationResponse,
  type InvitationStatus,
  type StaffResponse,
  type TeacherClassAssignmentResponse,
  type TeacherResponse,
  type TeacherSubjectAssignmentResponse,
  type UpdateStaffRequest,
  type UpdateTeacherClassAssignmentRequest,
  type UpdateTeacherProfileRequest,
  type UpdateTeacherSubjectAssignmentRequest,
} from '../types/staffManagement';

const SectionCard: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, actions, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Pagination: React.FC<{
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onSizeChange: (s: number) => void;
}> = ({
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
}) => {
  if (totalElements === 0) return null;
  const start = page * size + 1;
  const end = Math.min((page + 1) * size, totalElements);
  return (
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200/80 pt-3 text-xs text-slate-600">
      <div className="flex items-center gap-2">
        <span>
          Showing <strong className="text-slate-900">{start}</strong>–
          <strong className="text-slate-900">{end}</strong> of{' '}
          <strong className="text-slate-900">{totalElements}</strong>
        </span>
        <select
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
        >
          {[10, 15, 25, 50].map((s) => (
            <option key={s} value={s}>
              {s} / page
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="px-2 font-medium text-slate-700">
          Page {page + 1} of {Math.max(totalPages, 1)}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

type StaffPageTab = 'staff' | 'teachers' | 'assignments' | 'invitations';

type ReturnToStaffDetailContext = {
  staff: StaffResponse;
  tab: StaffDetailTab;
};

type ActiveStaffDialog =
  | {
      kind: 'STAFF_DETAIL';
      staff: StaffResponse;
      initialTab: StaffDetailTab;
    }
  | {
      kind: 'STAFF_FORM';
      mode: 'create' | 'edit';
      staff: StaffResponse | null;
      returnToDetail?: ReturnToStaffDetailContext;
    }
  | {
      kind: 'STAFF_STATUS';
      staff: StaffResponse;
      returnToDetail?: ReturnToStaffDetailContext;
    }
  | {
      kind: 'TEACHER_PROFILE';
      mode: 'edit' | 'promote';
      teacher: TeacherResponse | null;
      staff: StaffResponse | null;
      returnToDetail?: ReturnToStaffDetailContext;
    }
  | {
      kind: 'ASSIGN_CLASS';
      mode: 'create' | 'edit';
      assignment: TeacherClassAssignmentResponse | null;
      preselectedTeacher: TeacherResponse | null;
      returnToDetail?: ReturnToStaffDetailContext;
    }
  | {
      kind: 'ASSIGN_SUBJECT';
      mode: 'create' | 'edit';
      assignment: TeacherSubjectAssignmentResponse | null;
      preselectedTeacher: TeacherResponse | null;
      returnToDetail?: ReturnToStaffDetailContext;
    }
  | {
      kind: 'INVITE_STAFF';
      preselectedStaff: StaffResponse | null;
      returnToDetail?: ReturnToStaffDetailContext;
    }
  | null;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export const SchoolStaffPage: React.FC = () => {
  const {
    activeOrganization,
    hasPermission,
    hasRole,
    isOrganizationDeactivated,
    isOrganizationSuspended,
    revalidateOrganizationStatus,
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const orgId = activeOrganization?.organizationId;

  const canViewStaff =
    hasPermission('staff.view') || hasPermission('staff.manage');
  const canManageStaff = hasPermission('staff.manage');
  const canViewTeachers =
    hasPermission('teacher.view') || hasPermission('teacher.manage');
  const canManageTeachers = hasPermission('teacher.manage');
  const isSchoolAdmin = hasRole('SCHOOL_ADMIN');

  const initialTabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<StaffPageTab>(
    initialTabParam === 'teachers' ||
      initialTabParam === 'assignments' ||
      initialTabParam === 'invitations'
      ? initialTabParam
      : 'staff'
  );

  // Reference academic & role data
  const [sessions, setSessions] = useState<AcademicSessionResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [roles, setRoles] = useState<OrganizationRoleDto[]>([]);

  // Staff Directory paginated state
  const [staffList, setStaffList] = useState<StaffResponse[]>([]);
  const [staffTotalElements, setStaffTotalElements] = useState(0);
  const [staffTotalPages, setStaffTotalPages] = useState(0);
  const [staffPage, setStaffPage] = useState(0);
  const [staffPageSize, setStaffPageSize] = useState(15);
  const [staffSearch, setStaffSearch] = useState('');
  const [debouncedStaffSearch, setDebouncedStaffSearch] = useState('');
  const [staffCategoryFilter, setStaffCategoryFilter] = useState<
    '' | 'TEACHING' | 'NON_TEACHING'
  >('');
  const [staffStatusFilter, setStaffStatusFilter] = useState<
    EmploymentStatus | ''
  >('');
  const [staffTypeFilter, setStaffTypeFilter] = useState<EmploymentType | ''>(
    ''
  );
  const [staffDepartmentFilter, setStaffDepartmentFilter] = useState('');
  const [staffDesignationFilter, setStaffDesignationFilter] = useState('');
  const [staffSortBy, setStaffSortBy] = useState<
    | 'firstName'
    | 'lastName'
    | 'employeeId'
    | 'joiningDate'
    | 'designation'
    | 'department'
    | 'employmentStatus'
    | 'createdAt'
  >('firstName');
  const [staffSortDir, setStaffSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedStaffSearch(staffSearch.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [staffSearch]);

  // Teachers Directory paginated state
  const [teachersList, setTeachersList] = useState<TeacherResponse[]>([]);
  const [teacherTotalElements, setTeacherTotalElements] = useState(0);
  const [teacherTotalPages, setTeacherTotalPages] = useState(0);
  const [teacherPage, setTeacherPage] = useState(0);
  const [teacherPageSize, setTeacherPageSize] = useState(15);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [debouncedTeacherSearch, setDebouncedTeacherSearch] = useState('');
  const [teacherSpecializationFilter, setTeacherSpecializationFilter] =
    useState('');
  const [teacherAvailableFilter, setTeacherAvailableFilter] = useState<
    '' | 'AVAILABLE' | 'UNAVAILABLE'
  >('');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<
    EmploymentStatus | ''
  >('');
  const [teacherSessionFilter, setTeacherSessionFilter] = useState<
    number | ''
  >('');
  const [teacherClassFilter, setTeacherClassFilter] = useState<number | ''>('');
  const [teacherSubjectFilter, setTeacherSubjectFilter] = useState<
    number | ''
  >('');
  const [teacherSortBy, setTeacherSortBy] = useState<
    | 'id'
    | 'staffId'
    | 'specialization'
    | 'experienceYears'
    | 'availableForAssignment'
    | 'createdAt'
  >('id');
  const [teacherSortDir, setTeacherSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedTeacherSearch(teacherSearch.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [teacherSearch]);

  // Teaching Assignments tab state
  const [assignmentSessionId, setAssignmentSessionId] = useState<number | ''>(
    ''
  );
  const [assignmentClassFilter, setAssignmentClassFilter] = useState<
    number | ''
  >('');
  const [sessionClassAssignments, setSessionClassAssignments] = useState<
    TeacherClassAssignmentResponse[]
  >([]);
  const [sessionSubjectAssignments, setSessionSubjectAssignments] = useState<
    TeacherSubjectAssignmentResponse[]
  >([]);
  const [confirmRemoveClassRowKey, setConfirmRemoveClassRowKey] = useState<
    string | null
  >(null);
  const [removingClassRowKey, setRemovingClassRowKey] = useState<string | null>(
    null
  );
  const [confirmRemoveSubjectRowKey, setConfirmRemoveSubjectRowKey] = useState<
    string | null
  >(null);
  const [removingSubjectRowKey, setRemovingSubjectRowKey] = useState<
    string | null
  >(null);

  // Invitations tab state
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [invitationStatusFilter, setInvitationStatusFilter] = useState<
    InvitationStatus | ''
  >('');
  const [invitationSearch, setInvitationSearch] = useState('');
  const [resendingInvitationId, setResendingInvitationId] = useState<
    number | null
  >(null);
  const [revokingInvitationId, setRevokingInvitationId] = useState<
    number | null
  >(null);
  const [resentInvitationInfo, setResentInvitationInfo] = useState<{
    email: string;
    link: string;
  } | null>(null);

  // Loading & loaded state flags (for accurate tab count badges)
  const [loadingReference, setLoadingReference] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(false);

  const [staffLoaded, setStaffLoaded] = useState(false);
  const [teachersLoaded, setTeachersLoaded] = useState(false);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  const [invitationsLoaded, setInvitationsLoaded] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [orgSuspendedError, setOrgSuspendedError] = useState<string | null>(
    null
  );
  const [subscriptionSuspendedError, setSubscriptionSuspendedError] = useState<
    string | null
  >(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Unified dialog state machine
  const [activeDialog, setActiveDialog] = useState<ActiveStaffDialog>(null);
  const [detailRefreshCounter, setDetailRefreshCounter] = useState(0);

  // Reset tenant-scoped state when switching organizations
  useEffect(() => {
    setActiveDialog(null);
    setStaffList([]);
    setStaffTotalElements(0);
    setStaffTotalPages(0);
    setStaffLoaded(false);
    setTeachersList([]);
    setTeacherTotalElements(0);
    setTeacherTotalPages(0);
    setTeachersLoaded(false);
    setSessionClassAssignments([]);
    setSessionSubjectAssignments([]);
    setAssignmentsLoaded(false);
    setInvitations([]);
    setInvitationsLoaded(false);
    setSessions([]);
    setClasses([]);
    setSubjects([]);
    setRoles([]);
    setError(null);
    setFeedback(null);
    setResentInvitationInfo(null);
    setOrgSuspendedError(null);
    setSubscriptionSuspendedError(null);
  }, [orgId]);

  const handleApiException = useCallback(
    async (err: unknown, fallbackMessage: string) => {
      const classified = classifyOrganizationAccessError(err);
      if (
        classified.kind === 'ORG_DEACTIVATED' ||
        classified.kind === 'ORG_SUSPENDED'
      ) {
        await revalidateOrganizationStatus();
        if (classified.kind === 'ORG_SUSPENDED') {
          setOrgSuspendedError(classified.userMessage);
        }
        return;
      }
      if (classified.kind === 'SUBSCRIPTION_RESTRICTED') {
        setSubscriptionSuspendedError(classified.userMessage);
        return;
      }
      setError(classified.userMessage || fallbackMessage);
    },
    [revalidateOrganizationStatus]
  );

  const loadReferenceData = useCallback(async () => {
    if (!orgId || isOrganizationDeactivated || isOrganizationSuspended) {
      setLoadingReference(false);
      return;
    }
    setLoadingReference(true);
    try {
      const [sessionList, classList, subjectList, roleList, invList] =
        await Promise.all([
          academicManagementApi.getSessions(orgId).catch(() => []),
          academicManagementApi.getClasses(orgId).catch(() => []),
          academicManagementApi.getSubjects(orgId).catch(() => []),
          staffManagementApi.listOrganizationRoles(orgId).catch(() => []),
          canViewStaff || canViewTeachers
            ? staffManagementApi.listInvitations(orgId).catch(() => null)
            : Promise.resolve(null),
        ]);
      setSessions(sessionList);
      setClasses(classList);
      setSubjects(subjectList);
      setRoles(roleList);

      if (invList !== null) {
        const staffRelatedInvitations = invList.filter(
          (i) =>
            i.targetType === 'STAFF' ||
            i.targetType === 'TEACHER' ||
            i.targetType === 'SCHOOL_ADMIN' ||
            i.targetType === 'MEMBER'
        );
        setInvitations(staffRelatedInvitations);
        setInvitationsLoaded(true);
      }

      setAssignmentSessionId((prev) => {
        if (prev !== '' && sessionList.some((s) => s.id === Number(prev))) {
          return prev;
        }
        const activeSession =
          sessionList.find((s) => s.status === 'ACTIVE') || sessionList[0];
        return activeSession ? activeSession.id : '';
      });
    } catch (err) {
      await handleApiException(
        err,
        'Unable to load academic session and role reference data.'
      );
    } finally {
      setLoadingReference(false);
    }
  }, [
    orgId,
    isOrganizationDeactivated,
    isOrganizationSuspended,
    canViewStaff,
    canViewTeachers,
    handleApiException,
  ]);

  const loadStaffDirectory = useCallback(async () => {
    if (
      !orgId ||
      !canViewStaff ||
      isOrganizationDeactivated ||
      isOrganizationSuspended
    ) {
      setLoadingStaff(false);
      return;
    }
    setLoadingStaff(true);
    setError(null);
    try {
      const pageData = await staffManagementApi.listStaff(orgId, {
        search: debouncedStaffSearch,
        department: staffDepartmentFilter,
        designation: staffDesignationFilter,
        employmentType: staffTypeFilter,
        employmentStatus: staffStatusFilter,
        teachingStaff:
          staffCategoryFilter === 'TEACHING'
            ? true
            : staffCategoryFilter === 'NON_TEACHING'
              ? false
              : '',
        page: staffPage,
        size: staffPageSize,
        sortBy: staffSortBy,
        sortDir: staffSortDir,
      });
      setStaffList(pageData.content);
      setStaffTotalElements(pageData.totalElements);
      setStaffTotalPages(pageData.totalPages);
      setStaffLoaded(true);
    } catch (err) {
      await handleApiException(err, 'Failed to load staff directory.');
    } finally {
      setLoadingStaff(false);
    }
  }, [
    orgId,
    canViewStaff,
    isOrganizationDeactivated,
    isOrganizationSuspended,
    debouncedStaffSearch,
    staffDepartmentFilter,
    staffDesignationFilter,
    staffTypeFilter,
    staffStatusFilter,
    staffCategoryFilter,
    staffPage,
    staffPageSize,
    staffSortBy,
    staffSortDir,
    handleApiException,
  ]);

  const loadTeachersDirectory = useCallback(async () => {
    if (
      !orgId ||
      !canViewTeachers ||
      isOrganizationDeactivated ||
      isOrganizationSuspended
    ) {
      setLoadingTeachers(false);
      return;
    }
    setLoadingTeachers(true);
    try {
      const pageData = await staffManagementApi.listTeachers(orgId, {
        search: debouncedTeacherSearch,
        specialization: teacherSpecializationFilter,
        availableForAssignment:
          teacherAvailableFilter === 'AVAILABLE'
            ? true
            : teacherAvailableFilter === 'UNAVAILABLE'
              ? false
              : '',
        employmentStatus: teacherStatusFilter,
        academicSessionId: teacherSessionFilter,
        classId: teacherClassFilter,
        subjectId: teacherSubjectFilter,
        page: teacherPage,
        size: teacherPageSize,
        sortBy: teacherSortBy,
        sortDir: teacherSortDir,
      });
      setTeachersList(pageData.content);
      setTeacherTotalElements(pageData.totalElements);
      setTeacherTotalPages(pageData.totalPages);
      setTeachersLoaded(true);
    } catch (err) {
      await handleApiException(err, 'Failed to load teachers directory.');
    } finally {
      setLoadingTeachers(false);
    }
  }, [
    orgId,
    canViewTeachers,
    isOrganizationDeactivated,
    isOrganizationSuspended,
    debouncedTeacherSearch,
    teacherSpecializationFilter,
    teacherAvailableFilter,
    teacherStatusFilter,
    teacherSessionFilter,
    teacherClassFilter,
    teacherSubjectFilter,
    teacherPage,
    teacherPageSize,
    teacherSortBy,
    teacherSortDir,
    handleApiException,
  ]);

  const loadSessionAssignments = useCallback(async () => {
    if (
      !orgId ||
      !canViewTeachers ||
      !assignmentSessionId ||
      isOrganizationDeactivated ||
      isOrganizationSuspended
    ) {
      setLoadingAssignments(false);
      if (!assignmentSessionId && sessions.length === 0 && !loadingReference) {
        setSessionClassAssignments([]);
        setSessionSubjectAssignments([]);
        setAssignmentsLoaded(true);
      }
      return;
    }
    setLoadingAssignments(true);
    try {
      const [cList, sList] = await Promise.all([
        staffManagementApi.getSessionClassAssignments(
          orgId,
          Number(assignmentSessionId)
        ),
        staffManagementApi.getSessionSubjectAssignments(
          orgId,
          Number(assignmentSessionId)
        ),
      ]);
      setSessionClassAssignments(cList);
      setSessionSubjectAssignments(sList);
      setAssignmentsLoaded(true);
    } catch (err) {
      await handleApiException(
        err,
        'Failed to load academic session teacher assignments.'
      );
    } finally {
      setLoadingAssignments(false);
    }
  }, [
    orgId,
    canViewTeachers,
    assignmentSessionId,
    sessions.length,
    loadingReference,
    isOrganizationDeactivated,
    isOrganizationSuspended,
    handleApiException,
  ]);

  const loadInvitations = useCallback(async () => {
    if (
      !orgId ||
      (!canViewStaff && !canViewTeachers) ||
      isOrganizationDeactivated ||
      isOrganizationSuspended
    ) {
      setLoadingInvitations(false);
      return;
    }
    setLoadingInvitations(true);
    try {
      const list = await staffManagementApi.listInvitations(orgId);
      const staffRelated = list.filter(
        (i) =>
          i.targetType === 'STAFF' ||
          i.targetType === 'TEACHER' ||
          i.targetType === 'SCHOOL_ADMIN' ||
          i.targetType === 'MEMBER'
      );
      setInvitations(staffRelated);
      setInvitationsLoaded(true);
    } catch {
      // Non-fatal if user lacks invitation list permission
    } finally {
      setLoadingInvitations(false);
    }
  }, [
    orgId,
    canViewStaff,
    canViewTeachers,
    isOrganizationDeactivated,
    isOrganizationSuspended,
  ]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    void loadStaffDirectory();
  }, [loadStaffDirectory]);

  useEffect(() => {
    void loadTeachersDirectory();
  }, [loadTeachersDirectory]);

  useEffect(() => {
    void loadSessionAssignments();
  }, [loadSessionAssignments]);

  const handleTabChange = (tab: StaffPageTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const closeOrReturnDialog = useCallback(
    (
      returnToDetail?: ReturnToStaffDetailContext,
      updatedStaff?: StaffResponse
    ) => {
      if (returnToDetail) {
        setActiveDialog({
          kind: 'STAFF_DETAIL',
          staff: updatedStaff || returnToDetail.staff,
          initialTab: returnToDetail.tab,
        });
      } else {
        setActiveDialog(null);
      }
    },
    []
  );

  // =========================================================================
  // CRUD Handlers
  // =========================================================================

  const handleSaveStaff = async (
    payload: CreateStaffRequest | UpdateStaffRequest,
    isEdit: boolean
  ) => {
    if (!orgId || activeDialog?.kind !== 'STAFF_FORM') return;
    const { staff: targetStaff, returnToDetail } = activeDialog;

    if (isEdit && targetStaff) {
      const updated = await staffManagementApi.updateStaff(
        orgId,
        targetStaff.id,
        payload as UpdateStaffRequest
      );
      setStaffList((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      setFeedback({
        type: 'success',
        message: `Updated staff profile for ${formatStaffFullName(updated)} (${updated.employeeId}).`,
      });
      setDetailRefreshCounter((c) => c + 1);
      closeOrReturnDialog(returnToDetail, updated);
    } else {
      const created = await staffManagementApi.createStaff(
        orgId,
        payload as CreateStaffRequest
      );
      setFeedback({
        type: 'success',
        message: `Registered new staff member ${formatStaffFullName(created)} (${created.employeeId}).`,
      });
      setActiveDialog(null);
    }
    await Promise.all([loadStaffDirectory(), loadTeachersDirectory()]);
  };

  const handleChangeStaffStatus = async (payload: ChangeStaffStatusRequest) => {
    if (!orgId || activeDialog?.kind !== 'STAFF_STATUS') return;
    const { staff: targetStaff, returnToDetail } = activeDialog;

    const updated = await staffManagementApi.changeStaffStatus(
      orgId,
      targetStaff.id,
      payload
    );
    setStaffList((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
    setFeedback({
      type: 'success',
      message: `Changed employment status of ${formatStaffFullName(updated)} to ${
        EMPLOYMENT_STATUS_META[updated.employmentStatus]?.label ||
        updated.employmentStatus
      }.`,
    });
    setDetailRefreshCounter((c) => c + 1);
    closeOrReturnDialog(returnToDetail, updated);
    await Promise.all([loadStaffDirectory(), loadTeachersDirectory()]);
  };

  const handleUpdateTeacherProfile = async (
    teacherId: number,
    payload: UpdateTeacherProfileRequest
  ) => {
    if (!orgId || activeDialog?.kind !== 'TEACHER_PROFILE') return;
    const { returnToDetail } = activeDialog;

    const updated = await staffManagementApi.updateTeacherProfile(
      orgId,
      teacherId,
      payload
    );
    setTeachersList((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
    setFeedback({
      type: 'success',
      message: `Updated teacher qualifications for ${formatStaffFullName(updated)}.`,
    });
    setDetailRefreshCounter((c) => c + 1);
    closeOrReturnDialog(returnToDetail);
    await loadTeachersDirectory();
  };

  const handlePromoteStaffToTeacher = async (payload: CreateTeacherRequest) => {
    if (!orgId || activeDialog?.kind !== 'TEACHER_PROFILE') return;
    const { staff: targetStaff, returnToDetail } = activeDialog;

    const created = await staffManagementApi.createTeacher(orgId, payload);
    const updatedStaff = targetStaff
      ? { ...targetStaff, teachingStaff: true }
      : undefined;
    setFeedback({
      type: 'success',
      message: `Enabled teaching profile for ${formatStaffFullName(created)}.`,
    });
    setDetailRefreshCounter((c) => c + 1);
    closeOrReturnDialog(returnToDetail, updatedStaff);
    await Promise.all([loadStaffDirectory(), loadTeachersDirectory()]);
  };

  const handleCreateClassAssignment = async (
    sessionId: number,
    classId: number,
    payload: AssignTeacherClassRequest
  ) => {
    if (!orgId || activeDialog?.kind !== 'ASSIGN_CLASS') return;
    const { returnToDetail } = activeDialog;

    const created = await staffManagementApi.assignTeacherToClass(
      orgId,
      sessionId,
      classId,
      payload
    );
    setFeedback({
      type: 'success',
      message: `Assigned ${formatTeacherAssignmentName(created)} to ${
        created.className || 'class'
      }${created.classTeacher ? ' as Class Teacher' : ''}.`,
    });
    setDetailRefreshCounter((c) => c + 1);
    closeOrReturnDialog(returnToDetail);
    await loadSessionAssignments();
  };

  const handleUpdateClassAssignment = async (
    sessionId: number,
    classId: number,
    teacherId: number,
    payload: UpdateTeacherClassAssignmentRequest
  ) => {
    if (!orgId || activeDialog?.kind !== 'ASSIGN_CLASS') return;
    const { returnToDetail } = activeDialog;

    const updated = await staffManagementApi.updateTeacherClassAssignment(
      orgId,
      sessionId,
      classId,
      teacherId,
      payload
    );
    setFeedback({
      type: 'success',
      message: `Updated class assignment for ${formatTeacherAssignmentName(updated)}.`,
    });
    setDetailRefreshCounter((c) => c + 1);
    closeOrReturnDialog(returnToDetail);
    await loadSessionAssignments();
  };

  const handleRemoveClassAssignmentRow = async (
    row: TeacherClassAssignmentResponse
  ) => {
    if (!orgId) return;
    const key = `${row.academicSessionId}-${row.classId}-${row.teacherId}`;
    setRemovingClassRowKey(key);
    try {
      await staffManagementApi.removeTeacherFromClass(
        orgId,
        row.academicSessionId,
        row.classId,
        row.teacherId
      );
      setConfirmRemoveClassRowKey(null);
      setFeedback({
        type: 'success',
        message: `Removed ${formatTeacherAssignmentName(row)} from ${row.className || 'class'}.`,
      });
      await loadSessionAssignments();
    } catch (err) {
      await handleApiException(err, 'Failed to remove class assignment.');
    } finally {
      setRemovingClassRowKey(null);
    }
  };

  const handleCreateSubjectAssignment = async (
    sessionId: number,
    classId: number,
    subjectId: number,
    payload: AssignTeacherSubjectRequest
  ) => {
    if (!orgId || activeDialog?.kind !== 'ASSIGN_SUBJECT') return;
    const { returnToDetail } = activeDialog;

    const created = await staffManagementApi.assignTeacherToSubject(
      orgId,
      sessionId,
      classId,
      subjectId,
      payload
    );
    setFeedback({
      type: 'success',
      message: `Assigned ${formatTeacherAssignmentName(created)} to teach ${
        created.subjectName || 'subject'
      } in ${created.className || 'class'}.`,
    });
    setDetailRefreshCounter((c) => c + 1);
    closeOrReturnDialog(returnToDetail);
    await loadSessionAssignments();
  };

  const handleUpdateSubjectAssignment = async (
    sessionId: number,
    classId: number,
    subjectId: number,
    teacherId: number,
    payload: UpdateTeacherSubjectAssignmentRequest
  ) => {
    if (!orgId || activeDialog?.kind !== 'ASSIGN_SUBJECT') return;
    const { returnToDetail } = activeDialog;

    const updated = await staffManagementApi.updateTeacherSubjectAssignment(
      orgId,
      sessionId,
      classId,
      subjectId,
      teacherId,
      payload
    );
    setFeedback({
      type: 'success',
      message: `Updated subject assignment for ${formatTeacherAssignmentName(updated)}.`,
    });
    setDetailRefreshCounter((c) => c + 1);
    closeOrReturnDialog(returnToDetail);
    await loadSessionAssignments();
  };

  const handleRemoveSubjectAssignmentRow = async (
    row: TeacherSubjectAssignmentResponse
  ) => {
    if (!orgId) return;
    const key = `${row.academicSessionId}-${row.classId}-${row.subjectId}-${row.teacherId}`;
    setRemovingSubjectRowKey(key);
    try {
      await staffManagementApi.removeTeacherFromSubject(
        orgId,
        row.academicSessionId,
        row.classId,
        row.subjectId,
        row.teacherId
      );
      setConfirmRemoveSubjectRowKey(null);
      setFeedback({
        type: 'success',
        message: `Removed ${formatTeacherAssignmentName(row)} from ${row.subjectName || 'subject'}.`,
      });
      await loadSessionAssignments();
    } catch (err) {
      await handleApiException(err, 'Failed to remove subject assignment.');
    } finally {
      setRemovingSubjectRowKey(null);
    }
  };

  const handleSendInvitation = async (
    payload: CreateInvitationRequest
  ): Promise<InvitationDispatchResponse> => {
    if (!orgId) {
      throw new Error('Organization context is required.');
    }
    const dispatched = await staffManagementApi.createInvitation(
      orgId,
      payload
    );
    setFeedback({
      type: 'success',
      message: `Sent invitation to ${dispatched.invitation.email} (${dispatched.invitation.roleCode}).`,
    });
    await loadInvitations();
    return dispatched;
  };

  const handleResendInvitationRow = async (inv: InvitationResponse) => {
    if (!orgId) return;
    setResendingInvitationId(inv.id);
    setError(null);
    try {
      const res = await staffManagementApi.resendInvitation(orgId, inv.id);
      setResentInvitationInfo({
        email: inv.email,
        link: normalizeInvitationLinkForFrontend(res.invitationLink),
      });
      setFeedback({
        type: 'success',
        message: `Resent invitation to ${inv.email}.`,
      });
      await loadInvitations();
    } catch (err) {
      await handleApiException(err, 'Failed to resend invitation.');
    } finally {
      setResendingInvitationId(null);
    }
  };

  const handleRevokeInvitationRow = async (inv: InvitationResponse) => {
    if (!orgId) return;
    setRevokingInvitationId(inv.id);
    setError(null);
    try {
      await staffManagementApi.revokeInvitation(orgId, inv.id);
      setFeedback({
        type: 'success',
        message: `Revoked pending invitation for ${inv.email}.`,
      });
      await loadInvitations();
    } catch (err) {
      await handleApiException(err, 'Failed to revoke invitation.');
    } finally {
      setRevokingInvitationId(null);
    }
  };

  const handleOpenTeacherDetail = async (
    teacher: TeacherResponse,
    initialTab: StaffDetailTab = 'teacher'
  ) => {
    if (!orgId) return;
    const matched = staffList.find((s) => s.id === teacher.staffId);
    if (matched) {
      setActiveDialog({
        kind: 'STAFF_DETAIL',
        staff: matched,
        initialTab,
      });
      return;
    }
    try {
      const fetchedStaff = await staffManagementApi.getStaffById(
        orgId,
        teacher.staffId
      );
      setActiveDialog({
        kind: 'STAFF_DETAIL',
        staff: fetchedStaff,
        initialTab,
      });
    } catch (err) {
      await handleApiException(err, 'Failed to open teacher staff record.');
    }
  };

  const currentOrActiveSession = useMemo(
    () => sessions.find((s) => s.status === 'ACTIVE') || sessions[0] || null,
    [sessions]
  );

  const selectedAssignmentSession = useMemo(
    () =>
      sessions.find((s) => s.id === Number(assignmentSessionId)) || null,
    [sessions, assignmentSessionId]
  );

  const isSelectedAssignmentSessionCompleted =
    selectedAssignmentSession?.status === 'COMPLETED';

  const filteredClassAssignments = useMemo(() => {
    if (!assignmentClassFilter) return sessionClassAssignments;
    return sessionClassAssignments.filter(
      (a) => a.classId === Number(assignmentClassFilter)
    );
  }, [sessionClassAssignments, assignmentClassFilter]);

  const filteredSubjectAssignments = useMemo(() => {
    if (!assignmentClassFilter) return sessionSubjectAssignments;
    return sessionSubjectAssignments.filter(
      (a) => a.classId === Number(assignmentClassFilter)
    );
  }, [sessionSubjectAssignments, assignmentClassFilter]);

  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      if (invitationStatusFilter && inv.status !== invitationStatusFilter) {
        return false;
      }
      if (invitationSearch.trim()) {
        const q = invitationSearch.toLowerCase();
        const name = [inv.recipientFirstName, inv.recipientLastName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return (
          inv.email.toLowerCase().includes(q) ||
          name.includes(q) ||
          inv.roleCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [invitations, invitationStatusFilter, invitationSearch]);

  // =========================================================================
  // Table Column Definitions
  // =========================================================================

  const staffColumns: DataTableColumn<StaffResponse>[] = [
    {
      key: 'staff',
      header: 'Employee & ID',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center text-xs font-bold shrink-0">
            {formatStaffInitials(row)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setActiveDialog({
                    kind: 'STAFF_DETAIL',
                    staff: row,
                    initialTab: 'overview',
                  })
                }
                className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer"
              >
                {formatStaffFullName(row)}
              </button>
              <IdLabel>{row.employeeId}</IdLabel>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {row.teachingStaff ? 'Teaching Faculty' : 'Non-Teaching Staff'} •
              Joined {formatDate(row.joiningDate)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'designation',
      header: 'Designation & Dept',
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-900">{row.designation}</p>
          <p className="mt-0.5 text-slate-500">
            {row.department || 'General'} •{' '}
            {EMPLOYMENT_TYPE_LABELS[row.employmentType] || row.employmentType}
          </p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Details',
      render: (row) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{row.phoneNumber}</p>
          <p className="mt-0.5 text-slate-500 truncate max-w-[200px]">
            {row.email || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status & Account',
      render: (row) => {
        const badge = getEmploymentStatusBadge(row.employmentStatus);
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={badge.variant} dot>
              {badge.label}
            </Badge>
            {row.userId ? (
              <span className="text-[11px] font-medium text-emerald-700">
                Account Linked (#{row.userId})
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                No Login Account
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const terminal = isTerminalEmploymentStatus(row.employmentStatus);
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setActiveDialog({
                  kind: 'STAFF_DETAIL',
                  staff: row,
                  initialTab: 'overview',
                })
              }
            >
              360° Profile
            </Button>
            {canManageStaff && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setActiveDialog({
                    kind: 'STAFF_FORM',
                    mode: 'edit',
                    staff: row,
                  })
                }
              >
                Edit
              </Button>
            )}
            {canManageStaff && !terminal && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setActiveDialog({
                    kind: 'STAFF_STATUS',
                    staff: row,
                  })
                }
              >
                Status
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const teacherColumns: DataTableColumn<TeacherResponse>[] = [
    {
      key: 'teacher',
      header: 'Teacher & Employee ID',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 flex items-center justify-center text-xs font-bold shrink-0">
            {formatStaffInitials(row)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => void handleOpenTeacherDetail(row, 'teacher')}
                className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left cursor-pointer"
              >
                {formatStaffFullName(row)}
              </button>
              {row.employeeId && <IdLabel>{row.employeeId}</IdLabel>}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {row.designation || 'Teacher'}
              {row.department ? ` • ${row.department}` : ''}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'specialization',
      header: 'Specialization & Qualifications',
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-900">
            {row.specialization || 'General Teaching'}
          </p>
          <p className="mt-0.5 text-slate-500 truncate max-w-[230px]">
            {row.qualifications || 'No qualifications recorded'} •{' '}
            {row.experienceYears ?? 0} yr(s) exp.
          </p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (row) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{row.phoneNumber || '—'}</p>
          <p className="mt-0.5 text-slate-500 truncate max-w-[180px]">
            {row.email || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'availability',
      header: 'Status & Assignment Availability',
      render: (row) => {
        const empBadge = getEmploymentStatusBadge(row.employmentStatus);
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={empBadge.variant} dot>
              {empBadge.label}
            </Badge>
            <Badge variant={row.availableForAssignment ? 'info' : 'neutral'}>
              {row.availableForAssignment
                ? 'Available for Assignment'
                : 'Assignment Paused'}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleOpenTeacherDetail(row, 'assignments')}
          >
            360° &amp; Assignments
          </Button>
          {canManageTeachers && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setActiveDialog({
                  kind: 'TEACHER_PROFILE',
                  mode: 'edit',
                  teacher: row,
                  staff: null,
                })
              }
            >
              Qualifications
            </Button>
          )}
        </div>
      ),
    },
  ];

  const classAssignmentColumns: DataTableColumn<TeacherClassAssignmentResponse>[] = [
    {
      key: 'class',
      header: 'Class & Session',
      render: (row) => (
        <div className="text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">
              {row.className || `Class #${row.classId}`}
            </span>
            {row.classCode && <IdLabel>{row.classCode}</IdLabel>}
          </div>
          <p className="mt-0.5 text-slate-500">
            {row.academicSessionName || `Session #${row.academicSessionId}`}
          </p>
        </div>
      ),
    },
    {
      key: 'teacher',
      header: 'Assigned Teacher',
      render: (row) => (
        <div className="text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">
              {formatTeacherAssignmentName(row)}
            </span>
            {row.teacherEmployeeId && <IdLabel>{row.teacherEmployeeId}</IdLabel>}
          </div>
          {row.remarks && (
            <p className="mt-0.5 text-slate-500 truncate max-w-[240px]">
              {row.remarks}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Class Role',
      render: (row) =>
        row.classTeacher ? (
          <Badge variant="primary" dot>
            Class Teacher (Homeroom)
          </Badge>
        ) : (
          <Badge variant="neutral">Assigned Teacher</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        if (!canManageTeachers || isSelectedAssignmentSessionCompleted) {
          return (
            <Badge variant="neutral">
              {isSelectedAssignmentSessionCompleted ? 'Locked' : 'Read Only'}
            </Badge>
          );
        }
        const key = `${row.academicSessionId}-${row.classId}-${row.teacherId}`;
        const confirming = confirmRemoveClassRowKey === key;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {confirming ? (
              <>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={removingClassRowKey === key}
                  onClick={() => void handleRemoveClassAssignmentRow(row)}
                >
                  {removingClassRowKey === key ? 'Removing...' : 'Confirm'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmRemoveClassRowKey(null)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'ASSIGN_CLASS',
                      mode: 'edit',
                      assignment: row,
                      preselectedTeacher: null,
                    })
                  }
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmRemoveClassRowKey(key)}
                >
                  Remove
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];
  const subjectAssignmentColumns: DataTableColumn<TeacherSubjectAssignmentResponse>[] =
    [
      {
        key: 'subject',
        header: 'Subject & Class',
        render: (row) => (
          <div className="text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900">
                {row.subjectName || `Subject #${row.subjectId}`}
              </span>
              {row.subjectCode && <IdLabel>{row.subjectCode}</IdLabel>}
            </div>
            <p className="mt-0.5 text-slate-500">
              {row.className || `Class #${row.classId}`} •{' '}
              {row.academicSessionName || `Session #${row.academicSessionId}`}
            </p>
          </div>
        ),
      },
      {
        key: 'teacher',
        header: 'Assigned Teacher',
        render: (row) => (
          <div className="text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900">
                {formatTeacherAssignmentName(row)}
              </span>
              {row.teacherEmployeeId && (
                <IdLabel>{row.teacherEmployeeId}</IdLabel>
              )}
            </div>
            {row.remarks && (
              <p className="mt-0.5 text-slate-500 truncate max-w-[260px]">
                {row.remarks}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => {
          if (!canManageTeachers || isSelectedAssignmentSessionCompleted) {
            return (
              <Badge variant="neutral">
                {isSelectedAssignmentSessionCompleted ? 'Locked' : 'Read Only'}
              </Badge>
            );
          }
          const key = `${row.academicSessionId}-${row.classId}-${row.subjectId}-${row.teacherId}`;
          const confirming = confirmRemoveSubjectRowKey === key;
          return (
            <div className="flex items-center justify-end gap-1.5">
              {confirming ? (
                <>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={removingSubjectRowKey === key}
                    onClick={() => void handleRemoveSubjectAssignmentRow(row)}
                  >
                    {removingSubjectRowKey === key ? 'Removing...' : 'Confirm'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmRemoveSubjectRowKey(null)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setActiveDialog({
                        kind: 'ASSIGN_SUBJECT',
                        mode: 'edit',
                        assignment: row,
                        preselectedTeacher: null,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmRemoveSubjectRowKey(key)}
                  >
                    Remove
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ];

  const invitationColumns: DataTableColumn<InvitationResponse>[] = [
    {
      key: 'recipient',
      header: 'Recipient & Email',
      render: (row) => {
        const name = [row.recipientFirstName, row.recipientLastName]
          .filter(Boolean)
          .join(' ');
        return (
          <div className="text-xs">
            <p className="font-semibold text-slate-900">{name || row.email}</p>
            <p className="mt-0.5 text-slate-500">
              {row.email}
              {row.recipientPhone ? ` • ${row.recipientPhone}` : ''}
            </p>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role & Target Type',
      render: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <IdLabel>{row.roleCode}</IdLabel>
          <Badge variant="neutral">{row.targetType}</Badge>
          {row.targetProfileId && (
            <span className="text-slate-500">
              Profile #{row.targetProfileId}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status & Expiry',
      render: (row) => {
        const badge = getInvitationStatusBadge(row.status);
        return (
          <div className="text-xs space-y-0.5">
            <Badge variant={badge.variant} dot>
              {badge.label}
            </Badge>
            <p className="text-[11px] text-slate-500">
              Expires {formatDate(row.expiresAt)}
            </p>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        if (!canManageStaff && !canManageTeachers) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        if (row.status !== 'PENDING') {
          return (
            <span className="text-xs text-slate-400">
              {row.status === 'ACCEPTED' ? 'Completed' : 'Closed'}
            </span>
          );
        }
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={resendingInvitationId === row.id}
              onClick={() => void handleResendInvitationRow(row)}
            >
              {resendingInvitationId === row.id ? 'Sending...' : 'Resend'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={revokingInvitationId === row.id}
              onClick={() => void handleRevokeInvitationRow(row)}
            >
              {revokingInvitationId === row.id ? 'Revoking...' : 'Revoke'}
            </Button>
          </div>
        );
      },
    },
  ];
  // =========================================================================
  // Deactivation & Suspension Guards
  // =========================================================================
  if (isOrganizationDeactivated) {
    return <OrganizationDeactivatedScreen />;
  }

  if (isOrganizationSuspended || orgSuspendedError) {
    return (
      <AppShell
        pageTitle="Staff & Teacher Management"
        breadcrumbParent={
          activeOrganization?.organizationName || 'School Administration'
        }
      >
        <SuspendedOrganizationWorkspaceView />
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle="Staff & Teacher Management"
      breadcrumbParent={
        activeOrganization?.organizationName || 'School Administration'
      }
    >
      <div className="space-y-6">
        {subscriptionSuspendedError && <SubscriptionSuspendedBanner />}

        <PageHeader
          eyebrow={
            activeOrganization?.organizationName
              ? `${activeOrganization.organizationName} • Human Resources & Faculty`
              : 'School Administration'
          }
          title="Staff & Teacher Management"
          description="Manage teaching and non-teaching staff records, teacher qualifications, class/subject teaching assignments, documents, and workspace invitations."
          badge={
            currentOrActiveSession ? (
              <Badge variant="success" dot>
                Session: {currentOrActiveSession.name}
              </Badge>
            ) : (
              <Badge variant="warning">No Active Session</Badge>
            )
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {(canManageStaff || canManageTeachers) && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'INVITE_STAFF',
                      preselectedStaff: null,
                    })
                  }
                >
                  + Invite Staff
                </Button>
              )}
              {canManageTeachers && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'ASSIGN_CLASS',
                      mode: 'create',
                      assignment: null,
                      preselectedTeacher: null,
                    })
                  }
                >
                  + Assign Class Teacher
                </Button>
              )}
              {canManageStaff && (
                <Button
                  variant="primary"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'STAFF_FORM',
                      mode: 'create',
                      staff: null,
                    })
                  }
                >
                  + Add Staff Member
                </Button>
              )}
            </div>
          }
        />

        {feedback && (
          <InlineAlert variant={feedback.type}>{feedback.message}</InlineAlert>
        )}
        {error && <InlineAlert variant="error">{error}</InlineAlert>}

        {/* KPI Overview Strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">
              Matching Staff Profiles
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {staffLoaded ? staffTotalElements : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Teaching &amp; non-teaching employees
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">
              Teaching Faculty
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {teachersLoaded ? teacherTotalElements : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Teachers in current directory filter
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">
              Session Teaching Assignments
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {assignmentsLoaded
                ? sessionClassAssignments.length +
                  sessionSubjectAssignments.length
                : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {sessionClassAssignments.length} class •{' '}
              {sessionSubjectAssignments.length} subject
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">
              Staff &amp; Teacher Invitations
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {invitationsLoaded
                ? invitations.filter((i) => i.status === 'PENDING').length
                : '—'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {invitationsLoaded
                ? `${invitations.length} total invitation records`
                : 'Pending workspace invitations'}
            </p>
          </div>
        </div>

        {/* Module Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex flex-wrap gap-6" aria-label="Tabs">
            {(
              [
                {
                  id: 'staff',
                  label: 'Staff Directory',
                  count: staffLoaded ? staffTotalElements : undefined,
                },
                {
                  id: 'teachers',
                  label: 'Teachers Directory',
                  count: teachersLoaded ? teacherTotalElements : undefined,
                },
                {
                  id: 'assignments',
                  label: 'Teaching Assignments',
                  count: assignmentsLoaded
                    ? sessionClassAssignments.length +
                      sessionSubjectAssignments.length
                    : undefined,
                },
                {
                  id: 'invitations',
                  label: 'Invitations & Access',
                  count: invitationsLoaded ? invitations.length : undefined,
                },
              ] as { id: StaffPageTab; label: string; count?: number }[]
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        active
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB 1: STAFF DIRECTORY */}
        {activeTab === 'staff' && (
          <SectionCard
            title="Organization Staff Directory"
            description="Search, filter, and manage teaching and non-teaching employees, employment status, and 360° staff profiles."
          >
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2">
                <TextInput
                  placeholder="Search by staff name or employee ID..."
                  value={staffSearch}
                  onChange={(e) => {
                    setStaffSearch(e.target.value);
                    setStaffPage(0);
                  }}
                />
              </div>

              <SelectInput
                value={staffCategoryFilter}
                onChange={(e) => {
                  setStaffCategoryFilter(
                    e.target.value as '' | 'TEACHING' | 'NON_TEACHING'
                  );
                  setStaffPage(0);
                }}
              >
                <option value="">All Staff Categories</option>
                <option value="TEACHING">Teaching Faculty</option>
                <option value="NON_TEACHING">Non-Teaching Staff</option>
              </SelectInput>

              <SelectInput
                value={staffStatusFilter}
                onChange={(e) => {
                  setStaffStatusFilter(
                    e.target.value as EmploymentStatus | ''
                  );
                  setStaffPage(0);
                }}
              >
                <option value="">All Employment Statuses</option>
                {(
                  Object.keys(EMPLOYMENT_STATUS_META) as EmploymentStatus[]
                ).map((st) => (
                  <option key={st} value={st}>
                    {EMPLOYMENT_STATUS_META[st].label}
                  </option>
                ))}
              </SelectInput>

              <SelectInput
                value={staffTypeFilter}
                onChange={(e) => {
                  setStaffTypeFilter(e.target.value as EmploymentType | '');
                  setStaffPage(0);
                }}
              >
                <option value="">All Employment Types</option>
                {(
                  Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]
                ).map((et) => (
                  <option key={et} value={et}>
                    {EMPLOYMENT_TYPE_LABELS[et]}
                  </option>
                ))}
              </SelectInput>

              <TextInput
                placeholder="Filter by Department..."
                value={staffDepartmentFilter}
                onChange={(e) => {
                  setStaffDepartmentFilter(e.target.value);
                  setStaffPage(0);
                }}
              />
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-2">
                <span>Sort by:</span>
                <select
                  value={staffSortBy}
                  onChange={(e) =>
                    setStaffSortBy(e.target.value as typeof staffSortBy)
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                >
                  <option value="firstName">First Name</option>
                  <option value="lastName">Last Name</option>
                  <option value="employeeId">Employee ID</option>
                  <option value="joiningDate">Joining Date</option>
                  <option value="designation">Designation</option>
                  <option value="department">Department</option>
                  <option value="employmentStatus">Employment Status</option>
                  <option value="createdAt">Recently Registered</option>
                </select>
                <select
                  value={staffSortDir}
                  onChange={(e) =>
                    setStaffSortDir(e.target.value as 'asc' | 'desc')
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>

              {(staffSearch ||
                staffCategoryFilter ||
                staffStatusFilter ||
                staffTypeFilter ||
                staffDepartmentFilter ||
                staffDesignationFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setStaffSearch('');
                    setDebouncedStaffSearch('');
                    setStaffCategoryFilter('');
                    setStaffStatusFilter('');
                    setStaffTypeFilter('');
                    setStaffDepartmentFilter('');
                    setStaffDesignationFilter('');
                    setStaffPage(0);
                  }}
                  className="font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <DataTable
              columns={staffColumns}
              data={staffList}
              rowKey={(r) => r.id}
              isLoading={loadingStaff}
              emptyTitle="No staff members found"
              emptyDescription="Register your first staff member or adjust your search and filter criteria."
            />

            <Pagination
              page={staffPage}
              size={staffPageSize}
              totalElements={staffTotalElements}
              totalPages={staffTotalPages}
              onPageChange={setStaffPage}
              onSizeChange={(newSize) => {
                setStaffPageSize(newSize);
                setStaffPage(0);
              }}
            />
          </SectionCard>
        )}
        {/* TAB 2: TEACHERS DIRECTORY */}
        {activeTab === 'teachers' && (
          <SectionCard
            title="Teaching Faculty Directory"
            description="Browse teaching staff, filter by subject specialization, academic session, class or subject assignment, and manage teaching availability."
          >
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2">
                <TextInput
                  placeholder="Search teacher by name or employee ID..."
                  value={teacherSearch}
                  onChange={(e) => {
                    setTeacherSearch(e.target.value);
                    setTeacherPage(0);
                  }}
                />
              </div>

              <TextInput
                placeholder="Filter by Specialization..."
                value={teacherSpecializationFilter}
                onChange={(e) => {
                  setTeacherSpecializationFilter(e.target.value);
                  setTeacherPage(0);
                }}
              />

              <SelectInput
                value={teacherAvailableFilter}
                onChange={(e) => {
                  setTeacherAvailableFilter(
                    e.target.value as '' | 'AVAILABLE' | 'UNAVAILABLE'
                  );
                  setTeacherPage(0);
                }}
              >
                <option value="">All Availability</option>
                <option value="AVAILABLE">Available for Assignment</option>
                <option value="UNAVAILABLE">Assignment Paused</option>
              </SelectInput>

              <SelectInput
                value={teacherClassFilter}
                onChange={(e) => {
                  setTeacherClassFilter(
                    e.target.value ? Number(e.target.value) : ''
                  );
                  setTeacherPage(0);
                }}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </SelectInput>

              <SelectInput
                value={teacherSubjectFilter}
                onChange={(e) => {
                  setTeacherSubjectFilter(
                    e.target.value ? Number(e.target.value) : ''
                  );
                  setTeacherPage(0);
                }}
              >
                <option value="">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name} ({sub.code})
                  </option>
                ))}
              </SelectInput>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-2">
                <span>Sort by:</span>
                <select
                  value={teacherSortBy}
                  onChange={(e) =>
                    setTeacherSortBy(e.target.value as typeof teacherSortBy)
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                >
                  <option value="id">Teacher ID</option>
                  <option value="specialization">Specialization</option>
                  <option value="experienceYears">Experience (Years)</option>
                  <option value="availableForAssignment">Availability</option>
                  <option value="createdAt">Recently Added</option>
                </select>
                <select
                  value={teacherSortDir}
                  onChange={(e) =>
                    setTeacherSortDir(e.target.value as 'asc' | 'desc')
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>

              {(teacherSearch ||
                teacherSpecializationFilter ||
                teacherAvailableFilter ||
                teacherStatusFilter ||
                teacherSessionFilter ||
                teacherClassFilter ||
                teacherSubjectFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setTeacherSearch('');
                    setDebouncedTeacherSearch('');
                    setTeacherSpecializationFilter('');
                    setTeacherAvailableFilter('');
                    setTeacherStatusFilter('');
                    setTeacherSessionFilter('');
                    setTeacherClassFilter('');
                    setTeacherSubjectFilter('');
                    setTeacherPage(0);
                  }}
                  className="font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <DataTable
              columns={teacherColumns}
              data={teachersList}
              rowKey={(r) => r.id}
              isLoading={loadingTeachers}
              emptyTitle="No teacher profiles found"
              emptyDescription="Register teaching staff or enable a teaching profile on an existing staff member."
            />

            <Pagination
              page={teacherPage}
              size={teacherPageSize}
              totalElements={teacherTotalElements}
              totalPages={teacherTotalPages}
              onPageChange={setTeacherPage}
              onSizeChange={(newSize) => {
                setTeacherPageSize(newSize);
                setTeacherPage(0);
              }}
            />
          </SectionCard>
        )}
        {/* TAB 3: TEACHING ASSIGNMENTS */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700">
                    Academic Session:
                  </span>
                  <SelectInput
                    value={assignmentSessionId}
                    onChange={(e) =>
                      setAssignmentSessionId(
                        e.target.value ? Number(e.target.value) : ''
                      )
                    }
                  >
                    <option value="">Select session</option>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </SelectInput>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700">
                    Filter by Class:
                  </span>
                  <SelectInput
                    value={assignmentClassFilter}
                    onChange={(e) =>
                      setAssignmentClassFilter(
                        e.target.value ? Number(e.target.value) : ''
                      )
                    }
                  >
                    <option value="">All Classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </SelectInput>
                </div>
              </div>

              {canManageTeachers && !isSelectedAssignmentSessionCompleted && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setActiveDialog({
                        kind: 'ASSIGN_CLASS',
                        mode: 'create',
                        assignment: null,
                        preselectedTeacher: null,
                      })
                    }
                  >
                    + Assign Teacher to Class
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      setActiveDialog({
                        kind: 'ASSIGN_SUBJECT',
                        mode: 'create',
                        assignment: null,
                        preselectedTeacher: null,
                      })
                    }
                  >
                    + Assign Subject Teacher
                  </Button>
                </div>
              )}
            </div>

            {isSelectedAssignmentSessionCompleted && (
              <InlineAlert variant="info">
                The selected academic session (
                {selectedAssignmentSession?.name}) is COMPLETED. Historical
                teacher-class and teacher-subject assignments are preserved in
                read-only mode.
              </InlineAlert>
            )}

            <SectionCard
              title="Class Teacher & Homeroom Assignments"
              description="Teachers assigned to classes for the selected academic session, including primary Class Teacher (homeroom) responsibilities."
            >
              <DataTable
                columns={classAssignmentColumns}
                data={filteredClassAssignments}
                rowKey={(r) => r.id}
                isLoading={loadingAssignments}
                emptyTitle="No class teacher assignments found"
                emptyDescription="Assign active teachers to classes for the selected academic session."
              />
            </SectionCard>

            <SectionCard
              title="Subject Teaching Assignments"
              description="Teachers assigned to teach specific curriculum subjects across school classes in the selected academic session."
            >
              <DataTable
                columns={subjectAssignmentColumns}
                data={filteredSubjectAssignments}
                rowKey={(r) => r.id}
                isLoading={loadingAssignments}
                emptyTitle="No subject teacher assignments found"
                emptyDescription="Assign teachers to class subjects configured in Academic Management."
              />
            </SectionCard>
          </div>
        )}

        {/* TAB 4: INVITATIONS & ACCESS */}
        {activeTab === 'invitations' && (
          <SectionCard
            title="Staff & Teacher Workspace Invitations"
            description="Manage single-use organization invitations sent to staff members and teachers to activate their login accounts and assign roles."
            actions={
              canManageStaff || canManageTeachers ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'INVITE_STAFF',
                      preselectedStaff: null,
                    })
                  }
                >
                  + Invite Staff or Teacher
                </Button>
              ) : undefined
            }
          >
            {resentInvitationInfo && (
              <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/70 p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-900">
                    Resent Invitation Link for {resentInvitationInfo.email}:
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setResentInvitationInfo(null)}
                  >
                    Dismiss
                  </Button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={resentInvitationInfo.link}
                  className="w-full rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-700"
                />
              </div>
            )}

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <TextInput
                  placeholder="Search invitations by recipient email, name, or role..."
                  value={invitationSearch}
                  onChange={(e) => setInvitationSearch(e.target.value)}
                />
              </div>
              <SelectInput
                value={invitationStatusFilter}
                onChange={(e) =>
                  setInvitationStatusFilter(
                    e.target.value as InvitationStatus | ''
                  )
                }
              >
                <option value="">All Invitation Statuses</option>
                {(
                  Object.keys(INVITATION_STATUS_META) as InvitationStatus[]
                ).map((st) => (
                  <option key={st} value={st}>
                    {INVITATION_STATUS_META[st].label}
                  </option>
                ))}
              </SelectInput>
            </div>

            {filteredInvitations.length === 0 && !loadingInvitations ? (
              <EmptyState
                title="No staff or teacher invitations found"
                description="Send an invitation from a staff member's 360° profile or use the + Invite Staff button above."
              />
            ) : (
              <DataTable
                columns={invitationColumns}
                data={filteredInvitations}
                rowKey={(r) => r.id}
                isLoading={loadingInvitations}
                emptyTitle="No invitations found"
                emptyDescription="No matching invitation records."
              />
            )}
          </SectionCard>
        )}
      </div>

      {/* ===================================================================== */}
      {/* Unified Modals & 360° Staff Profile View                              */}
      {/* ===================================================================== */}

      <StaffFormModal
        open={activeDialog?.kind === 'STAFF_FORM'}
        mode={
          activeDialog?.kind === 'STAFF_FORM' ? activeDialog.mode : 'create'
        }
        initialData={
          activeDialog?.kind === 'STAFF_FORM' ? activeDialog.staff : null
        }
        onClose={() =>
          closeOrReturnDialog(
            activeDialog?.kind === 'STAFF_FORM'
              ? activeDialog.returnToDetail
              : undefined
          )
        }
        onSubmit={handleSaveStaff}
      />

      <StaffStatusModal
        open={activeDialog?.kind === 'STAFF_STATUS'}
        staff={
          activeDialog?.kind === 'STAFF_STATUS' ? activeDialog.staff : null
        }
        onClose={() =>
          closeOrReturnDialog(
            activeDialog?.kind === 'STAFF_STATUS'
              ? activeDialog.returnToDetail
              : undefined
          )
        }
        onSubmit={handleChangeStaffStatus}
      />

      <TeacherProfileModal
        open={activeDialog?.kind === 'TEACHER_PROFILE'}
        mode={
          activeDialog?.kind === 'TEACHER_PROFILE'
            ? activeDialog.mode
            : 'edit'
        }
        teacher={
          activeDialog?.kind === 'TEACHER_PROFILE'
            ? activeDialog.teacher
            : null
        }
        staff={
          activeDialog?.kind === 'TEACHER_PROFILE' ? activeDialog.staff : null
        }
        onClose={() =>
          closeOrReturnDialog(
            activeDialog?.kind === 'TEACHER_PROFILE'
              ? activeDialog.returnToDetail
              : undefined
          )
        }
        onSubmitEdit={handleUpdateTeacherProfile}
        onSubmitPromote={handlePromoteStaffToTeacher}
      />

      {orgId && (
        <>
          <AssignTeacherClassModal
            open={activeDialog?.kind === 'ASSIGN_CLASS'}
            mode={
              activeDialog?.kind === 'ASSIGN_CLASS'
                ? activeDialog.mode
                : 'create'
            }
            organizationId={orgId}
            initialAssignment={
              activeDialog?.kind === 'ASSIGN_CLASS'
                ? activeDialog.assignment
                : null
            }
            preselectedTeacher={
              activeDialog?.kind === 'ASSIGN_CLASS'
                ? activeDialog.preselectedTeacher
                : null
            }
            sessions={sessions}
            classes={classes}
            onClose={() =>
              closeOrReturnDialog(
                activeDialog?.kind === 'ASSIGN_CLASS'
                  ? activeDialog.returnToDetail
                  : undefined
              )
            }
            onSubmitCreate={handleCreateClassAssignment}
            onSubmitUpdate={handleUpdateClassAssignment}
          />

          <AssignTeacherSubjectModal
            open={activeDialog?.kind === 'ASSIGN_SUBJECT'}
            mode={
              activeDialog?.kind === 'ASSIGN_SUBJECT'
                ? activeDialog.mode
                : 'create'
            }
            organizationId={orgId}
            initialAssignment={
              activeDialog?.kind === 'ASSIGN_SUBJECT'
                ? activeDialog.assignment
                : null
            }
            preselectedTeacher={
              activeDialog?.kind === 'ASSIGN_SUBJECT'
                ? activeDialog.preselectedTeacher
                : null
            }
            sessions={sessions}
            classes={classes}
            subjects={subjects}
            onClose={() =>
              closeOrReturnDialog(
                activeDialog?.kind === 'ASSIGN_SUBJECT'
                  ? activeDialog.returnToDetail
                  : undefined
              )
            }
            onSubmitCreate={handleCreateSubjectAssignment}
            onSubmitUpdate={handleUpdateSubjectAssignment}
          />

          <StaffInvitationModal
            open={activeDialog?.kind === 'INVITE_STAFF'}
            preselectedStaff={
              activeDialog?.kind === 'INVITE_STAFF'
                ? activeDialog.preselectedStaff
                : null
            }
            roles={roles}
            isSchoolAdmin={isSchoolAdmin}
            onClose={() =>
              closeOrReturnDialog(
                activeDialog?.kind === 'INVITE_STAFF'
                  ? activeDialog.returnToDetail
                  : undefined
              )
            }
            onSubmit={handleSendInvitation}
          />

          <StaffDetailModal
            open={activeDialog?.kind === 'STAFF_DETAIL'}
            organizationId={orgId}
            staff={
              activeDialog?.kind === 'STAFF_DETAIL' ? activeDialog.staff : null
            }
            initialTab={
              activeDialog?.kind === 'STAFF_DETAIL'
                ? activeDialog.initialTab
                : 'overview'
            }
            refreshTrigger={detailRefreshCounter}
            sessions={sessions}
            invitations={invitations}
            canManageStaff={canManageStaff}
            canViewTeachers={canViewTeachers}
            canManageTeachers={canManageTeachers}
            onClose={() => setActiveDialog(null)}
            onEditStaff={(staffMember, tab) =>
              setActiveDialog({
                kind: 'STAFF_FORM',
                mode: 'edit',
                staff: staffMember,
                returnToDetail: { staff: staffMember, tab },
              })
            }
            onChangeStaffStatus={(staffMember, tab) =>
              setActiveDialog({
                kind: 'STAFF_STATUS',
                staff: staffMember,
                returnToDetail: { staff: staffMember, tab },
              })
            }
            onEditTeacherProfile={(staffMember, tp, tab) =>
              setActiveDialog({
                kind: 'TEACHER_PROFILE',
                mode: 'edit',
                teacher: tp,
                staff: staffMember,
                returnToDetail: { staff: staffMember, tab },
              })
            }
            onPromoteToTeacher={(staffMember, tab) =>
              setActiveDialog({
                kind: 'TEACHER_PROFILE',
                mode: 'promote',
                teacher: null,
                staff: staffMember,
                returnToDetail: { staff: staffMember, tab },
              })
            }
            onAssignClass={(staffMember, tp, tab) =>
              setActiveDialog({
                kind: 'ASSIGN_CLASS',
                mode: 'create',
                assignment: null,
                preselectedTeacher: tp,
                returnToDetail: { staff: staffMember, tab },
              })
            }
            onEditClassAssignment={(staffMember, tp, ca, tab) =>
              setActiveDialog({
                kind: 'ASSIGN_CLASS',
                mode: 'edit',
                assignment: ca,
                preselectedTeacher: tp,
                returnToDetail: { staff: staffMember, tab },
              })
            }
            onAssignSubject={(staffMember, tp, tab) =>
              setActiveDialog({
                kind: 'ASSIGN_SUBJECT',
                mode: 'create',
                assignment: null,
                preselectedTeacher: tp,
                returnToDetail: { staff: staffMember, tab },
              })
            }
            onEditSubjectAssignment={(staffMember, tp, sa, tab) =>
              setActiveDialog({
                kind: 'ASSIGN_SUBJECT',
                mode: 'edit',
                assignment: sa,
                preselectedTeacher: tp,
                returnToDetail: { staff: staffMember, tab },
              })
            }
            onInviteStaff={(staffMember, tab) =>
              setActiveDialog({
                kind: 'INVITE_STAFF',
                preselectedStaff: staffMember,
                returnToDetail: { staff: staffMember, tab },
              })
            }
            onTeacherUpdated={(updatedTp) => {
              setTeachersList((prev) =>
                prev.map((t) => (t.id === updatedTp.id ? updatedTp : t))
              );
            }}
            onInvitationsChanged={() => {
              void loadInvitations();
            }}
            onAssignmentsChanged={() => {
              void loadSessionAssignments();
            }}
          />
        </>
      )}
    </AppShell>
  );
};





















