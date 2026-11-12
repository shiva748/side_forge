/**
 * Authentication, User Profile, Membership, and Role Experience types
 * aligned with `com.side.forge.user.dto.*`.
 *
 * IMPORTANT: Platform Administration (`PLATFORM_ADMIN`, `SYSTEM_ADMIN`, etc.)
 * is strictly excluded from the mobile application. Only Parent, Teacher,
 * and School Administration experiences are supported on mobile.
 */

export type MobileRoleExperience = 'PARENT' | 'TEACHER' | 'SCHOOL_ADMIN';
export type MobileUserCategory = MobileRoleExperience;

export type OrganizationRoleCode =
  | 'SCHOOL_ADMIN'
  | 'PRINCIPAL'
  | 'TEACHER'
  | 'ACCOUNTANT'
  | 'RECEPTIONIST'
  | 'SCHOOL_STAFF'
  | 'PARENT'
  | 'STUDENT'
  | string;

export interface UserOrganizationSummary {
  organizationId: number;
  organizationName: string;
  membershipStatus: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'LEFT' | string;
  organizationStatus?: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' | string;
  statusReason?: string | null;
  statusChangedAt?: string | null;
  roles: OrganizationRoleCode[];
  permissions?: string[];
}

export type UserMembershipResponse = UserOrganizationSummary;

export interface UserResponse {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  profilePhotoFileId: number | null;
  profilePhotoUrl?: string | null;
  status: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  organizations?: UserOrganizationSummary[];
  systemRoles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MobileWorkspace {
  key: string;
  membershipId: number;
  organizationId: number;
  organizationName: string;
  organizationCode: string;
  organizationStatus: string;
  statusReason?: string | null;
  statusChangedAt?: string | null;
  membershipStatus: string;
  isPrimary: boolean;
  rawRoles: OrganizationRoleCode[];
  roles: OrganizationRoleCode[];
  permissions: string[];
  experience: MobileRoleExperience;
  category: MobileRoleExperience;
  experienceLabel: string;
}

export type MobileWorkspaceOption = MobileWorkspace;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterUserRequest {
  firstName: string;
  lastName?: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface LoginResponseData {
  accessToken?: string;
}

export interface UpdateUserProfileRequest {
  firstName: string;
  lastName?: string | null;
  phoneNumber?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

const ADMIN_ROLE_CODES = new Set([
  'SCHOOL_ADMIN',
  'PRINCIPAL',
  'ACCOUNTANT',
  'RECEPTIONIST',
  'SCHOOL_STAFF',
]);

export function formatRoleCodeLabel(roleCode: string): string {
  switch (roleCode.trim().toUpperCase()) {
    case 'SCHOOL_ADMIN':
      return 'School Administrator';
    case 'PRINCIPAL':
      return 'Principal';
    case 'TEACHER':
      return 'Teacher';
    case 'PARENT':
      return 'Parent';
    case 'ACCOUNTANT':
      return 'Accountant';
    case 'RECEPTIONIST':
      return 'Receptionist';
    case 'SCHOOL_STAFF':
      return 'School Staff';
    case 'STUDENT':
      return 'Student';
    default:
      return roleCode
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function mapRoleCodeToMobileExperience(
  roleCode: string
): MobileRoleExperience | null {
  const upper = roleCode.trim().toUpperCase();
  if (upper === 'PARENT') return 'PARENT';
  if (upper === 'TEACHER') return 'TEACHER';
  if (ADMIN_ROLE_CODES.has(upper)) return 'SCHOOL_ADMIN';
  return null;
}

export function getExperienceDisplayName(
  experience: MobileRoleExperience,
  rawRoles?: string[]
): string {
  if (experience === 'PARENT') return 'Parent Portal';
  if (experience === 'TEACHER') return 'Teacher Workspace';
  if (rawRoles?.includes('PRINCIPAL')) return 'Principal Administration';
  if (rawRoles?.includes('SCHOOL_ADMIN')) return 'School Administration';
  return 'School Staff & Admin';
}

/**
 * Expands a user's backend `UserMembershipResponse[]` into selectable mobile
 * workspaces while filtering out inactive memberships and unsupported roles
 * (such as Platform Admin or Student-only accounts).
 * If a user holds multiple distinct mobile experiences within the same school
 * (e.g., both TEACHER and PARENT at the same school), each experience is
 * exposed as a distinct workspace entry so the user can switch seamlessly.
 */
export function buildMobileWorkspaces(
  memberships: UserOrganizationSummary[]
): MobileWorkspace[] {
  const workspaces: MobileWorkspace[] = [];

  for (const m of memberships ?? []) {
    const membershipStatus = m.membershipStatus || 'ACTIVE';
    const orgStatus = m.organizationStatus || 'ACTIVE';
    if (membershipStatus !== 'ACTIVE' || orgStatus === 'DEACTIVATED') {
      continue;
    }

    const experiences = new Set<MobileRoleExperience>();
    for (const role of m.roles ?? []) {
      const mapped = mapRoleCodeToMobileExperience(role);
      if (mapped) {
        experiences.add(mapped);
      }
    }

    const ordered: MobileRoleExperience[] = ['SCHOOL_ADMIN', 'TEACHER', 'PARENT'];
    for (const exp of ordered) {
      if (experiences.has(exp)) {
        workspaces.push({
          key: `${m.organizationId}:${exp}`,
          membershipId: m.organizationId,
          organizationId: m.organizationId,
          organizationName: m.organizationName,
          organizationCode: `ORG-${m.organizationId}`,
          organizationStatus: orgStatus,
          statusReason: m.statusReason ?? null,
          statusChangedAt: m.statusChangedAt ?? null,
          membershipStatus,
          isPrimary: workspaces.length === 0,
          rawRoles: m.roles ?? [],
          roles: m.roles ?? [],
          permissions: m.permissions ?? [],
          experience: exp,
          category: exp,
          experienceLabel: getExperienceDisplayName(exp, m.roles),
        });
      }
    }
  }

  return workspaces;
}
