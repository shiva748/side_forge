import type { BadgeVariant } from '../components/ui/Badge';
import type { Gender, StoredFileResponse } from './studentManagement';

export type { Gender, StoredFileResponse };

export type EmploymentType =
  | 'PERMANENT'
  | 'CONTRACTUAL'
  | 'TEMPORARY'
  | 'PART_TIME'
  | 'PROBATION'
  | 'VISITING';

export type EmploymentStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'ON_LEAVE'
  | 'SUSPENDED'
  | 'RESIGNED'
  | 'TERMINATED';

export type InvitationTargetType =
  | 'SCHOOL_ADMIN'
  | 'STAFF'
  | 'TEACHER'
  | 'GUARDIAN'
  | 'STUDENT'
  | 'MEMBER';

export type InvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REVOKED';

// ============================================================================
// Staff DTOs (matches com.side.forge.organization.staff.dto.*)
// ============================================================================

export interface StaffResponse {
  id: number;
  organizationId: number;
  userId: number | null;
  employeeId: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  email: string | null;
  phoneNumber: string;
  alternatePhoneNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  joiningDate: string;
  leavingDate: string | null;
  designation: string;
  department: string | null;
  employmentType: EmploymentType;
  employmentStatus: EmploymentStatus;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  teachingStaff: boolean;
  professionalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStaffRequest {
  employeeId: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  email?: string | null;
  phoneNumber: string;
  alternatePhoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  joiningDate: string;
  designation: string;
  department?: string | null;
  employmentType?: EmploymentType | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  teachingStaff?: boolean | null;
  professionalNotes?: string | null;
  userId?: number | null;
  // Optional initial teacher-profile fields when teachingStaff == true
  qualifications?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  registrationNumber?: string | null;
  certifications?: string | null;
  teachingNotes?: string | null;
}

export interface UpdateStaffRequest {
  employeeId: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  email?: string | null;
  phoneNumber: string;
  alternatePhoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  joiningDate: string;
  designation: string;
  department?: string | null;
  employmentType?: EmploymentType | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  teachingStaff?: boolean | null;
  professionalNotes?: string | null;
  userId?: number | null;
}

export interface ChangeStaffStatusRequest {
  employmentStatus: EmploymentStatus;
  leavingDate?: string | null;
  professionalNotes?: string | null;
}

export interface LinkStaffUserRequest {
  userId: number | null;
}

export interface StaffDirectoryQueryParams {
  search?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  employmentType?: EmploymentType | '';
  employmentStatus?: EmploymentStatus | '';
  teachingStaff?: boolean | '';
  page?: number;
  size?: number;
  sortBy?:
    | 'id'
    | 'employeeId'
    | 'firstName'
    | 'lastName'
    | 'joiningDate'
    | 'designation'
    | 'department'
    | 'employmentStatus'
    | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

// ============================================================================
// Teacher DTOs (matches com.side.forge.organization.teacher.dto.*)
// ============================================================================

export interface TeacherResponse {
  id: number;
  organizationId: number;
  staffId: number;
  userId: number | null;
  employeeId: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  email: string | null;
  phoneNumber: string | null;
  alternatePhoneNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  joiningDate: string | null;
  leavingDate: string | null;
  designation: string | null;
  department: string | null;
  employmentType: EmploymentType | null;
  employmentStatus: EmploymentStatus | null;
  qualifications: string | null;
  specialization: string | null;
  experienceYears: number | null;
  registrationNumber: string | null;
  certifications: string | null;
  teachingNotes: string | null;
  availableForAssignment: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherRequest {
  staffId?: number | null;
  employeeId?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  email?: string | null;
  phoneNumber?: string | null;
  alternatePhoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  joiningDate?: string | null;
  designation?: string | null;
  department?: string | null;
  employmentType?: EmploymentType | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  professionalNotes?: string | null;
  userId?: number | null;
  qualifications?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  registrationNumber?: string | null;
  certifications?: string | null;
  teachingNotes?: string | null;
  availableForAssignment?: boolean | null;
}

export interface UpdateTeacherProfileRequest {
  qualifications?: string | null;
  specialization?: string | null;
  experienceYears?: number | null;
  registrationNumber?: string | null;
  certifications?: string | null;
  teachingNotes?: string | null;
  availableForAssignment?: boolean | null;
}

export interface ChangeTeacherStatusRequest {
  employmentStatus?: EmploymentStatus | null;
  availableForAssignment?: boolean | null;
  leavingDate?: string | null;
  teachingNotes?: string | null;
}

export interface TeacherDirectoryQueryParams {
  search?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  employmentType?: EmploymentType | '';
  employmentStatus?: EmploymentStatus | '';
  specialization?: string;
  availableForAssignment?: boolean | '';
  academicSessionId?: number | '';
  classId?: number | '';
  subjectId?: number | '';
  page?: number;
  size?: number;
  sortBy?:
    | 'id'
    | 'staffId'
    | 'specialization'
    | 'experienceYears'
    | 'availableForAssignment'
    | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

// ============================================================================
// Teacher-Class & Teacher-Subject Assignment DTOs
// ============================================================================

export interface TeacherClassAssignmentResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string | null;
  classId: number;
  className: string | null;
  classCode: string | null;
  teacherId: number;
  staffId: number | null;
  teacherEmployeeId: string | null;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  classTeacher: boolean;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignTeacherClassRequest {
  teacherId: number;
  classTeacher?: boolean | null;
  remarks?: string | null;
}

export interface UpdateTeacherClassAssignmentRequest {
  classTeacher?: boolean | null;
  remarks?: string | null;
}

export interface TeacherSubjectAssignmentResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  academicSessionName: string | null;
  classId: number;
  className: string | null;
  classCode: string | null;
  subjectId: number;
  subjectName: string | null;
  subjectCode: string | null;
  teacherId: number;
  staffId: number | null;
  teacherEmployeeId: string | null;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignTeacherSubjectRequest {
  teacherId: number;
  remarks?: string | null;
}

export interface UpdateTeacherSubjectAssignmentRequest {
  remarks?: string | null;
}

// ============================================================================
// Organization Invitations & Role DTOs
// ============================================================================

export interface CreateInvitationRequest {
  email: string;
  roleCode: string;
  targetType?: InvitationTargetType | null;
  targetProfileId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  expiryHours?: number | null;
}

export interface InvitationResponse {
  id: number;
  organizationId: number;
  organizationName: string;
  email: string;
  roleCode: string;
  targetType: InvitationTargetType;
  targetProfileId: number | null;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  recipientPhone: string | null;
  status: InvitationStatus;
  expiresAt: string;
  invitedByUserId: number;
  onboardingRequestId: number | null;
  resendCount: number;
  lastSentAt: string;
  acceptedByUserId: number | null;
  acceptedAt: string | null;
  revokedByUserId: number | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface InvitationDispatchResponse {
  invitation: InvitationResponse;
  invitationLink: string;
  invitationToken: string;
}

export interface OrganizationMemberSummaryDto {
  membershipId: number;
  userId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  membershipStatus: string;
  roles: string[];
}

// ============================================================================
// Display & Status Helpers
// ============================================================================

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  PERMANENT: 'Permanent',
  CONTRACTUAL: 'Contractual',
  TEMPORARY: 'Temporary',
  PART_TIME: 'Part-Time',
  PROBATION: 'Probation',
  VISITING: 'Visiting Faculty',
};

export const EMPLOYMENT_STATUS_META: Record<
  EmploymentStatus,
  { label: string; variant: BadgeVariant; description: string }
> = {
  ACTIVE: {
    label: 'Active',
    variant: 'success',
    description: 'Currently employed and active in school operations.',
  },
  ON_LEAVE: {
    label: 'On Leave',
    variant: 'warning',
    description:
      'Temporarily on approved leave. Teaching assignment availability is paused.',
  },
  INACTIVE: {
    label: 'Inactive',
    variant: 'neutral',
    description:
      'Temporarily inactive staff record. Teaching assignment availability is paused.',
  },
  SUSPENDED: {
    label: 'Suspended',
    variant: 'danger',
    description:
      'Employment temporarily suspended. Teaching assignment availability is paused.',
  },
  RESIGNED: {
    label: 'Resigned',
    variant: 'info',
    description:
      'Historical record — staff member resigned. Terminal state (cannot be transitioned further).',
  },
  TERMINATED: {
    label: 'Terminated',
    variant: 'danger',
    description:
      'Historical record — employment terminated. Terminal state (cannot be transitioned further).',
  },
};

export const INVITATION_STATUS_META: Record<
  InvitationStatus,
  { label: string; variant: BadgeVariant }
> = {
  PENDING: { label: 'Pending Acceptance', variant: 'warning' },
  ACCEPTED: { label: 'Accepted', variant: 'success' },
  REJECTED: { label: 'Declined', variant: 'danger' },
  EXPIRED: { label: 'Expired', variant: 'neutral' },
  REVOKED: { label: 'Revoked', variant: 'danger' },
};

export const INVITATION_TARGET_TYPE_LABELS: Record<InvitationTargetType, string> = {
  SCHOOL_ADMIN: 'School Administrator',
  STAFF: 'Staff Profile',
  TEACHER: 'Teacher Faculty Profile',
  GUARDIAN: 'Guardian / Parent Profile',
  STUDENT: 'Student Profile',
  MEMBER: 'Organization Member',
};

export function getInvitationTargetTypeLabel(
  targetType: InvitationTargetType | string | null | undefined
): string {
  if (!targetType) return 'Organization Member';
  return (
    INVITATION_TARGET_TYPE_LABELS[targetType as InvitationTargetType] ||
    targetType
  );
}

export function isTerminalEmploymentStatus(
  status: EmploymentStatus | null | undefined
): boolean {
  return status === 'RESIGNED' || status === 'TERMINATED';
}

export function getEmploymentStatusBadge(
  status: EmploymentStatus | null | undefined
): {
  label: string;
  variant: BadgeVariant;
} {
  if (!status) {
    return { label: 'Unknown', variant: 'neutral' };
  }
  return (
    EMPLOYMENT_STATUS_META[status] || {
      label: status,
      variant: 'neutral',
    }
  );
}

export function getInvitationStatusBadge(
  status: InvitationStatus | null | undefined
): {
  label: string;
  variant: BadgeVariant;
} {
  if (!status) {
    return { label: 'Unknown', variant: 'neutral' };
  }
  return (
    INVITATION_STATUS_META[status] || {
      label: status,
      variant: 'neutral',
    }
  );
}

export function formatStaffFullName(
  person:
    | {
        firstName?: string | null;
        middleName?: string | null;
        lastName?: string | null;
      }
    | null
    | undefined
): string {
  if (!person) return '—';
  const parts = [person.firstName, person.middleName, person.lastName]
    .map((p) => (p ? p.trim() : ''))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '—';
}

export function formatStaffInitials(
  person:
    | {
        firstName?: string | null;
        lastName?: string | null;
      }
    | null
    | undefined
): string {
  if (!person) return 'ST';
  const first = person.firstName?.trim()?.[0] || '';
  const last = person.lastName?.trim()?.[0] || '';
  return (first + last).toUpperCase() || 'ST';
}

export function formatTeacherAssignmentName(
  assignment: {
    teacherFirstName?: string | null;
    teacherLastName?: string | null;
    teacherEmployeeId?: string | null;
    teacherId: number;
  }
): string {
  const parts = [assignment.teacherFirstName, assignment.teacherLastName]
    .map((p) => (p ? p.trim() : ''))
    .filter(Boolean);
  if (parts.length > 0) return parts.join(' ');
  if (assignment.teacherEmployeeId) return assignment.teacherEmployeeId;
  return `Teacher #${assignment.teacherId}`;
}

