import { apiClient } from '../lib/api-client';
import {
  OrganizationEntitlementsResponse,
  PlatformAdminUserResponse,
  PlatformFeature,
  SubscriptionStatus,
} from '../types/auth';
import { PagedResponse } from '../types/onboarding';
import {
  AssignPlatformAdminRoleRequest,
  AuthorizationAuditLogResponse,
  ChangeOrganizationStatusRequest,
  OrganizationAdminDetailResponse,
  OrganizationAdminListItemResponse,
  OrganizationStatus,
  OrganizationUsageResponse,
  PlatformAuditAction,
  PlatformAuditLogItem,
  PlatformDashboardResponse,
  UpdateFeatureEntitlementOverrideRequest,
  UpdateStudentLimitOverrideRequest,
} from '../types/platformDashboard';
import {
  CreateInvitationRequest,
  InvitationDispatchResponse,
  InvitationResponse,
} from '../types/staffManagement';

export interface ListPlatformOrganizationsParams {
  status?: OrganizationStatus | '';
  subscriptionStatus?: SubscriptionStatus | '';
  planCode?: string;
  search?: string;
  page?: number;
  size?: number;
}

export interface ListPlatformAuditLogsParams {
  action?: PlatformAuditAction | '';
  resourceType?: string;
  targetOrganizationId?: number;
  actorUserId?: number;
  page?: number;
  size?: number;
}

export interface ListAuthorizationAuditLogsParams {
  organizationId?: number;
  actorUserId?: number;
  action?: string;
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

  // =========================================================================
  // Platform-Level School Administrator Invitations (`platform.organization.manage`)
  // =========================================================================

  listOrganizationInvitations: async (
    organizationId: number
  ): Promise<InvitationResponse[]> => {
    return apiClient.get<InvitationResponse[]>(
      `/api/platform/organizations/${organizationId}/invitations`
    );
  },

  createSchoolAdminInvitation: async (
    organizationId: number,
    payload: CreateInvitationRequest
  ): Promise<InvitationDispatchResponse> => {
    return apiClient.post<InvitationDispatchResponse>(
      `/api/platform/organizations/${organizationId}/invitations`,
      {
        ...payload,
        email: payload.email.trim(),
        roleCode: 'SCHOOL_ADMIN',
        targetType: 'SCHOOL_ADMIN',
      }
    );
  },

  resendOrganizationInvitation: async (
    organizationId: number,
    invitationId: number
  ): Promise<InvitationDispatchResponse> => {
    return apiClient.post<InvitationDispatchResponse>(
      `/api/platform/organizations/${organizationId}/invitations/${invitationId}/resend`
    );
  },

  revokeOrganizationInvitation: async (
    organizationId: number,
    invitationId: number
  ): Promise<InvitationResponse> => {
    return apiClient.post<InvitationResponse>(
      `/api/platform/organizations/${organizationId}/invitations/${invitationId}/revoke`
    );
  },

  // =========================================================================
  // Per-Organization Feature Entitlement Overrides (`platform.entitlement.manage`)
  // =========================================================================

  getOrganizationEntitlements: async (
    organizationId: number
  ): Promise<OrganizationEntitlementsResponse> => {
    return apiClient.get<OrganizationEntitlementsResponse>(
      `/api/platform/organizations/${organizationId}/entitlements`
    );
  },

  setFeatureEntitlementOverride: async (
    organizationId: number,
    feature: PlatformFeature,
    payload: UpdateFeatureEntitlementOverrideRequest
  ): Promise<OrganizationEntitlementsResponse> => {
    return apiClient.put<OrganizationEntitlementsResponse>(
      `/api/platform/organizations/${organizationId}/entitlements/${feature}`,
      {
        enabled: payload.enabled,
        reason: payload.reason.trim(),
        expiresAt: payload.expiresAt || null,
      }
    );
  },

  removeFeatureEntitlementOverride: async (
    organizationId: number,
    feature: PlatformFeature
  ): Promise<OrganizationEntitlementsResponse> => {
    return apiClient.delete<OrganizationEntitlementsResponse>(
      `/api/platform/organizations/${organizationId}/entitlements/${feature}`
    );
  },

  // =========================================================================
  // Student Capacity Limit Overrides (`platform.entitlement.manage`)
  // =========================================================================

  getOrganizationUsage: async (
    organizationId: number
  ): Promise<OrganizationUsageResponse> => {
    return apiClient.get<OrganizationUsageResponse>(
      `/api/platform/organizations/${organizationId}/usage`
    );
  },

  setStudentLimitOverride: async (
    organizationId: number,
    payload: UpdateStudentLimitOverrideRequest
  ): Promise<OrganizationUsageResponse> => {
    return apiClient.put<OrganizationUsageResponse>(
      `/api/platform/organizations/${organizationId}/student-limit-override`,
      {
        overrideStudentLimit: payload.overrideStudentLimit,
        reason: payload.reason.trim(),
        expiresAt: payload.expiresAt || null,
      }
    );
  },

  clearStudentLimitOverride: async (
    organizationId: number,
    reason?: string
  ): Promise<OrganizationUsageResponse> => {
    return apiClient.delete<OrganizationUsageResponse>(
      `/api/platform/organizations/${organizationId}/student-limit-override`,
      {
        params: reason?.trim() ? { reason: reason.trim() } : undefined,
      }
    );
  },

  // =========================================================================
  // Platform Administrator Management (`platform.role.manage`)
  // =========================================================================

  listPlatformAdmins: async (): Promise<PlatformAdminUserResponse[]> => {
    return apiClient.get<PlatformAdminUserResponse[]>('/api/platform/admins');
  },

  assignPlatformAdminRole: async (
    payload: AssignPlatformAdminRoleRequest
  ): Promise<PlatformAdminUserResponse> => {
    return apiClient.post<PlatformAdminUserResponse>('/api/platform/admins/roles', {
      userId: payload.userId,
      roleCode: payload.roleCode.trim().toUpperCase(),
    });
  },

  revokePlatformAdminRole: async (
    userId: number,
    roleCode: string
  ): Promise<PlatformAdminUserResponse> => {
    return apiClient.delete<PlatformAdminUserResponse>(
      `/api/platform/admins/${userId}/roles/${encodeURIComponent(roleCode.trim().toUpperCase())}`
    );
  },

  // =========================================================================
  // Platform & Authorization Audit Logs (`platform.audit.view`)
  // =========================================================================

  listAuditLogs: async (
    params: ListPlatformAuditLogsParams = {}
  ): Promise<PagedResponse<PlatformAuditLogItem>> => {
    return apiClient.get<PagedResponse<PlatformAuditLogItem>>('/api/platform/audit-logs', {
      params: {
        action: params.action || undefined,
        resourceType: params.resourceType?.trim() || undefined,
        targetOrganizationId: params.targetOrganizationId || undefined,
        actorUserId: params.actorUserId || undefined,
        page: params.page ?? 0,
        size: params.size ?? 6,
      },
    });
  },

  listAuthorizationAuditLogs: async (
    params: ListAuthorizationAuditLogsParams = {}
  ): Promise<PagedResponse<AuthorizationAuditLogResponse>> => {
    return apiClient.get<PagedResponse<AuthorizationAuditLogResponse>>(
      '/api/platform/authorization-audit-logs',
      {
        params: {
          organizationId: params.organizationId || undefined,
          actorUserId: params.actorUserId || undefined,
          action: params.action?.trim() || undefined,
          page: params.page ?? 0,
          size: params.size ?? 20,
        },
      }
    );
  },
};
