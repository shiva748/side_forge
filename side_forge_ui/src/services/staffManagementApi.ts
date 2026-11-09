import { apiClient, buildUrl } from '../lib/api-client';
import type { OrganizationRoleDto } from '../types/auth';
import type { PagedResponse } from '../types/onboarding';
import type {
  AssignTeacherClassRequest,
  AssignTeacherSubjectRequest,
  ChangeStaffStatusRequest,
  ChangeTeacherStatusRequest,
  CreateInvitationRequest,
  CreateStaffRequest,
  CreateTeacherRequest,
  InvitationDispatchResponse,
  InvitationResponse,
  InvitationStatus,
  InvitationTargetType,
  LinkStaffUserRequest,
  OrganizationMemberSummaryDto,
  StaffDirectoryQueryParams,
  StaffResponse,
  StoredFileResponse,
  TeacherClassAssignmentResponse,
  TeacherDirectoryQueryParams,
  TeacherResponse,
  TeacherSubjectAssignmentResponse,
  UpdateStaffRequest,
  UpdateTeacherClassAssignmentRequest,
  UpdateTeacherProfileRequest,
  UpdateTeacherSubjectAssignmentRequest,
} from '../types/staffManagement';

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export const staffManagementApi = {
  // ==========================================================================
  // 1. Staff Profiles & Employment Lifecycle
  // ==========================================================================
  async listStaff(
    organizationId: number,
    params: StaffDirectoryQueryParams = {}
  ): Promise<PagedResponse<StaffResponse>> {
    const query = buildQuery({
      search: params.search?.trim() || undefined,
      employeeId: params.employeeId?.trim() || undefined,
      department: params.department?.trim() || undefined,
      designation: params.designation?.trim() || undefined,
      employmentType: params.employmentType || undefined,
      employmentStatus: params.employmentStatus || undefined,
      teachingStaff:
        params.teachingStaff !== '' && params.teachingStaff !== undefined
          ? params.teachingStaff
          : undefined,
      page: params.page ?? 0,
      size: params.size ?? 15,
      sortBy: params.sortBy || 'firstName',
      sortDir: params.sortDir || 'asc',
    });
    return apiClient.get<PagedResponse<StaffResponse>>(
      `/api/organizations/${organizationId}/staff${query}`
    );
  },

  async getStaffById(
    organizationId: number,
    staffId: number
  ): Promise<StaffResponse> {
    return apiClient.get<StaffResponse>(
      `/api/organizations/${organizationId}/staff/${staffId}`
    );
  },

  async createStaff(
    organizationId: number,
    payload: CreateStaffRequest
  ): Promise<StaffResponse> {
    return apiClient.post<StaffResponse>(
      `/api/organizations/${organizationId}/staff`,
      payload
    );
  },

  async updateStaff(
    organizationId: number,
    staffId: number,
    payload: UpdateStaffRequest
  ): Promise<StaffResponse> {
    return apiClient.put<StaffResponse>(
      `/api/organizations/${organizationId}/staff/${staffId}`,
      payload
    );
  },

  async changeStaffStatus(
    organizationId: number,
    staffId: number,
    payload: ChangeStaffStatusRequest
  ): Promise<StaffResponse> {
    return apiClient.patch<StaffResponse>(
      `/api/organizations/${organizationId}/staff/${staffId}/status`,
      payload
    );
  },

  async associateUserAccount(
    organizationId: number,
    staffId: number,
    payload: LinkStaffUserRequest
  ): Promise<StaffResponse> {
    return apiClient.put<StaffResponse>(
      `/api/organizations/${organizationId}/staff/${staffId}/user-account`,
      payload
    );
  },

  // ==========================================================================
  // 2. Staff Documents (Centralized File Service)
  // ==========================================================================
  async listStaffDocuments(
    organizationId: number,
    staffId: number
  ): Promise<StoredFileResponse[]> {
    return apiClient.get<StoredFileResponse[]>(
      `/api/organizations/${organizationId}/staff/${staffId}/documents`
    );
  },

  async uploadStaffDocument(
    organizationId: number,
    staffId: number,
    file: File
  ): Promise<StoredFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<StoredFileResponse>(
      `/api/organizations/${organizationId}/staff/${staffId}/documents`,
      formData
    );
  },

  getStaffDocumentDownloadUrl(
    organizationId: number,
    staffId: number,
    fileId: number
  ): string {
    return buildUrl(
      `/api/organizations/${organizationId}/staff/${staffId}/documents/${fileId}`
    );
  },

  async deleteStaffDocument(
    organizationId: number,
    staffId: number,
    fileId: number
  ): Promise<void> {
    return apiClient.delete<void>(
      `/api/organizations/${organizationId}/staff/${staffId}/documents/${fileId}`
    );
  },

  // ==========================================================================
  // 3. Teacher Profiles & Directory
  // ==========================================================================
  async listTeachers(
    organizationId: number,
    params: TeacherDirectoryQueryParams = {}
  ): Promise<PagedResponse<TeacherResponse>> {
    const query = buildQuery({
      search: params.search?.trim() || undefined,
      employeeId: params.employeeId?.trim() || undefined,
      department: params.department?.trim() || undefined,
      designation: params.designation?.trim() || undefined,
      employmentType: params.employmentType || undefined,
      employmentStatus: params.employmentStatus || undefined,
      specialization: params.specialization?.trim() || undefined,
      availableForAssignment:
        params.availableForAssignment !== '' &&
        params.availableForAssignment !== undefined
          ? params.availableForAssignment
          : undefined,
      academicSessionId: params.academicSessionId || undefined,
      classId: params.classId || undefined,
      subjectId: params.subjectId || undefined,
      page: params.page ?? 0,
      size: params.size ?? 15,
      sortBy: params.sortBy || 'id',
      sortDir: params.sortDir || 'asc',
    });
    return apiClient.get<PagedResponse<TeacherResponse>>(
      `/api/organizations/${organizationId}/teachers${query}`
    );
  },

  async listAvailableTeachers(
    organizationId: number,
    params: {
      search?: string;
      specialization?: string;
      page?: number;
      size?: number;
      sortBy?: string;
      sortDir?: 'asc' | 'desc';
    } = {}
  ): Promise<PagedResponse<TeacherResponse>> {
    const query = buildQuery({
      search: params.search?.trim() || undefined,
      specialization: params.specialization?.trim() || undefined,
      page: params.page ?? 0,
      size: params.size ?? 10,
      sortBy: params.sortBy || 'id',
      sortDir: params.sortDir || 'asc',
    });
    return apiClient.get<PagedResponse<TeacherResponse>>(
      `/api/organizations/${organizationId}/teachers/available${query}`
    );
  },

  async getTeacherById(
    organizationId: number,
    teacherId: number
  ): Promise<TeacherResponse> {
    return apiClient.get<TeacherResponse>(
      `/api/organizations/${organizationId}/teachers/${teacherId}`
    );
  },

  async findTeacherByStaff(
    organizationId: number,
    staff: { id: number; employeeId: string }
  ): Promise<TeacherResponse | null> {
    const page = await staffManagementApi.listTeachers(organizationId, {
      employeeId: staff.employeeId,
      page: 0,
      size: 20,
    });
    return page.content.find((t) => t.staffId === staff.id) || null;
  },

  async createTeacher(
    organizationId: number,
    payload: CreateTeacherRequest
  ): Promise<TeacherResponse> {
    return apiClient.post<TeacherResponse>(
      `/api/organizations/${organizationId}/teachers`,
      payload
    );
  },

  async updateTeacherProfile(
    organizationId: number,
    teacherId: number,
    payload: UpdateTeacherProfileRequest
  ): Promise<TeacherResponse> {
    return apiClient.put<TeacherResponse>(
      `/api/organizations/${organizationId}/teachers/${teacherId}`,
      payload
    );
  },

  async changeTeacherStatus(
    organizationId: number,
    teacherId: number,
    payload: ChangeTeacherStatusRequest
  ): Promise<TeacherResponse> {
    return apiClient.patch<TeacherResponse>(
      `/api/organizations/${organizationId}/teachers/${teacherId}/status`,
      payload
    );
  },

  // ==========================================================================
  // 4. Teacher-Class & Teacher-Subject Assignments
  // ==========================================================================
  async assignTeacherToClass(
    organizationId: number,
    sessionId: number,
    classId: number,
    payload: AssignTeacherClassRequest
  ): Promise<TeacherClassAssignmentResponse> {
    return apiClient.post<TeacherClassAssignmentResponse>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/classes/${classId}/teachers`,
      payload
    );
  },

  async getClassTeachers(
    organizationId: number,
    sessionId: number,
    classId: number
  ): Promise<TeacherClassAssignmentResponse[]> {
    return apiClient.get<TeacherClassAssignmentResponse[]>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/classes/${classId}/teachers`
    );
  },

  async updateTeacherClassAssignment(
    organizationId: number,
    sessionId: number,
    classId: number,
    teacherId: number,
    payload: UpdateTeacherClassAssignmentRequest
  ): Promise<TeacherClassAssignmentResponse> {
    return apiClient.put<TeacherClassAssignmentResponse>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/classes/${classId}/teachers/${teacherId}`,
      payload
    );
  },

  async removeTeacherFromClass(
    organizationId: number,
    sessionId: number,
    classId: number,
    teacherId: number
  ): Promise<void> {
    return apiClient.delete<void>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/classes/${classId}/teachers/${teacherId}`
    );
  },

  async getSessionClassAssignments(
    organizationId: number,
    sessionId: number
  ): Promise<TeacherClassAssignmentResponse[]> {
    return apiClient.get<TeacherClassAssignmentResponse[]>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/teacher-class-assignments`
    );
  },

  async getTeacherClassAssignments(
    organizationId: number,
    teacherId: number,
    academicSessionId?: number
  ): Promise<TeacherClassAssignmentResponse[]> {
    const query = buildQuery({ academicSessionId });
    return apiClient.get<TeacherClassAssignmentResponse[]>(
      `/api/organizations/${organizationId}/teachers/${teacherId}/class-assignments${query}`
    );
  },

  async assignTeacherToSubject(
    organizationId: number,
    sessionId: number,
    classId: number,
    subjectId: number,
    payload: AssignTeacherSubjectRequest
  ): Promise<TeacherSubjectAssignmentResponse> {
    return apiClient.post<TeacherSubjectAssignmentResponse>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/classes/${classId}/subjects/${subjectId}/teachers`,
      payload
    );
  },

  async getClassSubjectTeachers(
    organizationId: number,
    sessionId: number,
    classId: number,
    subjectId: number
  ): Promise<TeacherSubjectAssignmentResponse[]> {
    return apiClient.get<TeacherSubjectAssignmentResponse[]>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/classes/${classId}/subjects/${subjectId}/teachers`
    );
  },

  async getAllClassSubjectTeachers(
    organizationId: number,
    sessionId: number,
    classId: number
  ): Promise<TeacherSubjectAssignmentResponse[]> {
    return apiClient.get<TeacherSubjectAssignmentResponse[]>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/classes/${classId}/subject-teachers`
    );
  },

  async getSubjectTeachersInSession(
    organizationId: number,
    sessionId: number,
    subjectId: number
  ): Promise<TeacherSubjectAssignmentResponse[]> {
    return apiClient.get<TeacherSubjectAssignmentResponse[]>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/subjects/${subjectId}/teachers`
    );
  },

  async updateTeacherSubjectAssignment(
    organizationId: number,
    sessionId: number,
    classId: number,
    subjectId: number,
    teacherId: number,
    payload: UpdateTeacherSubjectAssignmentRequest
  ): Promise<TeacherSubjectAssignmentResponse> {
    return apiClient.put<TeacherSubjectAssignmentResponse>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/classes/${classId}/subjects/${subjectId}/teachers/${teacherId}`,
      payload
    );
  },

  async removeTeacherFromSubject(
    organizationId: number,
    sessionId: number,
    classId: number,
    subjectId: number,
    teacherId: number
  ): Promise<void> {
    return apiClient.delete<void>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/classes/${classId}/subjects/${subjectId}/teachers/${teacherId}`
    );
  },

  async getSessionSubjectAssignments(
    organizationId: number,
    sessionId: number
  ): Promise<TeacherSubjectAssignmentResponse[]> {
    return apiClient.get<TeacherSubjectAssignmentResponse[]>(
      `/api/organizations/${organizationId}/academic-sessions/${sessionId}/teacher-subject-assignments`
    );
  },

  async getTeacherSubjectAssignments(
    organizationId: number,
    teacherId: number,
    academicSessionId?: number,
    classId?: number
  ): Promise<TeacherSubjectAssignmentResponse[]> {
    const query = buildQuery({ academicSessionId, classId });
    return apiClient.get<TeacherSubjectAssignmentResponse[]>(
      `/api/organizations/${organizationId}/teachers/${teacherId}/subject-assignments${query}`
    );
  },

  // ==========================================================================
  // 5. Organization Invitations & Role Lookups
  // ==========================================================================
  async listInvitations(
    organizationId: number,
    params: {
      status?: InvitationStatus | '';
      roleCode?: string;
      targetType?: InvitationTargetType | '';
    } = {}
  ): Promise<InvitationResponse[]> {
    const query = buildQuery({
      status: params.status || undefined,
      roleCode: params.roleCode?.trim() || undefined,
      targetType: params.targetType || undefined,
    });
    return apiClient.get<InvitationResponse[]>(
      `/api/organizations/${organizationId}/invitations${query}`
    );
  },

  async createInvitation(
    organizationId: number,
    payload: CreateInvitationRequest
  ): Promise<InvitationDispatchResponse> {
    return apiClient.post<InvitationDispatchResponse>(
      `/api/organizations/${organizationId}/invitations`,
      payload
    );
  },

  async resendInvitation(
    organizationId: number,
    invitationId: number
  ): Promise<InvitationDispatchResponse> {
    return apiClient.post<InvitationDispatchResponse>(
      `/api/organizations/${organizationId}/invitations/${invitationId}/resend`
    );
  },

  async revokeInvitation(
    organizationId: number,
    invitationId: number
  ): Promise<InvitationResponse> {
    return apiClient.post<InvitationResponse>(
      `/api/organizations/${organizationId}/invitations/${invitationId}/revoke`
    );
  },

  async listOrganizationRoles(
    organizationId: number
  ): Promise<OrganizationRoleDto[]> {
    return apiClient.get<OrganizationRoleDto[]>(
      `/api/organizations/${organizationId}/roles`
    );
  },

  async listOrganizationMemberships(
    organizationId: number
  ): Promise<OrganizationMemberSummaryDto[]> {
    return apiClient.get<OrganizationMemberSummaryDto[]>(
      `/api/organizations/${organizationId}/memberships`
    );
  },
};
