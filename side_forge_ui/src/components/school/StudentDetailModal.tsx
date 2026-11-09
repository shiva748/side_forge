import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState, InlineAlert } from '../ui/StateViews';
import { ApiError } from '../../lib/api-client';
import { studentManagementApi } from '../../services/studentManagementApi';
import {
  getSessionStatusBadgeMeta,
  type AcademicSessionResponse,
} from '../../types/academicManagement';

const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, description, size = 'lg', footer, children }) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    maxWidthClass={size === 'lg' ? 'max-w-3xl' : 'max-w-xl'}
    footer={footer}
  >
    {children}
  </Dialog>
);

const AlertBanner: React.FC<{
  variant?: 'info' | 'success' | 'warning' | 'error';
  message: string;
  onDismiss?: () => void;
}> = ({ variant = 'info', message }) => (
  <InlineAlert variant={variant}>{message}</InlineAlert>
);
import {
  GENDER_LABELS,
  GUARDIAN_RELATIONSHIP_LABELS,
  formatGuardianFullName,
  formatStudentFullName,
  formatStudentInitials,
  getEnrollmentStatusBadge,
  getStudentStatusBadge,
  type StoredFileResponse,
  type StudentEnrollmentResponse,
  type StudentGuardianResponse,
  type StudentResponse,
} from '../../types/studentManagement';

export type StudentDetailTab = 'profile' | 'enrollments' | 'guardians' | 'documents';

interface StudentDetailModalProps {
  open: boolean;
  onClose: () => void;
  organizationId: number;
  student: StudentResponse | null;
  sessions?: AcademicSessionResponse[];
  initialTab?: StudentDetailTab;
  canUpdateStudent: boolean;
  canManageEnrollment: boolean;
  canManageGuardian: boolean;
  isSuspended: boolean;
  refreshTrigger?: number;
  onStudentRefreshed?: (student: StudentResponse) => void;
  onEditStudent: (student: StudentResponse, returnTab: StudentDetailTab) => void;
  onChangeStudentStatus: (student: StudentResponse, returnTab: StudentDetailTab) => void;
  onEnrollStudent: (student: StudentResponse, returnTab: StudentDetailTab) => void;
  onEditEnrollment: (
    enrollment: StudentEnrollmentResponse,
    student: StudentResponse,
    returnTab: StudentDetailTab
  ) => void;
  onChangeEnrollmentStatus: (
    enrollment: StudentEnrollmentResponse,
    student: StudentResponse,
    returnTab: StudentDetailTab
  ) => void;
  onLinkGuardian: (
    student: StudentResponse,
    linkedGuardianIds: number[],
    returnTab: StudentDetailTab
  ) => void;
  onEditGuardianLink: (
    student: StudentResponse,
    link: StudentGuardianResponse,
    returnTab: StudentDetailTab
  ) => void;
}

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

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  open,
  onClose,
  organizationId,
  student,
  sessions = [],
  initialTab = 'profile',
  canUpdateStudent,
  canManageEnrollment,
  canManageGuardian,
  isSuspended,
  refreshTrigger = 0,
  onStudentRefreshed,
  onEditStudent,
  onChangeStudentStatus,
  onEnrollStudent,
  onEditEnrollment,
  onChangeEnrollmentStatus,
  onLinkGuardian,
  onEditGuardianLink,
}) => {
  const [activeTab, setActiveTab] = useState<StudentDetailTab>(initialTab);
  const [liveStudent, setLiveStudent] = useState<StudentResponse | null>(student);
  const [enrollments, setEnrollments] = useState<StudentEnrollmentResponse[]>([]);
  const [guardians, setGuardians] = useState<StudentGuardianResponse[]>([]);
  const [documents, setDocuments] = useState<StoredFileResponse[]>([]);

  const [loadingRelated, setLoadingRelated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [photoCacheBust, setPhotoCacheBust] = useState<number>(() => Date.now());
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<number | null>(null);
  const [unlinkingGuardianId, setUnlinkingGuardianId] = useState<number | null>(null);
  const [confirmUnlinkGuardianId, setConfirmUnlinkGuardianId] = useState<number | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const onStudentRefreshedRef = useRef(onStudentRefreshed);

  useEffect(() => {
    onStudentRefreshedRef.current = onStudentRefreshed;
  }, [onStudentRefreshed]);

  useEffect(() => {
    setLiveStudent(student);
  }, [student]);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      setFeedback(null);
      setConfirmDeleteDocId(null);
      setConfirmUnlinkGuardianId(null);
      setPhotoLoadFailed(false);
      setPhotoCacheBust(Date.now());
    }
  }, [open, initialTab, student?.id]);

  const studentId = student?.id;

  const loadStudentRelatedData = useCallback(async () => {
    if (!open || !studentId) return;
    setLoadingRelated(true);
    setError(null);
    try {
      const [freshStudent, enrList, gdList, docList] = await Promise.all([
        studentManagementApi.getStudentById(organizationId, studentId),
        studentManagementApi.getStudentEnrollmentHistory(organizationId, studentId),
        studentManagementApi.listStudentGuardians(organizationId, studentId),
        studentManagementApi.listStudentDocuments(organizationId, studentId),
      ]);
      setLiveStudent(freshStudent);
      onStudentRefreshedRef.current?.(freshStudent);
      setEnrollments(enrList);
      setGuardians(gdList);
      setDocuments(docList);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Failed to load student enrollment, guardian, or document records.';
      setError(msg);
    } finally {
      setLoadingRelated(false);
    }
  }, [open, studentId, organizationId]);

  useEffect(() => {
    void loadStudentRelatedData();
  }, [loadStudentRelatedData, refreshTrigger]);

  const currentStudent = liveStudent || student;
  if (!currentStudent) return null;

  const fullName = formatStudentFullName(currentStudent);
  const statusBadge = getStudentStatusBadge(currentStudent.status);
  const photoUrl = studentManagementApi.getStudentPhotoUrl(
    organizationId,
    currentStudent.id,
    photoCacheBust
  );

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'Profile photo must not exceed 5 MB.',
      });
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }
    setUploadingPhoto(true);
    setFeedback(null);
    try {
      await studentManagementApi.uploadStudentPhoto(
        organizationId,
        currentStudent.id,
        file
      );
      setPhotoLoadFailed(false);
      setPhotoCacheBust(Date.now());
      setFeedback({
        type: 'success',
        message: 'Student profile photo uploaded successfully.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof ApiError ? err.message : 'Failed to upload profile photo.',
      });
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: 'Uploaded document must not exceed 10 MB.',
      });
      if (docInputRef.current) docInputRef.current.value = '';
      return;
    }
    const duplicate = documents.some(
      (d) =>
        d.originalFilename.toLowerCase() === file.name.toLowerCase() &&
        d.sizeBytes === file.size
    );
    if (duplicate) {
      setFeedback({
        type: 'error',
        message: `Document "${file.name}" is already attached to this student record.`,
      });
      if (docInputRef.current) docInputRef.current.value = '';
      return;
    }
    setUploadingDoc(true);
    setFeedback(null);
    try {
      const uploaded = await studentManagementApi.uploadStudentDocument(
        organizationId,
        currentStudent.id,
        file
      );
      setDocuments((prev) =>
        prev.some((d) => d.id === uploaded.id) ? prev : [uploaded, ...prev]
      );
      setFeedback({
        type: 'success',
        message: `Document "${uploaded.originalFilename}" uploaded successfully.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof ApiError ? err.message : 'Failed to upload student document.',
      });
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (doc: StoredFileResponse) => {
    setDeletingDocId(doc.id);
    setFeedback(null);
    try {
      await studentManagementApi.deleteStudentDocument(
        organizationId,
        currentStudent.id,
        doc.id
      );
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setConfirmDeleteDocId(null);
      setFeedback({
        type: 'success',
        message: `Document "${doc.originalFilename}" removed.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof ApiError ? err.message : 'Failed to delete document.',
      });
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleUnlinkGuardian = async (link: StudentGuardianResponse) => {
    setUnlinkingGuardianId(link.guardianId);
    setFeedback(null);
    try {
      await studentManagementApi.unlinkGuardianFromStudent(
        organizationId,
        currentStudent.id,
        link.guardianId
      );
      setGuardians((prev) => prev.filter((g) => g.guardianId !== link.guardianId));
      setConfirmUnlinkGuardianId(null);
      setFeedback({
        type: 'success',
        message: `Unlinked ${formatGuardianFullName(link.guardian)} from ${fullName}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof ApiError ? err.message : 'Failed to unlink guardian.',
      });
    } finally {
      setUnlinkingGuardianId(null);
    }
  };

  const initials = formatStudentInitials(currentStudent);
  const linkedGuardianIds = guardians.map((g) => g.guardianId);
  const currentActiveEnrollment = enrollments.find((e) => e.status === 'ACTIVE');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${fullName} — Student 360° Record`}
      description={`Admission #${currentStudent.admissionNumber} • Registered ${formatDate(currentStudent.admissionDate)}`}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {canUpdateStudent && !isSuspended && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditStudent(currentStudent, activeTab)}
                >
                  Edit Profile
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onChangeStudentStatus(currentStudent, activeTab)}
                >
                  Change Status
                </Button>
              </>
            )}
            {canManageEnrollment && !isSuspended && currentStudent.status === 'ACTIVE' && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => onEnrollStudent(currentStudent, activeTab)}
              >
                + Enroll in Session
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {feedback && (
          <AlertBanner
            variant={feedback.type}
            message={feedback.message}
            onDismiss={() => setFeedback(null)}
          />
        )}
        {error && <AlertBanner variant="error" message={error} />}

        {/* Top Identity Banner */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-white bg-indigo-600 text-white shadow-sm flex items-center justify-center font-bold text-lg">
              {!photoLoadFailed ? (
                <img
                  src={photoUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                  onError={() => setPhotoLoadFailed(true)}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {fullName}
                </h3>
                <Badge variant={statusBadge.variant} dot>
                  {statusBadge.label}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-600">
                <span className="font-mono font-semibold text-slate-800">
                  {currentStudent.admissionNumber}
                </span>{' '}
                • {GENDER_LABELS[currentStudent.gender] || currentStudent.gender} • DOB:{' '}
                {formatDate(currentStudent.dateOfBirth)}
              </p>
              {currentActiveEnrollment && (
                <p className="mt-1 text-xs font-medium text-indigo-700">
                  Active Placement:{' '}
                  <strong>
                    {currentActiveEnrollment.className ||
                      `Class #${currentActiveEnrollment.classId}`}
                  </strong>
                  {currentActiveEnrollment.rollNumber
                    ? ` • Roll #${currentActiveEnrollment.rollNumber}`
                    : ''}{' '}
                  ({currentActiveEnrollment.academicSessionName || 'Current Session'})
                </p>
              )}
            </div>
          </div>

          {canUpdateStudent && !isSuspended && (
            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button
                size="sm"
                variant="outline"
                isLoading={uploadingPhoto}
                onClick={() => photoInputRef.current?.click()}
              >
                {photoLoadFailed ? 'Upload Photo' : 'Change Photo'}
              </Button>
            </div>
          )}
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {(
            [
              { id: 'profile', label: 'Profile & Bio' },
              {
                id: 'enrollments',
                label: `Enrollments (${enrollments.length})`,
              },
              {
                id: 'guardians',
                label: `Guardians (${guardians.length})`,
              },
              {
                id: 'documents',
                label: `Documents (${documents.length})`,
              },
            ] as { id: StudentDetailTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`border-b-2 px-3.5 py-2 text-xs font-semibold transition-colors ${
                activeTab === t.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Profile & Bio */}
        {activeTab === 'profile' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2.5">
                <h4 className="font-semibold uppercase tracking-wider text-slate-500">
                  Personal & Admission Details
                </h4>
                <div className="grid grid-cols-2 gap-y-2 text-slate-700">
                  <span className="text-slate-500">Full Name:</span>
                  <span className="font-semibold text-slate-900">{fullName}</span>
                  <span className="text-slate-500">Admission No.:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {currentStudent.admissionNumber}
                  </span>
                  <span className="text-slate-500">Admission Date:</span>
                  <span className="font-medium text-slate-900">
                    {formatDate(currentStudent.admissionDate)}
                  </span>
                  <span className="text-slate-500">Date of Birth:</span>
                  <span className="font-medium text-slate-900">
                    {formatDate(currentStudent.dateOfBirth)}
                  </span>
                  <span className="text-slate-500">Gender:</span>
                  <span className="font-medium text-slate-900">
                    {GENDER_LABELS[currentStudent.gender] || currentStudent.gender}
                  </span>
                  <span className="text-slate-500">Blood Group:</span>
                  <span className="font-medium text-slate-900">
                    {currentStudent.bloodGroup || '—'}
                  </span>
                  <span className="text-slate-500">Nationality:</span>
                  <span className="font-medium text-slate-900">
                    {currentStudent.nationality || '—'}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2.5">
                <h4 className="font-semibold uppercase tracking-wider text-slate-500">
                  Contact & Address
                </h4>
                <div className="grid grid-cols-2 gap-y-2 text-slate-700">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-900 break-all">
                    {currentStudent.email || '—'}
                  </span>
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-medium text-slate-900">
                    {currentStudent.phoneNumber || '—'}
                  </span>
                  <span className="text-slate-500">Street Address:</span>
                  <span className="font-medium text-slate-900">
                    {currentStudent.address || '—'}
                  </span>
                  <span className="text-slate-500">City / State:</span>
                  <span className="font-medium text-slate-900">
                    {[currentStudent.city, currentStudent.state].filter(Boolean).join(', ') || '—'}
                  </span>
                  <span className="text-slate-500">Postal Code:</span>
                  <span className="font-medium text-slate-900">
                    {currentStudent.postalCode || '—'}
                  </span>
                  <span className="text-slate-500">Last Updated:</span>
                  <span className="font-medium text-slate-900">
                    {formatDate(currentStudent.updatedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold uppercase tracking-wider text-slate-500">
                  Primary & Emergency Guardian Contacts
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('guardians')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Manage Guardians ({guardians.length}) →
                </button>
              </div>
              {guardians.length === 0 ? (
                <p className="text-slate-500">
                  No parent or guardian contacts linked yet. Use the Guardians tab to link emergency and primary contacts.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {guardians.map((g) => (
                    <div
                      key={g.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {formatGuardianFullName(g.guardian)} (
                          {GUARDIAN_RELATIONSHIP_LABELS[g.relationshipType] ||
                            g.relationshipType}
                          )
                        </p>
                        <p className="text-slate-600 mt-0.5">
                          {g.guardian?.phoneNumber || '—'}
                          {g.guardian?.email ? ` • ${g.guardian.email}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {g.primaryContact && (
                          <Badge variant="success">Primary</Badge>
                        )}
                        {g.emergencyContact && (
                          <Badge variant="warning">Emergency</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Enrollment History */}
        {activeTab === 'enrollments' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Complete academic session placement timeline for {fullName}.
              </p>
              {canManageEnrollment && !isSuspended && currentStudent.status === 'ACTIVE' && (
                <Button
                  size="sm"
                  onClick={() => onEnrollStudent(currentStudent, 'enrollments')}
                >
                  + Enroll in Active Session
                </Button>
              )}
            </div>

            {loadingRelated ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Loading enrollment history...
              </p>
            ) : enrollments.length === 0 ? (
              <EmptyState
                title="No academic enrollments yet"
                description="Enroll this student into an active academic session and class to track their academic progression."
              />
            ) : (
              <div className="space-y-2.5">
                {enrollments.map((enr) => {
                  const enrBadge = getEnrollmentStatusBadge(enr.status);
                  const matchedSession = sessions.find(
                    (s) => s.id === enr.academicSessionId
                  );
                  const sessionBadge = matchedSession
                    ? getSessionStatusBadgeMeta(matchedSession.status)
                    : null;
                  return (
                    <div
                      key={enr.id}
                      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {enr.className || `Class #${enr.classId}`}
                            {enr.classCode ? ` (${enr.classCode})` : ''}
                          </span>
                          <Badge variant={enrBadge.variant} dot>
                            {enrBadge.label}
                          </Badge>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs font-medium text-slate-700">
                            {enr.academicSessionName || `Session #${enr.academicSessionId}`}
                          </span>
                          {sessionBadge && (
                            <Badge variant={sessionBadge.variant}>
                              {sessionBadge.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">
                          Roll No.:{' '}
                          <span className="font-mono font-medium text-slate-900">
                            {enr.rollNumber || 'Unassigned'}
                          </span>{' '}
                          • Enrolled on {formatDate(enr.enrollmentDate)}
                        </p>
                        {enr.remarks && (
                          <p className="text-xs text-slate-500 italic">
                            Note: {enr.remarks}
                          </p>
                        )}
                      </div>

                      {canManageEnrollment &&
                      !isSuspended &&
                      enr.status === 'ACTIVE' &&
                      matchedSession?.status !== 'COMPLETED' ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onEditEnrollment(enr, currentStudent, 'enrollments')
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              onChangeEnrollmentStatus(
                                enr,
                                currentStudent,
                                'enrollments'
                              )
                            }
                          >
                            Status
                          </Button>
                        </div>
                      ) : (
                        enr.status !== 'ACTIVE' && (
                          <span className="text-[11px] font-medium text-slate-400 shrink-0">
                            Finalized ({enrBadge.label})
                          </span>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Guardians & Contacts */}
        {activeTab === 'guardians' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Parents and legal guardians linked to {fullName}.
              </p>
              {canManageGuardian && !isSuspended && (
                <Button
                  size="sm"
                  onClick={() =>
                    onLinkGuardian(currentStudent, linkedGuardianIds, 'guardians')
                  }
                >
                  + Link Guardian
                </Button>
              )}
            </div>

            {loadingRelated ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Loading associated guardians...
              </p>
            ) : guardians.length === 0 ? (
              <EmptyState
                title="No guardians linked yet"
                description="Associate parents or legal guardians with this student for emergency contacts and school notifications."
              />
            ) : (
              <div className="space-y-2.5">
                {guardians.map((g) => (
                  <div
                    key={g.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatGuardianFullName(g.guardian)}
                        </span>
                        <Badge variant="info">
                          {GUARDIAN_RELATIONSHIP_LABELS[g.relationshipType] ||
                            g.relationshipType}
                        </Badge>
                        {g.primaryContact && (
                          <Badge variant="success">Primary Contact</Badge>
                        )}
                        {g.emergencyContact && (
                          <Badge variant="warning">Emergency</Badge>
                        )}
                        {g.receiveNotifications && (
                          <Badge variant="neutral">Notifications</Badge>
                        )}
                      </div>
                      <p className="text-slate-600">
                        Phone:{' '}
                        <span className="font-medium text-slate-900">
                          {g.guardian?.phoneNumber || '—'}
                        </span>
                        {g.guardian?.alternatePhoneNumber
                          ? ` / ${g.guardian.alternatePhoneNumber}`
                          : ''}
                        {g.guardian?.email ? ` • ${g.guardian.email}` : ''}
                        {g.guardian?.occupation ? ` • ${g.guardian.occupation}` : ''}
                      </p>
                      {g.guardian?.address && (
                        <p className="text-slate-500">
                          Address: {g.guardian.address}
                        </p>
                      )}
                    </div>

                    {canManageGuardian && !isSuspended && (
                      <div className="flex items-center gap-2 shrink-0">
                        {confirmUnlinkGuardianId === g.guardianId ? (
                          <>
                            <span className="text-xs font-medium text-rose-700">
                              Unlink guardian?
                            </span>
                            <Button
                              size="sm"
                              variant="danger"
                              isLoading={unlinkingGuardianId === g.guardianId}
                              onClick={() => handleUnlinkGuardian(g)}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={unlinkingGuardianId === g.guardianId}
                              onClick={() => setConfirmUnlinkGuardianId(null)}
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
                                onEditGuardianLink(currentStudent, g, 'guardians')
                              }
                            >
                              Edit Link
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setConfirmUnlinkGuardianId(g.guardianId)}
                            >
                              Unlink
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Documents & Files */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-600">
                  Centralized student documents (birth certificate, transfer certificate, ID proof, transcripts).
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Supported: PDF, Images, Word, Excel, CSV, TXT, ZIP (Max 10 MB per file)
                </p>
              </div>
              {canUpdateStudent && !isSuspended && (
                <div>
                  <input
                    ref={docInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                    className="hidden"
                    onChange={handleDocumentUpload}
                  />
                  <Button
                    size="sm"
                    isLoading={uploadingDoc}
                    onClick={() => docInputRef.current?.click()}
                  >
                    + Upload Document
                  </Button>
                </div>
              )}
            </div>

            {loadingRelated ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Loading student documents...
              </p>
            ) : documents.length === 0 ? (
              <EmptyState
                title="No student documents uploaded"
                description="Upload official admission documents, certificates, or identity records for secure tenant-isolated storage."
              />
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => {
                  const downloadHref =
                    studentManagementApi.getStudentDocumentDownloadUrl(
                      organizationId,
                      currentStudent.id,
                      doc.id
                    );
                  return (
                    <div
                      key={doc.id}
                      className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {doc.originalFilename}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {formatBytes(doc.sizeBytes)} • {doc.contentType} • Uploaded{' '}
                          {formatDate(doc.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={downloadHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Download
                        </a>
                        {canUpdateStudent && !isSuspended && (
                          confirmDeleteDocId === doc.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="danger"
                                isLoading={deletingDocId === doc.id}
                                onClick={() => handleDeleteDocument(doc)}
                              >
                                Confirm Delete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={deletingDocId === doc.id}
                                onClick={() => setConfirmDeleteDocId(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setConfirmDeleteDocId(doc.id)}
                            >
                              Delete
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};






