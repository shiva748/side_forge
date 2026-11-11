import type { BadgeProps } from '../components/ui/Badge';
import type { AcademicSessionStatus } from './academicManagement';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type StudentStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'GRADUATED'
  | 'TRANSFERRED'
  | 'WITHDRAWN';

export type EnrollmentStatus =
  | 'ACTIVE'
  | 'PROMOTED'
  | 'COMPLETED'
  | 'TRANSFERRED'
  | 'WITHDRAWN'
  | 'DROPPED';

export type GuardianRelationshipType = 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'OTHER';

export interface StudentResponse {
  id: number;
  organizationId: number;
  userId: number | null;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string;
  gender: Gender;
  email: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  admissionDate: string;
  bloodGroup: string | null;
  nationality: string | null;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentRequest {
  admissionNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth: string;
  gender: Gender;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  admissionDate: string;
  bloodGroup?: string | null;
  nationality?: string | null;
  userId?: number | null;
}

export interface UpdateStudentRequest {
  admissionNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth: string;
  gender: Gender;
  email?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  admissionDate: string;
  bloodGroup?: string | null;
  nationality?: string | null;
  userId?: number | null;
}

export interface ChangeStudentStatusRequest {
  status: StudentStatus;
}

export interface StudentEnrollmentResponse {
  id: number;
  organizationId: number;
  studentId: number;
  academicSessionId: number;
  academicSessionName: string | null;
  classId: number;
  className: string | null;
  classCode: string | null;
  sectionId: number | null;
  sectionName: string | null;
  rollNumber: string | null;
  enrollmentDate: string;
  status: EnrollmentStatus;
  remarks: string | null;
  student: StudentResponse | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnrollmentRequest {
  studentId: number;
  academicSessionId: number;
  classId: number;
  sectionId?: number | null;
  rollNumber?: string | null;
  enrollmentDate?: string | null;
  remarks?: string | null;
}

export interface UpdateEnrollmentRequest {
  classId: number;
  sectionId?: number | null;
  rollNumber?: string | null;
  enrollmentDate?: string | null;
  remarks?: string | null;
}

export interface ChangeEnrollmentStatusRequest {
  status: EnrollmentStatus;
  remarks?: string | null;
}

export interface GuardianResponse {
  id: number;
  organizationId: number;
  userId: number | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phoneNumber: string;
  alternatePhoneNumber: string | null;
  address: string | null;
  occupation: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGuardianRequest {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phoneNumber: string;
  alternatePhoneNumber?: string | null;
  address?: string | null;
  occupation?: string | null;
  userId?: number | null;
}

export interface UpdateGuardianRequest {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phoneNumber: string;
  alternatePhoneNumber?: string | null;
  address?: string | null;
  occupation?: string | null;
  userId?: number | null;
}

export interface StudentGuardianResponse {
  id: number;
  organizationId: number;
  studentId: number;
  guardianId: number;
  relationshipType: GuardianRelationshipType;
  primaryContact: boolean;
  emergencyContact: boolean;
  receiveNotifications: boolean;
  guardian: GuardianResponse;
  createdAt: string;
  updatedAt: string;
}

export interface GuardianStudentLinkResponse {
  id: number;
  organizationId: number;
  studentId: number;
  guardianId: number;
  relationshipType: GuardianRelationshipType;
  primaryContact: boolean;
  emergencyContact: boolean;
  receiveNotifications: boolean;
  student: StudentResponse;
  createdAt: string;
  updatedAt: string;
}

export interface LinkStudentGuardianRequest {
  guardianId: number;
  relationshipType: GuardianRelationshipType;
  primaryContact: boolean;
  emergencyContact: boolean;
  receiveNotifications: boolean;
}

export interface UpdateStudentGuardianRequest {
  relationshipType: GuardianRelationshipType;
  primaryContact: boolean;
  emergencyContact: boolean;
  receiveNotifications: boolean;
}

export interface StoredFileResponse {
  id: number;
  fileUid: string;
  organizationId: number | null;
  uploadedByUserId: number | null;
  category: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  downloadUrl: string;
  createdAt: string;
}

export interface StudentDirectoryQueryParams {
  search?: string;
  admissionNumber?: string;
  status?: StudentStatus | '';
  gender?: Gender | '';
  academicSessionId?: number | '';
  classId?: number | '';
  sectionId?: number | '';
  page?: number;
  size?: number;
  sortBy?:
    | 'id'
    | 'admissionNumber'
    | 'firstName'
    | 'lastName'
    | 'admissionDate'
    | 'dateOfBirth'
    | 'status'
    | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

export interface EnrollmentDirectoryQueryParams {
  academicSessionId?: number | '';
  classId?: number | '';
  sectionId?: number | '';
  studentId?: number | '';
  status?: EnrollmentStatus | '';
  page?: number;
  size?: number;
  sortBy?: 'enrollmentDate' | 'rollNumber' | 'status' | 'createdAt' | 'id';
  sortDir?: 'asc' | 'desc';
}

export interface ClassStudentRosterQueryParams {
  sectionId?: number | '';
  search?: string;
  status?: StudentStatus | '';
  gender?: Gender | '';
  page?: number;
  size?: number;
  sortBy?:
    | 'firstName'
    | 'lastName'
    | 'admissionNumber'
    | 'admissionDate'
    | 'dateOfBirth'
    | 'status'
    | 'createdAt';
  sortDir?: 'asc' | 'desc';
}

export const STUDENT_STATUS_META: Record<
  StudentStatus,
  { label: string; variant: BadgeProps['variant']; description: string }
> = {
  ACTIVE: {
    label: 'Active',
    variant: 'success',
    description: 'Student is actively registered and eligible for academic session enrollments.',
  },
  INACTIVE: {
    label: 'Inactive',
    variant: 'neutral',
    description: 'Student record is temporarily inactive while preserving historical records.',
  },
  SUSPENDED: {
    label: 'Suspended',
    variant: 'warning',
    description: 'Student is temporarily suspended from normal academic activities.',
  },
  GRADUATED: {
    label: 'Graduated',
    variant: 'info',
    description: 'Student has completed their studies and graduated from the school.',
  },
  TRANSFERRED: {
    label: 'Transferred',
    variant: 'info',
    description: 'Student has transferred to another institution.',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    variant: 'danger',
    description: 'Student has been withdrawn from the school.',
  },
};

export const ENROLLMENT_STATUS_META: Record<
  EnrollmentStatus,
  { label: string; variant: BadgeProps['variant']; description: string }
> = {
  ACTIVE: {
    label: 'Active',
    variant: 'success',
    description: 'Currently enrolled in this academic session and class.',
  },
  PROMOTED: {
    label: 'Promoted',
    variant: 'info',
    description: 'Student has been promoted to the next class/session.',
  },
  COMPLETED: {
    label: 'Completed',
    variant: 'neutral',
    description: 'Academic session enrollment completed.',
  },
  TRANSFERRED: {
    label: 'Transferred',
    variant: 'info',
    description: 'Student transferred out during this session.',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    variant: 'warning',
    description: 'Student withdrew from this academic session.',
  },
  DROPPED: {
    label: 'Dropped',
    variant: 'danger',
    description: 'Enrollment was dropped for this academic session.',
  },
};

export const GENDER_LABELS: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};

export const GUARDIAN_RELATIONSHIP_LABELS: Record<GuardianRelationshipType, string> = {
  FATHER: 'Father',
  MOTHER: 'Mother',
  GUARDIAN: 'Legal Guardian',
  OTHER: 'Other Relative',
};

export function getStudentStatusBadge(status: StudentStatus): {
  label: string;
  variant: BadgeProps['variant'];
} {
  return STUDENT_STATUS_META[status] || { label: status, variant: 'neutral' };
}

export function getEnrollmentStatusBadge(status: EnrollmentStatus): {
  label: string;
  variant: BadgeProps['variant'];
} {
  return ENROLLMENT_STATUS_META[status] || { label: status, variant: 'neutral' };
}

export function formatStudentFullName(
  student?: Pick<StudentResponse, 'firstName' | 'middleName' | 'lastName'> | null
): string {
  if (!student) return 'Unknown Student';
  return (
    [student.firstName, student.middleName, student.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ') || 'Unnamed Student'
  );
}

export function formatStudentInitials(
  student?: Pick<StudentResponse, 'firstName' | 'middleName' | 'lastName'> | null
): string {
  if (!student) return 'ST';
  const first = student.firstName?.trim()?.[0] || '';
  const last = student.lastName?.trim()?.[0] || student.middleName?.trim()?.[0] || '';
  return (first + last).toUpperCase() || 'ST';
}

export function formatGuardianFullName(
  guardian?: Pick<GuardianResponse, 'firstName' | 'lastName'> | null
): string {
  if (!guardian) return 'Unknown Guardian';
  return (
    [guardian.firstName, guardian.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(' ') || 'Unnamed Guardian'
  );
}

export function formatGuardianInitials(
  guardian?: Pick<GuardianResponse, 'firstName' | 'lastName'> | null
): string {
  if (!guardian) return 'GD';
  const first = guardian.firstName?.trim()?.[0] || '';
  const last = guardian.lastName?.trim()?.[0] || '';
  return (first + last).toUpperCase() || 'GD';
}


