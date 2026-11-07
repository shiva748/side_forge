import { apiClient } from '../lib/api-client';
import { PagedResponse } from '../types/onboarding';
import {
  AcademicSessionResponse,
  AcademicSessionScope,
  AccountantDashboardResponse,
  AdminDashboardResponse,
  AnnouncementItem,
  PrincipalDashboardResponse,
  SchoolNoticeResponse,
  StaffSummaryItem,
  StudentSummaryItem,
  TeacherDashboardResponse,
} from '../types/schoolDashboard';

export interface DashboardQueryOptions {
  academicSessionId?: number;
  sessionScope?: AcademicSessionScope;
  referenceDate?: string;
}

function buildDashboardQuery(options?: DashboardQueryOptions): string {
  const params = new URLSearchParams();
  if (options?.academicSessionId) {
    params.set('academicSessionId', String(options.academicSessionId));
  }
  if (options?.sessionScope) {
    params.set('sessionScope', options.sessionScope);
  }
  if (options?.referenceDate) {
    params.set('referenceDate', options.referenceDate);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const schoolDashboardApi = {
  getAdminDashboard: async (
    organizationId: number,
    options?: DashboardQueryOptions
  ): Promise<AdminDashboardResponse> => {
    return apiClient.get<AdminDashboardResponse>(
      `/api/organizations/${organizationId}/dashboards/admin${buildDashboardQuery(options)}`
    );
  },

  getPrincipalDashboard: async (
    organizationId: number,
    options?: DashboardQueryOptions
  ): Promise<PrincipalDashboardResponse> => {
    return apiClient.get<PrincipalDashboardResponse>(
      `/api/organizations/${organizationId}/dashboards/principal${buildDashboardQuery(options)}`
    );
  },

  getAccountantDashboard: async (
    organizationId: number,
    options?: DashboardQueryOptions
  ): Promise<AccountantDashboardResponse> => {
    return apiClient.get<AccountantDashboardResponse>(
      `/api/organizations/${organizationId}/dashboards/accountant${buildDashboardQuery(options)}`
    );
  },

  getTeacherDashboard: async (
    organizationId: number,
    options?: DashboardQueryOptions
  ): Promise<TeacherDashboardResponse> => {
    return apiClient.get<TeacherDashboardResponse>(
      `/api/organizations/${organizationId}/dashboards/teacher${buildDashboardQuery(options)}`
    );
  },

  getAcademicSessions: async (
    organizationId: number
  ): Promise<AcademicSessionResponse[]> => {
    return apiClient.get<AcademicSessionResponse[]>(
      `/api/organizations/${organizationId}/academic-sessions`
    );
  },

  getRecentStudents: async (
    organizationId: number,
    size = 5
  ): Promise<PagedResponse<StudentSummaryItem>> => {
    return apiClient.get<PagedResponse<StudentSummaryItem>>(
      `/api/organizations/${organizationId}/students?page=0&size=${size}&sortBy=id&sortDir=desc`
    );
  },

  getRecentStaff: async (
    organizationId: number,
    size = 5
  ): Promise<PagedResponse<StaffSummaryItem>> => {
    return apiClient.get<PagedResponse<StaffSummaryItem>>(
      `/api/organizations/${organizationId}/staff?page=0&size=${size}&sortBy=id&sortDir=desc`
    );
  },

  getVisibleAnnouncements: async (
    organizationId: number
  ): Promise<AnnouncementItem[]> => {
    return apiClient.get<AnnouncementItem[]>(
      `/api/organizations/${organizationId}/announcements`
    );
  },

  getNotices: async (
    organizationId: number
  ): Promise<SchoolNoticeResponse[]> => {
    return apiClient.get<SchoolNoticeResponse[]>(
      `/api/organizations/${organizationId}/notices`
    );
  },
};
