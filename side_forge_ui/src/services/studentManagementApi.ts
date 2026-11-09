import { apiClient, buildUrl } from '../lib/api-client';
import type { PagedResponse } from '../types/onboarding';
import type {
  ChangeEnrollmentStatusRequest,
  ChangeStudentStatusRequest,
  CreateEnrollmentRequest,
  CreateGuardianRequest,
  CreateStudentRequest,
  EnrollmentDirectoryQueryParams,
  EnrollmentStatus,
  GuardianResponse,
  GuardianStudentLinkResponse,
  LinkStudentGuardianRequest,
  StoredFileResponse,
  StudentDirectoryQueryParams,
  StudentEnrollmentResponse,
  StudentGuardianResponse,
  StudentResponse,
  UpdateEnrollmentRequest,
  UpdateGuardianRequest,
  UpdateStudentGuardianRequest,
  UpdateStudentRequest,
} from '../types/studentManagement';

export const studentManagementApi = {
  // =========================================================================
  // Students (/api/organizations/{organizationId}/students)
  // =========================================================================
  listStudents(
    organizationId: number,
    params: StudentDirectoryQueryParams = {}
  ): Promise<PagedResponse<StudentResponse>> {
    return apiClient.get<PagedResponse<StudentResponse>>(
      `/api/organizations/${organizationId}/students`,
      {
        params: {
          search: params.search?.trim() || undefined,
          admissionNumber: params.admissionNumber?.trim() || undefined,
          status: params.status || undefined,
          gender: params.gender || undefined,
          academicSessionId: params.academicSessionId || undefined,
          classId: params.classId || undefined,
          page: params.page ?? 0,
          size: params.size ?? 15,
          sortBy: params.sortBy || 'firstName',
          sortDir: params.sortDir || 'asc',
        },
      }
    );
  },

  getStudentById(organizationId: number, studentId: number): Promise<StudentResponse> {
    return apiClient.get<StudentResponse>(
      `/api/organizations/${organizationId}/students/${studentId}`
    );
  },

  createStudent(
    organizationId: number,
    payload: CreateStudentRequest
  ): Promise<StudentResponse> {
    return apiClient.post<StudentResponse>(
      `/api/organizations/${organizationId}/students`,
      payload
    );
  },

  updateStudent(
    organizationId: number,
    studentId: number,
    payload: UpdateStudentRequest
  ): Promise<StudentResponse> {
    return apiClient.put<StudentResponse>(
      `/api/organizations/${organizationId}/students/${studentId}`,
      payload
    );
  },

  changeStudentStatus(
    organizationId: number,
    studentId: number,
    payload: ChangeStudentStatusRequest
  ): Promise<StudentResponse> {
    return apiClient.patch<StudentResponse>(
      `/api/organizations/${organizationId}/students/${studentId}/status`,
      payload
    );
  },

  // =========================================================================
  // Student Photo & Documents (Centralized File Service)
  // =========================================================================
  uploadStudentPhoto(
    organizationId: number,
    studentId: number,
    file: File
  ): Promise<StoredFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<StoredFileResponse>(
      `/api/organizations/${organizationId}/students/${studentId}/photo`,
      formData
    );
  },

  getStudentPhotoUrl(organizationId: number, studentId: number, cacheBust?: number): string {
    return buildUrl(`/api/organizations/${organizationId}/students/${studentId}/photo`, {
      t: cacheBust,
    });
  },

  listStudentDocuments(
    organizationId: number,
    studentId: number
  ): Promise<StoredFileResponse[]> {
    return apiClient.get<StoredFileResponse[]>(
      `/api/organizations/${organizationId}/students/${studentId}/documents`
    );
  },

  uploadStudentDocument(
    organizationId: number,
    studentId: number,
    file: File
  ): Promise<StoredFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<StoredFileResponse>(
      `/api/organizations/${organizationId}/students/${studentId}/documents`,
      formData
    );
  },

  getStudentDocumentDownloadUrl(
    organizationId: number,
    studentId: number,
    fileId: number
  ): string {
    return buildUrl(
      `/api/organizations/${organizationId}/students/${studentId}/documents/${fileId}`
    );
  },

  deleteStudentDocument(
    organizationId: number,
    studentId: number,
    fileId: number
  ): Promise<void> {
    return apiClient.delete<void>(
      `/api/organizations/${organizationId}/students/${studentId}/documents/${fileId}`
    );
  },

  // =========================================================================
  // Student Enrollments (/api/organizations/{organizationId}/enrollments)
  // =========================================================================
  listEnrollments(
    organizationId: number,
    params: EnrollmentDirectoryQueryParams = {}
  ): Promise<PagedResponse<StudentEnrollmentResponse>> {
    return apiClient.get<PagedResponse<StudentEnrollmentResponse>>(
      `/api/organizations/${organizationId}/enrollments`,
      {
        params: {
          academicSessionId: params.academicSessionId || undefined,
          classId: params.classId || undefined,
          studentId: params.studentId || undefined,
          status: params.status || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
          sortBy: params.sortBy || 'enrollmentDate',
          sortDir: params.sortDir || 'desc',
        },
      }
    );
  },

  getStudentEnrollmentHistory(
    organizationId: number,
    studentId: number
  ): Promise<StudentEnrollmentResponse[]> {
    return apiClient.get<StudentEnrollmentResponse[]>(
      `/api/organizations/${organizationId}/students/${studentId}/enrollments`
    );
  },

  getSessionEnrollments(
    organizationId: number,
    sessionId: number,
    params?: { classId?: number; status?: EnrollmentStatus; page?: number; size?: number }
  ): Promise<PagedResponse<StudentEnrollmentResponse>> {
    return apiClient.get<PagedResponse<StudentEnrollmentResponse>>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/enrollments`,
      {
        params: {
          classId: params?.classId,
          status: params?.status,
          page: params?.page ?? 0,
          size: params?.size ?? 20,
        },
      }
    );
  },

  enrollStudent(
    organizationId: number,
    payload: CreateEnrollmentRequest
  ): Promise<StudentEnrollmentResponse> {
    return apiClient.post<StudentEnrollmentResponse>(
      `/api/organizations/${organizationId}/enrollments`,
      payload
    );
  },

  updateEnrollment(
    organizationId: number,
    enrollmentId: number,
    payload: UpdateEnrollmentRequest
  ): Promise<StudentEnrollmentResponse> {
    return apiClient.put<StudentEnrollmentResponse>(
      `/api/organizations/${organizationId}/enrollments/${enrollmentId}`,
      payload
    );
  },

  changeEnrollmentStatus(
    organizationId: number,
    enrollmentId: number,
    payload: ChangeEnrollmentStatusRequest
  ): Promise<StudentEnrollmentResponse> {
    return apiClient.patch<StudentEnrollmentResponse>(
      `/api/organizations/${organizationId}/enrollments/${enrollmentId}/status`,
      payload
    );
  },

  // =========================================================================
  // Guardians & Student-Guardian Links
  // =========================================================================
  listOrganizationGuardians(organizationId: number): Promise<GuardianResponse[]> {
    return apiClient.get<GuardianResponse[]>(
      `/api/organizations/${organizationId}/guardians`
    );
  },

  createGuardian(
    organizationId: number,
    payload: CreateGuardianRequest
  ): Promise<GuardianResponse> {
    return apiClient.post<GuardianResponse>(
      `/api/organizations/${organizationId}/guardians`,
      payload
    );
  },

  updateGuardian(
    organizationId: number,
    guardianId: number,
    payload: UpdateGuardianRequest
  ): Promise<GuardianResponse> {
    return apiClient.put<GuardianResponse>(
      `/api/organizations/${organizationId}/guardians/${guardianId}`,
      payload
    );
  },

  listGuardianStudents(
    organizationId: number,
    guardianId: number
  ): Promise<GuardianStudentLinkResponse[]> {
    return apiClient.get<GuardianStudentLinkResponse[]>(
      `/api/organizations/${organizationId}/guardians/${guardianId}/students`
    );
  },

  listStudentGuardians(
    organizationId: number,
    studentId: number
  ): Promise<StudentGuardianResponse[]> {
    return apiClient.get<StudentGuardianResponse[]>(
      `/api/organizations/${organizationId}/students/${studentId}/guardians`
    );
  },

  linkGuardianToStudent(
    organizationId: number,
    studentId: number,
    payload: LinkStudentGuardianRequest
  ): Promise<StudentGuardianResponse> {
    return apiClient.post<StudentGuardianResponse>(
      `/api/organizations/${organizationId}/students/${studentId}/guardians`,
      payload
    );
  },

  updateStudentGuardianLink(
    organizationId: number,
    studentId: number,
    guardianId: number,
    payload: UpdateStudentGuardianRequest
  ): Promise<StudentGuardianResponse> {
    return apiClient.put<StudentGuardianResponse>(
      `/api/organizations/${organizationId}/students/${studentId}/guardians/${guardianId}`,
      payload
    );
  },

  unlinkGuardianFromStudent(
    organizationId: number,
    studentId: number,
    guardianId: number
  ): Promise<void> {
    return apiClient.delete<void>(
      `/api/organizations/${organizationId}/students/${studentId}/guardians/${guardianId}`
    );
  },
};
