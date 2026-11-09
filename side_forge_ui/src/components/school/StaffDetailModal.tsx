import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '../../lib/api-client';
import { staffManagementApi } from '../../services/staffManagementApi';
import type { AcademicSessionResponse } from '../../types/academicManagement';
import {
  EMPLOYMENT_STATUS_META,
  EMPLOYMENT_TYPE_LABELS,
  formatStaffFullName,
  formatStaffInitials,
  getEmploymentStatusBadge,
  getInvitationStatusBadge,
  isTerminalEmploymentStatus,
  type InvitationResponse,
  type StaffResponse,
  type StoredFileResponse,
  type TeacherClassAssignmentResponse,
  type TeacherResponse,
  type TeacherSubjectAssignmentResponse,
} from '../../types/staffManagement';
import { GENDER_LABELS } from '../../types/studentManagement';
import { Badge, CounterLabel, IdLabel } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { EmptyState, InlineAlert } from '../ui/StateViews';

export type StaffDetailTab =
  | 'overview'
  | 'teacher'
  | 'assignments'
  | 'documents';

interface StaffDetailModalProps {
  open: boolean;
  organizationId: number;
  staff: StaffResponse | null;
  initialTab?: StaffDetailTab;
  refreshTrigger?: number;
  sessions: AcademicSessionResponse[];
  invitations: InvitationResponse[];
  canManageStaff: boolean;
  canViewTeachers: boolean;
  canManageTeachers: boolean;
  onClose: () => void;
  onEditStaff: (staff: StaffResponse, currentTab: StaffDetailTab) => void;
  onChangeStaffStatus: (
    staff: StaffResponse,
    currentTab: StaffDetailTab
  ) => void;
  onEditTeacherProfile: (
    staff: StaffResponse,
    teacher: TeacherResponse,
    currentTab: StaffDetailTab
  ) => void;
  onPromoteToTeacher: (
    staff: StaffResponse,
    currentTab: StaffDetailTab
  ) => void;
  onAssignClass: (
    staff: StaffResponse,
    teacher: TeacherResponse,
    currentTab: StaffDetailTab
  ) => void;
  onEditClassAssignment: (
    staff: StaffResponse,
    teacher: TeacherResponse,
    assignment: TeacherClassAssignmentResponse,
    currentTab: StaffDetailTab
  ) => void;
  onAssignSubject: (
    staff: StaffResponse,
    teacher: TeacherResponse,
    currentTab: StaffDetailTab
  ) => void;
  onEditSubjectAssignment: (
    staff: StaffResponse,
    teacher: TeacherResponse,
    assignment: TeacherSubjectAssignmentResponse,
    currentTab: StaffDetailTab
  ) => void;
  onInviteStaff: (staff: StaffResponse, currentTab: StaffDetailTab) => void;
  onStaffRefreshed?: (updated: StaffResponse) => void;
  onTeacherUpdated?: (updated: TeacherResponse) => void;
  onInvitationsChanged?: () => void;
  onAssignmentsChanged?: () => void;
}

const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

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

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export const StaffDetailModal: React.FC<StaffDetailModalProps> = ({
  open,
  organizationId,
  staff,
  initialTab = 'overview',
  refreshTrigger = 0,
  sessions,
  invitations,
  canManageStaff,
  canViewTeachers,
  canManageTeachers,
  onClose,
  onEditStaff,
  onChangeStaffStatus,
  onEditTeacherProfile,
  onPromoteToTeacher,
  onAssignClass,
  onEditClassAssignment,
  onAssignSubject,
  onEditSubjectAssignment,
  onInviteStaff,
  onStaffRefreshed,
  onTeacherUpdated,
  onInvitationsChanged,
  onAssignmentsChanged,
}) => {
  const [activeTab, setActiveTab] = useState<StaffDetailTab>(initialTab);
  const [currentStaff, setCurrentStaff] = useState<StaffResponse | null>(staff);
  const [teacherProfile, setTeacherProfile] = useState<TeacherResponse | null>(
    null
  );
  const [classAssignments, setClassAssignments] = useState<
    TeacherClassAssignmentResponse[]
  >([]);
  const [subjectAssignments, setSubjectAssignments] = useState<
    TeacherSubjectAssignmentResponse[]
  >([]);
  const [documents, setDocuments] = useState<StoredFileResponse[]>([]);

  const [sessionFilter, setSessionFilter] = useState<number | ''>('');
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [removingClassKey, setRemovingClassKey] = useState<string | null>(null);
  const [confirmRemoveClassKey, setConfirmRemoveClassKey] = useState<
    string | null
  >(null);
  const [removingSubjectKey, setRemovingSubjectKey] = useState<string | null>(
    null
  );
  const [confirmRemoveSubjectKey, setConfirmRemoveSubjectKey] = useState<
    string | null
  >(null);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<number | null>(
    null
  );
  const [confirmUnlinkUser, setConfirmUnlinkUser] = useState(false);
  const [unlinkingUser, setUnlinkingUser] = useState(false);
  const [resendingInvId, setResendingInvId] = useState<number | null>(null);
  const [revokingInvId, setRevokingInvId] = useState<number | null>(null);
  const [resentLink, setResentLink] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const docInputRef = useRef<HTMLInputElement | null>(null);
  const onStaffRefreshedRef = useRef(onStaffRefreshed);
  useEffect(() => {
    onStaffRefreshedRef.current = onStaffRefreshed;
  }, [onStaffRefreshed]);

  const staffId = staff?.id ?? null;

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setCurrentStaff(staff);
      setError(null);
      setFeedback(null);
      setResentLink(null);
      setConfirmRemoveClassKey(null);
      setConfirmRemoveSubjectKey(null);
      setConfirmDeleteDocId(null);
      setConfirmUnlinkUser(false);
    }
  }, [open, staffId, initialTab, staff]);

  const loadRelatedData = useCallback(async () => {
    if (!open || !staffId || !organizationId) return;
    setLoadingRelated(true);
    setError(null);
    try {
      const [freshStaff, docs] = await Promise.all([
        staffManagementApi.getStaffById(organizationId, staffId),
        staffManagementApi.listStaffDocuments(organizationId, staffId),
      ]);
      setCurrentStaff(freshStaff);
      setDocuments(docs);
      onStaffRefreshedRef.current?.(freshStaff);

      if (freshStaff.teachingStaff && canViewTeachers) {
        const tp = await staffManagementApi.findTeacherByStaff(
          organizationId,
          freshStaff
        );
        setTeacherProfile(tp);
        if (tp) {
          const [cList, sList] = await Promise.all([
            staffManagementApi.getTeacherClassAssignments(
              organizationId,
              tp.id
            ),
            staffManagementApi.getTeacherSubjectAssignments(
              organizationId,
              tp.id
            ),
          ]);
          setClassAssignments(cList);
          setSubjectAssignments(sList);
        } else {
          setClassAssignments([]);
          setSubjectAssignments([]);
        }
      } else {
        setTeacherProfile(null);
        setClassAssignments([]);
        setSubjectAssignments([]);
      }
    } catch (err) {
      setError(
        extractErrorMessage(err, 'Failed to load staff profile details.')
      );
    } finally {
      setLoadingRelated(false);
    }
  }, [open, staffId, organizationId, canViewTeachers]);

  useEffect(() => {
    void loadRelatedData();
  }, [loadRelatedData, refreshTrigger]);

  const sessionMap = useMemo(() => {
    const map = new Map<number, AcademicSessionResponse>();
    sessions.forEach((s) => map.set(s.id, s));
    return map;
  }, [sessions]);

  const staffInvitations = useMemo(() => {
    if (!currentStaff) return [];
    const emailLower = currentStaff.email?.toLowerCase() || '';
    return invitations.filter((inv) => {
      if (
        inv.targetProfileId &&
        (inv.targetProfileId === currentStaff.id ||
          (teacherProfile && inv.targetProfileId === teacherProfile.id)) &&
        (inv.targetType === 'STAFF' || inv.targetType === 'TEACHER')
      ) {
        return true;
      }
      if (emailLower && inv.email.toLowerCase() === emailLower) {
        return true;
      }
      return false;
    });
  }, [currentStaff, teacherProfile, invitations]);

  const filteredClassAssignments = useMemo(() => {
    if (!sessionFilter) return classAssignments;
    return classAssignments.filter(
      (a) => a.academicSessionId === Number(sessionFilter)
    );
  }, [classAssignments, sessionFilter]);

  const filteredSubjectAssignments = useMemo(() => {
    if (!sessionFilter) return subjectAssignments;
    return subjectAssignments.filter(
      (a) => a.academicSessionId === Number(sessionFilter)
    );
  }, [subjectAssignments, sessionFilter]);

  if (!currentStaff) return null;

  const statusBadge = getEmploymentStatusBadge(currentStaff.employmentStatus);
  const isTerminal = isTerminalEmploymentStatus(currentStaff.employmentStatus);

  const handleToggleAvailability = async () => {
    if (!teacherProfile) return;
    setTogglingAvailability(true);
    setError(null);
    try {
      const updated = await staffManagementApi.changeTeacherStatus(
        organizationId,
        teacherProfile.id,
        {
          availableForAssignment: !teacherProfile.availableForAssignment,
        }
      );
      setTeacherProfile(updated);
      onTeacherUpdated?.(updated);
      setFeedback({
        type: 'success',
        message: updated.availableForAssignment
          ? 'Teacher marked available for academic assignments.'
          : 'Teacher marked unavailable for new academic assignments.',
      });
    } catch (err) {
      setError(
        extractErrorMessage(
          err,
          'Failed to update teacher assignment availability.'
        )
      );
    } finally {
      setTogglingAvailability(false);
    }
  };

  const handleRemoveClassAssignment = async (
    assignment: TeacherClassAssignmentResponse
  ) => {
    const key = `${assignment.academicSessionId}-${assignment.classId}-${assignment.teacherId}`;
    setRemovingClassKey(key);
    setError(null);
    try {
      await staffManagementApi.removeTeacherFromClass(
        organizationId,
        assignment.academicSessionId,
        assignment.classId,
        assignment.teacherId
      );
      setClassAssignments((prev) =>
        prev.filter((a) => a.id !== assignment.id)
      );
      setConfirmRemoveClassKey(null);
      setFeedback({
        type: 'success',
        message: `Removed teacher from ${assignment.className || 'class'}.`,
      });
      onAssignmentsChanged?.();
    } catch (err) {
      setError(
        extractErrorMessage(err, 'Failed to remove class assignment.')
      );
    } finally {
      setRemovingClassKey(null);
    }
  };

  const handleRemoveSubjectAssignment = async (
    assignment: TeacherSubjectAssignmentResponse
  ) => {
    const key = `${assignment.academicSessionId}-${assignment.classId}-${assignment.subjectId}-${assignment.teacherId}`;
    setRemovingSubjectKey(key);
    setError(null);
    try {
      await staffManagementApi.removeTeacherFromSubject(
        organizationId,
        assignment.academicSessionId,
        assignment.classId,
        assignment.subjectId,
        assignment.teacherId
      );
      setSubjectAssignments((prev) =>
        prev.filter((a) => a.id !== assignment.id)
      );
      setConfirmRemoveSubjectKey(null);
      setFeedback({
        type: 'success',
        message: `Removed teacher from ${assignment.subjectName || 'subject'} (${assignment.className || 'class'}).`,
      });
      onAssignmentsChanged?.();
    } catch (err) {
      setError(
        extractErrorMessage(err, 'Failed to remove subject assignment.')
      );
    } finally {
      setRemovingSubjectKey(null);
    }
  };

  const handleUploadDocument = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (docInputRef.current) docInputRef.current.value = '';
    if (!file) return;

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setError('Document file size must not exceed 10 MB.');
      return;
    }
    const isDuplicate = documents.some(
      (d) =>
        d.originalFilename.toLowerCase() === file.name.toLowerCase() &&
        d.sizeBytes === file.size
    );
    if (isDuplicate) {
      setError(`A document named "${file.name}" has already been uploaded.`);
      return;
    }

    setUploadingDoc(true);
    setError(null);
    try {
      const uploaded = await staffManagementApi.uploadStaffDocument(
        organizationId,
        currentStaff.id,
        file
      );
      setDocuments((prev) => [uploaded, ...prev]);
      setFeedback({
        type: 'success',
        message: `Uploaded document "${uploaded.originalFilename}".`,
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to upload staff document.'));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (fileId: number) => {
    setDeletingDocId(fileId);
    setError(null);
    try {
      await staffManagementApi.deleteStaffDocument(
        organizationId,
        currentStaff.id,
        fileId
      );
      setDocuments((prev) => prev.filter((d) => d.id !== fileId));
      setConfirmDeleteDocId(null);
      setFeedback({
        type: 'success',
        message: 'Staff document deleted successfully.',
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to delete staff document.'));
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleUnlinkUserAccount = async () => {
    setUnlinkingUser(true);
    setError(null);
    try {
      const updated = await staffManagementApi.associateUserAccount(
        organizationId,
        currentStaff.id,
        { userId: null }
      );
      setCurrentStaff(updated);
      onStaffRefreshedRef.current?.(updated);
      setConfirmUnlinkUser(false);
      setFeedback({
        type: 'success',
        message: 'Unlinked user account from this staff profile.',
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to unlink user account.'));
    } finally {
      setUnlinkingUser(false);
    }
  };

  const handleResendInvitation = async (inv: InvitationResponse) => {
    setResendingInvId(inv.id);
    setError(null);
    try {
      const res = await staffManagementApi.resendInvitation(
        organizationId,
        inv.id
      );
      setResentLink(res.invitationLink);
      setFeedback({
        type: 'success',
        message: `Resent invitation to ${inv.email}.`,
      });
      onInvitationsChanged?.();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to resend invitation.'));
    } finally {
      setResendingInvId(null);
    }
  };

  const handleRevokeInvitation = async (inv: InvitationResponse) => {
    setRevokingInvId(inv.id);
    setError(null);
    try {
      await staffManagementApi.revokeInvitation(organizationId, inv.id);
      setFeedback({
        type: 'success',
        message: `Revoked pending invitation for ${inv.email}.`,
      });
      onInvitationsChanged?.();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to revoke invitation.'));
    } finally {
      setRevokingInvId(null);
    }
  };

  const tabs: { id: StaffDetailTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview & Employment' },
    { id: 'teacher', label: 'Qualifications & Teacher Profile' },
    ...(currentStaff.teachingStaff
      ? [
          {
            id: 'assignments' as StaffDetailTab,
            label: 'Teaching Assignments',
            count: classAssignments.length + subjectAssignments.length,
          },
        ]
      : []),
    {
      id: 'documents',
      label: 'Documents',
      count: documents.length,
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Staff 360° Profile — ${formatStaffFullName(currentStaff)}`}
      description={`${currentStaff.designation}${
        currentStaff.department ? ` • ${currentStaff.department}` : ''
      } (${currentStaff.employeeId})`}
      maxWidthClass="max-w-4xl"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {canManageStaff && !isTerminal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChangeStaffStatus(currentStaff, activeTab)}
              >
                Change Status
              </Button>
            )}
            {canManageStaff && !currentStaff.userId && !isTerminal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInviteStaff(currentStaff, activeTab)}
              >
                Invite to Workspace
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canManageStaff && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditStaff(currentStaff, activeTab)}
              >
                Edit Staff Profile
              </Button>
            )}
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {feedback && (
          <InlineAlert variant={feedback.type}>{feedback.message}</InlineAlert>
        )}
        {error && <InlineAlert variant="error">{error}</InlineAlert>}

        {/* Top Identity Banner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-xs">
              {formatStaffInitials(currentStaff)}
            </div>
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900">
                  {formatStaffFullName(currentStaff)}
                </h3>
                <IdLabel>{currentStaff.employeeId}</IdLabel>
                <Badge variant={statusBadge.variant} dot>
                  {statusBadge.label}
                </Badge>
                <Badge
                  variant={currentStaff.teachingStaff ? 'primary' : 'neutral'}
                >
                  {currentStaff.teachingStaff
                    ? 'Teaching Faculty'
                    : 'Non-Teaching Staff'}
                </Badge>
              </div>
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-800">
                  {currentStaff.designation}
                </span>
                {currentStaff.department ? ` • ${currentStaff.department}` : ''}{' '}
                •{' '}
                {EMPLOYMENT_TYPE_LABELS[currentStaff.employmentType] ||
                  currentStaff.employmentType}{' '}
                • Joined {formatDate(currentStaff.joiningDate)}
              </p>
              {teacherProfile && (
                <p className="text-xs text-indigo-700 font-medium">
                  Teacher Profile #{teacherProfile.id}
                  {teacherProfile.specialization
                    ? ` • Specialization: ${teacherProfile.specialization}`
                    : ''}
                  {teacherProfile.experienceYears !== null &&
                  teacherProfile.experienceYears !== undefined
                    ? ` • ${teacherProfile.experienceYears} yr(s) experience`
                    : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5 shrink-0 text-xs">
            {currentStaff.userId ? (
              <Badge variant="success" dot>
                Linked User Account #{currentStaff.userId}
              </Badge>
            ) : (
              <Badge variant="neutral">No Linked Login Account</Badge>
            )}
            {teacherProfile && (
              <Badge
                variant={
                  teacherProfile.availableForAssignment ? 'info' : 'warning'
                }
              >
                {teacherProfile.availableForAssignment
                  ? 'Available for Assignment'
                  : 'Assignment Paused'}
              </Badge>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex flex-wrap gap-5">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <CounterLabel count={tab.count} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        {loadingRelated && (
          <p className="text-xs text-slate-500">
            Refreshing profile, teaching assignments, and documents...
          </p>
        )}

        {/* TAB 1: OVERVIEW & EMPLOYMENT */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Employment Information */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 text-xs">
                <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">
                  Employment Information
                </h4>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Employee ID:</span>
                  <IdLabel>{currentStaff.employeeId}</IdLabel>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Designation:</span>
                  <span className="font-medium text-slate-900">
                    {currentStaff.designation}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Department:</span>
                  <span className="text-slate-800">
                    {currentStaff.department || '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Employment Type:</span>
                  <span className="text-slate-800">
                    {EMPLOYMENT_TYPE_LABELS[currentStaff.employmentType] ||
                      currentStaff.employmentType}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Employment Status:</span>
                  <Badge variant={statusBadge.variant} dot>
                    {statusBadge.label}
                  </Badge>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Joining Date:</span>
                  <span className="text-slate-800">
                    {formatDate(currentStaff.joiningDate)}
                  </span>
                </div>
                {currentStaff.leavingDate && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Leaving Date:</span>
                    <span className="font-medium text-rose-700">
                      {formatDate(currentStaff.leavingDate)}
                    </span>
                  </div>
                )}
              </div>

              {/* Personal & Biographical Information */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 text-xs">
                <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">
                  Personal &amp; Contact Details
                </h4>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Full Name:</span>
                  <span className="font-medium text-slate-900">
                    {formatStaffFullName(currentStaff)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Gender:</span>
                  <span className="text-slate-800">
                    {currentStaff.gender
                      ? GENDER_LABELS[currentStaff.gender] || currentStaff.gender
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Date of Birth:</span>
                  <span className="text-slate-800">
                    {formatDate(currentStaff.dateOfBirth)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Primary Phone:</span>
                  <span className="font-medium text-slate-900">
                    {currentStaff.phoneNumber}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Alternate Phone:</span>
                  <span className="text-slate-800">
                    {currentStaff.alternatePhoneNumber || '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Email Address:</span>
                  <span className="text-slate-800">
                    {currentStaff.email || '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Address:</span>
                  <span className="text-right text-slate-800">
                    {[
                      currentStaff.address,
                      currentStaff.city,
                      currentStaff.state,
                      currentStaff.postalCode,
                    ]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Emergency Contact */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs">
                <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">
                  Emergency Contact &amp; Notes
                </h4>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Contact Person:</span>
                  <span className="text-slate-800">
                    {currentStaff.emergencyContactName || '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Emergency Phone:</span>
                  <span className="text-slate-800">
                    {currentStaff.emergencyContactPhone || '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Relationship:</span>
                  <span className="text-slate-800">
                    {currentStaff.emergencyContactRelation || '—'}
                  </span>
                </div>
                {currentStaff.professionalNotes && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block mb-0.5">
                      Professional Notes:
                    </span>
                    <p className="text-slate-700">
                      {currentStaff.professionalNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Workspace Account & Invitations */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-semibold text-slate-900">
                    Workspace Login Account &amp; Invitations
                  </h4>
                  {canManageStaff && !currentStaff.userId && !isTerminal && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onInviteStaff(currentStaff, activeTab)}
                    >
                      + Send Invitation
                    </Button>
                  )}
                </div>

                {currentStaff.userId ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">
                        Associated Application User ID:
                      </span>
                      <Badge variant="success" dot>
                        User #{currentStaff.userId}
                      </Badge>
                    </div>
                    {canManageStaff && (
                      <div className="pt-1 flex items-center justify-end gap-2">
                        {confirmUnlinkUser ? (
                          <>
                            <span className="text-rose-700 font-medium">
                              Unlink account?
                            </span>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={unlinkingUser}
                              onClick={handleUnlinkUserAccount}
                            >
                              {unlinkingUser ? 'Unlinking...' : 'Confirm'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={unlinkingUser}
                              onClick={() => setConfirmUnlinkUser(false)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmUnlinkUser(true)}
                          >
                            Unlink Account
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500">
                    This employee record is not currently linked to an
                    application login account.
                  </p>
                )}

                {staffInvitations.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <p className="font-medium text-slate-700">
                      Invitation History:
                    </p>
                    {staffInvitations.map((inv) => {
                      const invBadge = getInvitationStatusBadge(inv.status);
                      return (
                        <div
                          key={inv.id}
                          className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-slate-900">
                                {inv.email}
                              </span>
                              <IdLabel>{inv.roleCode}</IdLabel>
                              <Badge variant={invBadge.variant}>
                                {invBadge.label}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Expires: {formatDate(inv.expiresAt)}
                            </p>
                          </div>
                          {canManageStaff && inv.status === 'PENDING' && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={resendingInvId === inv.id}
                                onClick={() => handleResendInvitation(inv)}
                              >
                                {resendingInvId === inv.id
                                  ? 'Sending...'
                                  : 'Resend'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={revokingInvId === inv.id}
                                onClick={() => handleRevokeInvitation(inv)}
                              >
                                {revokingInvId === inv.id
                                  ? 'Revoking...'
                                  : 'Revoke'}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {resentLink && (
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-2 text-[11px] space-y-1">
                        <span className="font-semibold text-indigo-900 block">
                          Latest Resent Link:
                        </span>
                        <input
                          type="text"
                          readOnly
                          value={resentLink}
                          className="w-full rounded border border-indigo-200 bg-white px-2 py-1 font-mono text-[11px]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* TAB 2: QUALIFICATIONS & TEACHER PROFILE */}
        {activeTab === 'teacher' && (
          <div className="space-y-4">
            {!currentStaff.teachingStaff || !teacherProfile ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-900">
                  {currentStaff.teachingStaff
                    ? 'Teacher Profile Not Loaded'
                    : 'Non-Teaching Staff Member'}
                </p>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {currentStaff.teachingStaff
                    ? 'This employee is marked as teaching staff. Attach or configure their professional teaching profile to manage qualifications and class/subject assignments.'
                    : 'This employee is currently classified as non-teaching/administrative staff. If they also perform teaching duties, you can enable a Teacher Profile for them without duplicating their staff record.'}
                </p>
                {canManageTeachers && !isTerminal && (
                  <div>
                    <Button
                      size="sm"
                      onClick={() => onPromoteToTeacher(currentStaff, activeTab)}
                    >
                      + Enable Teaching Profile
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      Professional Teaching Profile (Teacher #{teacherProfile.id})
                    </h4>
                    <p className="text-slate-500 mt-0.5">
                      Qualifications, subject specialization, and academic
                      assignment availability.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canManageTeachers &&
                      currentStaff.employmentStatus === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={togglingAvailability}
                          onClick={handleToggleAvailability}
                        >
                          {togglingAvailability
                            ? 'Updating...'
                            : teacherProfile.availableForAssignment
                              ? 'Pause Assignments'
                              : 'Mark Available'}
                        </Button>
                      )}
                    {canManageTeachers && (
                      <Button
                        size="sm"
                        onClick={() =>
                          onEditTeacherProfile(
                            currentStaff,
                            teacherProfile,
                            activeTab
                          )
                        }
                      >
                        Edit Qualifications
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-slate-500 block">
                      Primary Specialization
                    </span>
                    <span className="font-semibold text-slate-900 mt-1 block">
                      {teacherProfile.specialization || 'Not specified'}
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-slate-500 block">
                      Teaching Experience
                    </span>
                    <span className="font-semibold text-slate-900 mt-1 block">
                      {teacherProfile.experienceYears ?? 0} Year(s)
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <span className="text-slate-500 block">
                      Registration / License No.
                    </span>
                    <span className="font-semibold text-slate-900 mt-1 block">
                      {teacherProfile.registrationNumber || '—'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div>
                    <span className="font-semibold text-slate-700 block">
                      Academic &amp; Professional Qualifications:
                    </span>
                    <p className="mt-1 text-slate-800">
                      {teacherProfile.qualifications || 'No qualifications recorded.'}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 block">
                      Certifications &amp; Training:
                    </span>
                    <p className="mt-1 text-slate-800">
                      {teacherProfile.certifications || 'No certifications recorded.'}
                    </p>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 block">
                      Teaching Notes:
                    </span>
                    <p className="mt-1 text-slate-800">
                      {teacherProfile.teachingNotes || '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* TAB 3: TEACHING ASSIGNMENTS */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {!teacherProfile ? (
              <EmptyState
                title="Teacher profile required"
                description="Enable a teaching profile for this staff member before assigning classes or subjects."
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-medium text-slate-600">
                      Academic Session:
                    </span>
                    <select
                      value={sessionFilter}
                      onChange={(e) =>
                        setSessionFilter(
                          e.target.value ? Number(e.target.value) : ''
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                    >
                      <option value="">All Academic Sessions</option>
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  {canManageTeachers &&
                    currentStaff.employmentStatus === 'ACTIVE' &&
                    teacherProfile.availableForAssignment && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onAssignClass(
                              currentStaff,
                              teacherProfile,
                              activeTab
                            )
                          }
                        >
                          + Assign to Class
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            onAssignSubject(
                              currentStaff,
                              teacherProfile,
                              activeTab
                            )
                          }
                        >
                          + Assign Subject
                        </Button>
                      </div>
                    )}
                </div>

                {/* Assigned Classes */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-semibold text-slate-900">
                      Assigned Classes
                    </h4>
                    <CounterLabel count={filteredClassAssignments.length} />
                  </div>

                  {filteredClassAssignments.length === 0 ? (
                    <p className="text-slate-500 py-3 text-center">
                      No class assignments found for the selected academic
                      session.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredClassAssignments.map((ca) => {
                        const sess = sessionMap.get(ca.academicSessionId);
                        const isCompletedSession =
                          sess?.status === 'COMPLETED';
                        const key = `${ca.academicSessionId}-${ca.classId}-${ca.teacherId}`;
                        const confirming = confirmRemoveClassKey === key;

                        return (
                          <div
                            key={ca.id}
                            className="py-2.5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900">
                                  {ca.className || `Class #${ca.classId}`}
                                </span>
                                {ca.classCode && (
                                  <IdLabel>{ca.classCode}</IdLabel>
                                )}
                                {ca.classTeacher && (
                                  <Badge variant="primary" dot>
                                    Class Teacher
                                  </Badge>
                                )}
                                <Badge variant="neutral">
                                  {ca.academicSessionName ||
                                    `Session #${ca.academicSessionId}`}
                                </Badge>
                              </div>
                              {ca.remarks && (
                                <p className="text-slate-500">{ca.remarks}</p>
                              )}
                            </div>

                            {canManageTeachers && !isCompletedSession ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {confirming ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      disabled={removingClassKey === key}
                                      onClick={() =>
                                        handleRemoveClassAssignment(ca)
                                      }
                                    >
                                      {removingClassKey === key
                                        ? 'Removing...'
                                        : 'Confirm'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setConfirmRemoveClassKey(null)
                                      }
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
                                        onEditClassAssignment(
                                          currentStaff,
                                          teacherProfile,
                                          ca,
                                          activeTab
                                        )
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setConfirmRemoveClassKey(key)
                                      }
                                    >
                                      Remove
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : (
                              isCompletedSession && (
                                <Badge variant="neutral">Completed Session</Badge>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Assigned Subjects */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-semibold text-slate-900">
                      Assigned Subjects
                    </h4>
                    <CounterLabel count={filteredSubjectAssignments.length} />
                  </div>

                  {filteredSubjectAssignments.length === 0 ? (
                    <p className="text-slate-500 py-3 text-center">
                      No subject assignments found for the selected academic
                      session.
                    </p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredSubjectAssignments.map((sa) => {
                        const sess = sessionMap.get(sa.academicSessionId);
                        const isCompletedSession =
                          sess?.status === 'COMPLETED';
                        const key = `${sa.academicSessionId}-${sa.classId}-${sa.subjectId}-${sa.teacherId}`;
                        const confirming = confirmRemoveSubjectKey === key;

                        return (
                          <div
                            key={sa.id}
                            className="py-2.5 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900">
                                  {sa.subjectName || `Subject #${sa.subjectId}`}
                                </span>
                                {sa.subjectCode && (
                                  <IdLabel>{sa.subjectCode}</IdLabel>
                                )}
                                <span className="text-slate-600 font-medium">
                                  • {sa.className || `Class #${sa.classId}`}
                                </span>
                                <Badge variant="neutral">
                                  {sa.academicSessionName ||
                                    `Session #${sa.academicSessionId}`}
                                </Badge>
                              </div>
                              {sa.remarks && (
                                <p className="text-slate-500">{sa.remarks}</p>
                              )}
                            </div>

                            {canManageTeachers && !isCompletedSession ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {confirming ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      disabled={removingSubjectKey === key}
                                      onClick={() =>
                                        handleRemoveSubjectAssignment(sa)
                                      }
                                    >
                                      {removingSubjectKey === key
                                        ? 'Removing...'
                                        : 'Confirm'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        setConfirmRemoveSubjectKey(null)
                                      }
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
                                        onEditSubjectAssignment(
                                          currentStaff,
                                          teacherProfile,
                                          sa,
                                          activeTab
                                        )
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        setConfirmRemoveSubjectKey(key)
                                      }
                                    >
                                      Remove
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : (
                              isCompletedSession && (
                                <Badge variant="neutral">Completed Session</Badge>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Official Staff Documents &amp; Attachments
                  </h4>
                  <p className="text-slate-500 mt-0.5">
                    Upload identity documents, degree certificates, appointment
                    letters, or photographs (Max 10 MB per file).
                  </p>
                </div>

                {canManageStaff && (
                  <div>
                    <input
                      ref={docInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleUploadDocument}
                    />
                    <Button
                      size="sm"
                      disabled={uploadingDoc}
                      onClick={() => docInputRef.current?.click()}
                    >
                      {uploadingDoc ? 'Uploading...' : '+ Upload Document'}
                    </Button>
                  </div>
                )}
              </div>

              {documents.length === 0 ? (
                <EmptyState
                  title="No staff documents uploaded"
                  description="Upload qualification certificates, ID proofs, or employment documents to store them with this staff record."
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {documents.map((doc) => {
                    const downloadUrl =
                      staffManagementApi.getStaffDocumentDownloadUrl(
                        organizationId,
                        currentStaff.id,
                        doc.id
                      );
                    const confirming = confirmDeleteDocId === doc.id;

                    return (
                      <div
                        key={doc.id}
                        className="py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-semibold text-slate-900 truncate">
                            {doc.originalFilename}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {formatFileSize(doc.sizeBytes)} • {doc.contentType} •
                            Uploaded {formatDate(doc.createdAt)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Download
                          </a>

                          {canManageStaff && (
                            <>
                              {confirming ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="danger"
                                    disabled={deletingDocId === doc.id}
                                    onClick={() => handleDeleteDocument(doc.id)}
                                  >
                                    {deletingDocId === doc.id
                                      ? 'Deleting...'
                                      : 'Confirm'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setConfirmDeleteDocId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setConfirmDeleteDocId(doc.id)}
                                >
                                  Delete
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};













