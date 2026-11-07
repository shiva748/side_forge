import { apiClient } from '../lib/api-client';
import { SubscriptionStatus } from '../types/auth';
import { PagedResponse } from '../types/onboarding';
import {
  ChangeOrganizationStatusRequest,
  OrganizationAdminDetailResponse,
  OrganizationAdminListItemResponse,
  OrganizationStatus,
  PlatformAuditLogItem,
  PlatformDashboardResponse,
} from '../types/platformDashboard';

export interface ListPlatformOrganizationsParams {
  status?: OrganizationStatus | '';
  subscriptionStatus?: SubscriptionStatus | '';
  planCode?: string;
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
          subscriptionStatus: params.subscriptionStatus || undefined,
          planCode: params.planCode?.trim() || undefined,
          search: params.search?.trim() || undefined,
          page: params.page ?? 0,
          size: params.size ?? 10,
        },
      }
    );
  },

  /**
   * Fetches complete details of a single registered organization.
   * Target: `GET /api/platform/organizations/{organizationId}`
   * Permission: `platform.organization.view` (`PermissionCode.PLATFORM_ORGANIZATION_VIEW`)
   */
  getOrganizationDetails: async (
    organizationId: number
  ): Promise<OrganizationAdminDetailResponse> => {
    return apiClient.get<OrganizationAdminDetailResponse>(
      `/api/platform/organizations/${organizationId}`
    );
  },

  /**
   * Updates an organization's lifecycle status (`ACTIVE`, `SUSPENDED`, or `DEACTIVATED`).
   * Target: `PATCH /api/platform/organizations/{organizationId}/status`
   * Permission: `platform.organization.manage` (`PermissionCode.PLATFORM_ORGANIZATION_MANAGE`)
   */
  changeOrganizationStatus: async (
    organizationId: number,
    payload: ChangeOrganizationStatusRequest
  ): Promise<OrganizationAdminDetailResponse> => {
    return apiClient.patch<OrganizationAdminDetailResponse>(
      `/api/platform/organizations/${organizationId}/status`,
      {
        status: payload.status,
        reason: payload.reason.trim(),
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
