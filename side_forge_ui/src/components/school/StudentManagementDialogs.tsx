import React, { useEffect, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { InlineAlert } from '../ui/StateViews';
import {
  FormField,
  Input,
  Select,
  Textarea,
} from '../ui/FormControls';

const TextInput = Input;
const SelectInput = Select;
const TextAreaInput = Textarea;

const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, description, size = 'md', footer, children }) => (
  <Dialog
    open={open}
    onClose={onClose}
    title={title}
    description={description}
    maxWidthClass={
      size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-md' : 'max-w-lg'
    }
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

const CheckboxField: React.FC<{
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ id, label, description, checked, onChange }) => (
  <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
    />
    <span className="text-xs">
      <span className="font-semibold text-slate-800 block">{label}</span>
      {description && (
        <span className="text-slate-500 mt-0.5 block">{description}</span>
      )}
    </span>
  </label>
);
import { ApiError } from '../../lib/api-client';
import { studentManagementApi } from '../../services/studentManagementApi';
import type {
  AcademicSessionResponse,
  SchoolClassResponse,
} from '../../types/academicManagement';
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
  type GuardianRelationshipType,
  type GuardianResponse,
  type LinkStudentGuardianRequest,
  type StudentEnrollmentResponse,
  type StudentGuardianResponse,
  type StudentResponse,
  type StudentStatus,
  type UpdateEnrollmentRequest,
  type UpdateGuardianRequest,
  type UpdateStudentGuardianRequest,
  type UpdateStudentRequest,
} from '../../types/studentManagement';

function extractErrorInfo(err: unknown): {
  message: string;
  fieldErrors: Record<string, string>;
} {
  if (err instanceof ApiError) {
    return {
      message: err.message,
      fieldErrors: err.fieldErrors || {},
    };
  }
  if (err instanceof Error) {
    return { message: err.message, fieldErrors: {} };
  }
  return { message: 'An unexpected error occurred.', fieldErrors: {} };
}

function cleanOptional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

// ============================================================================
// 1. Create / Edit Student Profile Modal
// ============================================================================
interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: StudentResponse | null;
  onSubmit: (
    payload: CreateStudentRequest | UpdateStudentRequest,
    isEdit: boolean
  ) => Promise<void>;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  open,
  onClose,
  initialData,
  onSubmit,
}) => {
  const isEdit = Boolean(initialData);
  const todayIso = new Date().toISOString().slice(0, 10);

  const [admissionNumber, setAdmissionNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('MALE');
  const [admissionDate, setAdmissionDate] = useState(todayIso);
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [nationality, setNationality] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFieldErrors({});
    if (initialData) {
      setAdmissionNumber(initialData.admissionNumber);
      setFirstName(initialData.firstName);
      setMiddleName(initialData.middleName || '');
      setLastName(initialData.lastName || '');
      setDateOfBirth(initialData.dateOfBirth ? initialData.dateOfBirth.slice(0, 10) : '');
      setGender(initialData.gender);
      setAdmissionDate(
        initialData.admissionDate ? initialData.admissionDate.slice(0, 10) : todayIso
      );
      setEmail(initialData.email || '');
      setPhoneNumber(initialData.phoneNumber || '');
      setBloodGroup(initialData.bloodGroup || '');
      setNationality(initialData.nationality || '');
      setAddress(initialData.address || '');
      setCity(initialData.city || '');
      setState(initialData.state || '');
      setPostalCode(initialData.postalCode || '');
    } else {
      setAdmissionNumber('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setDateOfBirth('');
      setGender('MALE');
      setAdmissionDate(todayIso);
      setEmail('');
      setPhoneNumber('');
      setBloodGroup('');
      setNationality('');
      setAddress('');
      setCity('');
      setState('');
      setPostalCode('');
    }
  }, [open, initialData, todayIso]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const localErrors: Record<string, string> = {};
    const trimmedAdmNo = admissionNumber.trim().toUpperCase();
    const trimmedFirst = firstName.trim();
    const trimmedEmail = cleanOptional(email);

    if (!trimmedAdmNo) {
      localErrors.admissionNumber = 'Admission number is required.';
    } else if (trimmedAdmNo.length > 50) {
      localErrors.admissionNumber = 'Admission number must not exceed 50 characters.';
    }
    if (!trimmedFirst) {
      localErrors.firstName = 'First name is required.';
    } else if (trimmedFirst.length > 100) {
      localErrors.firstName = 'First name must not exceed 100 characters.';
    }
    if (!dateOfBirth) {
      localErrors.dateOfBirth = 'Date of birth is required.';
    } else if (dateOfBirth >= todayIso) {
      localErrors.dateOfBirth = 'Date of birth must be in the past.';
    }
    if (!admissionDate) {
      localErrors.admissionDate = 'Admission date is required.';
    } else if (dateOfBirth && admissionDate < dateOfBirth) {
      localErrors.admissionDate = 'Admission date cannot be earlier than date of birth.';
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      localErrors.email = 'Invalid email address.';
    }
    if (postalCode.trim().length > 10) {
      localErrors.postalCode = 'Postal code must not exceed 10 characters.';
    }
    if (phoneNumber.trim().length > 20) {
      localErrors.phoneNumber = 'Phone number must not exceed 20 characters.';
    }
    if (nationality.trim().length > 60) {
      localErrors.nationality = 'Nationality must not exceed 60 characters.';
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    const payload: CreateStudentRequest & UpdateStudentRequest = {
      admissionNumber: trimmedAdmNo,
      firstName: trimmedFirst,
      middleName: cleanOptional(middleName),
      lastName: cleanOptional(lastName),
      dateOfBirth,
      gender,
      admissionDate,
      email: trimmedEmail,
      phoneNumber: cleanOptional(phoneNumber),
      bloodGroup: cleanOptional(bloodGroup),
      nationality: cleanOptional(nationality),
      address: cleanOptional(address),
      city: cleanOptional(city),
      state: cleanOptional(state),
      postalCode: cleanOptional(postalCode),
      userId: initialData?.userId ?? null,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload, isEdit);
    } catch (err) {
      const info = extractErrorInfo(err);
      setError(info.message);
      setFieldErrors(info.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Student Profile' : 'Register New Student'}
      description={
        isEdit
          ? `Update biographical, contact, and residential details for ${formatStudentFullName(initialData)} (${initialData?.admissionNumber}).`
          : 'Create a permanent student admission profile within your school directory.'
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="student-profile-form" isLoading={submitting}>
            {isEdit ? 'Save Changes' : 'Register Student'}
          </Button>
        </>
      }
    >
      <form id="student-profile-form" onSubmit={handleSubmit} className="space-y-5">
        {error && <AlertBanner variant="error" message={error} />}

        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Admission & Core Identity
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              label="Admission Number"
              htmlFor="st-admission-number"
              required
              error={fieldErrors.admissionNumber}
              hint="Unique school ID (e.g. ADM-2026-001)"
            >
              <TextInput
                id="st-admission-number"
                value={admissionNumber}
                maxLength={50}
                onChange={(e) => setAdmissionNumber(e.target.value.toUpperCase())}
                placeholder="e.g. ADM-2026-001"
                hasError={Boolean(fieldErrors.admissionNumber)}
              />
            </FormField>

            <FormField
              label="Admission Date"
              htmlFor="st-admission-date"
              required
              error={fieldErrors.admissionDate}
            >
              <TextInput
                id="st-admission-date"
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                hasError={Boolean(fieldErrors.admissionDate)}
              />
            </FormField>

            <FormField
              label="Gender"
              htmlFor="st-gender"
              required
              error={fieldErrors.gender}
            >
              <SelectInput
                id="st-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                hasError={Boolean(fieldErrors.gender)}
              >
                {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
                  <option key={g} value={g}>
                    {GENDER_LABELS[g]}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              label="First Name"
              htmlFor="st-first-name"
              required
              error={fieldErrors.firstName}
            >
              <TextInput
                id="st-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                hasError={Boolean(fieldErrors.firstName)}
              />
            </FormField>

            <FormField
              label="Middle Name"
              htmlFor="st-middle-name"
              error={fieldErrors.middleName}
            >
              <TextInput
                id="st-middle-name"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Optional"
                hasError={Boolean(fieldErrors.middleName)}
              />
            </FormField>

            <FormField
              label="Last Name"
              htmlFor="st-last-name"
              error={fieldErrors.lastName}
            >
              <TextInput
                id="st-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name / surname"
                hasError={Boolean(fieldErrors.lastName)}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField
              label="Date of Birth"
              htmlFor="st-dob"
              required
              error={fieldErrors.dateOfBirth}
            >
              <TextInput
                id="st-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                hasError={Boolean(fieldErrors.dateOfBirth)}
              />
            </FormField>

            <FormField
              label="Blood Group"
              htmlFor="st-blood-group"
              error={fieldErrors.bloodGroup}
            >
              <SelectInput
                id="st-blood-group"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
              >
                <option value="">Not specified</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField
              label="Nationality"
              htmlFor="st-nationality"
              error={fieldErrors.nationality}
            >
              <TextInput
                id="st-nationality"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="e.g. Indian"
              />
            </FormField>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Contact & Residential Address
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Student Email"
              htmlFor="st-email"
              error={fieldErrors.email}
            >
              <TextInput
                id="st-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@school.edu (optional)"
                hasError={Boolean(fieldErrors.email)}
              />
            </FormField>

            <FormField
              label="Phone Number"
              htmlFor="st-phone"
              error={fieldErrors.phoneNumber}
            >
              <TextInput
                id="st-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 / +91 contact number (optional)"
                hasError={Boolean(fieldErrors.phoneNumber)}
              />
            </FormField>
          </div>

          <FormField
            label="Street Address"
            htmlFor="st-address"
            error={fieldErrors.address}
          >
            <TextInput
              id="st-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House/Apartment, Street, Locality"
              hasError={Boolean(fieldErrors.address)}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="City" htmlFor="st-city" error={fieldErrors.city}>
              <TextInput
                id="st-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
              />
            </FormField>

            <FormField label="State / Province" htmlFor="st-state" error={fieldErrors.state}>
              <TextInput
                id="st-state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
              />
            </FormField>

            <FormField label="Postal Code" htmlFor="st-postal" error={fieldErrors.postalCode}>
              <TextInput
                id="st-postal"
                value={postalCode}
                maxLength={10}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="ZIP / PIN"
                hasError={Boolean(fieldErrors.postalCode)}
              />
            </FormField>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// ============================================================================
// 2. Change Student Status Modal
// ============================================================================
interface StudentStatusModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentResponse | null;
  onSubmit: (payload: ChangeStudentStatusRequest) => Promise<void>;
}

export const StudentStatusModal: React.FC<StudentStatusModalProps> = ({
  open,
  onClose,
  student,
  onSubmit,
}) => {
  const [status, setStatus] = useState<StudentStatus>('ACTIVE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !student) return;
    setError(null);
    setStatus(student.status);
  }, [open, student]);

  if (!student) return null;

  const currentBadge = getStudentStatusBadge(student.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ status });
    } catch (err) {
      const info = extractErrorInfo(err);
      setError(info.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Student Status"
      description={`Update admission lifecycle status for ${formatStudentFullName(student)} (${student.admissionNumber}).`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="student-status-form"
            isLoading={submitting}
            disabled={status === student.status}
          >
            Update Status
          </Button>
        </>
      }
    >
      <form id="student-status-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertBanner variant="error" message={error} />}

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
          <span className="font-medium text-slate-600">Current Status:</span>
          <Badge variant={currentBadge.variant} dot>
            {currentBadge.label}
          </Badge>
        </div>

        <FormField label="New Student Status" htmlFor="st-new-status" required>
          <SelectInput
            id="st-new-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StudentStatus)}
          >
            {(Object.keys(STUDENT_STATUS_META) as StudentStatus[]).map((st) => (
              <option key={st} value={st}>
                {STUDENT_STATUS_META[st].label}
                {st === student.status ? ' (Current)' : ''}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-600 space-y-1.5">
          <p>{STUDENT_STATUS_META[status]?.description}</p>
          {status !== 'ACTIVE' && student.status === 'ACTIVE' && (
            <p className="text-amber-700 font-medium">
              Note: Only ACTIVE students can be enrolled into new academic sessions.
            </p>
          )}
          {status === 'ACTIVE' && student.status !== 'ACTIVE' && (
            <p className="text-indigo-700 font-medium">
              Note: Reactivating a student verifies your organization&apos;s active student subscription capacity.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
};

// ============================================================================
// 3. Enroll Student / Edit Enrollment Modal (with Debounced Server-Side Search)
// ============================================================================
interface EnrollmentFormModalProps {
  open: boolean;
  onClose: () => void;
  organizationId?: number;
  initialData?: StudentEnrollmentResponse | null;
  preselectedStudent?: StudentResponse | null;
  availableStudents?: StudentResponse[];
  sessions: AcademicSessionResponse[];
  classes: SchoolClassResponse[];
  defaultSessionId?: number | '';
  onSwitchToEditEnrollment?: (enrollment: StudentEnrollmentResponse) => void;
  onSubmit: (
    payload: CreateEnrollmentRequest | UpdateEnrollmentRequest,
    isEdit: boolean
  ) => Promise<void>;
}

export const EnrollmentFormModal: React.FC<EnrollmentFormModalProps> = ({
  open,
  onClose,
  organizationId,
  initialData,
  preselectedStudent,
  sessions,
  classes,
  defaultSessionId,
  onSwitchToEditEnrollment,
  onSubmit,
}) => {
  const isEdit = Boolean(initialData);
  const todayIso = new Date().toISOString().slice(0, 10);

  // Backend StudentEnrollmentService allows enrolling into any non-COMPLETED session (ACTIVE preferred first)
  const eligibleSessions = React.useMemo(
    () =>
      [...sessions]
        .filter((s) => s.status !== 'COMPLETED')
        .sort((a, b) => {
          if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
          if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
          return a.name.localeCompare(b.name);
        }),
    [sessions]
  );
  const activeClasses = React.useMemo(
    () => classes.filter((c) => c.active),
    [classes]
  );

  // Selected student state (either preselected from profile or chosen via server-side search)
  const [selectedStudent, setSelectedStudent] = useState<StudentResponse | null>(
    null
  );
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [debouncedStudentQuery, setDebouncedStudentQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentResponse[]>([]);
  const [searchTotalElements, setSearchTotalElements] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchPage, setSearchPage] = useState(0);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchRetryTick, setSearchRetryTick] = useState(0);

  // Student's existing enrollments to proactively prevent duplicate session enrollment
  const [studentExistingEnrollments, setStudentExistingEnrollments] = useState<
    StudentEnrollmentResponse[]
  >([]);
  const [checkingExistingEnrollments, setCheckingExistingEnrollments] =
    useState(false);

  const [academicSessionId, setAcademicSessionId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [rollNumber, setRollNumber] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState(todayIso);
  const [remarks, setRemarks] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Debounce the student search query (300ms)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedStudentQuery(studentSearchQuery.trim());
      setSearchPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [studentSearchQuery]);

  // Server-side search for eligible (ACTIVE) students when no student is selected yet
  useEffect(() => {
    if (!open || isEdit || preselectedStudent || selectedStudent || !organizationId) {
      return;
    }
    let cancelled = false;
    setSearchingStudents(true);
    setSearchError(null);
    studentManagementApi
      .listStudents(organizationId, {
        search: debouncedStudentQuery || undefined,
        status: 'ACTIVE',
        page: searchPage,
        size: 6,
        sortBy: 'firstName',
        sortDir: 'asc',
      })
      .then((res) => {
        if (!cancelled) {
          setSearchResults(res.content || []);
          setSearchTotalElements(res.totalElements || 0);
          setSearchTotalPages(res.totalPages || 0);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSearchError(
            err instanceof ApiError
              ? err.message
              : 'Unable to search active students. Please try again.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearchingStudents(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    isEdit,
    preselectedStudent,
    selectedStudent,
    organizationId,
    debouncedStudentQuery,
    searchPage,
    searchRetryTick,
  ]);

  // Fetch existing enrollments for the selected/preselected student to prevent duplicate enrollment
  const effectiveStudent = preselectedStudent || selectedStudent;
  useEffect(() => {
    if (!open || isEdit || !effectiveStudent || !organizationId) {
      setStudentExistingEnrollments([]);
      return;
    }
    let cancelled = false;
    setCheckingExistingEnrollments(true);
    studentManagementApi
      .getStudentEnrollmentHistory(organizationId, effectiveStudent.id)
      .then((history) => {
        if (!cancelled) {
          setStudentExistingEnrollments(history || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStudentExistingEnrollments([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCheckingExistingEnrollments(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, isEdit, effectiveStudent?.id, organizationId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFieldErrors({});
    setStudentSearchQuery('');
    setDebouncedStudentQuery('');
    setSearchPage(0);
    if (initialData) {
      setSelectedStudent(initialData.student || null);
      setAcademicSessionId(String(initialData.academicSessionId));
      setClassId(String(initialData.classId));
      setRollNumber(initialData.rollNumber || '');
      setEnrollmentDate(
        initialData.enrollmentDate ? initialData.enrollmentDate.slice(0, 10) : todayIso
      );
      setRemarks(initialData.remarks || '');
    } else {
      setSelectedStudent(preselectedStudent || null);
      const initialSession =
        defaultSessionId &&
        eligibleSessions.some((s) => s.id === Number(defaultSessionId))
          ? String(defaultSessionId)
          : eligibleSessions[0]
            ? String(eligibleSessions[0].id)
            : '';
      setAcademicSessionId(initialSession);
      setClassId(activeClasses[0] ? String(activeClasses[0].id) : '');
      setRollNumber('');
      setEnrollmentDate(todayIso);
      setRemarks('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.id, preselectedStudent?.id, defaultSessionId]);

  const conflictingEnrollment = React.useMemo(() => {
    if (isEdit || !academicSessionId) return null;
    const sessionNum = Number(academicSessionId);
    return (
      studentExistingEnrollments.find(
        (enr) => enr.academicSessionId === sessionNum
      ) || null
    );
  }, [isEdit, academicSessionId, studentExistingEnrollments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const localErrors: Record<string, string> = {};
    if (!isEdit && !effectiveStudent) {
      localErrors.studentId = 'Please search and select an active student to enroll.';
    }
    if (!isEdit && !academicSessionId) {
      localErrors.academicSessionId = 'Please select an academic session.';
    }
    if (!isEdit && conflictingEnrollment) {
      localErrors.academicSessionId =
        'This student is already enrolled in the selected academic session.';
    }
    if (!classId) {
      localErrors.classId = 'Please select a school class.';
    }
    const studentDob = effectiveStudent?.dateOfBirth?.slice(0, 10);
    if (enrollmentDate && studentDob && enrollmentDate < studentDob) {
      localErrors.enrollmentDate =
        'Enrollment date cannot be earlier than the student date of birth.';
    }

    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        const updatePayload: UpdateEnrollmentRequest = {
          classId: Number(classId),
          rollNumber: cleanOptional(rollNumber),
          enrollmentDate: enrollmentDate || null,
          remarks: cleanOptional(remarks),
        };
        await onSubmit(updatePayload, true);
      } else {
        const createPayload: CreateEnrollmentRequest = {
          studentId: effectiveStudent!.id,
          academicSessionId: Number(academicSessionId),
          classId: Number(classId),
          rollNumber: cleanOptional(rollNumber),
          enrollmentDate: enrollmentDate || null,
          remarks: cleanOptional(remarks),
        };
        await onSubmit(createPayload, false);
      }
    } catch (err) {
      const info = extractErrorInfo(err);
      setError(info.message);
      setFieldErrors(info.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Academic Enrollment' : 'Enroll Student in Academic Session'}
      description={
        isEdit
          ? `Modify class assignment or roll number for ${formatStudentFullName(initialData?.student)} in ${initialData?.academicSessionName || 'Session'}.`
          : 'Search and select an eligible active student, then assign their academic session and class placement.'
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="enrollment-form"
            isLoading={submitting}
            disabled={
              (!isEdit && eligibleSessions.length === 0) ||
              (!isEdit && !effectiveStudent) ||
              (!isEdit && Boolean(conflictingEnrollment)) ||
              checkingExistingEnrollments
            }
          >
            {isEdit ? 'Save Enrollment' : 'Enroll Student'}
          </Button>
        </>
      }
    >
      <form id="enrollment-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertBanner variant="error" message={error} />}

        {!isEdit && eligibleSessions.length === 0 && (
          <AlertBanner
            variant="warning"
            message="No eligible academic session found. Please create or activate an academic session in Academic Management before enrolling students."
          />
        )}

        {/* STEP 1: Student Selection / Confirmation */}
        {isEdit ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Student:</span>
              <span className="font-semibold text-slate-900">
                {formatStudentFullName(initialData?.student)} (
                {initialData?.student?.admissionNumber || `#${initialData?.studentId}`})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Academic Session:</span>
              <span className="font-medium text-slate-800">
                {initialData?.academicSessionName || `Session #${initialData?.academicSessionId}`}
              </span>
            </div>
          </div>
        ) : effectiveStudent ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 text-xs space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {formatStudentInitials(effectiveStudent)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">
                      {formatStudentFullName(effectiveStudent)}
                    </span>
                    <Badge
                      variant={getStudentStatusBadge(effectiveStudent.status).variant}
                      dot
                    >
                      {getStudentStatusBadge(effectiveStudent.status).label}
                    </Badge>
                  </div>
                  <p className="text-slate-600 mt-0.5">
                    <span className="font-mono font-semibold text-slate-800">
                      {effectiveStudent.admissionNumber}
                    </span>{' '}
                    • {GENDER_LABELS[effectiveStudent.gender] || effectiveStudent.gender} • DOB:{' '}
                    {effectiveStudent.dateOfBirth?.slice(0, 10)}
                    {effectiveStudent.phoneNumber
                      ? ` • ${effectiveStudent.phoneNumber}`
                      : ''}
                  </p>
                </div>
              </div>
              {!preselectedStudent && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedStudent(null);
                    setStudentExistingEnrollments([]);
                  }}
                >
                  Change Student
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="enr-student-search"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                1. Find &amp; Select Eligible Student (Active Only) *
              </label>
              <span className="text-[11px] text-slate-500">
                {searchTotalElements} active student(s)
              </span>
            </div>

            <div className="relative">
              <TextInput
                id="enr-student-search"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="Type student name or admission number (e.g. ADM-2026)..."
                hasError={Boolean(fieldErrors.studentId)}
              />
              {studentSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStudentSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {fieldErrors.studentId && (
              <p className="text-xs text-rose-600">{fieldErrors.studentId}</p>
            )}

            {searchingStudents ? (
              <div className="rounded-lg border border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
                Searching active students...
              </div>
            ) : searchError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center justify-between">
                <span>{searchError}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSearchRetryTick((t) => t + 1)}
                >
                  Retry
                </Button>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white py-5 px-3 text-center text-xs text-slate-500">
                {debouncedStudentQuery
                  ? `No active students found matching "${debouncedStudentQuery}".`
                  : 'No active students found in this organization. Register an active student first.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white max-h-56 overflow-y-auto">
                {searchResults.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(st);
                      setFieldErrors((prev) => ({ ...prev, studentId: '' }));
                    }}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-indigo-50/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                        {formatStudentInitials(st)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {formatStudentFullName(st)}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          <span className="font-mono font-medium text-slate-700">
                            {st.admissionNumber}
                          </span>{' '}
                          • {GENDER_LABELS[st.gender] || st.gender} • DOB:{' '}
                          {st.dateOfBirth?.slice(0, 10)}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            )}

            {searchTotalPages > 1 && (
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600">
                <span>
                  Page {searchPage + 1} of {searchTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={searchPage <= 0 || searchingStudents}
                    onClick={() => setSearchPage((p) => Math.max(0, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      searchPage + 1 >= searchTotalPages || searchingStudents
                    }
                    onClick={() => setSearchPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Duplicate Enrollment Warning */}
        {!isEdit && conflictingEnrollment && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-2">
            <div className="font-semibold">
              Already Enrolled in Selected Academic Session
            </div>
            <p className="text-amber-800">
              <strong>{formatStudentFullName(effectiveStudent)}</strong> is already
              enrolled in{' '}
              <strong>
                {conflictingEnrollment.academicSessionName || 'this session'}
              </strong>{' '}
              (Class:{' '}
              <strong>
                {conflictingEnrollment.className ||
                  `#${conflictingEnrollment.classId}`}
              </strong>
              , Roll:{' '}
              <strong>{conflictingEnrollment.rollNumber || 'Unassigned'}</strong>,
              Status: <strong>{conflictingEnrollment.status}</strong>). A student
              can only have one enrollment per academic session.
            </p>
            {conflictingEnrollment.status === 'ACTIVE' &&
              onSwitchToEditEnrollment && (
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onSwitchToEditEnrollment({
                        ...conflictingEnrollment,
                        student:
                          conflictingEnrollment.student || effectiveStudent || null,
                      })
                    }
                  >
                    Edit Existing Placement Instead →
                  </Button>
                </div>
              )}
          </div>
        )}

        {!isEdit && (
          <FormField
            label="Academic Session"
            htmlFor="enr-session"
            required
            error={fieldErrors.academicSessionId}
            hint="Completed sessions cannot accept new enrollments"
          >
            <SelectInput
              id="enr-session"
              value={academicSessionId}
              onChange={(e) => setAcademicSessionId(e.target.value)}
              hasError={Boolean(fieldErrors.academicSessionId)}
              disabled={eligibleSessions.length === 0}
            >
              <option value="">Select academic session...</option>
              {eligibleSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </SelectInput>
          </FormField>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="School Class"
            htmlFor="enr-class"
            required
            error={fieldErrors.classId}
          >
            <SelectInput
              id="enr-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              hasError={Boolean(fieldErrors.classId)}
            >
              <option value="">Select class...</option>
              {activeClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </SelectInput>
          </FormField>

          <FormField
            label="Roll Number"
            htmlFor="enr-roll"
            error={fieldErrors.rollNumber}
            hint="Unique within session & class"
          >
            <TextInput
              id="enr-roll"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="e.g. 01 or R-101"
              hasError={Boolean(fieldErrors.rollNumber)}
            />
          </FormField>
        </div>

        <FormField
          label="Enrollment Date"
          htmlFor="enr-date"
          error={fieldErrors.enrollmentDate}
        >
          <TextInput
            id="enr-date"
            type="date"
            value={enrollmentDate}
            onChange={(e) => setEnrollmentDate(e.target.value)}
            hasError={Boolean(fieldErrors.enrollmentDate)}
          />
        </FormField>

        <FormField label="Remarks" htmlFor="enr-remarks" error={fieldErrors.remarks}>
          <TextAreaInput
            id="enr-remarks"
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional admission or class placement notes"
          />
        </FormField>
      </form>
    </Modal>
  );
};

// ============================================================================
// 4. Change Enrollment Status Modal
// ============================================================================
interface EnrollmentStatusModalProps {
  open: boolean;
  onClose: () => void;
  enrollment: StudentEnrollmentResponse | null;
  onSubmit: (payload: ChangeEnrollmentStatusRequest) => Promise<void>;
}

export const EnrollmentStatusModal: React.FC<EnrollmentStatusModalProps> = ({
  open,
  onClose,
  enrollment,
  onSubmit,
}) => {
  const [status, setStatus] = useState<EnrollmentStatus>('PROMOTED');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableTargetStatuses = React.useMemo(
    () =>
      (Object.keys(ENROLLMENT_STATUS_META) as EnrollmentStatus[]).filter(
        (st) => st !== enrollment?.status
      ),
    [enrollment?.status]
  );

  useEffect(() => {
    if (!open || !enrollment) return;
    setError(null);
    setStatus(availableTargetStatuses[0] || 'PROMOTED');
    setRemarks(enrollment.remarks || '');
  }, [open, enrollment, availableTargetStatuses]);

  if (!enrollment) return null;

  const currentBadge = getEnrollmentStatusBadge(enrollment.status);
  const isHistorical = enrollment.status !== 'ACTIVE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        status,
        remarks: cleanOptional(remarks),
      });
    } catch (err) {
      const info = extractErrorInfo(err);
      setError(info.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Enrollment Status"
      description={`Update enrollment status for ${formatStudentFullName(enrollment.student)} in ${enrollment.academicSessionName || 'Session'} (${enrollment.className || 'Class'}).`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="enrollment-status-form"
            isLoading={submitting}
            disabled={isHistorical || status === enrollment.status}
          >
            Update Enrollment Status
          </Button>
        </>
      }
    >
      <form id="enrollment-status-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertBanner variant="error" message={error} />}

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs">
          <span className="font-medium text-slate-600">Current Enrollment Status:</span>
          <Badge variant={currentBadge.variant} dot>
            {currentBadge.label}
          </Badge>
        </div>

        {isHistorical ? (
          <AlertBanner
            variant="warning"
            message={`This enrollment is already in historical status (${enrollment.status}) and cannot be transitioned again.`}
          />
        ) : (
          <>
            <FormField label="New Enrollment Status" htmlFor="enr-new-status" required>
              <SelectInput
                id="enr-new-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EnrollmentStatus)}
              >
                {availableTargetStatuses.map((st) => (
                  <option key={st} value={st}>
                    {ENROLLMENT_STATUS_META[st].label}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-slate-700 space-y-1">
              <p className="font-medium text-slate-900">
                {ENROLLMENT_STATUS_META[status]?.description}
              </p>
              <p className="text-amber-800">
                Important: Transitioning an enrollment out of ACTIVE finalizes this session placement. Historical enrollments cannot be modified or transitioned again.
              </p>
            </div>

            <FormField label="Remarks" htmlFor="enr-status-remarks">
              <TextAreaInput
                id="enr-status-remarks"
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional remarks for this academic enrollment status change"
              />
            </FormField>
          </>
        )}
      </form>
    </Modal>
  );
};

// ============================================================================
// 5. Create / Edit Guardian Modal
// ============================================================================
interface GuardianFormModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: GuardianResponse | null;
  existingGuardians?: GuardianResponse[];
  onSubmit: (
    payload: CreateGuardianRequest | UpdateGuardianRequest,
    isEdit: boolean
  ) => Promise<void>;
}

export const GuardianFormModal: React.FC<GuardianFormModalProps> = ({
  open,
  onClose,
  initialData,
  existingGuardians = [],
  onSubmit,
}) => {
  const isEdit = Boolean(initialData);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [alternatePhoneNumber, setAlternatePhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setError(null);
    setFieldErrors({});
    if (initialData) {
      setFirstName(initialData.firstName);
      setLastName(initialData.lastName || '');
      setPhoneNumber(initialData.phoneNumber);
      setAlternatePhoneNumber(initialData.alternatePhoneNumber || '');
      setEmail(initialData.email || '');
      setOccupation(initialData.occupation || '');
      setAddress(initialData.address || '');
    } else {
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setAlternatePhoneNumber('');
      setEmail('');
      setOccupation('');
      setAddress('');
    }
  }, [open, initialData]);

  const potentialDuplicateGuardian = React.useMemo(() => {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const cleanMail = email.trim().toLowerCase();
    if (!cleanPhone && !cleanMail) return null;
    return (
      existingGuardians.find((g) => {
        if (initialData && g.id === initialData.id) return false;
        const gPhone = (g.phoneNumber || '').replace(/\D/g, '');
        const gMail = (g.email || '').trim().toLowerCase();
        const phoneMatch = cleanPhone.length >= 7 && gPhone === cleanPhone;
        const mailMatch = cleanMail.length > 3 && gMail === cleanMail;
        return phoneMatch || mailMatch;
      }) || null
    );
  }, [existingGuardians, initialData, phoneNumber, email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const localErrors: Record<string, string> = {};
    const trimmedEmail = cleanOptional(email);
    if (!firstName.trim()) localErrors.firstName = 'First name is required.';
    if (!phoneNumber.trim()) localErrors.phoneNumber = 'Primary phone number is required.';
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      localErrors.email = 'Invalid email address.';
    }
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    const payload: CreateGuardianRequest & UpdateGuardianRequest = {
      firstName: firstName.trim(),
      lastName: cleanOptional(lastName),
      phoneNumber: phoneNumber.trim(),
      alternatePhoneNumber: cleanOptional(alternatePhoneNumber),
      email: trimmedEmail,
      occupation: cleanOptional(occupation),
      address: cleanOptional(address),
      userId: initialData?.userId ?? null,
    };

    setSubmitting(true);
    try {
      await onSubmit(payload, isEdit);
    } catch (err) {
      const info = extractErrorInfo(err);
      setError(info.message);
      setFieldErrors(info.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Guardian Profile' : 'Add New Guardian'}
      description={
        isEdit
          ? `Update contact and residential details for ${formatGuardianFullName(initialData)}.`
          : 'Create a reusable parent or legal guardian profile in your school directory.'
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="guardian-form" isLoading={submitting}>
            {isEdit ? 'Save Guardian' : 'Create Guardian'}
          </Button>
        </>
      }
    >
      <form id="guardian-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertBanner variant="error" message={error} />}

        {potentialDuplicateGuardian && (
          <AlertBanner
            variant="warning"
            message={`Possible duplicate guardian: "${formatGuardianFullName(
              potentialDuplicateGuardian
            )}" (${potentialDuplicateGuardian.phoneNumber}) already uses this phone number or email in your directory. One guardian record can be linked to multiple students.`}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="First Name"
            htmlFor="gd-first"
            required
            error={fieldErrors.firstName}
          >
            <TextInput
              id="gd-first"
              value={firstName}
              maxLength={100}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              hasError={Boolean(fieldErrors.firstName)}
            />
          </FormField>

          <FormField label="Last Name" htmlFor="gd-last" error={fieldErrors.lastName}>
            <TextInput
              id="gd-last"
              value={lastName}
              maxLength={100}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Primary Phone Number"
            htmlFor="gd-phone"
            required
            error={fieldErrors.phoneNumber}
          >
            <TextInput
              id="gd-phone"
              value={phoneNumber}
              maxLength={20}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 / +91 mobile number"
              hasError={Boolean(fieldErrors.phoneNumber)}
            />
          </FormField>

          <FormField
            label="Alternate Phone Number"
            htmlFor="gd-alt-phone"
            error={fieldErrors.alternatePhoneNumber}
          >
            <TextInput
              id="gd-alt-phone"
              value={alternatePhoneNumber}
              maxLength={20}
              onChange={(e) => setAlternatePhoneNumber(e.target.value)}
              placeholder="Optional secondary number"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Email Address" htmlFor="gd-email" error={fieldErrors.email}>
            <TextInput
              id="gd-email"
              type="email"
              value={email}
              maxLength={255}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              hasError={Boolean(fieldErrors.email)}
            />
          </FormField>

          <FormField
            label="Occupation / Profession"
            htmlFor="gd-occupation"
            error={fieldErrors.occupation}
          >
            <TextInput
              id="gd-occupation"
              value={occupation}
              maxLength={100}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="e.g. Engineer, Physician, Business"
            />
          </FormField>
        </div>

        <FormField label="Residential Address" htmlFor="gd-address" error={fieldErrors.address}>
          <TextInput
            id="gd-address"
            value={address}
            maxLength={500}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="House/Apartment, Street, City, PIN"
          />
        </FormField>
      </form>
    </Modal>
  );
};

// ============================================================================
// 6. Link Guardian to Student / Edit Student-Guardian Relationship Modal
// ============================================================================
interface LinkGuardianModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentResponse | null;
  initialLink?: StudentGuardianResponse | null;
  availableGuardians: GuardianResponse[];
  linkedGuardianIds: number[];
  onOpenCreateGuardian?: () => void;
  onSubmit: (
    payload: LinkStudentGuardianRequest | UpdateStudentGuardianRequest,
    isEdit: boolean,
    guardianId: number
  ) => Promise<void>;
}

export const LinkGuardianModal: React.FC<LinkGuardianModalProps> = ({
  open,
  onClose,
  student,
  initialLink,
  availableGuardians,
  linkedGuardianIds,
  onOpenCreateGuardian,
  onSubmit,
}) => {
  const isEdit = Boolean(initialLink);

  const [guardianId, setGuardianId] = useState<string>('');
  const [guardianFilter, setGuardianFilter] = useState<string>('');
  const [relationshipType, setRelationshipType] =
    useState<GuardianRelationshipType>('FATHER');
  const [primaryContact, setPrimaryContact] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState(true);
  const [receiveNotifications, setReceiveNotifications] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlinkedActiveGuardians = React.useMemo(
    () =>
      availableGuardians.filter(
        (g) => g.active && !linkedGuardianIds.includes(g.id)
      ),
    [availableGuardians, linkedGuardianIds]
  );

  const filteredUnlinkedGuardians = React.useMemo(() => {
    const q = guardianFilter.trim().toLowerCase();
    if (!q) return unlinkedActiveGuardians;
    return unlinkedActiveGuardians.filter(
      (g) =>
        formatGuardianFullName(g).toLowerCase().includes(q) ||
        g.phoneNumber.toLowerCase().includes(q) ||
        (g.email && g.email.toLowerCase().includes(q))
    );
  }, [unlinkedActiveGuardians, guardianFilter]);

  const selectedGuardianPreview = React.useMemo(
    () =>
      unlinkedActiveGuardians.find((g) => String(g.id) === guardianId) || null,
    [unlinkedActiveGuardians, guardianId]
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setGuardianFilter('');
    if (initialLink) {
      setGuardianId(String(initialLink.guardianId));
      setRelationshipType(initialLink.relationshipType);
      setPrimaryContact(initialLink.primaryContact);
      setEmergencyContact(initialLink.emergencyContact);
      setReceiveNotifications(initialLink.receiveNotifications);
    } else {
      setGuardianId(
        unlinkedActiveGuardians[0] ? String(unlinkedActiveGuardians[0].id) : ''
      );
      setRelationshipType('FATHER');
      setPrimaryContact(linkedGuardianIds.length === 0);
      setEmergencyContact(true);
      setReceiveNotifications(true);
    }
  }, [open, initialLink, unlinkedActiveGuardians, linkedGuardianIds.length]);

  if (!student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isEdit && !guardianId) {
      setError('Please select a guardian to associate with this student.');
      return;
    }

    setSubmitting(true);
    try {
      const targetGuardianId = isEdit
        ? initialLink!.guardianId
        : Number(guardianId);

      if (isEdit) {
        const updatePayload: UpdateStudentGuardianRequest = {
          relationshipType,
          primaryContact,
          emergencyContact,
          receiveNotifications,
        };
        await onSubmit(updatePayload, true, targetGuardianId);
      } else {
        const linkPayload: LinkStudentGuardianRequest = {
          guardianId: targetGuardianId,
          relationshipType,
          primaryContact,
          emergencyContact,
          receiveNotifications,
        };
        await onSubmit(linkPayload, false, targetGuardianId);
      }
    } catch (err) {
      const info = extractErrorInfo(err);
      setError(info.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Guardian Relationship' : 'Link Guardian to Student'}
      description={
        isEdit
          ? `Update relationship preferences between ${formatGuardianFullName(initialLink?.guardian)} and ${formatStudentFullName(student)}.`
          : `Associate a parent or legal guardian with ${formatStudentFullName(student)} (${student.admissionNumber}).`
      }
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="link-guardian-form"
            isLoading={submitting}
            disabled={!isEdit && !guardianId}
          >
            {isEdit ? 'Save Relationship' : 'Link Guardian'}
          </Button>
        </>
      }
    >
      <form id="link-guardian-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertBanner variant="error" message={error} />}

        {isEdit ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <p className="font-semibold text-slate-900">
              {formatGuardianFullName(initialLink?.guardian)}
            </p>
            <p className="text-slate-600 mt-0.5">
              {initialLink?.guardian?.phoneNumber}
              {initialLink?.guardian?.email ? ` • ${initialLink.guardian.email}` : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {unlinkedActiveGuardians.length > 5 && (
              <TextInput
                value={guardianFilter}
                onChange={(e) => setGuardianFilter(e.target.value)}
                placeholder="Filter guardians by name, phone, or email..."
              />
            )}
            <FormField label="Select Guardian" htmlFor="lg-guardian" required>
              <SelectInput
                id="lg-guardian"
                value={guardianId}
                onChange={(e) => setGuardianId(e.target.value)}
              >
                <option value="">Select an existing guardian...</option>
                {filteredUnlinkedGuardians.map((g) => (
                  <option key={g.id} value={g.id}>
                    {formatGuardianFullName(g)} — {g.phoneNumber}
                    {g.email ? ` (${g.email})` : ''}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            {selectedGuardianPreview && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 text-xs text-slate-700 space-y-0.5">
                <p className="font-semibold text-slate-900">
                  {formatGuardianFullName(selectedGuardianPreview)}
                </p>
                <p>
                  Phone: <strong>{selectedGuardianPreview.phoneNumber}</strong>
                  {selectedGuardianPreview.alternatePhoneNumber
                    ? ` / ${selectedGuardianPreview.alternatePhoneNumber}`
                    : ''}
                  {selectedGuardianPreview.email
                    ? ` • ${selectedGuardianPreview.email}`
                    : ''}
                </p>
                {(selectedGuardianPreview.occupation ||
                  selectedGuardianPreview.address) && (
                  <p className="text-slate-500">
                    {[
                      selectedGuardianPreview.occupation,
                      selectedGuardianPreview.address,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
              </div>
            )}

            {onOpenCreateGuardian && (
              <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-3 py-2 text-xs">
                <span className="text-slate-600">
                  Guardian not listed in the directory yet?
                </span>
                <button
                  type="button"
                  onClick={() => onOpenCreateGuardian()}
                  className="font-semibold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  + Create New Guardian
                </button>
              </div>
            )}
          </div>
        )}

        <FormField label="Relationship Type" htmlFor="lg-relationship" required>
          <SelectInput
            id="lg-relationship"
            value={relationshipType}
            onChange={(e) =>
              setRelationshipType(e.target.value as GuardianRelationshipType)
            }
          >
            {(
              Object.keys(
                GUARDIAN_RELATIONSHIP_LABELS
              ) as GuardianRelationshipType[]
            ).map((rel) => (
              <option key={rel} value={rel}>
                {GUARDIAN_RELATIONSHIP_LABELS[rel]}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
          <CheckboxField
            id="lg-primary"
            label="Primary Contact"
            description="Designate as the main point of contact for this student (replaces any previous primary contact)."
            checked={primaryContact}
            onChange={(e) => setPrimaryContact(e.target.checked)}
          />
          <CheckboxField
            id="lg-emergency"
            label="Emergency Contact"
            description="Authorize school staff to reach this guardian during urgent situations."
            checked={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.checked)}
          />
          <CheckboxField
            id="lg-notifications"
            label="Receive Academic & Fee Notifications"
            description="Include this guardian in automated school circulars, attendance alerts, and fee reminders."
            checked={receiveNotifications}
            onChange={(e) => setReceiveNotifications(e.target.checked)}
          />
        </div>
      </form>
    </Modal>
  );
};













