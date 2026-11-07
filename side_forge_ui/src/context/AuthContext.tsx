import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AUTH_UNAUTHORIZED_EVENT } from '../lib/api-client';
import { queryClient } from '../lib/query-client';
import { authApi } from '../services/authApi';
import {
  LoginUserRequest,
  OrganizationEntitlementsResponse,
  OrganizationSubscriptionResponse,
  PlatformFeature,
  SYSTEM_ROLE_PERMISSIONS,
  UserOrganizationSummary,
  UserProfile,
  WorkspaceType,
} from '../types/auth';

const ACTIVE_ORG_STORAGE_KEY = 'sideforge.activeOrganizationId';
const ACTIVE_WORKSPACE_STORAGE_KEY = 'sideforge.activeWorkspace';

export interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOrgContextLoading: boolean;
  activeWorkspace: WorkspaceType | null;
  hasPlatformAccess: boolean;
  platformRoles: string[];
  platformPermissions: Set<string>;
  activeOrganizationId: number | null;
  activeOrganization: UserOrganizationSummary | null;
  activeMemberships: UserOrganizationSummary[];
  organizationRoles: Set<string>;
  organizationPermissions: Set<string>;
  subscription: OrganizationSubscriptionResponse | null;
  entitlements: OrganizationEntitlementsResponse | null;
  enabledFeatures: Set<PlatformFeature>;
  login: (credentials: LoginUserRequest) => Promise<{ defaultRoute: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  selectOrganization: (organizationId: number) => void;
  switchWorkspace: (workspace: WorkspaceType) => void;
  hasPermission: (permission: string | string[]) => boolean;
  hasRole: (role: string | string[]) => boolean;
  hasFeature: (feature: PlatformFeature) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOrgContextLoading, setIsOrgContextLoading] = useState<boolean>(false);

  const [hasPlatformAccess, setHasPlatformAccess] = useState<boolean>(false);
  const [platformRoles, setPlatformRoles] = useState<string[]>([]);
  const [platformPermissions, setPlatformPermissions] = useState<Set<string>>(new Set());

  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<number | null>(null);

  const [organizationPermissions, setOrganizationPermissions] = useState<Set<string>>(new Set());
  const [subscription, setSubscription] = useState<OrganizationSubscriptionResponse | null>(null);
  const [entitlements, setEntitlements] = useState<OrganizationEntitlementsResponse | null>(null);

  const activeMemberships = useMemo(() => {
    if (!user?.organizations) return [];
    return user.organizations.filter((m) => m.membershipStatus === 'ACTIVE');
  }, [user]);

  const activeOrganization = useMemo(() => {
    if (!activeOrganizationId) return null;
    return activeMemberships.find((m) => m.organizationId === activeOrganizationId) || null;
  }, [activeMemberships, activeOrganizationId]);

  const organizationRoles = useMemo(() => {
    return new Set<string>(activeOrganization?.roles || []);
  }, [activeOrganization]);

  const enabledFeatures = useMemo(() => {
    return new Set<PlatformFeature>(entitlements?.enabledFeatures || []);
  }, [entitlements]);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setHasPlatformAccess(false);
    setPlatformRoles([]);
    setPlatformPermissions(new Set());
    setActiveWorkspace(null);
    setActiveOrganizationId(null);
    setOrganizationPermissions(new Set());
    setSubscription(null);
    setEntitlements(null);
  }, []);

  const loadOrganizationContext = useCallback(
    async (org: UserOrganizationSummary | null) => {
      if (!org) {
        setOrganizationPermissions(new Set());
        setSubscription(null);
        setEntitlements(null);
        return;
      }

      setIsOrgContextLoading(true);
      try {
        // Seed permissions from known system role mappings first
        const resolvedPermissions = new Set<string>();
        for (const roleCode of org.roles) {
          for (const perm of SYSTEM_ROLE_PERMISSIONS[roleCode] || []) {
            resolvedPermissions.add(perm);
          }
        }

        // Fetch live role definitions (including custom org roles) + subscription + entitlements in parallel
        const [rolesResult, subResult, entResult] = await Promise.allSettled([
          authApi.getOrganizationRoles(org.organizationId),
          authApi.getOrganizationSubscription(org.organizationId),
          authApi.getOrganizationEntitlements(org.organizationId),
        ]);

        if (rolesResult.status === 'fulfilled' && Array.isArray(rolesResult.value)) {
          const userRoleSet = new Set(org.roles);
          for (const roleDef of rolesResult.value) {
            if (userRoleSet.has(roleDef.code)) {
              for (const perm of roleDef.permissions || []) {
                resolvedPermissions.add(perm);
              }
            }
          }
        }

        setOrganizationPermissions(resolvedPermissions);
        setSubscription(subResult.status === 'fulfilled' ? subResult.value : null);
        setEntitlements(entResult.status === 'fulfilled' ? entResult.value : null);
      } finally {
        setIsOrgContextLoading(false);
      }
    },
    []
  );

  const hydrateUserSession = useCallback(async (): Promise<{
    profile: UserProfile;
    defaultRoute: string;
  } | null> => {
    try {
      const profile = await authApi.getCurrentUser();
      if (!profile || typeof profile.id !== 'number') {
        clearAuthState();
        return null;
      }
      const platformCtx = await authApi.probePlatformAccess(profile.id);

      setUser(profile);
      setHasPlatformAccess(platformCtx.hasPlatformAccess);
      setPlatformRoles(platformCtx.platformRoles);
      setPlatformPermissions(new Set(platformCtx.platformPermissions));

      const activeOrgs = (profile.organizations || []).filter(
        (m) => m.membershipStatus === 'ACTIVE'
      );

      const storedOrgId = Number(localStorage.getItem(ACTIVE_ORG_STORAGE_KEY));
      const matchedOrg =
        activeOrgs.find((m) => m.organizationId === storedOrgId) || activeOrgs[0] || null;

      setActiveOrganizationId(matchedOrg ? matchedOrg.organizationId : null);
      if (matchedOrg) {
        localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, String(matchedOrg.organizationId));
      }

      const storedWorkspace = localStorage.getItem(
        ACTIVE_WORKSPACE_STORAGE_KEY
      ) as WorkspaceType | null;
      let resolvedWorkspace: WorkspaceType | null = null;

      if (
        storedWorkspace === 'PLATFORM' &&
        platformCtx.hasPlatformAccess
      ) {
        resolvedWorkspace = 'PLATFORM';
      } else if (storedWorkspace === 'SCHOOL' && matchedOrg) {
        resolvedWorkspace = 'SCHOOL';
      } else if (platformCtx.hasPlatformAccess && !matchedOrg) {
        resolvedWorkspace = 'PLATFORM';
      } else if (matchedOrg) {
        resolvedWorkspace = 'SCHOOL';
      } else if (platformCtx.hasPlatformAccess) {
        resolvedWorkspace = 'PLATFORM';
      }

      setActiveWorkspace(resolvedWorkspace);
      if (resolvedWorkspace) {
        localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, resolvedWorkspace);
      }

      await loadOrganizationContext(matchedOrg);

      const defaultRoute =
        resolvedWorkspace === 'PLATFORM'
          ? '/platform'
          : activeOrgs.length > 0
          ? '/app'
          : '/onboarding-status';
      return { profile, defaultRoute };
    } catch {
      clearAuthState();
      return null;
    }
  }, [clearAuthState, loadOrganizationContext]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        await hydrateUserSession();
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [hydrateUserSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuthState();
      queryClient.clear();
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [clearAuthState]);

  const login = useCallback(
    async (credentials: LoginUserRequest): Promise<{ defaultRoute: string }> => {
      await authApi.login(credentials);
      const result = await hydrateUserSession();
      if (!result) {
        throw new Error('Failed to load user profile after sign in.');
      }
      return { defaultRoute: result.defaultRoute };
    },
    [hydrateUserSession]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuthState();
      queryClient.clear();
    }
  }, [clearAuthState]);

  const refreshSession = useCallback(async () => {
    await hydrateUserSession();
  }, [hydrateUserSession]);

  const selectOrganization = useCallback(
    (organizationId: number) => {
      const target = activeMemberships.find((m) => m.organizationId === organizationId);
      if (!target) return;
      setActiveOrganizationId(organizationId);
      localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, String(organizationId));
      setActiveWorkspace('SCHOOL');
      localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, 'SCHOOL');
      void loadOrganizationContext(target);
    },
    [activeMemberships, loadOrganizationContext]
  );

  const switchWorkspace = useCallback(
    (workspace: WorkspaceType) => {
      if (workspace === 'PLATFORM' && !hasPlatformAccess) return;
      if (workspace === 'SCHOOL' && activeMemberships.length === 0) return;
      setActiveWorkspace(workspace);
      localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspace);
    },
    [activeMemberships.length, hasPlatformAccess]
  );

  const hasPermission = useCallback(
    (permission: string | string[]): boolean => {
      const list = Array.isArray(permission) ? permission : [permission];
      return list.every(
        (p) => organizationPermissions.has(p) || platformPermissions.has(p)
      );
    },
    [organizationPermissions, platformPermissions]
  );

  const hasRole = useCallback(
    (role: string | string[]): boolean => {
      const list = Array.isArray(role) ? role : [role];
      return list.some(
        (r) => organizationRoles.has(r) || platformRoles.includes(r)
      );
    },
    [organizationRoles, platformRoles]
  );

  const hasFeature = useCallback(
    (feature: PlatformFeature): boolean => {
      return enabledFeatures.has(feature);
    },
    [enabledFeatures]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      isOrgContextLoading,
      activeWorkspace,
      hasPlatformAccess,
      platformRoles,
      platformPermissions,
      activeOrganizationId,
      activeOrganization,
      activeMemberships,
      organizationRoles,
      organizationPermissions,
      subscription,
      entitlements,
      enabledFeatures,
      login,
      logout,
      refreshSession,
      selectOrganization,
      switchWorkspace,
      hasPermission,
      hasRole,
      hasFeature,
    }),
    [
      user,
      isLoading,
      isOrgContextLoading,
      activeWorkspace,
      hasPlatformAccess,
      platformRoles,
      platformPermissions,
      activeOrganizationId,
      activeOrganization,
      activeMemberships,
      organizationRoles,
      organizationPermissions,
      subscription,
      entitlements,
      enabledFeatures,
      login,
      logout,
      refreshSession,
      selectOrganization,
      switchWorkspace,
      hasPermission,
      hasRole,
      hasFeature,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}


