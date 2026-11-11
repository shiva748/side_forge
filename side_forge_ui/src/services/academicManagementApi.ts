import { apiClient } from '../lib/api-client';
import {
  AcademicSessionResponse,
  AcademicSessionStatus,
  AssignClassSubjectRequest,
  ClassSubjectResponse,
  CreateAcademicSessionRequest,
  CreateSchoolClassRequest,
  CreateSectionRequest,
  CreateSubjectRequest,
  SchoolClassResponse,
  SectionResponse,
  SubjectResponse,
  UpdateAcademicSessionRequest,
  UpdateSchoolClassRequest,
  UpdateSectionRequest,
  UpdateSubjectRequest,
} from '../types/academicManagement';

export const academicManagementApi = {
  // 1. Academic Sessions (`/api/organizations/{orgId}/academic-sessions`)
  getSessions: (orgId: number, status?: AcademicSessionStatus) =>
    apiClient.get<AcademicSessionResponse[]>(
      `/api/organizations/${orgId}/academic-sessions${
        status ? `?status=${encodeURIComponent(status)}` : ''
      }`
    ),

  getSessionById: (orgId: number, sessionId: number) =>
    apiClient.get<AcademicSessionResponse>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}`
    ),

  createSession: (orgId: number, payload: CreateAcademicSessionRequest) =>
    apiClient.post<AcademicSessionResponse>(
      `/api/organizations/${orgId}/academic-sessions`,
      payload
    ),

  updateSession: (
    orgId: number,
    sessionId: number,
    payload: UpdateAcademicSessionRequest
  ) =>
    apiClient.put<AcademicSessionResponse>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}`,
      payload
    ),

  startSession: (orgId: number, sessionId: number) =>
    apiClient.patch<AcademicSessionResponse>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}/start`
    ),

  completeSession: (orgId: number, sessionId: number) =>
    apiClient.patch<AcademicSessionResponse>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}/complete`
    ),

  // 2. Reusable School Classes (`/api/organizations/{orgId}/classes`)
  getClasses: (orgId: number, active?: boolean) =>
    apiClient.get<SchoolClassResponse[]>(
      `/api/organizations/${orgId}/classes${
        active !== undefined ? `?active=${active}` : ''
      }`
    ),

  getClassById: (orgId: number, classId: number) =>
    apiClient.get<SchoolClassResponse>(
      `/api/organizations/${orgId}/classes/${classId}`
    ),

  createClass: (orgId: number, payload: CreateSchoolClassRequest) =>
    apiClient.post<SchoolClassResponse>(
      `/api/organizations/${orgId}/classes`,
      payload
    ),

  updateClass: (
    orgId: number,
    classId: number,
    payload: UpdateSchoolClassRequest
  ) =>
    apiClient.put<SchoolClassResponse>(
      `/api/organizations/${orgId}/classes/${classId}`,
      payload
    ),

  deactivateClass: (orgId: number, classId: number) =>
    apiClient.patch<SchoolClassResponse>(
      `/api/organizations/${orgId}/classes/${classId}/deactivate`
    ),

  // 3. Reusable Subjects (`/api/organizations/{orgId}/subjects`)
  getSubjects: (orgId: number, active?: boolean) =>
    apiClient.get<SubjectResponse[]>(
      `/api/organizations/${orgId}/subjects${
        active !== undefined ? `?active=${active}` : ''
      }`
    ),

  getSubjectById: (orgId: number, subjectId: number) =>
    apiClient.get<SubjectResponse>(
      `/api/organizations/${orgId}/subjects/${subjectId}`
    ),

  createSubject: (orgId: number, payload: CreateSubjectRequest) =>
    apiClient.post<SubjectResponse>(
      `/api/organizations/${orgId}/subjects`,
      payload
    ),

  updateSubject: (
    orgId: number,
    subjectId: number,
    payload: UpdateSubjectRequest
  ) =>
    apiClient.put<SubjectResponse>(
      `/api/organizations/${orgId}/subjects/${subjectId}`,
      payload
    ),

  deactivateSubject: (orgId: number, subjectId: number) =>
    apiClient.patch<SubjectResponse>(
      `/api/organizations/${orgId}/subjects/${subjectId}/deactivate`
    ),

  // 4. Session-Specific Class-Subject Assignments
  getClassSubjects: (orgId: number, sessionId: number, classId: number) =>
    apiClient.get<ClassSubjectResponse[]>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}/classes/${classId}/subjects`
    ),

  assignSubjectToClass: (
    orgId: number,
    sessionId: number,
    classId: number,
    payload: AssignClassSubjectRequest
  ) =>
    apiClient.post<ClassSubjectResponse>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}/classes/${classId}/subjects`,
      payload
    ),

  removeSubjectFromClass: async (
    orgId: number,
    sessionId: number,
    classId: number,
    subjectId: number
  ): Promise<void> => {
    await apiClient.delete<void>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}/classes/${classId}/subjects/${subjectId}`
    );
  },

  // 5. Academic-Session-Specific Class Sections (`/api/organizations/{orgId}/academic-sessions/{sessionId}/sections`)
  getSections: (
    orgId: number,
    sessionId: number,
    params?: { classId?: number; active?: boolean }
  ) =>
    apiClient.get<SectionResponse[]>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}/sections`,
      {
        params: {
          classId: params?.classId || undefined,
          active: params?.active !== undefined ? params.active : undefined,
        },
      }
    ),

  getSectionById: (orgId: number, sessionId: number, sectionId: number) =>
    apiClient.get<SectionResponse>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}/sections/${sectionId}`
    ),

  createSection: (
    orgId: number,
    sessionId: number,
    payload: CreateSectionRequest
  ) =>
    apiClient.post<SectionResponse>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}/sections`,
      payload
    ),

  updateSection: (
    orgId: number,
    sessionId: number,
    sectionId: number,
    payload: UpdateSectionRequest
  ) =>
    apiClient.put<SectionResponse>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}/sections/${sectionId}`,
      payload
    ),

  deactivateSection: (orgId: number, sessionId: number, sectionId: number) =>
    apiClient.patch<SectionResponse>(
      `/api/organizations/${orgId}/academic-sessions/${sessionId}/sections/${sectionId}/deactivate`
    ),
};
