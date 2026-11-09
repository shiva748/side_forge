import React, { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../lib/api-client';
import { academicManagementApi } from '../../services/academicManagementApi';
import { staffManagementApi } from '../../services/staffManagementApi';
import type {
  AcademicSessionResponse,
  ClassSubjectResponse,
  SchoolClassResponse,
  SubjectResponse,
} from '../../types/academicManagement';
import type { OrganizationRoleDto } from '../../types/auth';
import {
  EMPLOYMENT_STATUS_META,
  EMPLOYMENT_TYPE_LABELS,
  formatStaffFullName,
  formatStaffInitials,
  getEmploymentStatusBadge,
  isTerminalEmploymentStatus,
  type AssignTeacherClassRequest,
  type AssignTeacherSubjectRequest,
  type ChangeStaffStatusRequest,
  type CreateInvitationRequest,
  type CreateStaffRequest,
  type CreateTeacherRequest,
  type EmploymentStatus,
  type EmploymentType,
  type Gender,
  type InvitationDispatchResponse,
  type InvitationTargetType,
  type StaffResponse,
  type TeacherClassAssignmentResponse,
  type TeacherResponse,
  type TeacherSubjectAssignmentResponse,
  type UpdateStaffRequest,
  type UpdateTeacherClassAssignmentRequest,
  type UpdateTeacherProfileRequest,
  type UpdateTeacherSubjectAssignmentRequest,
} from '../../types/staffManagement';
import { GENDER_LABELS } from '../../types/studentManagement';
import { Badge, IdLabel } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import {
  FormField,
  Input as TextInput,
  Select as SelectInput,
  Textarea as TextareaInput,
} from '../ui/FormControls';
import { InlineAlert } from '../ui/StateViews';

const AlertBanner: React.FC<{
  variant: 'error' | 'warning' | 'info' | 'success';
  message: string;
}> = ({ variant, message }) => (
  <InlineAlert variant={variant}>{message}</InlineAlert>
);

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
      const entries = Object.entries(err.fieldErrors)
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
      return `${err.message} (${entries})`;
    }
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return fallback;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================================
// 1. Staff Create / Edit Modal
// ============================================================================

interface StaffFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialData: StaffResponse | null;
  onClose: () => void;
  onSubmit: (
    payload: CreateStaffRequest | UpdateStaffRequest,
    isEdit: boolean
  ) => Promise<void>;
}

export const StaffFormModal: React.FC<StaffFormModalProps> = ({
  open,
  mode,
  initialData,
  onClose,
  onSubmit,
}) => {
  const isEdit = mode === 'edit';

  const [employeeId, setEmployeeId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [alternatePhoneNumber, setAlternatePhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] =
    useState<EmploymentType>('PERMANENT');
  const [teachingStaff, setTeachingStaff] = useState(true);
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');
  const [professionalNotes, setProfessionalNotes] = useState('');

  // Optional initial teacher fields when creating a teaching staff member
  const [qualifications, setQualifications] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [certifications, setCertifications] = useState('');
  const [teachingNotes, setTeachingNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (isEdit && initialData) {
      setEmployeeId(initialData.employeeId || '');
      setFirstName(initialData.firstName || '');
      setMiddleName(initialData.middleName || '');
      setLastName(initialData.lastName || '');
      setDateOfBirth(initialData.dateOfBirth || '');
      setGender(initialData.gender || '');
      setEmail(initialData.email || '');
      setPhoneNumber(initialData.phoneNumber || '');
      setAlternatePhoneNumber(initialData.alternatePhoneNumber || '');
      setAddress(initialData.address || '');
      setCity(initialData.city || '');
      setState(initialData.state || '');
      setPostalCode(initialData.postalCode || '');
      setJoiningDate(initialData.joiningDate || todayIsoDate());
      setDesignation(initialData.designation || '');
      setDepartment(initialData.department || '');
      setEmploymentType(initialData.employmentType || 'PERMANENT');
      setTeachingStaff(Boolean(initialData.teachingStaff));
      setEmergencyContactName(initialData.emergencyContactName || '');
      setEmergencyContactPhone(initialData.emergencyContactPhone || '');
      setEmergencyContactRelation(initialData.emergencyContactRelation || '');
      setProfessionalNotes(initialData.professionalNotes || '');
    } else {
      setEmployeeId('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setDateOfBirth('');
      setGender('');
      setEmail('');
      setPhoneNumber('');
      setAlternatePhoneNumber('');
      setAddress('');
      setCity('');
      setState('');
      setPostalCode('');
      setJoiningDate(todayIsoDate());
      setDesignation('');
      setDepartment('');
      setEmploymentType('PERMANENT');
      setTeachingStaff(true);
      setEmergencyContactName('');
      setEmergencyContactPhone('');
      setEmergencyContactRelation('');
      setProfessionalNotes('');
      setQualifications('');
      setSpecialization('');
      setExperienceYears('0');
      setRegistrationNumber('');
      setCertifications('');
      setTeachingNotes('');
    }
  }, [open, isEdit, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId.trim()) {
      setError('Employee ID is required.');
      return;
    }
    if (!firstName.trim()) {
      setError('First name is required.');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (!joiningDate) {
      setError('Joining date is required.');
      return;
    }
    if (!designation.trim()) {
      setError('Designation is required.');
      return;
    }
    if (dateOfBirth) {
      if (dateOfBirth >= todayIsoDate()) {
        setError('Date of birth must be in the past.');
        return;
      }
      if (joiningDate <= dateOfBirth) {
        setError('Joining date must be after date of birth.');
        return;
      }
    }

    const parsedExp =
      experienceYears.trim() !== '' ? Number(experienceYears) : 0;
    if (Number.isNaN(parsedExp) || parsedExp < 0) {
      setError('Experience years must be zero or a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      const basePayload: UpdateStaffRequest = {
        employeeId: employeeId.trim().toUpperCase(),
        firstName: firstName.trim(),
        middleName: middleName.trim() || null,
        lastName: lastName.trim() || null,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        email: email.trim() || null,
        phoneNumber: phoneNumber.trim(),
        alternatePhoneNumber: alternatePhoneNumber.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        postalCode: postalCode.trim() || null,
        joiningDate,
        designation: designation.trim(),
        department: department.trim() || null,
        employmentType,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
        emergencyContactRelation: emergencyContactRelation.trim() || null,
        teachingStaff,
        professionalNotes: professionalNotes.trim() || null,
        userId: isEdit ? (initialData?.userId ?? null) : null,
      };

      if (isEdit) {
        await onSubmit(basePayload, true);
      } else {
        const createPayload: CreateStaffRequest = {
          ...basePayload,
          ...(teachingStaff
            ? {
                qualifications: qualifications.trim() || null,
                specialization: specialization.trim() || null,
                experienceYears: parsedExp,
                registrationNumber: registrationNumber.trim() || null,
                certifications: certifications.trim() || null,
                teachingNotes: teachingNotes.trim() || null,
              }
            : {}),
        };
        await onSubmit(createPayload, false);
      }
    } catch (err) {
      setError(
        extractErrorMessage(err, 'Failed to save staff profile information.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? `Edit Staff Profile — ${formatStaffFullName(initialData)}`
          : 'Register Staff Member'
      }
      description={
        isEdit
          ? 'Update employment, personal, contact, or emergency details for this staff member.'
          : 'Register a teaching or non-teaching employee in the school directory.'
      }
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="staff-form-modal"
            disabled={submitting}
          >
            {submitting
              ? 'Saving...'
              : isEdit
                ? 'Save Changes'
                : 'Register Staff Member'}
          </Button>
        </>
      }
    >
      <form id="staff-form-modal" onSubmit={handleSubmit} className="space-y-6">
        {error && <AlertBanner variant="error" message={error} />}

        {/* Section 1: Employment & Role Classification */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              1. Employment &amp; Role Classification
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Employee ID" required>
              <TextInput
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                placeholder="e.g. EMP-2026-001"
                maxLength={50}
                required
              />
            </FormField>

            <FormField label="Designation" required>
              <TextInput
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Senior Mathematics Teacher"
                maxLength={100}
                required
              />
            </FormField>

            <FormField label="Department">
              <TextInput
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Science & Mathematics"
                maxLength={100}
              />
            </FormField>

            <FormField label="Employment Type" required>
              <SelectInput
                value={employmentType}
                onChange={(e) =>
                  setEmploymentType(e.target.value as EmploymentType)
                }
                required
              >
                {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map(
                  (et) => (
                    <option key={et} value={et}>
                      {EMPLOYMENT_TYPE_LABELS[et]}
                    </option>
                  )
                )}
              </SelectInput>
            </FormField>

            <FormField label="Joining Date" required>
              <TextInput
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Staff Category" required>
              <SelectInput
                value={teachingStaff ? 'TEACHING' : 'NON_TEACHING'}
                onChange={(e) =>
                  setTeachingStaff(e.target.value === 'TEACHING')
                }
              >
                <option value="TEACHING">Teaching Faculty</option>
                <option value="NON_TEACHING">Non-Teaching / Admin Staff</option>
              </SelectInput>
            </FormField>
          </div>
        </div>

        {/* Section 2: Personal & Biographical Details */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              2. Personal &amp; Biographical Information
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="First Name" required>
              <TextInput
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                maxLength={100}
                required
              />
            </FormField>

            <FormField label="Middle Name">
              <TextInput
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                placeholder="Middle name (optional)"
                maxLength={100}
              />
            </FormField>

            <FormField label="Last Name">
              <TextInput
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                maxLength={100}
              />
            </FormField>

            <FormField label="Gender">
              <SelectInput
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender | '')}
              >
                <option value="">Select gender</option>
                {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
                  <option key={g} value={g}>
                    {GENDER_LABELS[g]}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="Date of Birth">
              <TextInput
                type="date"
                max={todayIsoDate()}
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        {/* Section 3: Contact & Residential Address */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              3. Contact &amp; Residential Address
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Primary Phone" required>
              <TextInput
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +91 9876543210"
                maxLength={20}
                required
              />
            </FormField>

            <FormField label="Alternate Phone">
              <TextInput
                value={alternatePhoneNumber}
                onChange={(e) => setAlternatePhoneNumber(e.target.value)}
                placeholder="Optional alternate phone"
                maxLength={20}
              />
            </FormField>

            <FormField label="Email Address">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@school.edu"
                maxLength={255}
              />
            </FormField>

            <div className="sm:col-span-3">
              <FormField label="Street Address">
                <TextInput
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House/Flat No, Street, Locality"
                  maxLength={500}
                />
              </FormField>
            </div>

            <FormField label="City">
              <TextInput
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                maxLength={100}
              />
            </FormField>

            <FormField label="State">
              <TextInput
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                maxLength={100}
              />
            </FormField>

            <FormField label="Postal / PIN Code">
              <TextInput
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="6-digit PIN"
                maxLength={10}
              />
            </FormField>
          </div>
        </div>

        {/* Section 4: Emergency Contact & Professional Notes */}
        <div className="space-y-3">
          <div className="border-b border-slate-200 pb-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              4. Emergency Contact &amp; Notes
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Emergency Contact Name">
              <TextInput
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                placeholder="Contact person name"
                maxLength={150}
              />
            </FormField>

            <FormField label="Emergency Contact Phone">
              <TextInput
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                placeholder="Emergency phone number"
                maxLength={20}
              />
            </FormField>

            <FormField label="Emergency Contact Relation">
              <TextInput
                value={emergencyContactRelation}
                onChange={(e) => setEmergencyContactRelation(e.target.value)}
                placeholder="e.g. Spouse, Parent, Sibling"
                maxLength={50}
              />
            </FormField>

            <div className="sm:col-span-3">
              <FormField label="Professional / Administrative Notes">
                <TextareaInput
                  rows={2}
                  value={professionalNotes}
                  onChange={(e) => setProfessionalNotes(e.target.value)}
                  placeholder="Optional administrative or employment notes..."
                  maxLength={500}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 5: Initial Teaching Profile (Create Mode + Teaching Staff) */}
        {!isEdit && teachingStaff && (
          <div className="space-y-3 rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4">
            <div className="border-b border-indigo-200/60 pb-1.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-800">
                5. Teaching Qualifications &amp; Specialization (Teacher Profile)
              </h4>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Primary Specialization">
                <TextInput
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Mathematics, Physics"
                  maxLength={255}
                />
              </FormField>

              <FormField label="Teaching Experience (Years)">
                <TextInput
                  type="number"
                  min={0}
                  max={60}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                />
              </FormField>

              <FormField label="Teacher Registration / License No.">
                <TextInput
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="Optional registration ID"
                  maxLength={100}
                />
              </FormField>

              <div className="sm:col-span-3">
                <FormField label="Academic &amp; Teaching Qualifications">
                  <TextInput
                    value={qualifications}
                    onChange={(e) => setQualifications(e.target.value)}
                    placeholder="e.g. M.Sc. Mathematics, B.Ed."
                    maxLength={500}
                  />
                </FormField>
              </div>

              <div className="sm:col-span-3">
                <FormField label="Certifications &amp; Training">
                  <TextInput
                    value={certifications}
                    onChange={(e) => setCertifications(e.target.value)}
                    placeholder="e.g. CTET Qualified, CBSE Master Trainer"
                    maxLength={500}
                  />
                </FormField>
              </div>

              <div className="sm:col-span-3">
                <FormField label="Teaching Notes">
                  <TextareaInput
                    rows={2}
                    value={teachingNotes}
                    onChange={(e) => setTeachingNotes(e.target.value)}
                    placeholder="Optional notes regarding subjects, grade levels, or academic responsibilities..."
                    maxLength={500}
                  />
                </FormField>
              </div>
            </div>
          </div>
        )}
      </form>
    </Dialog>
  );
};

// ============================================================================
// 2. Staff Employment Status Lifecycle Modal
// ============================================================================

interface StaffStatusModalProps {
  open: boolean;
  staff: StaffResponse | null;
  onClose: () => void;
  onSubmit: (payload: ChangeStaffStatusRequest) => Promise<void>;
}

export const StaffStatusModal: React.FC<StaffStatusModalProps> = ({
  open,
  staff,
  onClose,
  onSubmit,
}) => {
  const [employmentStatus, setEmploymentStatus] =
    useState<EmploymentStatus>('ACTIVE');
  const [leavingDate, setLeavingDate] = useState('');
  const [professionalNotes, setProfessionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrentTerminal = isTerminalEmploymentStatus(staff?.employmentStatus);

  const availableStatuses = useMemo(() => {
    const all = Object.keys(EMPLOYMENT_STATUS_META) as EmploymentStatus[];
    if (!staff) return all;
    return all.filter((st) => st !== staff.employmentStatus);
  }, [staff]);

  useEffect(() => {
    if (!open || !staff) return;
    setError(null);
    const nextDefault =
      staff.employmentStatus === 'ACTIVE' ? 'ON_LEAVE' : 'ACTIVE';
    setEmploymentStatus(nextDefault);
    setLeavingDate(staff.leavingDate || todayIsoDate());
    setProfessionalNotes(staff.professionalNotes || '');
  }, [open, staff]);

  if (!staff) return null;

  const currentBadge = getEmploymentStatusBadge(staff.employmentStatus);
  const nextMeta = EMPLOYMENT_STATUS_META[employmentStatus];
  const isTargetTerminal = isTerminalEmploymentStatus(employmentStatus);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isCurrentTerminal) {
      setError(
        `Cannot transition employment status from historical state ${staff.employmentStatus}.`
      );
      return;
    }
    if (employmentStatus === staff.employmentStatus) {
      setError('Please select a different employment status.');
      return;
    }
    if (isTargetTerminal && leavingDate && leavingDate < staff.joiningDate) {
      setError(
        `Leaving date (${leavingDate}) cannot be earlier than joining date (${staff.joiningDate}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        employmentStatus,
        leavingDate: isTargetTerminal ? leavingDate || todayIsoDate() : null,
        professionalNotes:
          professionalNotes.trim() !== (staff.professionalNotes || '')
            ? professionalNotes.trim()
            : undefined,
      });
    } catch (err) {
      setError(
        extractErrorMessage(err, 'Failed to update staff employment status.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Change Staff Employment Status"
      description={`Update employment lifecycle status for ${formatStaffFullName(staff)} (${staff.employeeId}).`}
      maxWidthClass="max-w-lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="staff-status-modal"
            variant={isTargetTerminal ? 'danger' : 'primary'}
            disabled={submitting || isCurrentTerminal}
          >
            {submitting ? 'Updating...' : 'Confirm Status Change'}
          </Button>
        </>
      }
    >
      <form
        id="staff-status-modal"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error && <AlertBanner variant="error" message={error} />}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-600">Staff Member:</span>
            <span className="font-semibold text-slate-900">
              {formatStaffFullName(staff)} ({staff.employeeId})
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-600">Current Status:</span>
            <Badge variant={currentBadge.variant} dot>
              {currentBadge.label}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-600">Joining Date:</span>
            <span className="text-slate-700">{staff.joiningDate}</span>
          </div>
        </div>

        {isCurrentTerminal ? (
          <AlertBanner
            variant="warning"
            message={`This staff record is in a terminal historical state (${staff.employmentStatus}) and cannot be transitioned to another employment status.`}
          />
        ) : (
          <>
            <FormField label="New Employment Status" required>
              <SelectInput
                value={employmentStatus}
                onChange={(e) =>
                  setEmploymentStatus(e.target.value as EmploymentStatus)
                }
                required
              >
                {availableStatuses.map((st) => (
                  <option key={st} value={st}>
                    {EMPLOYMENT_STATUS_META[st].label} ({st})
                  </option>
                ))}
              </SelectInput>
            </FormField>

            {nextMeta && (
              <div
                className={`rounded-xl border p-3 text-xs ${
                  isTargetTerminal
                    ? 'border-rose-200 bg-rose-50/70 text-rose-900'
                    : employmentStatus === 'ACTIVE'
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                      : 'border-amber-200 bg-amber-50/70 text-amber-900'
                }`}
              >
                <p className="font-semibold">{nextMeta.label}:</p>
                <p className="mt-0.5">{nextMeta.description}</p>
                {isTargetTerminal && (
                  <p className="mt-1.5 font-semibold text-rose-800">
                    Warning: Marking a staff member as {employmentStatus} is a
                    permanent historical transition and cannot be undone.
                  </p>
                )}
              </div>
            )}

            {isTargetTerminal && (
              <FormField
                label="Effective Leaving Date"
                required
                hint={`Must not be earlier than joining date (${staff.joiningDate}).`}
              >
                <TextInput
                  type="date"
                  min={staff.joiningDate}
                  value={leavingDate}
                  onChange={(e) => setLeavingDate(e.target.value)}
                  required
                />
              </FormField>
            )}

            <FormField label="Administrative / Status Notes">
              <TextareaInput
                rows={2}
                value={professionalNotes}
                onChange={(e) => setProfessionalNotes(e.target.value)}
                placeholder="Optional reason or employment lifecycle note..."
                maxLength={500}
              />
            </FormField>
          </>
        )}
      </form>
    </Dialog>
  );
};

// ============================================================================
// 3. Teacher Profile Edit / Promote Staff to Teacher Modal
// ============================================================================

interface TeacherProfileModalProps {
  open: boolean;
  mode: 'edit' | 'promote';
  teacher: TeacherResponse | null;
  staff: StaffResponse | null;
  onClose: () => void;
  onSubmitEdit: (
    teacherId: number,
    payload: UpdateTeacherProfileRequest
  ) => Promise<void>;
  onSubmitPromote: (payload: CreateTeacherRequest) => Promise<void>;
}

export const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  open,
  mode,
  teacher,
  staff,
  onClose,
  onSubmitEdit,
  onSubmitPromote,
}) => {
  const [qualifications, setQualifications] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [certifications, setCertifications] = useState('');
  const [teachingNotes, setTeachingNotes] = useState('');
  const [availableForAssignment, setAvailableForAssignment] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveEmploymentStatus =
    teacher?.employmentStatus || staff?.employmentStatus || 'ACTIVE';
  const isStaffActive = effectiveEmploymentStatus === 'ACTIVE';

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === 'edit' && teacher) {
      setQualifications(teacher.qualifications || '');
      setSpecialization(teacher.specialization || '');
      setExperienceYears(String(teacher.experienceYears ?? 0));
      setRegistrationNumber(teacher.registrationNumber || '');
      setCertifications(teacher.certifications || '');
      setTeachingNotes(teacher.teachingNotes || '');
      setAvailableForAssignment(
        isStaffActive ? Boolean(teacher.availableForAssignment) : false
      );
    } else {
      setQualifications('');
      setSpecialization('');
      setExperienceYears('0');
      setRegistrationNumber('');
      setCertifications('');
      setTeachingNotes('');
      setAvailableForAssignment(isStaffActive);
    }
  }, [open, mode, teacher, isStaffActive]);

  const targetName = formatStaffFullName(teacher || staff);
  const targetEmpId = teacher?.employeeId || staff?.employeeId || '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedExp =
      experienceYears.trim() !== '' ? Number(experienceYears) : 0;
    if (Number.isNaN(parsedExp) || parsedExp < 0) {
      setError('Experience years must be zero or a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'edit' && teacher) {
        await onSubmitEdit(teacher.id, {
          qualifications: qualifications.trim() || null,
          specialization: specialization.trim() || null,
          experienceYears: parsedExp,
          registrationNumber: registrationNumber.trim() || null,
          certifications: certifications.trim() || null,
          teachingNotes: teachingNotes.trim() || null,
          availableForAssignment: isStaffActive
            ? availableForAssignment
            : false,
        });
      } else if (mode === 'promote' && staff) {
        await onSubmitPromote({
          staffId: staff.id,
          qualifications: qualifications.trim() || null,
          specialization: specialization.trim() || null,
          experienceYears: parsedExp,
          registrationNumber: registrationNumber.trim() || null,
          certifications: certifications.trim() || null,
          teachingNotes: teachingNotes.trim() || null,
          availableForAssignment: isStaffActive
            ? availableForAssignment
            : false,
        });
      }
    } catch (err) {
      setError(
        extractErrorMessage(err, 'Failed to save teacher professional profile.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        mode === 'edit'
          ? `Edit Teacher Qualifications — ${targetName}`
          : `Enable Teaching Profile — ${targetName}`
      }
      description={
        mode === 'edit'
          ? 'Update academic qualifications, subject specialization, teaching experience, and assignment availability.'
          : 'Attach a teaching profile to this staff member so they can be assigned to classes and subjects.'
      }
      maxWidthClass="max-w-3xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="teacher-profile-modal"
            disabled={submitting}
          >
            {submitting
              ? 'Saving...'
              : mode === 'edit'
                ? 'Save Teacher Profile'
                : 'Enable Teaching Profile'}
          </Button>
        </>
      }
    >
      <form
        id="teacher-profile-modal"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {error && <AlertBanner variant="error" message={error} />}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-900">{targetName}</span>
            <span className="ml-2 text-slate-500">({targetEmpId})</span>
          </div>
          <Badge
            variant={
              getEmploymentStatusBadge(effectiveEmploymentStatus).variant
            }
            dot
          >
            {getEmploymentStatusBadge(effectiveEmploymentStatus).label}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Primary Subject Specialization">
            <TextInput
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="e.g. Mathematics, English Literature"
              maxLength={255}
            />
          </FormField>

          <FormField label="Teaching Experience (Years)">
            <TextInput
              type="number"
              min={0}
              max={60}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
            />
          </FormField>

          <FormField label="Registration / License No.">
            <TextInput
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="Optional teacher registration ID"
              maxLength={100}
            />
          </FormField>

          <div className="sm:col-span-3">
            <FormField label="Academic &amp; Professional Qualifications">
              <TextInput
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder="e.g. M.Sc. Physics, B.Ed."
                maxLength={500}
              />
            </FormField>
          </div>

          <div className="sm:col-span-3">
            <FormField label="Certifications &amp; Special Training">
              <TextInput
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="e.g. CTET, Montessori Diploma"
                maxLength={500}
              />
            </FormField>
          </div>

          <div className="sm:col-span-3">
            <FormField label="Teaching Notes">
              <TextareaInput
                rows={2}
                value={teachingNotes}
                onChange={(e) => setTeachingNotes(e.target.value)}
                placeholder="Notes on grade preferences, lab duties, or academic responsibilities..."
                maxLength={500}
              />
            </FormField>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <label className="flex items-start gap-2.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={isStaffActive && availableForAssignment}
              disabled={!isStaffActive}
              onChange={(e) => setAvailableForAssignment(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="font-semibold text-slate-900">
                Available for Academic Class &amp; Subject Assignments
              </span>
              <p className="mt-0.5 text-slate-500">
                {isStaffActive
                  ? 'When enabled, this teacher appears in class teacher and subject teacher assignment selectors.'
                  : 'Unavailable because the staff member is not currently in ACTIVE employment status.'}
              </p>
            </div>
          </label>
        </div>
      </form>
    </Dialog>
  );
};

// ============================================================================
// 4. Assign Teacher to Class Modal
// ============================================================================

interface AssignTeacherClassModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  organizationId: number;
  initialAssignment: TeacherClassAssignmentResponse | null;
  preselectedTeacher: TeacherResponse | null;
  sessions: AcademicSessionResponse[];
  classes: SchoolClassResponse[];
  onClose: () => void;
  onSubmitCreate: (
    sessionId: number,
    classId: number,
    payload: AssignTeacherClassRequest
  ) => Promise<void>;
  onSubmitUpdate: (
    sessionId: number,
    classId: number,
    teacherId: number,
    payload: UpdateTeacherClassAssignmentRequest
  ) => Promise<void>;
}

export const AssignTeacherClassModal: React.FC<
  AssignTeacherClassModalProps
> = ({
  open,
  mode,
  organizationId,
  initialAssignment,
  preselectedTeacher,
  sessions,
  classes,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEdit = mode === 'edit';

  const modifiableSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.status !== 'COMPLETED')
        .sort((a, b) => {
          if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
          if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
          return b.id - a.id;
        }),
    [sessions]
  );

  const activeClasses = useMemo(
    () => classes.filter((c) => c.active),
    [classes]
  );

  const [academicSessionId, setAcademicSessionId] = useState<number | ''>('');
  const [classId, setClassId] = useState<number | ''>('');
  const [classTeacher, setClassTeacher] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Teacher search state when not preselected
  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TeacherResponse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchTotalElements, setSearchTotalElements] = useState(0);

  // Existing class teachers in selected (session, class) for duplicate & classTeacher warnings
  const [existingClassTeachers, setExistingClassTeachers] = useState<
    TeacherClassAssignmentResponse[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setSearchPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSearchQuery('');
    setDebouncedQuery('');
    setSearchPage(0);

    if (isEdit && initialAssignment) {
      setAcademicSessionId(initialAssignment.academicSessionId);
      setClassId(initialAssignment.classId);
      setClassTeacher(Boolean(initialAssignment.classTeacher));
      setRemarks(initialAssignment.remarks || '');
      setSelectedTeacher(preselectedTeacher);
    } else {
      const defaultSession =
        modifiableSessions.find((s) => s.status === 'ACTIVE') ||
        modifiableSessions[0] ||
        null;
      setAcademicSessionId(defaultSession ? defaultSession.id : '');
      setClassId(activeClasses.length > 0 ? activeClasses[0].id : '');
      setClassTeacher(false);
      setRemarks('');
      setSelectedTeacher(preselectedTeacher || null);
    }
  }, [
    open,
    isEdit,
    initialAssignment,
    preselectedTeacher,
    modifiableSessions,
    activeClasses,
  ]);

  // Debounced server-side search of available teachers when not preselected
  useEffect(() => {
    if (!open || isEdit || preselectedTeacher || !organizationId) return;
    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);
    staffManagementApi
      .listAvailableTeachers(organizationId, {
        search: debouncedQuery || undefined,
        page: searchPage,
        size: 6,
      })
      .then((res) => {
        if (cancelled) return;
        setSearchResults(res.content);
        setSearchTotalPages(res.totalPages);
        setSearchTotalElements(res.totalElements);
      })
      .catch((err) => {
        if (cancelled) return;
        setSearchError(
          extractErrorMessage(
            err,
            'Failed to load available teaching staff.'
          )
        );
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    isEdit,
    preselectedTeacher,
    organizationId,
    debouncedQuery,
    searchPage,
  ]);

  // Load existing class teacher assignments for selected session + class
  useEffect(() => {
    if (!open || !organizationId || !academicSessionId || !classId) {
      setExistingClassTeachers([]);
      return;
    }
    let cancelled = false;
    staffManagementApi
      .getClassTeachers(
        organizationId,
        Number(academicSessionId),
        Number(classId)
      )
      .then((list) => {
        if (!cancelled) setExistingClassTeachers(list);
      })
      .catch(() => {
        if (!cancelled) setExistingClassTeachers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, organizationId, academicSessionId, classId]);

  const effectiveTeacher = preselectedTeacher || selectedTeacher;

  const duplicateClassAssignment = useMemo(() => {
    if (isEdit || !effectiveTeacher) return null;
    return (
      existingClassTeachers.find((a) => a.teacherId === effectiveTeacher.id) ||
      null
    );
  }, [isEdit, effectiveTeacher, existingClassTeachers]);

  const existingDesignatedClassTeacher = useMemo(() => {
    const targetTeacherId = isEdit
      ? initialAssignment?.teacherId
      : effectiveTeacher?.id;
    return (
      existingClassTeachers.find(
        (a) => a.classTeacher && a.teacherId !== targetTeacherId
      ) || null
    );
  }, [isEdit, initialAssignment, effectiveTeacher, existingClassTeachers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isEdit && initialAssignment) {
      setSubmitting(true);
      try {
        await onSubmitUpdate(
          initialAssignment.academicSessionId,
          initialAssignment.classId,
          initialAssignment.teacherId,
          {
            classTeacher,
            remarks: remarks.trim() || null,
          }
        );
      } catch (err) {
        setError(
          extractErrorMessage(err, 'Failed to update class teacher assignment.')
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!effectiveTeacher) {
      setError('Please select an active teacher to assign.');
      return;
    }
    if (!academicSessionId) {
      setError('Please select an academic session.');
      return;
    }
    if (!classId) {
      setError('Please select a school class.');
      return;
    }
    if (duplicateClassAssignment) {
      setError(
        `${formatStaffFullName(effectiveTeacher)} is already assigned to this class in the selected academic session.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitCreate(Number(academicSessionId), Number(classId), {
        teacherId: effectiveTeacher.id,
        classTeacher,
        remarks: remarks.trim() || null,
      });
    } catch (err) {
      setError(
        extractErrorMessage(err, 'Failed to assign teacher to school class.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? 'Edit Class Teacher Assignment'
          : 'Assign Teacher to Class'
      }
      description={
        isEdit
          ? 'Update Class Teacher designation or remarks for this academic session placement.'
          : 'Assign an active, available teacher to a school class for a planned or active academic session.'
      }
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-teacher-class-form"
            disabled={
              submitting ||
              (!isEdit && (!effectiveTeacher || Boolean(duplicateClassAssignment)))
            }
          >
            {submitting
              ? 'Saving...'
              : isEdit
                ? 'Save Assignment'
                : 'Assign Teacher'}
          </Button>
        </>
      }
    >
      <form
        id="assign-teacher-class-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && <AlertBanner variant="error" message={error} />}

        {/* Step 1: Teacher Selection */}
        {isEdit && initialAssignment ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                {[
                  initialAssignment.teacherFirstName,
                  initialAssignment.teacherLastName,
                ]
                  .filter(Boolean)
                  .join(' ') || `Teacher #${initialAssignment.teacherId}`}
              </span>
              {initialAssignment.teacherEmployeeId && (
                <IdLabel>{initialAssignment.teacherEmployeeId}</IdLabel>
              )}
            </div>
            <p className="text-slate-600">
              {initialAssignment.className || `Class #${initialAssignment.classId}`} •{' '}
              {initialAssignment.academicSessionName ||
                `Session #${initialAssignment.academicSessionId}`}
            </p>
          </div>
        ) : effectiveTeacher ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {formatStaffInitials(effectiveTeacher)}
              </div>
              <div className="min-w-0 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 text-sm">
                    {formatStaffFullName(effectiveTeacher)}
                  </span>
                  {effectiveTeacher.employeeId && (
                    <IdLabel>{effectiveTeacher.employeeId}</IdLabel>
                  )}
                </div>
                <p className="text-slate-600">
                  {effectiveTeacher.designation || 'Teacher'}
                  {effectiveTeacher.specialization
                    ? ` • ${effectiveTeacher.specialization}`
                    : ''}
                </p>
              </div>
            </div>
            {!preselectedTeacher && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedTeacher(null)}
              >
                Change Teacher
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <FormField
              label="1. Find & Select Available Teacher"
              required
              hint="Search active teachers who are marked available for academic assignments."
            >
              <TextInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teacher by name or employee ID..."
              />
            </FormField>

            {searchError && (
              <AlertBanner variant="error" message={searchError} />
            )}

            {searchLoading ? (
              <p className="text-xs text-slate-500 py-2">
                Searching available teachers...
              </p>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                No available active teachers found matching your search.
              </p>
            ) : (
              <div className="divide-y divide-slate-200/80 rounded-lg border border-slate-200 bg-white overflow-hidden">
                {searchResults.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">
                          {formatStaffFullName(t)}
                        </span>
                        {t.employeeId && <IdLabel>{t.employeeId}</IdLabel>}
                      </div>
                      <p className="text-slate-500">
                        {t.designation || 'Teacher'}
                        {t.specialization ? ` • ${t.specialization}` : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTeacher(t)}
                    >
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchTotalPages > 1 && (
              <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                <span>
                  Page {searchPage + 1} of {searchTotalPages} ({searchTotalElements}{' '}
                  available)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={searchPage <= 0}
                    onClick={() => setSearchPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={searchPage + 1 >= searchTotalPages}
                    onClick={() => setSearchPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Academic Session & Class Selection */}
        {!isEdit && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="2. Academic Session" required>
              <SelectInput
                value={academicSessionId}
                onChange={(e) =>
                  setAcademicSessionId(
                    e.target.value ? Number(e.target.value) : ''
                  )
                }
                required
              >
                <option value="">Select academic session</option>
                {modifiableSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="3. School Class" required>
              <SelectInput
                value={classId}
                onChange={(e) =>
                  setClassId(e.target.value ? Number(e.target.value) : '')
                }
                required
              >
                <option value="">Select active class</option>
                {activeClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </SelectInput>
            </FormField>
          </div>
        )}

        {duplicateClassAssignment && (
          <AlertBanner
            variant="warning"
            message={`${formatStaffFullName(effectiveTeacher)} is already assigned to this class in the selected session.`}
          />
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
          <label className="flex items-start gap-2.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={classTeacher}
              onChange={(e) => setClassTeacher(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <div>
              <span className="font-semibold text-slate-900">
                Designate as Primary Class Teacher (Homeroom Teacher)
              </span>
              <p className="mt-0.5 text-slate-500">
                Only one teacher per class per session holds the primary Class
                Teacher role.
              </p>
            </div>
          </label>

          {classTeacher && existingDesignatedClassTeacher && (
            <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Note:{' '}
              {[
                existingDesignatedClassTeacher.teacherFirstName,
                existingDesignatedClassTeacher.teacherLastName,
              ]
                .filter(Boolean)
                .join(' ') ||
                existingDesignatedClassTeacher.teacherEmployeeId}{' '}
              is currently the designated Class Teacher for this class and will
              automatically transition to a regular class teacher.
            </p>
          )}
        </div>

        <FormField label="Assignment Remarks">
          <TextareaInput
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional notes regarding homeroom or class responsibilities..."
            maxLength={500}
          />
        </FormField>
      </form>
    </Dialog>
  );
};

// ============================================================================
// 5. Assign Teacher to Class Subject Modal
// ============================================================================

interface AssignTeacherSubjectModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  organizationId: number;
  initialAssignment: TeacherSubjectAssignmentResponse | null;
  preselectedTeacher: TeacherResponse | null;
  sessions: AcademicSessionResponse[];
  classes: SchoolClassResponse[];
  subjects: SubjectResponse[];
  onClose: () => void;
  onSubmitCreate: (
    sessionId: number,
    classId: number,
    subjectId: number,
    payload: AssignTeacherSubjectRequest
  ) => Promise<void>;
  onSubmitUpdate: (
    sessionId: number,
    classId: number,
    subjectId: number,
    teacherId: number,
    payload: UpdateTeacherSubjectAssignmentRequest
  ) => Promise<void>;
}

export const AssignTeacherSubjectModal: React.FC<
  AssignTeacherSubjectModalProps
> = ({
  open,
  mode,
  organizationId,
  initialAssignment,
  preselectedTeacher,
  sessions,
  classes,
  subjects,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEdit = mode === 'edit';

  const modifiableSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.status !== 'COMPLETED')
        .sort((a, b) => {
          if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
          if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
          return b.id - a.id;
        }),
    [sessions]
  );

  const activeClasses = useMemo(
    () => classes.filter((c) => c.active),
    [classes]
  );

  const subjectById = useMemo(() => {
    const map = new Map<number, SubjectResponse>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  const [academicSessionId, setAcademicSessionId] = useState<number | ''>('');
  const [classId, setClassId] = useState<number | ''>('');
  const [subjectId, setSubjectId] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');

  // Assigned class-subjects for selected (sessionId, classId)
  const [classSubjects, setClassSubjects] = useState<ClassSubjectResponse[]>(
    []
  );
  const [loadingClassSubjects, setLoadingClassSubjects] = useState(false);

  // Existing subject-teacher assignments for duplicate detection
  const [existingSubjectTeachers, setExistingSubjectTeachers] = useState<
    TeacherSubjectAssignmentResponse[]
  >([]);

  // Teacher search state when not preselected
  const [selectedTeacher, setSelectedTeacher] =
    useState<TeacherResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TeacherResponse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(0);
  const [searchTotalPages, setSearchTotalPages] = useState(0);
  const [searchTotalElements, setSearchTotalElements] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setSearchPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSearchQuery('');
    setDebouncedQuery('');
    setSearchPage(0);

    if (isEdit && initialAssignment) {
      setAcademicSessionId(initialAssignment.academicSessionId);
      setClassId(initialAssignment.classId);
      setSubjectId(initialAssignment.subjectId);
      setRemarks(initialAssignment.remarks || '');
      setSelectedTeacher(preselectedTeacher);
    } else {
      const defaultSession =
        modifiableSessions.find((s) => s.status === 'ACTIVE') ||
        modifiableSessions[0] ||
        null;
      setAcademicSessionId(defaultSession ? defaultSession.id : '');
      setClassId(activeClasses.length > 0 ? activeClasses[0].id : '');
      setSubjectId('');
      setRemarks('');
      setSelectedTeacher(preselectedTeacher || null);
    }
  }, [
    open,
    isEdit,
    initialAssignment,
    preselectedTeacher,
    modifiableSessions,
    activeClasses,
  ]);

  // Load subjects assigned to the selected class in the selected session
  useEffect(() => {
    if (!open || isEdit || !organizationId || !academicSessionId || !classId) {
      setClassSubjects([]);
      return;
    }
    let cancelled = false;
    setLoadingClassSubjects(true);
    academicManagementApi
      .getClassSubjects(
        organizationId,
        Number(academicSessionId),
        Number(classId)
      )
      .then((list) => {
        if (cancelled) return;
        const activeAssigned = list.filter((cs) => {
          const sub = subjectById.get(cs.subjectId);
          return !sub || sub.active;
        });
        setClassSubjects(activeAssigned);
        setSubjectId((prev) => {
          if (
            prev !== '' &&
            activeAssigned.some((cs) => cs.subjectId === Number(prev))
          ) {
            return prev;
          }
          return activeAssigned.length > 0 ? activeAssigned[0].subjectId : '';
        });
      })
      .catch(() => {
        if (!cancelled) {
          setClassSubjects([]);
          setSubjectId('');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingClassSubjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isEdit, organizationId, academicSessionId, classId, subjectById]);

  // Load existing subject-teacher assignments for duplicate prevention
  useEffect(() => {
    if (
      !open ||
      isEdit ||
      !organizationId ||
      !academicSessionId ||
      !classId ||
      !subjectId
    ) {
      setExistingSubjectTeachers([]);
      return;
    }
    let cancelled = false;
    staffManagementApi
      .getClassSubjectTeachers(
        organizationId,
        Number(academicSessionId),
        Number(classId),
        Number(subjectId)
      )
      .then((list) => {
        if (!cancelled) setExistingSubjectTeachers(list);
      })
      .catch(() => {
        if (!cancelled) setExistingSubjectTeachers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isEdit, organizationId, academicSessionId, classId, subjectId]);

  // Debounced server-side search of available teachers when not preselected
  useEffect(() => {
    if (!open || isEdit || preselectedTeacher || !organizationId) return;
    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);
    staffManagementApi
      .listAvailableTeachers(organizationId, {
        search: debouncedQuery || undefined,
        page: searchPage,
        size: 6,
      })
      .then((res) => {
        if (cancelled) return;
        setSearchResults(res.content);
        setSearchTotalPages(res.totalPages);
        setSearchTotalElements(res.totalElements);
      })
      .catch((err) => {
        if (cancelled) return;
        setSearchError(
          extractErrorMessage(
            err,
            'Failed to load available teaching staff.'
          )
        );
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    isEdit,
    preselectedTeacher,
    organizationId,
    debouncedQuery,
    searchPage,
  ]);
  const effectiveTeacher = preselectedTeacher || selectedTeacher;

  const duplicateSubjectAssignment = useMemo(() => {
    if (isEdit || !effectiveTeacher) return null;
    return (
      existingSubjectTeachers.find(
        (a) => a.teacherId === effectiveTeacher.id
      ) || null
    );
  }, [isEdit, effectiveTeacher, existingSubjectTeachers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isEdit && initialAssignment) {
      setSubmitting(true);
      try {
        await onSubmitUpdate(
          initialAssignment.academicSessionId,
          initialAssignment.classId,
          initialAssignment.subjectId,
          initialAssignment.teacherId,
          { remarks: remarks.trim() || null }
        );
      } catch (err) {
        setError(
          extractErrorMessage(
            err,
            'Failed to update subject teacher assignment.'
          )
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!effectiveTeacher) {
      setError('Please select an active teacher to assign.');
      return;
    }
    if (!academicSessionId) {
      setError('Please select an academic session.');
      return;
    }
    if (!classId) {
      setError('Please select a school class.');
      return;
    }
    if (!subjectId) {
      setError('Please select a curriculum subject assigned to this class.');
      return;
    }
    if (duplicateSubjectAssignment) {
      setError(
        `${formatStaffFullName(effectiveTeacher)} is already assigned to teach this subject in the selected class and session.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmitCreate(
        Number(academicSessionId),
        Number(classId),
        Number(subjectId),
        {
          teacherId: effectiveTeacher.id,
          remarks: remarks.trim() || null,
        }
      );
    } catch (err) {
      setError(
        extractErrorMessage(
          err,
          'Failed to assign teacher to class subject.'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        isEdit
          ? 'Edit Subject Teacher Assignment'
          : 'Assign Teacher to Class Subject'
      }
      description={
        isEdit
          ? 'Update teaching remarks for this class-subject teacher assignment.'
          : 'Assign an active teacher to teach a curriculum subject configured for a school class in an academic session.'
      }
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="assign-teacher-subject-form"
            disabled={
              submitting ||
              (!isEdit &&
                (!effectiveTeacher ||
                  !subjectId ||
                  Boolean(duplicateSubjectAssignment)))
            }
          >
            {submitting
              ? 'Saving...'
              : isEdit
                ? 'Save Changes'
                : 'Assign Subject Teacher'}
          </Button>
        </>
      }
    >
      <form
        id="assign-teacher-subject-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && <AlertBanner variant="error" message={error} />}

        {/* Step 1: Teacher Selection */}
        {isEdit && initialAssignment ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">
                {[
                  initialAssignment.teacherFirstName,
                  initialAssignment.teacherLastName,
                ]
                  .filter(Boolean)
                  .join(' ') || `Teacher #${initialAssignment.teacherId}`}
              </span>
              {initialAssignment.teacherEmployeeId && (
                <IdLabel>{initialAssignment.teacherEmployeeId}</IdLabel>
              )}
            </div>
            <p className="text-slate-600">
              {initialAssignment.subjectName ||
                `Subject #${initialAssignment.subjectId}`}{' '}
              • {initialAssignment.className || `Class #${initialAssignment.classId}`} •{' '}
              {initialAssignment.academicSessionName ||
                `Session #${initialAssignment.academicSessionId}`}
            </p>
          </div>
        ) : effectiveTeacher ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {formatStaffInitials(effectiveTeacher)}
              </div>
              <div className="min-w-0 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 text-sm">
                    {formatStaffFullName(effectiveTeacher)}
                  </span>
                  {effectiveTeacher.employeeId && (
                    <IdLabel>{effectiveTeacher.employeeId}</IdLabel>
                  )}
                </div>
                <p className="text-slate-600">
                  {effectiveTeacher.designation || 'Teacher'}
                  {effectiveTeacher.specialization
                    ? ` • ${effectiveTeacher.specialization}`
                    : ''}
                </p>
              </div>
            </div>
            {!preselectedTeacher && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedTeacher(null)}
              >
                Change Teacher
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
            <FormField
              label="1. Find & Select Available Teacher"
              required
              hint="Search active teachers who are marked available for academic assignments."
            >
              <TextInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search teacher by name or employee ID..."
              />
            </FormField>

            {searchError && (
              <AlertBanner variant="error" message={searchError} />
            )}

            {searchLoading ? (
              <p className="text-xs text-slate-500 py-2">
                Searching available teachers...
              </p>
            ) : searchResults.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">
                No available active teachers found matching your search.
              </p>
            ) : (
              <div className="divide-y divide-slate-200/80 rounded-lg border border-slate-200 bg-white overflow-hidden">
                {searchResults.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900">
                          {formatStaffFullName(t)}
                        </span>
                        {t.employeeId && <IdLabel>{t.employeeId}</IdLabel>}
                      </div>
                      <p className="text-slate-500">
                        {t.designation || 'Teacher'}
                        {t.specialization ? ` • ${t.specialization}` : ''}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTeacher(t)}
                    >
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchTotalPages > 1 && (
              <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                <span>
                  Page {searchPage + 1} of {searchTotalPages} ({searchTotalElements}{' '}
                  available)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={searchPage <= 0}
                    onClick={() => setSearchPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={searchPage + 1 >= searchTotalPages}
                    onClick={() => setSearchPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Step 2: Session, Class, and Assigned Curriculum Subject */}
        {!isEdit && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="2. Academic Session" required>
              <SelectInput
                value={academicSessionId}
                onChange={(e) =>
                  setAcademicSessionId(
                    e.target.value ? Number(e.target.value) : ''
                  )
                }
                required
              >
                <option value="">Select session</option>
                {modifiableSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="3. School Class" required>
              <SelectInput
                value={classId}
                onChange={(e) =>
                  setClassId(e.target.value ? Number(e.target.value) : '')
                }
                required
              >
                <option value="">Select class</option>
                {activeClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField
              label="4. Curriculum Subject"
              required
              hint="Subjects assigned to the selected class in this session."
            >
              <SelectInput
                value={subjectId}
                disabled={loadingClassSubjects || classSubjects.length === 0}
                onChange={(e) =>
                  setSubjectId(e.target.value ? Number(e.target.value) : '')
                }
                required
              >
                <option value="">
                  {loadingClassSubjects
                    ? 'Loading subjects...'
                    : classSubjects.length === 0
                      ? 'No subjects assigned to class'
                      : 'Select subject'}
                </option>
                {classSubjects.map((cs) => {
                  const sub = subjectById.get(cs.subjectId);
                  return (
                    <option key={cs.subjectId} value={cs.subjectId}>
                      {sub
                        ? `${sub.name} (${sub.code})`
                        : `Subject #${cs.subjectId}`}
                      {cs.compulsory ? ' — Compulsory' : ' — Optional'}
                    </option>
                  );
                })}
              </SelectInput>
            </FormField>
          </div>
        )}

        {!isEdit &&
          !loadingClassSubjects &&
          academicSessionId &&
          classId &&
          classSubjects.length === 0 && (
            <AlertBanner
              variant="warning"
              message="No subjects are assigned to the selected class in this academic session yet. Configure class-subject assignments in Academic Management first."
            />
          )}

        {duplicateSubjectAssignment && (
          <AlertBanner
            variant="warning"
            message={`${formatStaffFullName(effectiveTeacher)} is already assigned to teach this subject in the selected class and session.`}
          />
        )}

        <FormField label="Teaching Assignment Remarks">
          <TextareaInput
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional notes on syllabus coverage, lab sections, or co-teaching..."
            maxLength={500}
          />
        </FormField>
      </form>
    </Dialog>
  );
};

// ============================================================================
// 6. Staff / Teacher Invitation Modal
// ============================================================================

interface StaffInvitationModalProps {
  open: boolean;
  preselectedStaff: StaffResponse | null;
  roles: OrganizationRoleDto[];
  isSchoolAdmin: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateInvitationRequest
  ) => Promise<InvitationDispatchResponse>;
}

export const StaffInvitationModal: React.FC<StaffInvitationModalProps> = ({
  open,
  preselectedStaff,
  roles,
  isSchoolAdmin,
  onClose,
  onSubmit,
}) => {
  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState('TEACHER');
  const [targetType, setTargetType] =
    useState<InvitationTargetType>('TEACHER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [expiryHours, setExpiryHours] = useState('168');

  const [dispatched, setDispatched] =
    useState<InvitationDispatchResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignableRoles = useMemo(() => {
    const filtered = roles.filter((r) => {
      if (r.code === 'STUDENT' || r.code === 'PARENT') return false;
      if (!isSchoolAdmin && (r.code === 'SCHOOL_ADMIN' || r.code === 'PRINCIPAL')) {
        return false;
      }
      return true;
    });
    if (filtered.length > 0) return filtered;
    const defaults: OrganizationRoleDto[] = [
      { id: -1, code: 'TEACHER', name: 'Teacher', description: null, organizationId: null, systemDefined: true, permissions: [] },
      { id: -2, code: 'SCHOOL_STAFF', name: 'School Staff', description: null, organizationId: null, systemDefined: true, permissions: [] },
      { id: -3, code: 'ACCOUNTANT', name: 'Accountant', description: null, organizationId: null, systemDefined: true, permissions: [] },
      { id: -4, code: 'RECEPTIONIST', name: 'Receptionist', description: null, organizationId: null, systemDefined: true, permissions: [] },
    ];
    if (isSchoolAdmin) {
      defaults.unshift(
        { id: -5, code: 'PRINCIPAL', name: 'Principal', description: null, organizationId: null, systemDefined: true, permissions: [] },
        { id: -6, code: 'SCHOOL_ADMIN', name: 'School Admin', description: null, organizationId: null, systemDefined: true, permissions: [] }
      );
    }
    return defaults;
  }, [roles, isSchoolAdmin]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDispatched(null);
    setCopied(false);

    if (preselectedStaff) {
      setEmail(preselectedStaff.email || '');
      setFirstName(preselectedStaff.firstName || '');
      setLastName(preselectedStaff.lastName || '');
      const cleanPhone = (preselectedStaff.phoneNumber || '').replace(
        /\s+/g,
        ''
      );
      setPhoneNumber(cleanPhone);
      const isTeacher = Boolean(preselectedStaff.teachingStaff);
      setTargetType(isTeacher ? 'TEACHER' : 'STAFF');
      const defaultRole = isTeacher ? 'TEACHER' : 'SCHOOL_STAFF';
      setRoleCode(
        assignableRoles.some((r) => r.code === defaultRole)
          ? defaultRole
          : assignableRoles[0]?.code || defaultRole
      );
    } else {
      setEmail('');
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setTargetType('TEACHER');
      setRoleCode(
        assignableRoles.some((r) => r.code === 'TEACHER')
          ? 'TEACHER'
          : assignableRoles[0]?.code || 'TEACHER'
      );
    }
    setExpiryHours('168');
  }, [open, preselectedStaff, assignableRoles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Recipient email address is required.');
      return;
    }
    if (!roleCode) {
      setError('Please select an organization role.');
      return;
    }
    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (cleanPhone && !/^(\+91)?[6-9]\d{9}$/.test(cleanPhone)) {
      setError(
        'Phone number must be a valid 10-digit Indian mobile number (optionally prefixed with +91).'
      );
      return;
    }
    const hours = expiryHours.trim() ? Number(expiryHours) : 168;
    if (Number.isNaN(hours) || hours < 1 || hours > 720) {
      setError('Expiry hours must be between 1 and 720.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        email: email.trim(),
        roleCode,
        targetType,
        targetProfileId: preselectedStaff ? preselectedStaff.id : null,
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        phoneNumber: cleanPhone || null,
        expiryHours: hours,
      });
      setDispatched(result);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to send staff invitation.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!dispatched) return;
    try {
      await navigator.clipboard.writeText(dispatched.invitationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        dispatched
          ? 'Invitation Dispatched Successfully'
          : preselectedStaff
            ? `Invite ${formatStaffFullName(preselectedStaff)} to School Workspace`
            : 'Invite Staff or Teacher'
      }
      description={
        dispatched
          ? 'The single-use invitation has been created. Once accepted, the user account will be linked to the organization and assigned the selected role.'
          : 'Send an organization invitation by email to grant workspace access and link the recipient account to their staff/teacher profile.'
      }
      maxWidthClass="max-w-lg"
      footer={
        dispatched ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="staff-invitation-form"
              disabled={submitting}
            >
              {submitting ? 'Sending Invitation...' : 'Send Invitation'}
            </Button>
          </>
        )
      }
    >
      {dispatched ? (
        <div className="space-y-4 text-xs">
          <AlertBanner
            variant="success"
            message={`Invitation sent to ${dispatched.invitation.email} for role ${dispatched.invitation.roleCode}.`}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Recipient Email:</span>
              <span className="font-semibold text-slate-900">
                {dispatched.invitation.email}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Assigned Role:</span>
              <IdLabel>{dispatched.invitation.roleCode}</IdLabel>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Target Profile Type:</span>
              <span className="font-medium text-slate-800">
                {dispatched.invitation.targetType}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <p className="font-medium text-slate-700">
                Single-Use Invitation Link:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={dispatched.invitationLink}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-700"
                />
                <Button size="sm" variant="outline" onClick={handleCopyLink}>
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form
          id="staff-invitation-form"
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {error && <AlertBanner variant="error" message={error} />}

          {preselectedStaff && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">
                  Linking to Staff Profile:{' '}
                  {formatStaffFullName(preselectedStaff)}
                </span>
                <IdLabel>{preselectedStaff.employeeId}</IdLabel>
              </div>
              <p className="text-slate-600">
                {preselectedStaff.designation}
                {preselectedStaff.department
                  ? ` • ${preselectedStaff.department}`
                  : ''}
              </p>
            </div>
          )}

          <FormField label="Recipient Email Address" required>
            <TextInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@school.edu"
              maxLength={255}
              required
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Target Profile Type" required>
              <SelectInput
                value={targetType}
                disabled={Boolean(preselectedStaff)}
                onChange={(e) =>
                  setTargetType(e.target.value as InvitationTargetType)
                }
              >
                <option value="TEACHER">Teacher Profile (TEACHER)</option>
                <option value="STAFF">Staff Profile (STAFF)</option>
                {isSchoolAdmin && (
                  <option value="SCHOOL_ADMIN">
                    School Administrator (SCHOOL_ADMIN)
                  </option>
                )}
              </SelectInput>
            </FormField>

            <FormField label="Organization Role" required>
              <SelectInput
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value)}
                required
              >
                {assignableRoles.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField label="First Name">
              <TextInput
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                maxLength={100}
              />
            </FormField>

            <FormField label="Last Name">
              <TextInput
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                maxLength={100}
              />
            </FormField>

            <FormField
              label="Mobile Number (10-digit Indian)"
              hint="Optional, e.g. 9876543210 or +919876543210"
            >
              <TextInput
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="9876543210"
                maxLength={13}
              />
            </FormField>

            <FormField label="Invitation Expiry (Hours)">
              <TextInput
                type="number"
                min={1}
                max={720}
                value={expiryHours}
                onChange={(e) => setExpiryHours(e.target.value)}
              />
            </FormField>
          </div>
        </form>
      )}
    </Dialog>
  );
};






















