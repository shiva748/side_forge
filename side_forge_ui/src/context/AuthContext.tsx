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
  WorkspaceContextOption,
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
  activeWorkspaceOption: WorkspaceContextOption | null;
  availableWorkspaces: WorkspaceContextOption[];
  hasMultipleWorkspaces: boolean;
  hasPlatformAccess: boolean;
  platformRoles: string[];
  platformPermissions: Set<string>;
  activeOrganizationId: number | null;
  activeOrganization: UserOrganizationSummary | null;
  activeMemberships: UserOrganizationSummary[];
  inactiveMemberships: UserOrganizationSummary[];
  organizationRoles: Set<string>;
  organizationPermissions: Set<string>;
  subscription: OrganizationSubscriptionResponse | null;
  entitlements: OrganizationEntitlementsResponse | null;
  enabledFeatures: Set<PlatformFeature>;
  login: (credentials: LoginUserRequest) => Promise<{ defaultRoute: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  activatePlatformWorkspace: () => void;
  selectOrganization: (organizationId: number) => void;
  switchWorkspace: (workspace: WorkspaceType, organizationId?: number) => void;
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

  const inactiveMemberships = useMemo(() => {
    if (!user?.organizations) return [];
    return user.organizations.filter((m) => m.membershipStatus !== 'ACTIVE');
  }, [user]);

  const availableWorkspaces = useMemo<WorkspaceContextOption[]>(() => {
    const list: WorkspaceContextOption[] = [];
    if (hasPlatformAccess) {
      list.push({
        key: 'PLATFORM',
        workspaceType: 'PLATFORM',
        organizationId: null,
        displayName: 'Platform Administration',
        roles: platformRoles.length > 0 ? platformRoles : ['PLATFORM_USER'],
        membershipStatus: 'ACTIVE',
      });
    }
    for (const m of activeMemberships) {
      list.push({
        key: `SCHOOL:${m.organizationId}`,
        workspaceType: 'SCHOOL',
        organizationId: m.organizationId,
        displayName: m.organizationName || `School #${m.organizationId}`,
        roles: Array.isArray(m.roles) ? m.roles : [],
        membershipStatus: m.membershipStatus,
      });
    }
    return list;
  }, [activeMemberships, hasPlatformAccess, platformRoles]);

  const activeOrganization = useMemo(() => {
    if (!activeOrganizationId) return null;
    return activeMemberships.find((m) => m.organizationId === activeOrganizationId) || null;
  }, [activeMemberships, activeOrganizationId]);

  const activeWorkspaceOption = useMemo<WorkspaceContextOption | null>(() => {
    if (activeWorkspace === 'PLATFORM' && hasPlatformAccess) {
      return availableWorkspaces.find((w) => w.workspaceType === 'PLATFORM') || null;
    }
    if (activeWorkspace === 'SCHOOL' && activeOrganizationId) {
      return (
        availableWorkspaces.find(
          (w) => w.workspaceType === 'SCHOOL' && w.organizationId === activeOrganizationId
        ) || null
      );
    }
    return null;
  }, [activeOrganizationId, activeWorkspace, availableWorkspaces, hasPlatformAccess]);

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

  const hydrateUserSession = useCallback(
    async (
      options?: { isFreshLogin?: boolean }
    ): Promise<{
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

        const totalContexts =
          (platformCtx.hasPlatformAccess ? 1 : 0) + activeOrgs.length;

        // 0 valid contexts -> onboarding status page
        if (totalContexts === 0) {
          setActiveWorkspace(null);
          setActiveOrganizationId(null);
          localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
          localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
          await loadOrganizationContext(null);
          return { profile, defaultRoute: '/onboarding-status' };
        }

        // Exactly 1 valid context -> automatically select & activate it
        if (totalContexts === 1) {
          if (platformCtx.hasPlatformAccess) {
            setActiveWorkspace('PLATFORM');
            setActiveOrganizationId(null);
            localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, 'PLATFORM');
            localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
            await loadOrganizationContext(null);
            return { profile, defaultRoute: '/platform/onboarding' };
          }

          const singleOrg = activeOrgs[0];
          setActiveWorkspace('SCHOOL');
          setActiveOrganizationId(singleOrg.organizationId);
          localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, 'SCHOOL');
          localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, String(singleOrg.organizationId));
          await loadOrganizationContext(singleOrg);
          return { profile, defaultRoute: '/app' };
        }

        // Multiple valid contexts (> 1):
        // On fresh login, require explicit workspace selection on `/workspaces`.
        if (options?.isFreshLogin) {
          setActiveWorkspace(null);
          setActiveOrganizationId(null);
          localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
          localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
          await loadOrganizationContext(null);
          return { profile, defaultRoute: '/workspaces' };
        }

        // On page refresh / normal navigation, preserve the stored workspace if still valid
        const storedWorkspace = localStorage.getItem(
          ACTIVE_WORKSPACE_STORAGE_KEY
        ) as WorkspaceType | null;
        const storedOrgId = Number(localStorage.getItem(ACTIVE_ORG_STORAGE_KEY));
        const matchedStoredOrg = activeOrgs.find(
          (m) => m.organizationId === storedOrgId
        );

        if (storedWorkspace === 'PLATFORM' && platformCtx.hasPlatformAccess) {
          setActiveWorkspace('PLATFORM');
          setActiveOrganizationId(null);
          localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
          await loadOrganizationContext(null);
          return { profile, defaultRoute: '/platform/onboarding' };
        }

        if (storedWorkspace === 'SCHOOL' && matchedStoredOrg) {
          setActiveWorkspace('SCHOOL');
          setActiveOrganizationId(matchedStoredOrg.organizationId);
          await loadOrganizationContext(matchedStoredOrg);
          return { profile, defaultRoute: '/app' };
        }

        // Stored membership/context is missing or became invalid/inactive -> require selection
        setActiveWorkspace(null);
        setActiveOrganizationId(null);
        localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
        localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
        await loadOrganizationContext(null);
        return { profile, defaultRoute: '/workspaces' };
      } catch {
        clearAuthState();
        return null;
      }
    },
    [clearAuthState, loadOrganizationContext]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        await hydrateUserSession({ isFreshLogin: false });
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
      const result = await hydrateUserSession({ isFreshLogin: true });
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
      localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
      queryClient.clear();
    }
  }, [clearAuthState]);

  const refreshSession = useCallback(async () => {
    await hydrateUserSession({ isFreshLogin: false });
  }, [hydrateUserSession]);

  const activatePlatformWorkspace = useCallback(() => {
    if (!hasPlatformAccess) return;
    setActiveWorkspace('PLATFORM');
    setActiveOrganizationId(null);
    localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, 'PLATFORM');
    localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    void loadOrganizationContext(null);
  }, [hasPlatformAccess, loadOrganizationContext]);

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
    (workspace: WorkspaceType, organizationId?: number) => {
      if (workspace === 'PLATFORM') {
        activatePlatformWorkspace();
        return;
      }
      if (workspace === 'SCHOOL') {
        const targetId =
          organizationId ||
          activeOrganizationId ||
          activeMemberships[0]?.organizationId;
        if (targetId) {
          selectOrganization(targetId);
        }
      }
    },
    [activatePlatformWorkspace, activeMemberships, activeOrganizationId, selectOrganization]
  );

  // Strictly check permissions within the currently active workspace context
  const hasPermission = useCallback(
    (permission: string | string[]): boolean => {
      const list = Array.isArray(permission) ? permission : [permission];
      if (activeWorkspace === 'PLATFORM') {
        return list.every((p) => platformPermissions.has(p));
      }
      if (activeWorkspace === 'SCHOOL') {
        return list.every((p) => organizationPermissions.has(p));
      }
      return false;
    },
    [activeWorkspace, organizationPermissions, platformPermissions]
  );

  const hasRole = useCallback(
    (role: string | string[]): boolean => {
      const list = Array.isArray(role) ? role : [role];
      if (activeWorkspace === 'PLATFORM') {
        return list.some((r) => platformRoles.includes(r));
      }
      if (activeWorkspace === 'SCHOOL') {
        return list.some((r) => organizationRoles.has(r));
      }
      return false;
    },
    [activeWorkspace, organizationRoles, platformRoles]
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
      activeWorkspaceOption,
      availableWorkspaces,
      hasMultipleWorkspaces: availableWorkspaces.length > 1,
      hasPlatformAccess,
      platformRoles,
      platformPermissions,
      activeOrganizationId,
      activeOrganization,
      activeMemberships,
      inactiveMemberships,
      organizationRoles,
      organizationPermissions,
      subscription,
      entitlements,
      enabledFeatures,
      login,
      logout,
      refreshSession,
      activatePlatformWorkspace,
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
      activeWorkspaceOption,
      availableWorkspaces,
      hasPlatformAccess,
      platformRoles,
      platformPermissions,
      activeOrganizationId,
      activeOrganization,
      activeMemberships,
      inactiveMemberships,
      organizationRoles,
      organizationPermissions,
      subscription,
      entitlements,
      enabledFeatures,
      login,
      logout,
      refreshSession,
      activatePlatformWorkspace,
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


