import { apiClient } from '../lib/api-client';
import {
  LoginUserRequest,
  OrganizationEntitlementsResponse,
  OrganizationRoleDto,
  OrganizationSubscriptionResponse,
  PLATFORM_ROLE_PERMISSIONS,
  PlatformAdminUserResponse,
  RegisterUserRequest,
  SchoolSubscriptionBillingSummaryResponse,
  SchoolSubscriptionUsageResponse,
  UserProfile,
} from '../types/auth';

export interface PlatformAccessContext {
  hasPlatformAccess: boolean;
  platformRoles: string[];
  platformPermissions: string[];
}

export const authApi = {
  /**
   * Registers a new individual user account via `POST /api/auth/register`.
   * Note: Does NOT set an auth cookie and does NOT grant organization membership or SCHOOL_ADMIN access.
   */
  register: async (payload: RegisterUserRequest): Promise<UserProfile> => {
    return apiClient.post<UserProfile>('/api/auth/register', payload, {
      suppressUnauthorizedEvent: true,
    });
  },

  /**
   * Authenticates with `POST /api/auth/login`.
   * The Spring Boot backend sets the HttpOnly `jwt` cookie on response.
   */
  login: async (payload: LoginUserRequest): Promise<void> => {
    await apiClient.post('/api/auth/login', payload, {
      suppressUnauthorizedEvent: true,
    });
  },

  /**
   * Clears the HttpOnly `jwt` cookie via `POST /api/auth/logout`.
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout', undefined, {
      suppressUnauthorizedEvent: true,
    });
  },

  /**
   * Loads the authenticated user's profile and organization memberships via `GET /api/me`.
   */
  getCurrentUser: async (): Promise<UserProfile> => {
    return apiClient.get<UserProfile>('/api/me', {
      suppressUnauthorizedEvent: true,
      timeoutMs: 3500,
    });
  },

  /**
   * Probes whether the authenticated user holds a platform-scoped role.
   * Note: `GET /api/me` returns tenant memberships (`organizations[]`), so we probe
   * `GET /api/platform/plans` (accessible to all platform roles) and optionally
   * `GET /api/platform/admins` to resolve exact platform role codes.
   */
  probePlatformAccess: async (userId: number): Promise<PlatformAccessContext> => {
    try {
      await apiClient.get('/api/platform/plans', {
        suppressUnauthorizedEvent: true,
      });

      // Attempt to resolve exact platform roles if the user has PLATFORM_ROLE_MANAGE
      try {
        const admins = await apiClient.get<PlatformAdminUserResponse[]>('/api/platform/admins', {
          suppressUnauthorizedEvent: true,
        });
        const match = admins?.find((a) => a.userId === userId);
        if (match && match.roles.length > 0) {
          const roles = match.roles.map((r) => r.roleCode);
          const perms = new Set<string>();
          for (const rc of roles) {
            for (const p of PLATFORM_ROLE_PERMISSIONS[rc] || []) {
              perms.add(p);
            }
          }
          return {
            hasPlatformAccess: true,
            platformRoles: roles,
            platformPermissions: Array.from(perms),
          };
        }
      } catch {
        // User has platform access (e.g. PLATFORM_SUPPORT or PLATFORM_FINANCE) without PLATFORM_ROLE_MANAGE
      }

      return {
        hasPlatformAccess: true,
        platformRoles: ['PLATFORM_USER'],
        platformPermissions: PLATFORM_ROLE_PERMISSIONS.PLATFORM_SUPPORT,
      };
    } catch {
      return {
        hasPlatformAccess: false,
        platformRoles: [],
        platformPermissions: [],
      };
    }
  },

  /**
   * Loads role definitions (system + custom) and their assigned permissions for an organization.
   */
  getOrganizationRoles: async (organizationId: number): Promise<OrganizationRoleDto[]> => {
    return apiClient.get<OrganizationRoleDto[]>(
      `/api/organizations/${organizationId}/roles`,
      {
        suppressUnauthorizedEvent: true,
        suppressStatusRestrictionEvent: true,
      }
    );
  },

  /**
   * Loads the current subscription summary for an organization.
   */
  getOrganizationSubscription: async (
    organizationId: number
  ): Promise<OrganizationSubscriptionResponse | null> => {
    return apiClient.get<OrganizationSubscriptionResponse | null>(
      `/api/organizations/${organizationId}/subscription`,
      {
        suppressUnauthorizedEvent: true,
        suppressStatusRestrictionEvent: true,
      }
    );
  },

  /**
   * Loads the resolved feature entitlements for an organization (separate from RBAC permissions).
   */
  getOrganizationEntitlements: async (
    organizationId: number
  ): Promise<OrganizationEntitlementsResponse> => {
    return apiClient.get<OrganizationEntitlementsResponse>(
      `/api/organizations/${organizationId}/subscription/entitlements`,
      {
        suppressUnauthorizedEvent: true,
        suppressStatusRestrictionEvent: true,
      }
    );
  },

  /**
   * Loads student & storage usage for an organization (accessible during ACTIVE and SUSPENDED states).
   */
  getOrganizationUsage: async (
    organizationId: number
  ): Promise<SchoolSubscriptionUsageResponse> => {
    return apiClient.get<SchoolSubscriptionUsageResponse>(
      `/api/organizations/${organizationId}/subscription/usage`,
      {
        suppressUnauthorizedEvent: true,
        suppressStatusRestrictionEvent: true,
      }
    );
  },

  /**
   * Loads billing summary & payment receipts for an organization (accessible during ACTIVE and SUSPENDED states).
   */
  getOrganizationBillingSummary: async (
    organizationId: number
  ): Promise<SchoolSubscriptionBillingSummaryResponse> => {
    return apiClient.get<SchoolSubscriptionBillingSummaryResponse>(
      `/api/organizations/${organizationId}/subscription/billing`,
      {
        suppressUnauthorizedEvent: true,
        suppressStatusRestrictionEvent: true,
      }
    );
  },
};
