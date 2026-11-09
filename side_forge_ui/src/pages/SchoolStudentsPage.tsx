import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Dialog } from '../components/ui/Dialog';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, type DataTableColumn } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/FormControls';
import { EmptyState, InlineAlert } from '../components/ui/StateViews';
import {
  OrganizationDeactivatedScreen,
  SubscriptionSuspendedBanner,
  SuspendedOrganizationWorkspaceView,
} from '../components/school/OrganizationStatusBanner';
import {
  EnrollmentFormModal,
  EnrollmentStatusModal,
  GuardianFormModal,
  GuardianInvitationModal,
  LinkGuardianModal,
  StudentFormModal,
  StudentStatusModal,
} from '../components/school/StudentManagementDialogs';
import {
  StudentDetailModal,
  type StudentDetailTab,
} from '../components/school/StudentDetailModal';
import { academicManagementApi } from '../services/academicManagementApi';
import { studentManagementApi } from '../services/studentManagementApi';
import { classifyOrganizationAccessError } from '../types/auth';
import type {
  CreateInvitationRequest,
  InvitationDispatchResponse,
  InvitationResponse,
} from '../types/staffManagement';
import {
  getSessionStatusBadgeMeta,
  type AcademicSessionResponse,
  type SchoolClassResponse,
} from '../types/academicManagement';

const TextInput = Input;
const SelectInput = Select;

const AlertBanner: React.FC<{
  variant?: 'info' | 'success' | 'warning' | 'error';
  message: string;
  onDismiss?: () => void;
}> = ({ variant = 'info', message }) => (
  <InlineAlert variant={variant}>{message}</InlineAlert>
);

const SectionCard: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, actions, children }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
    <div>{children}</div>
  </div>
);

const Pagination: React.FC<{
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
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
  const end = Math.min(totalElements, (page + 1) * size);
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="font-semibold text-slate-900">{start}</strong>–
          <strong className="font-semibold text-slate-900">{end}</strong> of{' '}
          <strong className="font-semibold text-slate-900">{totalElements}</strong>
        </span>
        <select
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
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
          Page {page + 1} of {Math.max(1, totalPages)}
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
import {
  ENROLLMENT_STATUS_META,
  GENDER_LABELS,
  GUARDIAN_RELATIONSHIP_LABELS,
  STUDENT_STATUS_META,
  formatGuardianFullName,
  formatStudentFullName,
  formatStudentInitials,
  getEnrollmentStatusBadge,
  getStudentStatusBadge,
  type ChangeEnrollmentStatusRequest,
  type ChangeStudentStatusRequest,
  type CreateEnrollmentRequest,
  type CreateGuardianRequest,
  type CreateStudentRequest,
  type EnrollmentStatus,
  type Gender,
  type GuardianResponse,
  type GuardianStudentLinkResponse,
  type LinkStudentGuardianRequest,
  type StudentEnrollmentResponse,
  type StudentGuardianResponse,
  type StudentResponse,
  type StudentStatus,
  type UpdateEnrollmentRequest,
  type UpdateGuardianRequest,
  type UpdateStudentGuardianRequest,
  type UpdateStudentRequest,
} from '../types/studentManagement';

type StudentsPageTab = 'directory' | 'enrollments' | 'guardians';

type ReturnToDetailContext = {
  student: StudentResponse;
  tab: StudentDetailTab;
};

type ActiveStudentDialog =
  | {
      kind: 'STUDENT_DETAIL';
      student: StudentResponse;
      initialTab: StudentDetailTab;
    }
  | {
      kind: 'STUDENT_FORM';
      mode: 'create' | 'edit';
      student: StudentResponse | null;
      returnToDetail?: ReturnToDetailContext;
    }
  | {
      kind: 'STUDENT_STATUS';
      student: StudentResponse;
      returnToDetail?: ReturnToDetailContext;
    }
  | {
      kind: 'ENROLLMENT_FORM';
      mode: 'create' | 'edit';
      enrollment: StudentEnrollmentResponse | null;
      preselectedStudent: StudentResponse | null;
      returnToDetail?: ReturnToDetailContext;
    }
  | {
      kind: 'ENROLLMENT_STATUS';
      enrollment: StudentEnrollmentResponse;
      returnToDetail?: ReturnToDetailContext;
    }
  | {
      kind: 'GUARDIAN_FORM';
      mode: 'create' | 'edit';
      guardian: GuardianResponse | null;
      returnToLinkGuardian?: {
        student: StudentResponse;
        linkedGuardianIds: number[];
        returnToDetail?: ReturnToDetailContext;
      };
    }
  | {
      kind: 'LINK_GUARDIAN';
      student: StudentResponse;
      initialLink: StudentGuardianResponse | null;
      linkedGuardianIds: number[];
      returnToDetail?: ReturnToDetailContext;
    }
  | {
      kind: 'GUARDIAN_STUDENTS';
      guardian: GuardianResponse;
    }
  | {
      kind: 'INVITE_GUARDIAN';
      guardian: GuardianResponse;
      returnToDetail?: ReturnToDetailContext;
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

export const SchoolStudentsPage: React.FC = () => {
  const {
    activeOrganization,
    hasPermission,
    isOrganizationDeactivated,
    isOrganizationSuspended,
    revalidateOrganizationStatus,
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const orgId = activeOrganization?.organizationId;

  const canViewStudents =
    hasPermission('student.view') ||
    hasPermission('student.create') ||
    hasPermission('student.update') ||
    hasPermission('school.view');
  const canCreateStudent = hasPermission('student.create');
  const canUpdateStudent = hasPermission('student.update');
  const canManageEnrollment = hasPermission('student.enrollment.manage');
  const canManageGuardian = hasPermission('student.guardian.manage');

  const initialTabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<StudentsPageTab>(
    initialTabParam === 'enrollments' || initialTabParam === 'guardians'
      ? initialTabParam
      : 'directory'
  );

  // Reference academic data (sessions & classes)
  const [sessions, setSessions] = useState<AcademicSessionResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [guardians, setGuardians] = useState<GuardianResponse[]>([]);
  const [guardianInvitations, setGuardianInvitations] = useState<
    InvitationResponse[]
  >([]);

  // Student directory paginated state
  const [students, setStudents] = useState<StudentResponse[]>([]);
  const [studentTotalElements, setStudentTotalElements] = useState(0);
  const [studentTotalPages, setStudentTotalPages] = useState(0);
  const [studentPage, setStudentPage] = useState(0);
  const [studentPageSize, setStudentPageSize] = useState(15);
  const [studentSearch, setStudentSearch] = useState('');
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentStatus | ''>('');
  const [studentGenderFilter, setStudentGenderFilter] = useState<Gender | ''>('');
  const [studentSessionFilter, setStudentSessionFilter] = useState<number | ''>('');
  const [studentClassFilter, setStudentClassFilter] = useState<number | ''>('');
  const [studentSortBy, setStudentSortBy] = useState<
    | 'firstName'
    | 'lastName'
    | 'admissionNumber'
    | 'admissionDate'
    | 'dateOfBirth'
    | 'status'
    | 'createdAt'
  >('firstName');
  const [studentSortDir, setStudentSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedStudentSearch(studentSearch.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [studentSearch]);

  // Enrollments directory paginated state
  const [enrollments, setEnrollments] = useState<StudentEnrollmentResponse[]>([]);
  const [enrollmentTotalElements, setEnrollmentTotalElements] = useState(0);
  const [enrollmentTotalPages, setEnrollmentTotalPages] = useState(0);
  const [enrollmentPage, setEnrollmentPage] = useState(0);
  const [enrollmentPageSize, setEnrollmentPageSize] = useState(15);
  const [enrollmentSessionFilter, setEnrollmentSessionFilter] = useState<number | ''>('');
  const [enrollmentClassFilter, setEnrollmentClassFilter] = useState<number | ''>('');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<
    EnrollmentStatus | ''
  >('');
  const [enrollmentSortBy, setEnrollmentSortBy] = useState<
    'enrollmentDate' | 'rollNumber' | 'status' | 'createdAt'
  >('enrollmentDate');
  const [enrollmentSortDir, setEnrollmentSortDir] = useState<'asc' | 'desc'>(
    'desc'
  );

  // Guardians filter state
  const [guardianSearch, setGuardianSearch] = useState('');
  const [guardianActiveFilter, setGuardianActiveFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');

  // Loading & error states
  const [loadingReference, setLoadingReference] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [enrollmentsLoaded, setEnrollmentsLoaded] = useState(false);
  const [guardiansLoaded, setGuardiansLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgSuspendedError, setOrgSuspendedError] = useState<string | null>(null);
  const [subscriptionSuspendedError, setSubscriptionSuspendedError] = useState<
    string | null
  >(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Modal states
  // Single unified dialog state machine (prevents overlapping/stacked modals)
  const [activeDialog, setActiveDialog] = useState<ActiveStudentDialog>(null);
  const [detailRefreshCounter, setDetailRefreshCounter] = useState(0);
  const [guardianLinkedStudents, setGuardianLinkedStudents] = useState<
    GuardianStudentLinkResponse[]
  >([]);
  const [loadingGuardianStudents, setLoadingGuardianStudents] = useState(false);

  // Reset tenant-scoped state when switching organizations
  useEffect(() => {
    setActiveDialog(null);
    setStudents([]);
    setStudentTotalElements(0);
    setStudentTotalPages(0);
    setStudentsLoaded(false);
    setEnrollments([]);
    setEnrollmentTotalElements(0);
    setEnrollmentTotalPages(0);
    setEnrollmentsLoaded(false);
    setGuardians([]);
    setGuardianInvitations([]);
    setGuardiansLoaded(false);
    setSessions([]);
    setClasses([]);
    setError(null);
    setFeedback(null);
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
      const [sessionList, classList, guardianList, invList] = await Promise.all([
        academicManagementApi.getSessions(orgId),
        academicManagementApi.getClasses(orgId),
        canViewStudents
          ? studentManagementApi.listOrganizationGuardians(orgId)
          : Promise.resolve([]),
        canViewStudents || canManageGuardian
          ? studentManagementApi.listGuardianInvitations(orgId).catch(() => [])
          : Promise.resolve([]),
      ]);
      setSessions(sessionList);
      setClasses(classList);
      setGuardians(guardianList);
      setGuardianInvitations(invList);
      setGuardiansLoaded(canViewStudents);
    } catch (err) {
      await handleApiException(
        err,
        'Unable to load academic session and class reference data.'
      );
    } finally {
      setLoadingReference(false);
    }
  }, [
    orgId,
    isOrganizationDeactivated,
    isOrganizationSuspended,
    canViewStudents,
    canManageGuardian,
    handleApiException,
  ]);

  const loadStudentsDirectory = useCallback(async () => {
    if (!orgId || !canViewStudents || isOrganizationDeactivated || isOrganizationSuspended) {
      setLoadingStudents(false);
      return;
    }
    setLoadingStudents(true);
    setError(null);
    try {
      const pageData = await studentManagementApi.listStudents(orgId, {
        search: debouncedStudentSearch,
        status: studentStatusFilter,
        gender: studentGenderFilter,
        academicSessionId: studentSessionFilter,
        classId: studentClassFilter,
        page: studentPage,
        size: studentPageSize,
        sortBy: studentSortBy,
        sortDir: studentSortDir,
      });
      setStudents(pageData.content);
      setStudentTotalElements(pageData.totalElements);
      setStudentTotalPages(pageData.totalPages);
      setStudentsLoaded(true);
    } catch (err) {
      await handleApiException(err, 'Failed to load student directory.');
    } finally {
      setLoadingStudents(false);
    }
  }, [
    orgId,
    canViewStudents,
    isOrganizationDeactivated,
    isOrganizationSuspended,
    debouncedStudentSearch,
    studentStatusFilter,
    studentGenderFilter,
    studentSessionFilter,
    studentClassFilter,
    studentPage,
    studentPageSize,
    studentSortBy,
    studentSortDir,
    handleApiException,
  ]);

  const loadEnrollmentsDirectory = useCallback(async () => {
    if (!orgId || !canViewStudents || isOrganizationDeactivated || isOrganizationSuspended) {
      setLoadingEnrollments(false);
      return;
    }
    setLoadingEnrollments(true);
    try {
      const pageData = await studentManagementApi.listEnrollments(orgId, {
        academicSessionId: enrollmentSessionFilter,
        classId: enrollmentClassFilter,
        status: enrollmentStatusFilter,
        page: enrollmentPage,
        size: enrollmentPageSize,
        sortBy: enrollmentSortBy,
        sortDir: enrollmentSortDir,
      });
      setEnrollments(pageData.content);
      setEnrollmentTotalElements(pageData.totalElements);
      setEnrollmentTotalPages(pageData.totalPages);
      setEnrollmentsLoaded(true);
    } catch (err) {
      await handleApiException(err, 'Failed to load academic session enrollments.');
    } finally {
      setLoadingEnrollments(false);
    }
  }, [
    orgId,
    canViewStudents,
    isOrganizationDeactivated,
    isOrganizationSuspended,
    enrollmentSessionFilter,
    enrollmentClassFilter,
    enrollmentStatusFilter,
    enrollmentPage,
    enrollmentPageSize,
    enrollmentSortBy,
    enrollmentSortDir,
    handleApiException,
  ]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    void loadStudentsDirectory();
  }, [loadStudentsDirectory]);

  useEffect(() => {
    void loadEnrollmentsDirectory();
  }, [loadEnrollmentsDirectory]);

  const handleTabChange = (tab: StudentsPageTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const closeOrReturnDialog = useCallback(
    (returnToDetail?: ReturnToDetailContext, updatedStudent?: StudentResponse) => {
      if (returnToDetail) {
        setActiveDialog({
          kind: 'STUDENT_DETAIL',
          student: updatedStudent || returnToDetail.student,
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
  const handleSaveStudent = async (
    payload: CreateStudentRequest | UpdateStudentRequest,
    isEdit: boolean
  ) => {
    if (!orgId || activeDialog?.kind !== 'STUDENT_FORM') return;
    const { student: targetStudent, returnToDetail } = activeDialog;

    if (isEdit && targetStudent) {
      const updated = await studentManagementApi.updateStudent(
        orgId,
        targetStudent.id,
        payload as UpdateStudentRequest
      );
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setEnrollments((prev) =>
        prev.map((e) =>
          e.studentId === updated.id ? { ...e, student: updated } : e
        )
      );
      setFeedback({
        type: 'success',
        message: `Updated student profile for ${formatStudentFullName(updated)} (${updated.admissionNumber}).`,
      });
      setDetailRefreshCounter((c) => c + 1);
      closeOrReturnDialog(returnToDetail, updated);
    } else {
      const created = await studentManagementApi.createStudent(
        orgId,
        payload as CreateStudentRequest
      );
      setFeedback({
        type: 'success',
        message: `Registered new student ${formatStudentFullName(created)} (${created.admissionNumber}).`,
      });
      setActiveDialog(null);
    }
    await loadStudentsDirectory();
  };

  const handleChangeStudentStatus = async (payload: ChangeStudentStatusRequest) => {
    if (!orgId || activeDialog?.kind !== 'STUDENT_STATUS') return;
    const { student: targetStudent, returnToDetail } = activeDialog;
    const updated = await studentManagementApi.changeStudentStatus(
      orgId,
      targetStudent.id,
      payload
    );
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEnrollments((prev) =>
      prev.map((e) =>
        e.studentId === updated.id ? { ...e, student: updated } : e
      )
    );
    setFeedback({
      type: 'success',
      message: `Changed status of ${formatStudentFullName(updated)} to ${
        STUDENT_STATUS_META[updated.status]?.label || updated.status
      }.`,
    });
    setDetailRefreshCounter((c) => c + 1);
    closeOrReturnDialog(returnToDetail, updated);
    await loadStudentsDirectory();
  };

  const handleSaveEnrollment = async (
    payload: CreateEnrollmentRequest | UpdateEnrollmentRequest,
    isEdit: boolean
  ) => {
    if (!orgId || activeDialog?.kind !== 'ENROLLMENT_FORM') return;
    const { enrollment: targetEnrollment, returnToDetail } = activeDialog;

    if (isEdit && targetEnrollment) {
      const updated = await studentManagementApi.updateEnrollment(
        orgId,
        targetEnrollment.id,
        payload as UpdateEnrollmentRequest
      );
      setFeedback({
        type: 'success',
        message: `Updated enrollment placement for ${formatStudentFullName(updated.student)} in ${updated.className || 'class'}.`,
      });
    } else {
      const created = await studentManagementApi.enrollStudent(
        orgId,
        payload as CreateEnrollmentRequest
      );
      setFeedback({
        type: 'success',
        message: `Enrolled ${formatStudentFullName(created.student)} into ${created.className || 'class'} (${created.academicSessionName || 'session'}).`,
      });
    }
    setDetailRefreshCounter((c) => c + 1);
    closeOrReturnDialog(returnToDetail);
    await Promise.all([loadStudentsDirectory(), loadEnrollmentsDirectory()]);
  };

  const handleChangeEnrollmentStatus = async (
    payload: ChangeEnrollmentStatusRequest
  ) => {
    if (!orgId || activeDialog?.kind !== 'ENROLLMENT_STATUS') return;
    const { enrollment: targetEnrollment, returnToDetail } = activeDialog;
    const updated = await studentManagementApi.changeEnrollmentStatus(
      orgId,
      targetEnrollment.id,
      payload
    );
    setFeedback({
      type: 'success',
      message: `Enrollment status for ${formatStudentFullName(updated.student)} updated to ${
        ENROLLMENT_STATUS_META[updated.status]?.label || updated.status
      }.`,
    });
    setDetailRefreshCounter((c) => c + 1);
    closeOrReturnDialog(returnToDetail);
    await loadEnrollmentsDirectory();
  };

  const handleSaveGuardian = async (
    payload: CreateGuardianRequest | UpdateGuardianRequest,
    isEdit: boolean
  ) => {
    if (!orgId || activeDialog?.kind !== 'GUARDIAN_FORM') return;
    const { guardian: targetGuardian, returnToLinkGuardian } = activeDialog;

    if (isEdit && targetGuardian) {
      const updated = await studentManagementApi.updateGuardian(
        orgId,
        targetGuardian.id,
        payload as UpdateGuardianRequest
      );
      setGuardians((prev) =>
        prev.map((g) => (g.id === updated.id ? updated : g))
      );
      setFeedback({
        type: 'success',
        message: `Updated guardian profile for ${formatGuardianFullName(updated)}.`,
      });
      setActiveDialog(null);
    } else {
      const created = await studentManagementApi.createGuardian(
        orgId,
        payload as CreateGuardianRequest
      );
      setGuardians((prev) => [created, ...prev]);
      setFeedback({
        type: 'success',
        message: `Created guardian profile for ${formatGuardianFullName(created)}.`,
      });
      if (returnToLinkGuardian) {
        setActiveDialog({
          kind: 'LINK_GUARDIAN',
          student: returnToLinkGuardian.student,
          initialLink: null,
          linkedGuardianIds: returnToLinkGuardian.linkedGuardianIds,
          returnToDetail: returnToLinkGuardian.returnToDetail,
        });
      } else {
        setActiveDialog(null);
      }
    }
    setDetailRefreshCounter((c) => c + 1);
  };

  const handleOpenLinkGuardian = async (
    student: StudentResponse,
    knownLinkedIds?: number[],
    returnTab: StudentDetailTab = 'guardians'
  ) => {
    if (!orgId) return;
    let linkedIds = knownLinkedIds;
    if (!linkedIds) {
      try {
        const currentLinks = await studentManagementApi.listStudentGuardians(
          orgId,
          student.id
        );
        linkedIds = currentLinks.map((l) => l.guardianId);
      } catch {
        linkedIds = [];
      }
    }
    setActiveDialog({
      kind: 'LINK_GUARDIAN',
      student,
      initialLink: null,
      linkedGuardianIds: linkedIds,
      returnToDetail: { student, tab: returnTab },
    });
  };

  const handleSaveGuardianLink = async (
    payload: LinkStudentGuardianRequest | UpdateStudentGuardianRequest,
    isEdit: boolean,
    guardianId: number
  ) => {
    if (!orgId || activeDialog?.kind !== 'LINK_GUARDIAN') return;
    const { student: targetStudent, returnToDetail } = activeDialog;
    if (isEdit) {
      await studentManagementApi.updateStudentGuardianLink(
        orgId,
        targetStudent.id,
        guardianId,
        payload as UpdateStudentGuardianRequest
      );
      setFeedback({
        type: 'success',
        message: `Updated guardian relationship for ${formatStudentFullName(targetStudent)}.`,
      });
    } else {
      await studentManagementApi.linkGuardianToStudent(
        orgId,
        targetStudent.id,
        payload as LinkStudentGuardianRequest
      );
      setFeedback({
        type: 'success',
        message: `Linked guardian to ${formatStudentFullName(targetStudent)}.`,
      });
    }
    setDetailRefreshCounter((c) => c + 1);
    closeOrReturnDialog(returnToDetail);
  };

  const handleOpenGuardianStudents = async (guardian: GuardianResponse) => {
    if (!orgId) return;
    setActiveDialog({ kind: 'GUARDIAN_STUDENTS', guardian });
    setLoadingGuardianStudents(true);
    setGuardianLinkedStudents([]);
    try {
      const links = await studentManagementApi.listGuardianStudents(
        orgId,
        guardian.id
      );
      setGuardianLinkedStudents(links);
    } catch (err) {
      await handleApiException(
        err,
        'Failed to load students associated with this guardian.'
      );
    } finally {
      setLoadingGuardianStudents(false);
    }
  };

  const refreshGuardianInvitations = useCallback(async () => {
    if (!orgId) return;
    try {
      const list = await studentManagementApi.listGuardianInvitations(orgId);
      setGuardianInvitations(list);
    } catch {
      // Non-fatal
    }
  }, [orgId]);

  const handleSendGuardianInvitation = async (
    payload: CreateInvitationRequest
  ): Promise<InvitationDispatchResponse> => {
    if (!orgId) throw new Error('Organization context is required.');
    const res = await studentManagementApi.inviteGuardian(orgId, payload);
    setFeedback({
      type: 'success',
      message: `Sent Parent Portal invitation to ${res.invitation.email}.`,
    });
    await refreshGuardianInvitations();
    return res;
  };

  const handleResendGuardianInvitation = async (
    invitationId: number
  ): Promise<InvitationDispatchResponse> => {
    if (!orgId) throw new Error('Organization context is required.');
    const res = await studentManagementApi.resendGuardianInvitation(
      orgId,
      invitationId
    );
    setFeedback({
      type: 'success',
      message: `Resent Parent Portal invitation to ${res.invitation.email}.`,
    });
    await refreshGuardianInvitations();
    return res;
  };

  const handleRevokeGuardianInvitation = async (
    invitationId: number
  ): Promise<InvitationResponse> => {
    if (!orgId) throw new Error('Organization context is required.');
    const res = await studentManagementApi.revokeGuardianInvitation(
      orgId,
      invitationId
    );
    setFeedback({
      type: 'success',
      message: `Revoked pending Parent Portal invitation for ${res.email}.`,
    });
    await refreshGuardianInvitations();
    return res;
  };

  const filteredGuardians = useMemo(() => {
    return guardians.filter((g) => {
      if (guardianActiveFilter === 'ACTIVE' && !g.active) return false;
      if (guardianActiveFilter === 'INACTIVE' && g.active) return false;
      if (guardianSearch.trim()) {
        const q = guardianSearch.toLowerCase();
        const fullName = formatGuardianFullName(g).toLowerCase();
        return (
          fullName.includes(q) ||
          g.phoneNumber.toLowerCase().includes(q) ||
          (g.email && g.email.toLowerCase().includes(q)) ||
          (g.occupation && g.occupation.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [guardians, guardianActiveFilter, guardianSearch]);

  const currentOrActiveSession = useMemo(
    () => sessions.find((s) => s.status === 'ACTIVE') || sessions[0] || null,
    [sessions]
  );

  // =========================================================================
  // Table Column Definitions
  // =========================================================================
  const studentColumns: DataTableColumn<StudentResponse>[] = [
    {
      key: 'student',
      header: 'Student & Admission #',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 border border-indigo-100">
            {formatStudentInitials(row)}
          </div>
          <div>
            <button
              type="button"
              onClick={() =>
                setActiveDialog({
                  kind: 'STUDENT_DETAIL',
                  student: row,
                  initialTab: 'profile',
                })
              }
              className="text-left font-semibold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              {formatStudentFullName(row)}
            </button>
            <p className="mt-0.5 text-xs font-mono text-slate-500">
              {row.admissionNumber}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'demographics',
      header: 'Gender & DOB',
      render: (row) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800">
            {GENDER_LABELS[row.gender] || row.gender}
          </span>
          <p className="mt-0.5 text-slate-500">
            DOB: {formatDate(row.dateOfBirth)}
            {row.bloodGroup ? ` • ${row.bloodGroup}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact & Location',
      render: (row) => (
        <div className="text-xs">
          <p className="text-slate-800">{row.phoneNumber || '—'}</p>
          <p className="mt-0.5 text-slate-500 truncate max-w-[190px]">
            {row.email ||
              [row.city, row.state].filter(Boolean).join(', ') ||
              'No email on file'}
          </p>
        </div>
      ),
    },
    {
      key: 'admissionDate',
      header: 'Admitted On',
      render: (row) => (
        <span className="text-xs text-slate-700">
          {formatDate(row.admissionDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const b = getStudentStatusBadge(row.status);
        return (
          <Badge variant={b.variant} dot>
            {b.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setActiveDialog({
                kind: 'STUDENT_DETAIL',
                student: row,
                initialTab: 'profile',
              })
            }
          >
            360° View
          </Button>
          {canManageEnrollment && row.status === 'ACTIVE' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setActiveDialog({
                  kind: 'ENROLLMENT_FORM',
                  mode: 'create',
                  enrollment: null,
                  preselectedStudent: row,
                })
              }
            >
              Enroll
            </Button>
          )}
          {canUpdateStudent && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setActiveDialog({
                    kind: 'STUDENT_FORM',
                    mode: 'edit',
                    student: row,
                  })
                }
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setActiveDialog({
                    kind: 'STUDENT_STATUS',
                    student: row,
                  })
                }
              >
                Status
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const enrollmentColumns: DataTableColumn<StudentEnrollmentResponse>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => {
        const stBadge = row.student?.status
          ? getStudentStatusBadge(row.student.status)
          : null;
        return (
          <div>
            <div className="flex items-center gap-2">
              {row.student ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'STUDENT_DETAIL',
                      student: row.student!,
                      initialTab: 'enrollments',
                    })
                  }
                  className="text-left font-semibold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  {formatStudentFullName(row.student)}
                </button>
              ) : (
                <span className="font-semibold text-slate-900">
                  Student #{row.studentId}
                </span>
              )}
              {stBadge && <Badge variant={stBadge.variant}>{stBadge.label}</Badge>}
            </div>
            <p className="mt-0.5 text-xs font-mono text-slate-500">
              {row.student?.admissionNumber || `#${row.studentId}`}
            </p>
          </div>
        );
      },
    },
    {
      key: 'session',
      header: 'Academic Session',
      render: (row) => {
        const matchedSession = sessions.find(
          (s) => s.id === row.academicSessionId
        );
        const sb = matchedSession
          ? getSessionStatusBadgeMeta(matchedSession.status)
          : null;
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-800">
              {row.academicSessionName || `Session #${row.academicSessionId}`}
            </span>
            {sb && <Badge variant={sb.variant}>{sb.label}</Badge>}
          </div>
        );
      },
    },
    {
      key: 'class',
      header: 'Class & Roll No.',
      render: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-900">
            {row.className || `Class #${row.classId}`}
            {row.classCode ? ` (${row.classCode})` : ''}
          </span>
          <p className="mt-0.5 text-slate-500 font-mono">
            Roll: {row.rollNumber || 'Unassigned'}
          </p>
        </div>
      ),
    },
    {
      key: 'enrollmentDate',
      header: 'Enrolled On',
      render: (row) => (
        <span className="text-xs text-slate-700">
          {formatDate(row.enrollmentDate)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Enrollment Status',
      render: (row) => {
        const eb = getEnrollmentStatusBadge(row.status);
        return (
          <Badge variant={eb.variant} dot>
            {eb.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => {
        const matchedSession = sessions.find(
          (s) => s.id === row.academicSessionId
        );
        const canModifyRow =
          canManageEnrollment &&
          row.status === 'ACTIVE' &&
          matchedSession?.status !== 'COMPLETED';
        return (
          <div className="flex items-center justify-end gap-1.5">
            {row.student && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setActiveDialog({
                    kind: 'STUDENT_DETAIL',
                    student: row.student!,
                    initialTab: 'enrollments',
                  })
                }
              >
                Student 360°
              </Button>
            )}
            {canModifyRow ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'ENROLLMENT_FORM',
                      mode: 'edit',
                      enrollment: row,
                      preselectedStudent: null,
                    })
                  }
                >
                  Edit Placement
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'ENROLLMENT_STATUS',
                      enrollment: row,
                    })
                  }
                >
                  Status
                </Button>
              </>
            ) : (
              row.status !== 'ACTIVE' && (
                <span className="text-[11px] text-slate-400 px-1.5">
                  Finalized
                </span>
              )
            )}
          </div>
        );
      },
    },
  ];

  const guardianColumns: DataTableColumn<GuardianResponse>[] = [
    {
      key: 'name',
      header: 'Guardian Name',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900">
            {formatGuardianFullName(row)}
          </span>
          {row.occupation && (
            <p className="mt-0.5 text-xs text-slate-500">{row.occupation}</p>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Numbers',
      render: (row) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{row.phoneNumber}</p>
          {row.alternatePhoneNumber && (
            <p className="mt-0.5 text-slate-500">
              Alt: {row.alternatePhoneNumber}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email & Address',
      render: (row) => (
        <div className="text-xs">
          <p className="text-slate-800">{row.email || '—'}</p>
          <p className="mt-0.5 text-slate-500 truncate max-w-[220px]">
            {row.address || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status & Portal Access',
      render: (row) => {
        const hasPendingInvite = guardianInvitations.some(
          (inv) =>
            inv.status === 'PENDING' &&
            (inv.targetProfileId === row.id ||
              (row.email &&
                inv.email.toLowerCase() === row.email.toLowerCase()))
        );
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={row.active ? 'success' : 'neutral'} dot>
              {row.active ? 'Active' : 'Inactive'}
            </Badge>
            {row.userId ? (
              <span className="text-[11px] font-medium text-emerald-700">
                Portal Linked (#{row.userId})
              </span>
            ) : hasPendingInvite ? (
              <span className="text-[11px] font-medium text-amber-700">
                Portal Invite Pending
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">
                No Portal Account
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
        const hasPendingInvite = guardianInvitations.some(
          (inv) =>
            inv.status === 'PENDING' &&
            (inv.targetProfileId === row.id ||
              (row.email &&
                inv.email.toLowerCase() === row.email.toLowerCase()))
        );
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleOpenGuardianStudents(row)}
            >
              Linked Students
            </Button>
            {canManageGuardian && row.active && !row.userId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setActiveDialog({
                    kind: 'INVITE_GUARDIAN',
                    guardian: row,
                  })
                }
              >
                {hasPendingInvite ? 'Manage Invite' : 'Invite Parent'}
              </Button>
            )}
            {canManageGuardian && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setActiveDialog({
                    kind: 'GUARDIAN_FORM',
                    mode: 'edit',
                    guardian: row,
                  })
                }
              >
                Edit
              </Button>
            )}
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
        pageTitle="Student Management"
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
      pageTitle="Student Management"
      breadcrumbParent={
        activeOrganization?.organizationName || 'School Administration'
      }
    >
      <div className="space-y-6">
        {subscriptionSuspendedError && <SubscriptionSuspendedBanner />}

        <PageHeader
          eyebrow={
            activeOrganization?.organizationName
              ? `${activeOrganization.organizationName} • Student Operations`
              : 'School Administration'
          }
          title="Student Management"
          description="Manage student admission profiles, academic session class enrollments, guardian relationships, and official student documents."
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
              {canManageGuardian && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'GUARDIAN_FORM',
                      mode: 'create',
                      guardian: null,
                    })
                  }
                >
                  + Add Guardian
                </Button>
              )}
              {canManageEnrollment && (
                <Button
                  variant="outline"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'ENROLLMENT_FORM',
                      mode: 'create',
                      enrollment: null,
                      preselectedStudent: null,
                    })
                  }
                >
                  + Enroll Student
                </Button>
              )}
              {canCreateStudent && (
                <Button
                  variant="primary"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'STUDENT_FORM',
                      mode: 'create',
                      student: null,
                    })
                  }
                >
                  + Register Student
                </Button>
              )}
            </div>
          }
        />

        {feedback && (
          <AlertBanner
            variant={feedback.type}
            message={feedback.message}
            onDismiss={() => setFeedback(null)}
          />
        )}
        {error && (
          <AlertBanner
            variant="error"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {/* KPI Overview Strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">
              Matching Student Profiles
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {studentTotalElements}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Across current directory filters
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">
              Active Academic Session
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 truncate">
              {currentOrActiveSession ? currentOrActiveSession.name : 'None Active'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {sessions.filter((s) => s.status === 'ACTIVE').length} active session(s)
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Active Classes</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {classes.filter((c) => c.active).length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {classes.length} total school classes
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">
              Guardians in Directory
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {guardians.filter((g) => g.active).length}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {guardians.length} total guardian records
            </p>
          </div>
        </div>

        {/* Module Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex flex-wrap gap-6" aria-label="Tabs">
            {(
              [
                {
                  id: 'directory',
                  label: 'Student Directory',
                  count: studentsLoaded ? studentTotalElements : undefined,
                },
                {
                  id: 'enrollments',
                  label: 'Academic Enrollments',
                  count: enrollmentsLoaded ? enrollmentTotalElements : undefined,
                },
                {
                  id: 'guardians',
                  label: 'Guardians Directory',
                  count: guardiansLoaded ? guardians.length : undefined,
                },
              ] as { id: StudentsPageTab; label: string; count?: number }[]
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 border-b-2 py-3 text-sm font-semibold transition-colors ${
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

        {/* TAB 1: STUDENT DIRECTORY */}
        {activeTab === 'directory' && (
          <SectionCard
            title="Student Admission Directory"
            description="Search, filter, and inspect student profiles, academic session placements, guardian links, and documents."
          >
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2">
                <TextInput
                  placeholder="Search by student name or admission number..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setStudentPage(0);
                  }}
                />
              </div>

              <SelectInput
                value={studentStatusFilter}
                onChange={(e) => {
                  setStudentStatusFilter(e.target.value as StudentStatus | '');
                  setStudentPage(0);
                }}
              >
                <option value="">All Statuses</option>
                {(Object.keys(STUDENT_STATUS_META) as StudentStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {STUDENT_STATUS_META[st].label}
                  </option>
                ))}
              </SelectInput>

              <SelectInput
                value={studentGenderFilter}
                onChange={(e) => {
                  setStudentGenderFilter(e.target.value as Gender | '');
                  setStudentPage(0);
                }}
              >
                <option value="">All Genders</option>
                {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
                  <option key={g} value={g}>
                    {GENDER_LABELS[g]}
                  </option>
                ))}
              </SelectInput>

              <SelectInput
                value={studentSessionFilter}
                onChange={(e) => {
                  setStudentSessionFilter(
                    e.target.value ? Number(e.target.value) : ''
                  );
                  setStudentPage(0);
                }}
              >
                <option value="">All Academic Sessions</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </SelectInput>

              <SelectInput
                value={studentClassFilter}
                onChange={(e) => {
                  setStudentClassFilter(
                    e.target.value ? Number(e.target.value) : ''
                  );
                  setStudentPage(0);
                }}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </SelectInput>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Sort by:</span>
                <select
                  value={studentSortBy}
                  onChange={(e) =>
                    setStudentSortBy(e.target.value as typeof studentSortBy)
                  }
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <option value="firstName">First Name</option>
                  <option value="lastName">Last Name</option>
                  <option value="admissionNumber">Admission Number</option>
                  <option value="admissionDate">Admission Date</option>
                  <option value="dateOfBirth">Date of Birth</option>
                  <option value="status">Status</option>
                  <option value="createdAt">Recently Registered</option>
                </select>
                <select
                  value={studentSortDir}
                  onChange={(e) =>
                    setStudentSortDir(e.target.value as 'asc' | 'desc')
                  }
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>

              {(studentSearch ||
                studentStatusFilter ||
                studentGenderFilter ||
                studentSessionFilter ||
                studentClassFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setStudentSearch('');
                    setStudentStatusFilter('');
                    setStudentGenderFilter('');
                    setStudentSessionFilter('');
                    setStudentClassFilter('');
                    setStudentPage(0);
                  }}
                  className="font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <DataTable
              columns={studentColumns}
              data={students}
              rowKey={(r) => r.id}
              isLoading={loadingStudents || loadingReference}
              emptyTitle="No student profiles found"
              emptyDescription="Register your first student admission profile or adjust your search and filter criteria."
            />

            <Pagination
              page={studentPage}
              size={studentPageSize}
              totalElements={studentTotalElements}
              totalPages={studentTotalPages}
              onPageChange={setStudentPage}
              onSizeChange={(newSize) => {
                setStudentPageSize(newSize);
                setStudentPage(0);
              }}
            />
          </SectionCard>
        )}

        {/* TAB 2: ACADEMIC ENROLLMENTS */}
        {activeTab === 'enrollments' && (
          <SectionCard
            title="Academic Session Enrollments"
            description="Browse and manage student class placements, roll numbers, and enrollment progression across academic sessions."
          >
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SelectInput
                value={enrollmentSessionFilter}
                onChange={(e) => {
                  setEnrollmentSessionFilter(
                    e.target.value ? Number(e.target.value) : ''
                  );
                  setEnrollmentPage(0);
                }}
              >
                <option value="">All Academic Sessions</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.status}
                  </option>
                ))}
              </SelectInput>

              <SelectInput
                value={enrollmentClassFilter}
                onChange={(e) => {
                  setEnrollmentClassFilter(
                    e.target.value ? Number(e.target.value) : ''
                  );
                  setEnrollmentPage(0);
                }}
              >
                <option value="">All School Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </SelectInput>

              <SelectInput
                value={enrollmentStatusFilter}
                onChange={(e) => {
                  setEnrollmentStatusFilter(
                    e.target.value as EnrollmentStatus | ''
                  );
                  setEnrollmentPage(0);
                }}
              >
                <option value="">All Enrollment Statuses</option>
                {(
                  Object.keys(ENROLLMENT_STATUS_META) as EnrollmentStatus[]
                ).map((st) => (
                  <option key={st} value={st}>
                    {ENROLLMENT_STATUS_META[st].label}
                  </option>
                ))}
              </SelectInput>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>Sort by:</span>
                <select
                  value={enrollmentSortBy}
                  onChange={(e) =>
                    setEnrollmentSortBy(
                      e.target.value as typeof enrollmentSortBy
                    )
                  }
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <option value="enrollmentDate">Enrollment Date</option>
                  <option value="rollNumber">Roll Number</option>
                  <option value="status">Enrollment Status</option>
                  <option value="createdAt">Created Date</option>
                </select>
                <select
                  value={enrollmentSortDir}
                  onChange={(e) =>
                    setEnrollmentSortDir(e.target.value as 'asc' | 'desc')
                  }
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              {(enrollmentSessionFilter ||
                enrollmentClassFilter ||
                enrollmentStatusFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setEnrollmentSessionFilter('');
                    setEnrollmentClassFilter('');
                    setEnrollmentStatusFilter('');
                    setEnrollmentPage(0);
                  }}
                  className="font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <DataTable
              columns={enrollmentColumns}
              data={enrollments}
              rowKey={(r) => r.id}
              isLoading={loadingEnrollments}
              emptyTitle="No academic enrollments found"
              emptyDescription="Enroll active students into an active academic session and class to populate this roster."
            />

            <Pagination
              page={enrollmentPage}
              size={enrollmentPageSize}
              totalElements={enrollmentTotalElements}
              totalPages={enrollmentTotalPages}
              onPageChange={setEnrollmentPage}
              onSizeChange={(newSize) => {
                setEnrollmentPageSize(newSize);
                setEnrollmentPage(0);
              }}
            />
          </SectionCard>
        )}

        {/* TAB 3: GUARDIANS DIRECTORY */}
        {activeTab === 'guardians' && (
          <SectionCard
            title="Organization Guardians Directory"
            description="Centralized directory of parents and legal guardians that can be linked to one or more students."
            actions={
              canManageGuardian ? (
                <Button
                  size="sm"
                  onClick={() =>
                    setActiveDialog({
                      kind: 'GUARDIAN_FORM',
                      mode: 'create',
                      guardian: null,
                    })
                  }
                >
                  + Add Guardian
                </Button>
              ) : undefined
            }
          >
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <TextInput
                  placeholder="Search guardian by name, phone number, email, or occupation..."
                  value={guardianSearch}
                  onChange={(e) => setGuardianSearch(e.target.value)}
                />
              </div>
              <SelectInput
                value={guardianActiveFilter}
                onChange={(e) =>
                  setGuardianActiveFilter(
                    e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE'
                  )
                }
              >
                <option value="ALL">All Guardians</option>
                <option value="ACTIVE">Active Guardians Only</option>
                <option value="INACTIVE">Inactive Guardians Only</option>
              </SelectInput>
            </div>

            {filteredGuardians.length === 0 && !loadingReference ? (
              <EmptyState
                title="No guardians found"
                description="Add parent or legal guardian profiles so they can be linked to students for primary and emergency contact."
              />
            ) : (
              <DataTable
                columns={guardianColumns}
                data={filteredGuardians}
                rowKey={(r) => r.id}
                isLoading={loadingReference}
              />
            )}
          </SectionCard>
        )}

        {/* Unified Single-Active-Dialog Manager */}
        <StudentFormModal
          open={activeDialog?.kind === 'STUDENT_FORM'}
          onClose={() =>
            closeOrReturnDialog(
              activeDialog?.kind === 'STUDENT_FORM'
                ? activeDialog.returnToDetail
                : undefined
            )
          }
          initialData={
            activeDialog?.kind === 'STUDENT_FORM' ? activeDialog.student : null
          }
          onSubmit={handleSaveStudent}
        />

        <StudentStatusModal
          open={activeDialog?.kind === 'STUDENT_STATUS'}
          onClose={() =>
            closeOrReturnDialog(
              activeDialog?.kind === 'STUDENT_STATUS'
                ? activeDialog.returnToDetail
                : undefined
            )
          }
          student={
            activeDialog?.kind === 'STUDENT_STATUS' ? activeDialog.student : null
          }
          onSubmit={handleChangeStudentStatus}
        />

        <EnrollmentFormModal
          open={activeDialog?.kind === 'ENROLLMENT_FORM'}
          onClose={() =>
            closeOrReturnDialog(
              activeDialog?.kind === 'ENROLLMENT_FORM'
                ? activeDialog.returnToDetail
                : undefined
            )
          }
          organizationId={orgId}
          initialData={
            activeDialog?.kind === 'ENROLLMENT_FORM'
              ? activeDialog.enrollment
              : null
          }
          preselectedStudent={
            activeDialog?.kind === 'ENROLLMENT_FORM'
              ? activeDialog.preselectedStudent
              : null
          }
          availableStudents={students}
          sessions={sessions}
          classes={classes}
          defaultSessionId={currentOrActiveSession?.id || ''}
          onSwitchToEditEnrollment={(existingEnr) => {
            setActiveDialog((prev) => ({
              kind: 'ENROLLMENT_FORM',
              mode: 'edit',
              enrollment: existingEnr,
              preselectedStudent: null,
              returnToDetail:
                prev?.kind === 'ENROLLMENT_FORM'
                  ? prev.returnToDetail
                  : undefined,
            }));
          }}
          onSubmit={handleSaveEnrollment}
        />

        <EnrollmentStatusModal
          open={activeDialog?.kind === 'ENROLLMENT_STATUS'}
          onClose={() =>
            closeOrReturnDialog(
              activeDialog?.kind === 'ENROLLMENT_STATUS'
                ? activeDialog.returnToDetail
                : undefined
            )
          }
          enrollment={
            activeDialog?.kind === 'ENROLLMENT_STATUS'
              ? activeDialog.enrollment
              : null
          }
          onSubmit={handleChangeEnrollmentStatus}
        />

        <GuardianFormModal
          open={activeDialog?.kind === 'GUARDIAN_FORM'}
          onClose={() => {
            if (
              activeDialog?.kind === 'GUARDIAN_FORM' &&
              activeDialog.returnToLinkGuardian
            ) {
              const ret = activeDialog.returnToLinkGuardian;
              setActiveDialog({
                kind: 'LINK_GUARDIAN',
                student: ret.student,
                initialLink: null,
                linkedGuardianIds: ret.linkedGuardianIds,
                returnToDetail: ret.returnToDetail,
              });
            } else {
              setActiveDialog(null);
            }
          }}
          initialData={
            activeDialog?.kind === 'GUARDIAN_FORM'
              ? activeDialog.guardian
              : null
          }
          existingGuardians={guardians}
          onSubmit={handleSaveGuardian}
        />

        <LinkGuardianModal
          open={activeDialog?.kind === 'LINK_GUARDIAN'}
          onClose={() =>
            closeOrReturnDialog(
              activeDialog?.kind === 'LINK_GUARDIAN'
                ? activeDialog.returnToDetail
                : undefined
            )
          }
          student={
            activeDialog?.kind === 'LINK_GUARDIAN' ? activeDialog.student : null
          }
          initialLink={
            activeDialog?.kind === 'LINK_GUARDIAN'
              ? activeDialog.initialLink
              : null
          }
          availableGuardians={guardians}
          linkedGuardianIds={
            activeDialog?.kind === 'LINK_GUARDIAN'
              ? activeDialog.linkedGuardianIds
              : []
          }
          onOpenCreateGuardian={
            canManageGuardian && activeDialog?.kind === 'LINK_GUARDIAN'
              ? () => {
                  setActiveDialog({
                    kind: 'GUARDIAN_FORM',
                    mode: 'create',
                    guardian: null,
                    returnToLinkGuardian: {
                      student: activeDialog.student,
                      linkedGuardianIds: activeDialog.linkedGuardianIds,
                      returnToDetail: activeDialog.returnToDetail,
                    },
                  });
                }
              : undefined
          }
          onSubmit={handleSaveGuardianLink}
        />

        <GuardianInvitationModal
          open={activeDialog?.kind === 'INVITE_GUARDIAN'}
          guardian={
            activeDialog?.kind === 'INVITE_GUARDIAN'
              ? activeDialog.guardian
              : null
          }
          existingInvitations={guardianInvitations}
          onClose={() =>
            closeOrReturnDialog(
              activeDialog?.kind === 'INVITE_GUARDIAN'
                ? activeDialog.returnToDetail
                : undefined
            )
          }
          onSubmit={handleSendGuardianInvitation}
          onResend={handleResendGuardianInvitation}
          onRevoke={handleRevokeGuardianInvitation}
        />

        {activeDialog?.kind === 'GUARDIAN_STUDENTS' && (
          <Dialog
            open={true}
            onClose={() => setActiveDialog(null)}
            title={`Students Linked to ${formatGuardianFullName(activeDialog.guardian)}`}
            description={`${activeDialog.guardian.phoneNumber}${
              activeDialog.guardian.email ? ` • ${activeDialog.guardian.email}` : ''
            }`}
            maxWidthClass="max-w-xl"
            footer={
              <Button variant="outline" onClick={() => setActiveDialog(null)}>
                Close
              </Button>
            }
          >
            {loadingGuardianStudents ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Loading associated students...
              </p>
            ) : guardianLinkedStudents.length === 0 ? (
              <EmptyState
                title="No students linked to this guardian"
                description="Open a student's 360° View and use the Guardians tab to link this guardian."
              />
            ) : (
              <div className="space-y-2.5">
                {guardianLinkedStudents.map((link) => {
                  const st = link.student;
                  const stBadge = st ? getStudentStatusBadge(st.status) : null;
                  return (
                    <div
                      key={link.id}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {formatStudentFullName(st)}
                          </span>
                          {stBadge && (
                            <Badge variant={stBadge.variant} dot>
                              {stBadge.label}
                            </Badge>
                          )}
                          <Badge variant="info">
                            {GUARDIAN_RELATIONSHIP_LABELS[link.relationshipType] ||
                              link.relationshipType}
                          </Badge>
                          {link.primaryContact && (
                            <Badge variant="success">Primary</Badge>
                          )}
                          {link.emergencyContact && (
                            <Badge variant="warning">Emergency</Badge>
                          )}
                        </div>
                        <p className="font-mono text-slate-500">
                          {st?.admissionNumber || `Student #${link.studentId}`}
                        </p>
                      </div>
                      {st && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setActiveDialog({
                              kind: 'STUDENT_DETAIL',
                              student: st,
                              initialTab: 'profile',
                            })
                          }
                        >
                          Open 360° View
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Dialog>
        )}

        {orgId && (
          <StudentDetailModal
            open={activeDialog?.kind === 'STUDENT_DETAIL'}
            onClose={() => setActiveDialog(null)}
            organizationId={orgId}
            student={
              activeDialog?.kind === 'STUDENT_DETAIL'
                ? activeDialog.student
                : null
            }
            sessions={sessions}
            guardianInvitations={guardianInvitations}
            initialTab={
              activeDialog?.kind === 'STUDENT_DETAIL'
                ? activeDialog.initialTab
                : 'profile'
            }
            canUpdateStudent={canUpdateStudent}
            canManageEnrollment={canManageEnrollment}
            canManageGuardian={canManageGuardian}
            isSuspended={isOrganizationSuspended || Boolean(orgSuspendedError)}
            refreshTrigger={detailRefreshCounter}
            onEditStudent={(st, returnTab) =>
              setActiveDialog({
                kind: 'STUDENT_FORM',
                mode: 'edit',
                student: st,
                returnToDetail: { student: st, tab: returnTab },
              })
            }
            onChangeStudentStatus={(st, returnTab) =>
              setActiveDialog({
                kind: 'STUDENT_STATUS',
                student: st,
                returnToDetail: { student: st, tab: returnTab },
              })
            }
            onEnrollStudent={(st, returnTab) =>
              setActiveDialog({
                kind: 'ENROLLMENT_FORM',
                mode: 'create',
                enrollment: null,
                preselectedStudent: st,
                returnToDetail: { student: st, tab: returnTab },
              })
            }
            onEditEnrollment={(enr, st, returnTab) =>
              setActiveDialog({
                kind: 'ENROLLMENT_FORM',
                mode: 'edit',
                enrollment: enr,
                preselectedStudent: null,
                returnToDetail: { student: st, tab: returnTab },
              })
            }
            onChangeEnrollmentStatus={(enr, st, returnTab) =>
              setActiveDialog({
                kind: 'ENROLLMENT_STATUS',
                enrollment: enr,
                returnToDetail: { student: st, tab: returnTab },
              })
            }
            onLinkGuardian={(st, linkedIds, returnTab) => {
              void handleOpenLinkGuardian(st, linkedIds, returnTab);
            }}
            onEditGuardianLink={(st, link, returnTab) =>
              setActiveDialog({
                kind: 'LINK_GUARDIAN',
                student: st,
                initialLink: link,
                linkedGuardianIds: [],
                returnToDetail: { student: st, tab: returnTab },
              })
            }
            onInviteGuardian={(guardian, st, returnTab) =>
              setActiveDialog({
                kind: 'INVITE_GUARDIAN',
                guardian,
                returnToDetail: { student: st, tab: returnTab },
              })
            }
          />
        )}
      </div>
    </AppShell>
  );
};










