import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';
import { STORAGE_KEYS } from '@/constants/env';
import { secureStorage } from '@/utils/secureStorage';
import { authApi } from '@/api/authApi';
import { invitationApi } from '@/api/invitationApi';
import type { InvitationResponse } from '@/types/invitation';
import {
  buildMobileWorkspaces,
  mapRoleCodeToMobileExperience,
  type LoginRequest,
  type MobileRoleExperience,
  type MobileWorkspace,
  type UserMembershipResponse,
  type UserResponse,
} from '@/types/auth';

export type AuthStatus = 'BOOTSTRAPPING' | 'UNAUTHENTICATED' | 'AUTHENTICATED';

export type ParentAcademicSection =
  | 'homework'
  | 'exams'
  | 'timetable'
  | 'attendance';

export interface AuthWorkspaceState {
  status: AuthStatus;
  user: UserResponse | null;
  memberships: UserMembershipResponse[];
  workspaces: MobileWorkspace[];
  activeWorkspace: MobileWorkspace | null;
  needsWorkspaceSelection: boolean;
  hasOnlyUnsupportedRoles: boolean;
  selectedChildId: number | null;
  parentAcademicSection: ParentAcademicSection;
  pendingInvitations: InvitationResponse[];
  pendingInvitationsCount: number;
  profilePhotoVersion: number;
  authError: string | null;

  clearAuthError: () => void;
  bumpProfilePhotoVersion: () => void;
  setParentAcademicSection: (section: ParentAcademicSection) => void;
  bootstrapSession: () => Promise<void>;
  login: (
    emailOrCredentials: LoginRequest | string,
    password?: string
  ) => Promise<void>;
  completeInvitationAcceptance: (params?: {
    accessToken?: string;
    organizationId?: number;
    roleCode?: string;
    switchImmediately?: boolean;
  }) => Promise<void>;
  refreshPendingInvitations: () => Promise<InvitationResponse[]>;
  selectWorkspace: (
    workspaceOrKey: MobileWorkspace | string,
    queryClient?: QueryClient
  ) => Promise<void>;
  setSelectedChildId: (childId: number) => void;
  refreshUserAndMemberships: () => Promise<void>;
  logout: (queryClient?: QueryClient) => Promise<void>;
  handleUnauthorizedSession: (queryClient?: QueryClient) => Promise<void>;
}

async function resolveInitialWorkspace(
  workspaces: MobileWorkspace[],
  preferredOrgId?: number | null,
  preferredExperience?: MobileRoleExperience | null
): Promise<{ selected: MobileWorkspace | null; needsSelection: boolean }> {
  if (workspaces.length === 0) return { selected: null, needsSelection: false };
  if (preferredOrgId && preferredExperience) {
    const match = workspaces.find(
      (w) =>
        w.organizationId === preferredOrgId &&
        w.experience === preferredExperience
    );
    if (match) return { selected: match, needsSelection: false };
  }
  if (workspaces.length === 1) {
    const single = workspaces[0];
    await secureStorage.setAsync(
      STORAGE_KEYS.ACTIVE_ORG_ID,
      String(single.organizationId)
    );
    await secureStorage.setAsync(
      STORAGE_KEYS.ACTIVE_ROLE_EXPERIENCE,
      single.experience
    );
    return { selected: single, needsSelection: false };
  }
  return { selected: null, needsSelection: true };
}


export const useAuthWorkspaceStore = create<AuthWorkspaceState>((set, get) => ({
  status: 'BOOTSTRAPPING',
  user: null,
  memberships: [],
  workspaces: [],
  activeWorkspace: null,
  needsWorkspaceSelection: false,
  hasOnlyUnsupportedRoles: false,
  selectedChildId: null,
  parentAcademicSection: 'homework',
  pendingInvitations: [],
  pendingInvitationsCount: 0,
  profilePhotoVersion: 0,
  authError: null,

  clearAuthError: () => set({ authError: null }),
  bumpProfilePhotoVersion: () =>
    set((state) => ({ profilePhotoVersion: state.profilePhotoVersion + 1 })),
  setParentAcademicSection: (section) =>
    set({ parentAcademicSection: section }),

  refreshPendingInvitations: async () => {
    try {
      const list = await invitationApi.getMyPendingInvitations();
      const pending = list.filter((i) => i.status === 'PENDING');
      set({
        pendingInvitations: pending,
        pendingInvitationsCount: pending.length,
      });
      return pending;
    } catch {
      return get().pendingInvitations;
    }
  },

  bootstrapSession: async () => {
    set({ status: 'BOOTSTRAPPING' });
    await Promise.all([
      secureStorage.getAsync(STORAGE_KEYS.ACCESS_TOKEN),
      secureStorage.getAsync(STORAGE_KEYS.ACTIVE_ORG_ID),
      secureStorage.getAsync(STORAGE_KEYS.ACTIVE_ROLE_EXPERIENCE),
      secureStorage.getAsync(STORAGE_KEYS.CUSTOM_API_BASE_URL),
    ]);

    try {
      const [user, pendingList] = await Promise.all([
        authApi.getCurrentUser(),
        invitationApi.getMyPendingInvitations().catch(() => []),
      ]);
      const pending = pendingList.filter((i) => i.status === 'PENDING');
      const memberships = user.organizations ?? [];
      const workspaces = buildMobileWorkspaces(memberships);
      const storedOrg = secureStorage.getSync(STORAGE_KEYS.ACTIVE_ORG_ID);
      const storedExp = secureStorage.getSync(
        STORAGE_KEYS.ACTIVE_ROLE_EXPERIENCE
      ) as MobileRoleExperience | null;

      const { selected, needsSelection } = await resolveInitialWorkspace(
        workspaces,
        storedOrg ? Number(storedOrg) : null,
        storedExp
      );

      set({
        status: 'AUTHENTICATED',
        user,
        memberships,
        workspaces,
        activeWorkspace: selected,
        needsWorkspaceSelection: needsSelection,
        hasOnlyUnsupportedRoles:
          workspaces.length === 0 &&
          ((user.systemRoles?.length ?? 0) > 0 || memberships.length > 0),
        pendingInvitations: pending,
        pendingInvitationsCount: pending.length,
        authError: null,
      });
    } catch {
      await secureStorage.removeAsync(STORAGE_KEYS.ACCESS_TOKEN);
      set({
        status: 'UNAUTHENTICATED',
        user: null,
        memberships: [],
        workspaces: [],
        activeWorkspace: null,
        needsWorkspaceSelection: false,
        hasOnlyUnsupportedRoles: false,
        pendingInvitations: [],
        pendingInvitationsCount: 0,
      });
    }
  },

  login: async (emailOrCredentials, password) => {
    const credentials: LoginRequest =
      typeof emailOrCredentials === 'string'
        ? { email: emailOrCredentials.trim(), password: password ?? '' }
        : emailOrCredentials;
    set({ authError: null });
    try {
      await authApi.login(credentials);
      await get().bootstrapSession();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Invalid email or password.';
      set({ authError: msg });
      throw err;
    }
  },

  completeInvitationAcceptance: async (params) => {
    if (params?.accessToken) {
      await secureStorage.setAsync(
        STORAGE_KEYS.ACCESS_TOKEN,
        params.accessToken
      );
    }
    // Only switch the active workspace automatically if explicitly requested
    // or if the user did not have an active workspace prior to acceptance.
    const existingActive = get().activeWorkspace;
    if (params?.switchImmediately && params.organizationId) {
      await secureStorage.setAsync(
        STORAGE_KEYS.ACTIVE_ORG_ID,
        String(params.organizationId)
      );
      if (params.roleCode) {
        const mappedExp = mapRoleCodeToMobileExperience(params.roleCode);
        if (mappedExp) {
          await secureStorage.setAsync(
            STORAGE_KEYS.ACTIVE_ROLE_EXPERIENCE,
            mappedExp
          );
        }
      }
    } else if (existingActive) {
      await secureStorage.setAsync(
        STORAGE_KEYS.ACTIVE_ORG_ID,
        String(existingActive.organizationId)
      );
      await secureStorage.setAsync(
        STORAGE_KEYS.ACTIVE_ROLE_EXPERIENCE,
        existingActive.experience
      );
    }
    await get().refreshUserAndMemberships();
    await get().refreshPendingInvitations();
  },

  selectWorkspace: async (workspaceOrKey, queryClient) => {
    const workspace =
      typeof workspaceOrKey === 'string'
        ? get().workspaces.find((w) => w.key === workspaceOrKey)
        : workspaceOrKey;
    if (!workspace) return;
    await secureStorage.setAsync(
      STORAGE_KEYS.ACTIVE_ORG_ID,
      String(workspace.organizationId)
    );
    await secureStorage.setAsync(
      STORAGE_KEYS.ACTIVE_ROLE_EXPERIENCE,
      workspace.experience
    );
    queryClient?.removeQueries({ queryKey: ['org'] });
    set({
      activeWorkspace: workspace,
      needsWorkspaceSelection: false,
      selectedChildId: null,
    });
  },

  setSelectedChildId: (childId) => set({ selectedChildId: childId }),

  refreshUserAndMemberships: async () => {
    const [user, pendingList] = await Promise.all([
      authApi.getCurrentUser(),
      invitationApi.getMyPendingInvitations().catch(() => []),
    ]);
    const pending = pendingList.filter((i) => i.status === 'PENDING');
    const memberships = user.organizations ?? [];
    const workspaces = buildMobileWorkspaces(memberships);
    const current = get().activeWorkspace;
    const stillValid = current
      ? workspaces.find(
          (w) =>
            w.organizationId === current.organizationId &&
            w.experience === current.experience
        ) ?? null
      : null;

    set({
      user,
      memberships,
      workspaces,
      activeWorkspace: stillValid,
      needsWorkspaceSelection: !stillValid && workspaces.length > 0,
      pendingInvitations: pending,
      pendingInvitationsCount: pending.length,
    });
  },

  logout: async (queryClient) => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors during logout
    }
    await get().handleUnauthorizedSession(queryClient);
  },

  handleUnauthorizedSession: async (queryClient) => {
    await Promise.all([
      secureStorage.removeAsync(STORAGE_KEYS.ACCESS_TOKEN),
      secureStorage.removeAsync(STORAGE_KEYS.ACTIVE_ORG_ID),
      secureStorage.removeAsync(STORAGE_KEYS.ACTIVE_ROLE_EXPERIENCE),
    ]);
    queryClient?.clear();
    set({
      status: 'UNAUTHENTICATED',
      user: null,
      memberships: [],
      workspaces: [],
      activeWorkspace: null,
      needsWorkspaceSelection: false,
      hasOnlyUnsupportedRoles: false,
      selectedChildId: null,
      pendingInvitations: [],
      pendingInvitationsCount: 0,
    });
  },
}));
