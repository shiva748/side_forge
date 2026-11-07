import { BadgeVariant } from '../components/ui/Badge';

export type AcademicSessionStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface AcademicSessionResponse {
  id: number;
  organizationId: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: AcademicSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAcademicSessionRequest {
  name: string;
}

export interface UpdateAcademicSessionRequest {
  name: string;
}

export interface SchoolClassResponse {
  id: number;
  organizationId: number;
  name: string;
  code: string;
  displayOrder: number;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchoolClassRequest {
  name: string;
  code: string;
  displayOrder?: number;
  description?: string;
}

export interface UpdateSchoolClassRequest {
  name: string;
  code: string;
  displayOrder?: number;
  description?: string;
}

export interface SubjectResponse {
  id: number;
  organizationId: number;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectRequest {
  name: string;
  code: string;
  description?: string;
}

export interface UpdateSubjectRequest {
  name: string;
  code: string;
  description?: string;
}

export interface ClassSubjectResponse {
  id: number;
  organizationId: number;
  academicSessionId: number;
  classId: number;
  subjectId: number;
  compulsory: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignClassSubjectRequest {
  subjectId: number;
  compulsory?: boolean;
  displayOrder?: number;
}

export function getSessionStatusBadgeMeta(status?: AcademicSessionStatus | string | null): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Active', variant: 'success' };
    case 'PLANNED':
      return { label: 'Planned', variant: 'info' };
    case 'COMPLETED':
      return { label: 'Completed', variant: 'neutral' };
    default:
      return { label: status || 'Unknown', variant: 'neutral' };
  }
}
