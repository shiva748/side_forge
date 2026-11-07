import { apiClient } from '../lib/api-client';
import { PagedResponse } from '../types/onboarding';
import {
  OrganizationAdminListItemResponse,
  OrganizationStatus,
  PlatformAuditLogItem,
  PlatformDashboardResponse,
} from '../types/platformDashboard';

export interface ListPlatformOrganizationsParams {
  status?: OrganizationStatus;
  search?: string;
  page?: number;
  size?: number;
}

export interface ListPlatformAuditLogsParams {
  resourceType?: string;
  targetOrganizationId?: number;
  page?: number;
  size?: number;
}

/**
 * Platform Administrator Dashboard & Overview API Service.
 * Connects to existing `PlatformSaaSController` endpoints (`/api/platform/*`).
 */
export const platformDashboardApi = {
  /**
   * Fetches aggregated platform-level metrics and subscription alerts.
   * Target: `GET /api/platform/dashboard`
   * Permission: `platform.dashboard.view` (`PermissionCode.PLATFORM_DASHBOARD_VIEW`)
   */
  getDashboardMetrics: async (): Promise<PlatformDashboardResponse> => {
    return apiClient.get<PlatformDashboardResponse>('/api/platform/dashboard');
  },

  /**
   * Fetches paginated organizations registered on the platform (sorted newest first).
   * Target: `GET /api/platform/organizations`
   * Permission: `platform.organization.view` (`PermissionCode.PLATFORM_ORGANIZATION_VIEW`)
   */
  listOrganizations: async (
    params: ListPlatformOrganizationsParams = {}
  ): Promise<PagedResponse<OrganizationAdminListItemResponse>> => {
    return apiClient.get<PagedResponse<OrganizationAdminListItemResponse>>(
      '/api/platform/organizations',
      {
        params: {
          status: params.status || undefined,
          search: params.search?.trim() || undefined,
          page: params.page ?? 0,
          size: params.size ?? 5,
        },
      }
    );
  },

  /**
   * Fetches recent platform audit log entries.
   * Target: `GET /api/platform/audit-logs`
   * Permission: `platform.audit.view` (`PermissionCode.PLATFORM_AUDIT_VIEW`)
   */
  listAuditLogs: async (
    params: ListPlatformAuditLogsParams = {}
  ): Promise<PagedResponse<PlatformAuditLogItem>> => {
    return apiClient.get<PagedResponse<PlatformAuditLogItem>>('/api/platform/audit-logs', {
      params: {
        resourceType: params.resourceType || undefined,
        targetOrganizationId: params.targetOrganizationId || undefined,
        page: params.page ?? 0,
        size: params.size ?? 6,
      },
    });
  },
};
