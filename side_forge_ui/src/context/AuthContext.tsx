import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ApiError,
  AUTH_UNAUTHORIZED_EVENT,
  ORG_STATUS_RESTRICTED_EVENT,
  OrgStatusRestrictedEventDetail,
} from '../lib/api-client';
import { queryClient } from '../lib/query-client';
import { accountAndInvitationApi } from '../services/accountAndInvitationApi';
import { authApi } from '../services/authApi';
import { platformDashboardApi } from '../services/platformDashboardApi';
import type { InvitationResponse } from '../types/accountAndInvitations';
import {
  LoginUserRequest,
  OrganizationEntitlementsResponse,
  OrganizationRestrictionInfo,
  OrganizationSubscriptionResponse,
  PlatformFeature,
  SchoolOrganizationStatus,
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
  activeOrganizationStatus: SchoolOrganizationStatus;
  activeOrganizationRestriction: OrganizationRestrictionInfo | null;
  organizationStatusById: Record<number, OrganizationRestrictionInfo>;
  isOrganizationSuspended: boolean;
  isOrganizationDeactivated: boolean;
  isOrganizationRestricted: boolean;
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
  revalidateOrganizationStatus: () => Promise<SchoolOrganizationStatus>;
  revalidateAllOrganizationsStatuses: () => Promise<void>;
  activatePlatformWorkspace: () => void;
  selectOrganization: (organizationId: number) => Promise<SchoolOrganizationStatus>;
  switchWorkspace: (workspace: WorkspaceType, organizationId?: number) => void;
  hasPermission: (permission: string | string[]) => boolean;
  hasRole: (role: string | string[]) => boolean;
  hasFeature: (feature: PlatformFeature) => boolean;
  profilePhotoBlobUrl: string | null;
  refreshProfilePhoto: () => Promise<void>;
  updateCurrentUserProfile: (updated: UserProfile) => void;
  pendingInvitations: InvitationResponse[];
  pendingInvitationsCount: number;
  refreshPendingInvitations: () => Promise<InvitationResponse[]>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOrgContextLoading, setIsOrgContextLoading] = useState<boolean>(false);
  const [profilePhotoBlobUrl, setProfilePhotoBlobUrl] = useState<string | null>(null);
  const profilePhotoObjectUrlRef = useRef<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<InvitationResponse[]>([]);

  const [hasPlatformAccess, setHasPlatformAccess] = useState<boolean>(false);
  const [platformRoles, setPlatformRoles] = useState<string[]>([]);
  const [platformPermissions, setPlatformPermissions] = useState<Set<string>>(new Set());

  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<number | null>(null);

  const [organizationPermissions, setOrganizationPermissions] = useState<Set<string>>(new Set());
  const [subscription, setSubscription] = useState<OrganizationSubscriptionResponse | null>(null);
  const [entitlements, setEntitlements] = useState<OrganizationEntitlementsResponse | null>(null);
  const [organizationStatusById, setOrganizationStatusById] = useState<
    Record<number, OrganizationRestrictionInfo>
  >({});
  const lastFocusCheckRef = useRef<number>(0);
  const contextLoadSeqRef = useRef<number>(0);
  const hasBootstrappedRef = useRef<boolean>(false);
  const lastRestrictionEventByOrgRef = useRef<Record<number, number>>({});

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
      const info = organizationStatusById[m.organizationId];
      const knownStatus = info?.status || m.organizationStatus || 'ACTIVE';
      list.push({
        key: `SCHOOL:${m.organizationId}`,
        workspaceType: 'SCHOOL',
        organizationId: m.organizationId,
        displayName: m.organizationName || `School #${m.organizationId}`,
        roles: Array.isArray(m.roles) ? m.roles : [],
        membershipStatus: m.membershipStatus,
        organizationStatus: knownStatus,
        statusReason: info?.reason ?? m.statusReason ?? m.suspensionReason ?? null,
        statusChangedAt: info?.changedAt ?? m.statusChangedAt ?? null,
      });
    }
    return list;
  }, [activeMemberships, hasPlatformAccess, organizationStatusById, platformRoles]);

  const activeOrganization = useMemo(() => {
    if (!activeOrganizationId) return null;
    return activeMemberships.find((m) => m.organizationId === activeOrganizationId) || null;
  }, [activeMemberships, activeOrganizationId]);

  const activeOrganizationRestriction = useMemo<OrganizationRestrictionInfo | null>(() => {
    if (!activeOrganizationId) return null;
    if (organizationStatusById[activeOrganizationId]) {
      return organizationStatusById[activeOrganizationId];
    }
    if (activeOrganization?.organizationStatus) {
      return {
        organizationId: activeOrganization.organizationId,
        status: activeOrganization.organizationStatus,
        reason:
          activeOrganization.statusReason ??
          activeOrganization.suspensionReason ??
          null,
        changedAt: activeOrganization.statusChangedAt ?? null,
        detectedAt: new Date().toISOString(),
        backendMessage: null,
      };
    }
    return null;
  }, [activeOrganization, activeOrganizationId, organizationStatusById]);

  const activeOrganizationStatus = useMemo<SchoolOrganizationStatus>(() => {
    if (!activeOrganizationId) return 'ACTIVE';
    return (
      activeOrganizationRestriction?.status ||
      activeOrganization?.organizationStatus ||
      'ACTIVE'
    );
  }, [activeOrganization, activeOrganizationId, activeOrganizationRestriction]);

  const isOrganizationSuspended =
    activeWorkspace === 'SCHOOL' && activeOrganizationStatus === 'SUSPENDED';
  const isOrganizationDeactivated =
    activeWorkspace === 'SCHOOL' && activeOrganizationStatus === 'DEACTIVATED';
  const isOrganizationRestricted =
    isOrganizationSuspended || isOrganizationDeactivated;

  // Keep refs synchronized so async callbacks remain stable and never trigger useEffect loops
  const activeMembershipsRef = useRef<UserOrganizationSummary[]>(activeMemberships);
  activeMembershipsRef.current = activeMemberships;
  const hasPlatformAccessRef = useRef<boolean>(hasPlatformAccess);
  hasPlatformAccessRef.current = hasPlatformAccess;
  const activeOrganizationIdRef = useRef<number | null>(activeOrganizationId);
  activeOrganizationIdRef.current = activeOrganizationId;
  const activeOrganizationRef = useRef<UserOrganizationSummary | null>(activeOrganization);
  activeOrganizationRef.current = activeOrganization;

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
    setPendingInvitations([]);
    if (profilePhotoObjectUrlRef.current) {
      URL.revokeObjectURL(profilePhotoObjectUrlRef.current);
      profilePhotoObjectUrlRef.current = null;
    }
    setProfilePhotoBlobUrl(null);
    setPlatformRoles([]);
    setPlatformPermissions(new Set());
    setActiveWorkspace(null);
    setActiveOrganizationId(null);
    setOrganizationPermissions(new Set());
    setSubscription(null);
    setEntitlements(null);
    setOrganizationStatusById({});
  }, []);

  const probeOrganizationStatusInfo = useCallback(
    async (
      org: UserOrganizationSummary,
      canQueryPlatform: boolean
    ): Promise<OrganizationRestrictionInfo> => {
      // 0. If GET /api/me already supplied the authoritative database organizationStatus, use it directly
      if (
        org.organizationStatus === 'ACTIVE' ||
        org.organizationStatus === 'SUSPENDED' ||
        org.organizationStatus === 'DEACTIVATED'
      ) {
        return {
          organizationId: org.organizationId,
          status: org.organizationStatus,
          reason: org.statusReason ?? org.suspensionReason ?? null,
          changedAt: org.statusChangedAt ?? null,
          detectedAt: new Date().toISOString(),
          backendMessage: null,
        };
      }

      // 1. If user has platform organization view permission, query authoritative status + history
      if (canQueryPlatform) {
        try {
          const detail = await platformDashboardApi.getOrganizationDetails(
            org.organizationId
          );
          if (
            detail.status === 'ACTIVE' ||
            detail.status === 'SUSPENDED' ||
            detail.status === 'DEACTIVATED'
          ) {
            const matchingHist = detail.statusHistory?.find(
              (h) => h.newStatus === detail.status
            );
            return {
              organizationId: org.organizationId,
              status: detail.status,
              reason: matchingHist?.reason ?? org.suspensionReason ?? null,
              changedAt: matchingHist?.createdAt ?? org.statusChangedAt ?? null,
              detectedAt: new Date().toISOString(),
              backendMessage: null,
            };
          }
        } catch {
          // Fall back to tenant endpoint probing below
        }
      }

      // 2. Probe tenant endpoints (/roles and /subscription) with suppressUnauthorizedEvent: true
      const [rolesRes, subRes] = await Promise.allSettled([
        authApi.getOrganizationRoles(org.organizationId),
        authApi.getOrganizationSubscription(org.organizationId),
      ]);

      const errors: ApiError[] = [];
      for (const r of [rolesRes, subRes]) {
        if (r.status === 'rejected' && r.reason instanceof ApiError) {
          errors.push(r.reason);
        }
      }

      const suspendedErr = errors.find((e) =>
        /current status is SUSPENDED/i.test(e.message)
      );
      const deactivatedErr = errors.find((e) =>
        /current status is DEACTIVATED/i.test(e.message)
      );
      const bothBlockedByFilter =
        rolesRes.status === 'rejected' &&
        subRes.status === 'rejected' &&
        errors.length === 2 &&
        errors.every((e) => e.status === 403 || e.status === 401);

      let status: SchoolOrganizationStatus = org.organizationStatus || 'ACTIVE';
      let backendMessage: string | null = null;

      if (deactivatedErr) {
        status = 'DEACTIVATED';
        backendMessage = deactivatedErr.message;
      } else if (suspendedErr) {
        status = 'SUSPENDED';
        backendMessage = suspendedErr.message;
      } else if (bothBlockedByFilter && org.membershipStatus === 'ACTIVE') {
        status = 'DEACTIVATED';
        backendMessage =
          errors[0]?.message ||
          'Organization is deactivated and normal operations are unavailable.';
      } else {
        status = 'ACTIVE';
      }

      return {
        organizationId: org.organizationId,
        status,
        reason: org.suspensionReason ?? null,
        changedAt: org.statusChangedAt ?? null,
        detectedAt: new Date().toISOString(),
        backendMessage,
      };
    },
    []
  );

  const revalidateAllOrganizationsStatuses = useCallback(
    async (
      orgsOverride?: UserOrganizationSummary[],
      canQueryPlatformOverride?: boolean
    ) => {
      let targetOrgs = orgsOverride;
      if (!targetOrgs) {
        try {
          const freshProfile = await authApi.getCurrentUser();
          if (freshProfile && typeof freshProfile.id === 'number') {
            setUser(freshProfile);
            targetOrgs = (freshProfile.organizations || []).filter(
              (m) => m.membershipStatus === 'ACTIVE'
            );
          }
        } catch {
          targetOrgs = activeMembershipsRef.current;
        }
      }

      const listToProbe = targetOrgs ?? activeMembershipsRef.current;
      const canQuery = canQueryPlatformOverride ?? hasPlatformAccessRef.current;
      if (!listToProbe || listToProbe.length === 0) return;

      const results = await Promise.allSettled(
        listToProbe.map((org) => probeOrganizationStatusInfo(org, canQuery))
      );

      setOrganizationStatusById((prev) => {
        const next = { ...prev };
        for (const res of results) {
          if (res.status === 'fulfilled' && res.value) {
            next[res.value.organizationId] = res.value;
          }
        }
        return next;
      });
    },
    [probeOrganizationStatusInfo]
  );

  const loadOrganizationContext = useCallback(
    async (
      org: UserOrganizationSummary | null,
      options?: { silent?: boolean; canQueryPlatform?: boolean }
    ): Promise<SchoolOrganizationStatus> => {
      const seq = ++contextLoadSeqRef.current;

      if (!org) {
        setOrganizationPermissions(new Set());
        setSubscription(null);
        setEntitlements(null);
        setIsOrgContextLoading(false);
        return 'ACTIVE';
      }

      if (!options?.silent) {
        setIsOrgContextLoading(true);
      }
      try {
        // Seed permissions from /api/me permissions (if present) and system role mappings
        const resolvedPermissions = new Set<string>(org.permissions || []);
        for (const roleCode of org.roles) {
          for (const perm of SYSTEM_ROLE_PERMISSIONS[roleCode] || []) {
            resolvedPermissions.add(perm);
          }
        }

        // If /api/me already confirmed the organization is DEACTIVATED, avoid firing
        // doomed tenant calls that AuthorizationContextFilter will reject
        if (org.organizationStatus === 'DEACTIVATED') {
          const reason =
            org.statusReason ?? org.suspensionReason ?? null;
          const changedAt = org.statusChangedAt ?? null;

          if (seq !== contextLoadSeqRef.current) return 'DEACTIVATED';

          setOrganizationPermissions(resolvedPermissions);
          setSubscription(null);
          setEntitlements(null);
          setOrganizationStatusById((prev) => ({
            ...prev,
            [org.organizationId]: {
              organizationId: org.organizationId,
              status: 'DEACTIVATED',
              reason,
              changedAt,
              detectedAt: new Date().toISOString(),
              backendMessage:
                'This school organization has been deactivated by the Side_forge platform administrator.',
            },
          }));
          return 'DEACTIVATED';
        }

        // Fetch live role definitions (when not known-suspended) + subscription + entitlements in parallel
        const isKnownSuspended = org.organizationStatus === 'SUSPENDED';
        const [rolesResult, subResult, entResult] = await Promise.allSettled([
          isKnownSuspended
            ? Promise.resolve([] as never[])
            : authApi.getOrganizationRoles(org.organizationId),
          authApi.getOrganizationSubscription(org.organizationId),
          authApi.getOrganizationEntitlements(org.organizationId),
        ]);

        if (seq !== contextLoadSeqRef.current) {
          return org.organizationStatus || 'ACTIVE';
        }

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
        const rejectedErrors: ApiError[] = [];
        for (const res of [rolesResult, subResult, entResult]) {
          if (res.status === 'rejected' && res.reason instanceof ApiError) {
            rejectedErrors.push(res.reason);
          }
        }

        let detectedStatus: SchoolOrganizationStatus =
          org.organizationStatus || 'ACTIVE';
        let backendMessage: string | null = null;

        const suspendedErr = rejectedErrors.find((e) =>
          /current status is SUSPENDED/i.test(e.message)
        );
        const deactivatedErr = rejectedErrors.find((e) =>
          /current status is DEACTIVATED/i.test(e.message)
        );
        const allThreeBlocked =
          rolesResult.status === 'rejected' &&
          subResult.status === 'rejected' &&
          entResult.status === 'rejected' &&
          rejectedErrors.length === 3 &&
          rejectedErrors.every((e) => e.status === 403 || e.status === 401);

        if (org.organizationStatus === 'SUSPENDED' || suspendedErr) {
          detectedStatus = 'SUSPENDED';
          backendMessage = suspendedErr?.message || null;
        } else if (deactivatedErr) {
          detectedStatus = 'DEACTIVATED';
          backendMessage = deactivatedErr.message;
        } else if (allThreeBlocked && org.membershipStatus === 'ACTIVE') {
          try {
            const latestProfile = await authApi.getCurrentUser();
            if (seq === contextLoadSeqRef.current) {
              setUser(latestProfile);
            }
            const latestMembership = (latestProfile.organizations || []).find(
              (m) => m.organizationId === org.organizationId
            );
            if (latestMembership && latestMembership.membershipStatus === 'ACTIVE') {
              detectedStatus =
                latestMembership.organizationStatus || 'DEACTIVATED';
              backendMessage =
                rejectedErrors[0]?.message ||
                'Organization is deactivated and normal operations are unavailable.';
            }
          } catch {
            detectedStatus = 'DEACTIVATED';
          }
        } else {
          detectedStatus = 'ACTIVE';
        }

        let reason: string | null =
          org.statusReason ?? org.suspensionReason ?? null;
        let changedAt: string | null = org.statusChangedAt ?? null;

        if (
          (detectedStatus === 'SUSPENDED' || detectedStatus === 'DEACTIVATED') &&
          (!reason || !changedAt) &&
          (options?.canQueryPlatform ?? hasPlatformAccessRef.current)
        ) {
          try {
            const detail = await platformDashboardApi.getOrganizationDetails(
              org.organizationId
            );
            const matchingHist = detail.statusHistory?.find(
              (h) => h.newStatus === detectedStatus
            );
            if (matchingHist) {
              reason = matchingHist.reason || reason;
              changedAt = matchingHist.createdAt || changedAt;
            }
          } catch {
            // Platform endpoint not permitted for pure school admin; ignore
          }
        }

        if (seq !== contextLoadSeqRef.current) {
          return detectedStatus;
        }

        setOrganizationStatusById((prev) => ({
          ...prev,
          [org.organizationId]: {
            organizationId: org.organizationId,
            status: detectedStatus,
            reason,
            changedAt,
            detectedAt: new Date().toISOString(),
            backendMessage,
          },
        }));

        if (detectedStatus === 'DEACTIVATED') {
          setSubscription(null);
          setEntitlements(null);
        } else {
          setSubscription(subResult.status === 'fulfilled' ? subResult.value : null);
          setEntitlements(entResult.status === 'fulfilled' ? entResult.value : null);
        }

        return detectedStatus;
      } finally {
        if (seq === contextLoadSeqRef.current && !options?.silent) {
          setIsOrgContextLoading(false);
        }
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
            return { profile, defaultRoute: '/platform' };
          }

          const singleOrg = activeOrgs[0];
          setActiveWorkspace('SCHOOL');
          setActiveOrganizationId(singleOrg.organizationId);
          localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, 'SCHOOL');
          localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, String(singleOrg.organizationId));
          await loadOrganizationContext(singleOrg, {
            canQueryPlatform: platformCtx.hasPlatformAccess,
          });
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
          await revalidateAllOrganizationsStatuses(
            activeOrgs,
            platformCtx.hasPlatformAccess
          );
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
          void revalidateAllOrganizationsStatuses(
            activeOrgs,
            platformCtx.hasPlatformAccess
          );
          return { profile, defaultRoute: '/platform' };
        }

        if (storedWorkspace === 'SCHOOL' && matchedStoredOrg) {
          setActiveWorkspace('SCHOOL');
          setActiveOrganizationId(matchedStoredOrg.organizationId);
          const otherOrgs = activeOrgs.filter(
            (o) => o.organizationId !== matchedStoredOrg.organizationId
          );
          if (otherOrgs.length > 0) {
            void revalidateAllOrganizationsStatuses(
              otherOrgs,
              platformCtx.hasPlatformAccess
            );
          }
          await loadOrganizationContext(matchedStoredOrg, {
            canQueryPlatform: platformCtx.hasPlatformAccess,
          });
          return { profile, defaultRoute: '/app' };
        }

        // Stored membership/context is missing or became invalid/inactive -> require selection
        setActiveWorkspace(null);
        setActiveOrganizationId(null);
        localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
        localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
        await loadOrganizationContext(null);
        await revalidateAllOrganizationsStatuses(
          activeOrgs,
          platformCtx.hasPlatformAccess
        );
        return { profile, defaultRoute: '/workspaces' };
      } catch {
        clearAuthState();
        return null;
      }
    },
    [clearAuthState, loadOrganizationContext, revalidateAllOrganizationsStatuses]
  );

  useEffect(() => {
    if (hasBootstrappedRef.current) return;
    hasBootstrappedRef.current = true;
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
    let isVerifyingAuth = false;
    const handleUnauthorized = async (event: Event) => {
      const custom = event as CustomEvent<{
        endpoint?: string;
        isOrganizationEndpoint?: boolean;
      }>;
      const endpoint = custom.detail?.endpoint || '';

      // If /api/me itself returned 401, the user's JWT session is genuinely expired/invalid
      if (endpoint === '/api/me' || endpoint.startsWith('/api/me?')) {
        clearAuthState();
        queryClient.clear();
        return;
      }

      if (isVerifyingAuth) return;
      isVerifyingAuth = true;
      try {
        // Verify with /api/me whether the user's JWT session is still valid.
        // Do not interpret a failed tenant endpoint request as user logout if /api/me succeeds.
        const profile = await authApi.getCurrentUser();
        if (!profile || typeof profile.id !== 'number') {
          clearAuthState();
          queryClient.clear();
        } else {
          setUser(profile);
        }
      } catch {
        clearAuthState();
        queryClient.clear();
      } finally {
        isVerifyingAuth = false;
      }
    };
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [clearAuthState]);

  const revalidateOrganizationStatus = useCallback(async (): Promise<SchoolOrganizationStatus> => {
    const currentOrgId = activeOrganizationIdRef.current;
    try {
      const freshProfile = await authApi.getCurrentUser();
      if (freshProfile && typeof freshProfile.id === 'number') {
        setUser(freshProfile);
        const activeOrgs = (freshProfile.organizations || []).filter(
          (m) => m.membershipStatus === 'ACTIVE'
        );
        await revalidateAllOrganizationsStatuses(
          activeOrgs,
          hasPlatformAccessRef.current
        );
        const freshTarget = activeOrgs.find(
          (m) => m.organizationId === currentOrgId
        );
        if (freshTarget) {
          const nextStatus = await loadOrganizationContext(freshTarget, {
            silent: false,
          });
          await queryClient.invalidateQueries();
          return nextStatus;
        }
      }
    } catch {
      // Fall back to existing activeOrganization reference
    }

    const currentOrg = activeOrganizationRef.current;
    if (!currentOrg) {
      await hydrateUserSession({ isFreshLogin: false });
      return 'ACTIVE';
    }
    const nextStatus = await loadOrganizationContext(currentOrg, {
      silent: false,
    });
    await queryClient.invalidateQueries();
    return nextStatus;
  }, [
    hydrateUserSession,
    loadOrganizationContext,
    revalidateAllOrganizationsStatuses,
  ]);

  // Listen for real-time 403 organization suspension / deactivation signals from apiClient
  useEffect(() => {
    const handleOrgStatusRestricted = (event: Event) => {
      const custom = event as CustomEvent<OrgStatusRestrictedEventDetail>;
      const detail = custom.detail;
      if (!detail || !detail.organizationId) return;

      const now = Date.now();
      const lastHandled =
        lastRestrictionEventByOrgRef.current[detail.organizationId] || 0;
      if (now - lastHandled < 5000) {
        return;
      }
      lastRestrictionEventByOrgRef.current[detail.organizationId] = now;

      if (
        detail.detectedStatus === 'SUSPENDED' ||
        detail.detectedStatus === 'DEACTIVATED'
      ) {
        const immediateStatus: SchoolOrganizationStatus = detail.detectedStatus;
        setOrganizationStatusById((prev) => {
          const existing = prev[detail.organizationId];
          if (existing?.status === immediateStatus) return prev;
          return {
            ...prev,
            [detail.organizationId]: {
              organizationId: detail.organizationId,
              status: immediateStatus,
              reason: existing?.reason ?? null,
              changedAt: existing?.changedAt ?? null,
              detectedAt: new Date().toISOString(),
              backendMessage: detail.message,
            },
          };
        });
        void queryClient.invalidateQueries();
        return;
      }

      const targetOrg = activeMembershipsRef.current.find(
        (m) => m.organizationId === detail.organizationId
      );
      if (targetOrg) {
        void loadOrganizationContext(targetOrg, { silent: true });
      }
    };

    window.addEventListener(
      ORG_STATUS_RESTRICTED_EVENT,
      handleOrgStatusRestricted
    );
    return () =>
      window.removeEventListener(
        ORG_STATUS_RESTRICTED_EVENT,
        handleOrgStatusRestricted
      );
  }, [loadOrganizationContext]);

  // Revalidate active school organization status when returning focus to the tab (throttled, no polling)
  useEffect(() => {
    if (activeWorkspace !== 'SCHOOL') return;

    const handleWindowFocus = () => {
      const currentOrg = activeOrganizationRef.current;
      if (!currentOrg) return;
      const now = Date.now();
      if (now - lastFocusCheckRef.current < 30000) return;
      lastFocusCheckRef.current = now;
      void loadOrganizationContext(currentOrg, { silent: true });
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [activeWorkspace, loadOrganizationContext]);

  const login = useCallback(
    async (credentials: LoginUserRequest): Promise<{ defaultRoute: string }> => {
      await authApi.login(credentials);
      setIsLoading(true);
      try {
        const result = await hydrateUserSession({ isFreshLogin: true });
        if (!result) {
          throw new Error('Failed to load user profile after sign in.');
        }
        return { defaultRoute: result.defaultRoute };
      } finally {
        setIsLoading(false);
      }
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

  const refreshProfilePhoto = useCallback(async () => {
    try {
      const blob = await accountAndInvitationApi.fetchProfilePhotoBlob();
      if (profilePhotoObjectUrlRef.current) {
        URL.revokeObjectURL(profilePhotoObjectUrlRef.current);
        profilePhotoObjectUrlRef.current = null;
      }
      if (blob && blob.size > 0) {
        const nextUrl = URL.createObjectURL(blob);
        profilePhotoObjectUrlRef.current = nextUrl;
        setProfilePhotoBlobUrl(nextUrl);
      } else {
        setProfilePhotoBlobUrl(null);
      }
    } catch {
      if (profilePhotoObjectUrlRef.current) {
        URL.revokeObjectURL(profilePhotoObjectUrlRef.current);
        profilePhotoObjectUrlRef.current = null;
      }
      setProfilePhotoBlobUrl(null);
    }
  }, []);

  const refreshPendingInvitations = useCallback(async (): Promise<InvitationResponse[]> => {
    try {
      const list = await accountAndInvitationApi.getMyPendingInvitations();
      const safeList = Array.isArray(list) ? list : [];
      setPendingInvitations(safeList);
      return safeList;
    } catch {
      return [];
    }
  }, []);

  const updateCurrentUserProfile = useCallback((updated: UserProfile) => {
    setUser((prev) => {
      if (!prev) return updated;
      return {
        ...prev,
        ...updated,
        organizations: updated.organizations ?? prev.organizations,
      };
    });
  }, []);

  // Automatically load or clear profile photo blob URL when user.profilePhotoFileId changes
  useEffect(() => {
    if (!user?.id || !user?.profilePhotoFileId) {
      if (profilePhotoObjectUrlRef.current) {
        URL.revokeObjectURL(profilePhotoObjectUrlRef.current);
        profilePhotoObjectUrlRef.current = null;
      }
      setProfilePhotoBlobUrl(null);
      return;
    }
    void refreshProfilePhoto();
  }, [user?.id, user?.profilePhotoFileId, refreshProfilePhoto]);

  // Load pending invitations when authenticated user changes
  useEffect(() => {
    if (!user?.id) {
      setPendingInvitations([]);
      return;
    }
    void refreshPendingInvitations();
  }, [user?.id, refreshPendingInvitations]);

  const refreshSession = useCallback(async () => {
    await hydrateUserSession({ isFreshLogin: false });
    void refreshPendingInvitations();
  }, [hydrateUserSession, refreshPendingInvitations]);

  const activatePlatformWorkspace = useCallback(() => {
    if (!hasPlatformAccessRef.current) return;
    setActiveWorkspace('PLATFORM');
    setActiveOrganizationId(null);
    localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, 'PLATFORM');
    localStorage.removeItem(ACTIVE_ORG_STORAGE_KEY);
    queryClient.removeQueries();
    void loadOrganizationContext(null);
  }, [loadOrganizationContext]);

  const selectOrganization = useCallback(
    async (organizationId: number): Promise<SchoolOrganizationStatus> => {
      let target = activeMembershipsRef.current.find(
        (m) => m.organizationId === organizationId
      );
      if (!target) return 'ACTIVE';

      // Synchronously enter loading state and clear previous organization's cached data
      // so no stale workspace content renders while the new organization initializes
      setIsOrgContextLoading(true);
      setSubscription(null);
      setEntitlements(null);
      setOrganizationPermissions(new Set(target.permissions || []));
      queryClient.removeQueries();

      setActiveOrganizationId(organizationId);
      localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, String(organizationId));
      setActiveWorkspace('SCHOOL');
      localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, 'SCHOOL');

      try {
        const freshProfile = await authApi.getCurrentUser();
        if (freshProfile && typeof freshProfile.id === 'number') {
          setUser(freshProfile);
          const freshActiveOrgs = (freshProfile.organizations || []).filter(
            (m) => m.membershipStatus === 'ACTIVE'
          );
          const otherOrgs = freshActiveOrgs.filter(
            (m) => m.organizationId !== organizationId
          );
          if (otherOrgs.length > 0) {
            void revalidateAllOrganizationsStatuses(
              otherOrgs,
              hasPlatformAccessRef.current
            );
          }
          const freshTarget = freshActiveOrgs.find(
            (m) => m.organizationId === organizationId
          );
          if (freshTarget) {
            target = freshTarget;
          }
        }
      } catch {
        // Proceed with cached membership summary if /api/me check fails
      }

      return loadOrganizationContext(target, { silent: false });
    },
    [loadOrganizationContext, revalidateAllOrganizationsStatuses]
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
          activeOrganizationIdRef.current ||
          activeMembershipsRef.current[0]?.organizationId;
        if (targetId) {
          void selectOrganization(targetId);
        }
      }
    },
    [activatePlatformWorkspace, selectOrganization]
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
      activeOrganizationStatus,
      activeOrganizationRestriction,
      organizationStatusById,
      isOrganizationSuspended,
      isOrganizationDeactivated,
      isOrganizationRestricted,
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
      revalidateOrganizationStatus,
      revalidateAllOrganizationsStatuses,
      activatePlatformWorkspace,
      selectOrganization,
      switchWorkspace,
      hasPermission,
      hasRole,
      hasFeature,
      profilePhotoBlobUrl,
      refreshProfilePhoto,
      updateCurrentUserProfile,
      pendingInvitations,
      pendingInvitationsCount: pendingInvitations.length,
      refreshPendingInvitations,
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
      activeOrganizationStatus,
      activeOrganizationRestriction,
      organizationStatusById,
      isOrganizationSuspended,
      isOrganizationDeactivated,
      isOrganizationRestricted,
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
      revalidateOrganizationStatus,
      revalidateAllOrganizationsStatuses,
      activatePlatformWorkspace,
      selectOrganization,
      switchWorkspace,
      hasPermission,
      hasRole,
      hasFeature,
      profilePhotoBlobUrl,
      refreshProfilePhoto,
      updateCurrentUserProfile,
      pendingInvitations,
      refreshPendingInvitations,
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


