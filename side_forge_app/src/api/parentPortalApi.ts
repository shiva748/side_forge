import { apiClient, ApiClientError, getActiveApiBaseUrl } from './client';
import { STORAGE_KEYS } from '@/constants/env';
import { secureStorage } from '@/utils/secureStorage';
import type {
  AnnouncementResponse,
  ChildAttendanceQueryParams,
  ChildDashboardCard,
  ClassTimetableResponse,
  LinkedChildSummaryResponse,
  ParentChildAttendanceResponse,
  ParentChildDetailResponse,
  ParentChildHomeworkDetailResponse,
  ParentDashboardResponse,
  StudentHomeworkDashboardResponse,
} from '@/types/parentPortal';

export interface ChildTimetableResult {
  timetable: ClassTimetableResponse | null;
  unavailableReason: string | null;
}

export interface AuthorizedAttachmentDownloadResult {
  filename: string;
  contentType: string;
  sizeBytes: number;
  textPreview: string | null;
  blob: Blob | null;
  authorizedSource: {
    uri: string;
    headers: Record<string, string>;
  };
}

export const parentPortalApi = {
  getParentDashboard: async (
    organizationId: number,
    academicSessionId?: number | null
  ): Promise<ParentDashboardResponse> => {
    const query = academicSessionId
      ? `?academicSessionId=${encodeURIComponent(String(academicSessionId))}`
      : '';
    const res = await apiClient.get<ParentDashboardResponse>(
      `/api/organizations/${organizationId}/parent-portal/dashboard${query}`,
      { organizationId }
    );
    if (!res.data) {
      throw new Error('Unable to load parent dashboard.');
    }
    return res.data;
  },

  getLinkedChildren: async (
    organizationId: number,
    academicSessionId?: number | null
  ): Promise<LinkedChildSummaryResponse[]> => {
    const query = academicSessionId
      ? `?academicSessionId=${encodeURIComponent(String(academicSessionId))}`
      : '';
    const res = await apiClient.get<LinkedChildSummaryResponse[]>(
      `/api/organizations/${organizationId}/parent-portal/children${query}`,
      { organizationId }
    );
    return res.data ?? [];
  },

  getChildDashboard: async (
    organizationId: number,
    studentId: number,
    academicSessionId?: number | null
  ): Promise<ChildDashboardCard> => {
    const query = academicSessionId
      ? `?academicSessionId=${encodeURIComponent(String(academicSessionId))}`
      : '';
    const res = await apiClient.get<ChildDashboardCard>(
      `/api/organizations/${organizationId}/parent-portal/children/${studentId}/dashboard${query}`,
      { organizationId }
    );
    if (!res.data) {
      throw new Error('Unable to load student dashboard.');
    }
    return res.data;
  },

  getChildDetails: async (
    organizationId: number,
    studentId: number
  ): Promise<ParentChildDetailResponse> => {
    const res = await apiClient.get<ParentChildDetailResponse>(
      `/api/organizations/${organizationId}/parent-portal/children/${studentId}`,
      { organizationId }
    );
    if (!res.data) {
      throw new Error('Unable to load student details.');
    }
    return res.data;
  },

  getChildAttendance: async (
    organizationId: number,
    studentId: number,
    params?: ChildAttendanceQueryParams
  ): Promise<ParentChildAttendanceResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.academicSessionId) {
      searchParams.set('academicSessionId', String(params.academicSessionId));
    }
    if (params?.startDate) {
      searchParams.set('startDate', params.startDate);
    }
    if (params?.endDate) {
      searchParams.set('endDate', params.endDate);
    }
    if (params?.year) {
      searchParams.set('year', String(params.year));
    }
    if (params?.month) {
      searchParams.set('month', String(params.month));
    }
    const qs = searchParams.toString();
    const query = qs ? `?${qs}` : '';
    const res = await apiClient.get<ParentChildAttendanceResponse>(
      `/api/organizations/${organizationId}/parent-portal/children/${studentId}/attendance${query}`,
      { organizationId }
    );
    if (!res.data) {
      throw new Error('Unable to load student attendance.');
    }
    return res.data;
  },

  getChildHomeworkDashboard: async (
    organizationId: number,
    studentId: number,
    academicSessionId?: number | null
  ): Promise<StudentHomeworkDashboardResponse> => {
    const searchParams = new URLSearchParams();
    if (academicSessionId) {
      searchParams.set('academicSessionId', String(academicSessionId));
    }
    const qs = searchParams.toString();
    const query = qs ? `?${qs}` : '';
    const res = await apiClient.get<StudentHomeworkDashboardResponse>(
      `/api/organizations/${organizationId}/parent-portal/children/${studentId}/homework${query}`,
      { organizationId }
    );
    if (!res.data) {
      throw new Error('Unable to load student homework assignments.');
    }
    return res.data;
  },

  getChildHomeworkDetail: async (
    organizationId: number,
    studentId: number,
    homeworkId: number
  ): Promise<ParentChildHomeworkDetailResponse> => {
    const res = await apiClient.get<ParentChildHomeworkDetailResponse>(
      `/api/organizations/${organizationId}/parent-portal/children/${studentId}/homework/${homeworkId}`,
      { organizationId }
    );
    if (!res.data) {
      throw new Error('Unable to load homework assignment details.');
    }
    return res.data;
  },

  buildHomeworkTeacherAttachmentEndpoint: (
    organizationId: number,
    studentId: number,
    homeworkId: number,
    fileId: number
  ): string =>
    `/api/organizations/${organizationId}/parent-portal/children/${studentId}/homework/${homeworkId}/attachments/${fileId}`,

  buildHomeworkSubmissionAttachmentEndpoint: (
    organizationId: number,
    studentId: number,
    homeworkId: number,
    submissionId: number,
    fileId: number
  ): string =>
    `/api/organizations/${organizationId}/parent-portal/children/${studentId}/homework/${homeworkId}/submissions/${submissionId}/attachments/${fileId}`,

  buildAuthorizedAttachmentSource: (
    organizationId: number,
    endpointPath: string
  ): { uri: string; headers: Record<string, string> } => {
    const baseUrl = getActiveApiBaseUrl();
    const uri = endpointPath.startsWith('http')
      ? endpointPath
      : `${baseUrl}${
          endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`
        }`;
    const token = secureStorage.getSync(STORAGE_KEYS.ACCESS_TOKEN);
    const headers: Record<string, string> = {
      'X-Organization-Id': String(organizationId),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['Cookie'] = `jwt=${token}`;
    }
    return { uri, headers };
  },

  getChildTimetable: async (
    organizationId: number,
    studentId: number,
    academicSessionId?: number | null
  ): Promise<ChildTimetableResult> => {
    const query = academicSessionId
      ? `?academicSessionId=${encodeURIComponent(String(academicSessionId))}`
      : '';
    try {
      const res = await apiClient.get<ClassTimetableResponse>(
        `/api/organizations/${organizationId}/parent-portal/children/${studentId}/timetable${query}`,
        { organizationId }
      );
      return {
        timetable: res.data ?? null,
        unavailableReason: null,
      };
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        (err.status === 404 || err.status === 400 || err.status === 409)
      ) {
        return {
          timetable: null,
          unavailableReason: err.message,
        };
      }
      throw err;
    }
  },

  getParentAnnouncements: async (
    organizationId: number
  ): Promise<AnnouncementResponse[]> => {
    const res = await apiClient.get<AnnouncementResponse[]>(
      `/api/organizations/${organizationId}/parent-portal/announcements`,
      { organizationId }
    );
    return res.data ?? [];
  },

  buildAuthorizedChildPhotoSource: (
    organizationId: number,
    profilePhotoUrl?: string | null
  ): { uri: string; headers: Record<string, string> } | null => {
    if (!profilePhotoUrl) return null;
    const baseUrl = getActiveApiBaseUrl();
    const uri = profilePhotoUrl.startsWith('http')
      ? profilePhotoUrl
      : `${baseUrl}${
          profilePhotoUrl.startsWith('/')
            ? profilePhotoUrl
            : `/${profilePhotoUrl}`
        }`;
    const token = secureStorage.getSync(STORAGE_KEYS.ACCESS_TOKEN);
    const headers: Record<string, string> = {
      'X-Organization-Id': String(organizationId),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['Cookie'] = `jwt=${token}`;
    }
    return { uri, headers };
  },

  fetchAuthorizedHomeworkAttachment: async (
    organizationId: number,
    endpointPath: string,
    fallbackFilename: string,
    fallbackContentType: string
  ): Promise<AuthorizedAttachmentDownloadResult> => {
    const authorizedSource = parentPortalApi.buildAuthorizedAttachmentSource(
      organizationId,
      endpointPath
    );

    let response: Response;
    try {
      response = await fetch(authorizedSource.uri, {
        method: 'GET',
        headers: authorizedSource.headers,
        credentials: 'include',
      });
    } catch {
      throw new ApiClientError(
        'Network error while downloading attachment. Please check your connection and try again.',
        0,
        'NETWORK_ERROR'
      );
    }

    if (!response.ok) {
      let serverMsg = '';
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errJson = (await response.json()) as { message?: string };
          serverMsg = errJson?.message ?? '';
        }
      } catch {
        // Ignore parse failure
      }

      if (response.status === 401) {
        throw new ApiClientError(
          serverMsg || 'Your session has expired. Please sign in again.',
          401,
          'UNAUTHORIZED'
        );
      }
      if (response.status === 403) {
        throw new ApiClientError(
          serverMsg ||
            'You do not have permission to access this homework attachment.',
          403,
          'FORBIDDEN'
        );
      }
      if (response.status === 404) {
        throw new ApiClientError(
          serverMsg ||
            'This attachment file is no longer available or has been removed.',
          404,
          'NOT_FOUND'
        );
      }
      throw new ApiClientError(
        serverMsg || `Unable to download attachment (${response.status}).`,
        response.status,
        'SERVER_ERROR'
      );
    }

    const contentType =
      response.headers.get('content-type') ||
      fallbackContentType ||
      'application/octet-stream';
    const isTextLike =
      contentType.startsWith('text/') ||
      contentType.includes('json') ||
      contentType.includes('csv') ||
      contentType.includes('xml');

    if (isTextLike) {
      const textContent = await response.text();
      return {
        filename: fallbackFilename,
        contentType,
        sizeBytes: textContent.length,
        textPreview: textContent.slice(0, 8000),
        blob: null,
        authorizedSource,
      };
    }

    let blob: Blob | null;
    let sizeBytes = 0;
    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader && !Number.isNaN(Number(contentLengthHeader))) {
      sizeBytes = Number(contentLengthHeader);
    }
    try {
      blob = await response.blob();
      if (blob && blob.size > 0) {
        sizeBytes = blob.size;
      }
    } catch {
      blob = null;
    }

    return {
      filename: fallbackFilename,
      contentType,
      sizeBytes,
      textPreview: null,
      blob,
      authorizedSource,
    };
  },
};
