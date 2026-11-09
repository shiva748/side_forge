/**
 * Types for Public & Authenticated Invitation Verification/Acceptance
 * and Personal Account Settings (`/api/invitations/**` & `/api/me/**`).
 *
 * Strictly aligned with:
 * - `com.side.forge.invitation.dto.InvitationDtos`
 * - `com.side.forge.user.dto.UpdateUserProfileRequest`
 * - `com.side.forge.user.dto.ChangePasswordRequest`
 * - `com.side.forge.storage.dto.StorageDtos.StoredFileResponse`
 */

import type {
  InvitationResponse,
  InvitationStatus,
  InvitationTargetType,
} from './staffManagement';
import type { StoredFileResponse } from './studentManagement';

export type {
  InvitationResponse,
  InvitationStatus,
  InvitationTargetType,
  StoredFileResponse,
};

export interface InvitationVerificationResponse {
  invitationId: number;
  organizationId: number;
  organizationName: string;
  email: string;
  roleCode: string;
  targetType: InvitationTargetType;
  targetProfileId: number | null;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  recipientPhone: string | null;
  existingUserAccount: boolean;
  status: InvitationStatus;
  expiresAt: string;
}

export interface AcceptInvitationRequest {
  token: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  password?: string | null;
}

export interface RejectInvitationRequest {
  token: string;
  email?: string | null;
}

export interface InvitationAcceptanceResponse {
  invitation: InvitationResponse;
  userId: number;
  email: string;
  organizationId: number;
  roleCode: string;
  membershipStatus: string;
  linkedProfileId: number | null;
  accessToken: string;
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

export type InvitationTerminalStateKind =
  | 'MISSING_TOKEN'
  | 'INVALID_TOKEN'
  | 'EXPIRED'
  | 'REVOKED'
  | 'ALREADY_ACCEPTED'
  | 'REJECTED'
  | 'ORG_INACTIVE'
  | 'GENERIC_ERROR';

export interface ClassifiedInvitationError {
  kind: InvitationTerminalStateKind;
  title: string;
  description: string;
  nextSteps: string;
}

export function classifyInvitationVerificationError(
  error: unknown
): ClassifiedInvitationError {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : '';
  const msg = rawMessage.trim();

  if (/Invalid invitation token/i.test(msg)) {
    return {
      kind: 'INVALID_TOKEN',
      title: 'Invalid Invitation Link',
      description:
        'This invitation token was not recognized or has been replaced by a newer resent invitation link.',
      nextSteps:
        'Please check that you opened the latest invitation link sent to you, or ask your school administrator to resend the invitation.',
    };
  }

  if (/Invitation is expired/i.test(msg) || /Invitation has expired/i.test(msg)) {
    return {
      kind: 'EXPIRED',
      title: 'Invitation Link Expired',
      description:
        'This single-use invitation link has passed its expiration date and can no longer be used.',
      nextSteps:
        'Contact your school administrator and ask them to resend your invitation to generate a fresh link.',
    };
  }

  if (/Invitation is revoked/i.test(msg) || /Invitation has been revoked/i.test(msg)) {
    return {
      kind: 'REVOKED',
      title: 'Invitation Revoked',
      description:
        'This invitation has been revoked by an administrator and is no longer active.',
      nextSteps:
        'If you still require access to this school organization, please contact the school administrator for a new invitation.',
    };
  }

  if (
    /Invitation is accepted/i.test(msg) ||
    /Invitation has already been accepted/i.test(msg)
  ) {
    return {
      kind: 'ALREADY_ACCEPTED',
      title: 'Invitation Already Accepted',
      description:
        'This invitation has already been used to activate organization membership.',
      nextSteps:
        'You can sign in directly with your Side_forge account to access your school workspace.',
    };
  }

  if (/Invitation is rejected/i.test(msg)) {
    return {
      kind: 'REJECTED',
      title: 'Invitation Previously Declined',
      description:
        'This invitation was previously declined by the recipient and cannot be accepted.',
      nextSteps:
        'If you declined this invitation by mistake, ask your school administrator to send a new invitation.',
    };
  }

  if (/Organization is not active/i.test(msg)) {
    return {
      kind: 'ORG_INACTIVE',
      title: 'Organization Currently Unavailable',
      description:
        'The school organization associated with this invitation is not currently active on Side_forge.',
      nextSteps:
        'Please contact your school administrator or Side_forge support for assistance.',
    };
  }

  return {
    kind: 'GENERIC_ERROR',
    title: 'Unable to Verify Invitation',
    description:
      msg || 'An unexpected error occurred while verifying this invitation link.',
    nextSteps:
      'Please refresh the page to try again or request a fresh invitation link from your administrator.',
  };
}

/**
 * Normalizes a backend-generated invitation link (`/api/invitations/accept?token=...`
 * or `/invitations/accept?token=...`) into a full browser URL pointing to the
 * public React route `/invitations/accept?token=...`.
 */
export function normalizeInvitationLinkForFrontend(rawLink: string): string {
  if (!rawLink) return '';
  const trimmed = rawLink.trim();
  const normalizedPath = trimmed.replace(
    /^\/api\/invitations\/accept\b/,
    '/invitations/accept'
  );
  if (
    normalizedPath.startsWith('http://') ||
    normalizedPath.startsWith('https://')
  ) {
    return normalizedPath.replace(
      /\/api\/invitations\/accept\b/,
      '/invitations/accept'
    );
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    const prefix = normalizedPath.startsWith('/') ? '' : '/';
    return `${window.location.origin}${prefix}${normalizedPath}`;
  }
  return normalizedPath;
}

/**
 * Extracts a raw invitation token from either a full URL, a relative path
 * (`/invitations/accept?token=...`), or a raw token string.
 */
export function extractInvitationTokenFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.includes('token=')) {
      const qIndex = trimmed.indexOf('?');
      const queryPart = qIndex >= 0 ? trimmed.slice(qIndex) : trimmed;
      const params = new URLSearchParams(
        queryPart.startsWith('?') ? queryPart : `?${queryPart}`
      );
      const tokenParam = params.get('token');
      if (tokenParam && tokenParam.trim()) {
        return tokenParam.trim();
      }
    }
  } catch {
    // Fall through to raw token return
  }

  if (!trimmed.includes(' ') && !trimmed.includes('/')) {
    return trimmed;
  }
  return null;
}

const SESSION_INVITATION_TOKEN_MAP_KEY = 'sideforge.pendingInvitationTokensById';
const SESSION_LAST_INVITATION_TOKEN_KEY = 'sideforge.lastVerifiedInvitationToken';

export function rememberInvitationTokenInSession(
  token: string,
  invitationId?: number
): void {
  try {
    sessionStorage.setItem(SESSION_LAST_INVITATION_TOKEN_KEY, token);
    if (invitationId) {
      const raw = sessionStorage.getItem(SESSION_INVITATION_TOKEN_MAP_KEY);
      const map: Record<string, string> = raw ? JSON.parse(raw) : {};
      map[String(invitationId)] = token;
      sessionStorage.setItem(
        SESSION_INVITATION_TOKEN_MAP_KEY,
        JSON.stringify(map)
      );
    }
  } catch {
    // Ignore sessionStorage errors
  }
}

export function getRememberedTokenForInvitation(
  invitationId: number
): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_INVITATION_TOKEN_MAP_KEY);
    if (!raw) return null;
    const map: Record<string, string> = JSON.parse(raw);
    return map[String(invitationId)] || null;
  } catch {
    return null;
  }
}

export function clearRememberedInvitationToken(
  token?: string,
  invitationId?: number
): void {
  try {
    const last = sessionStorage.getItem(SESSION_LAST_INVITATION_TOKEN_KEY);
    if (!token || last === token) {
      sessionStorage.removeItem(SESSION_LAST_INVITATION_TOKEN_KEY);
    }
    if (invitationId) {
      const raw = sessionStorage.getItem(SESSION_INVITATION_TOKEN_MAP_KEY);
      if (raw) {
        const map: Record<string, string> = JSON.parse(raw);
        delete map[String(invitationId)];
        sessionStorage.setItem(
          SESSION_INVITATION_TOKEN_MAP_KEY,
          JSON.stringify(map)
        );
      }
    }
  } catch {
    // Ignore
  }
}

export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const PROFILE_PHOTO_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];
export const PROFILE_PHOTO_ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
];

export function validateProfilePhotoFile(file: File): string | null {
  if (!file) {
    return 'Please select an image file to upload.';
  }
  if (file.size === 0) {
    return 'Selected image file is empty.';
  }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) {
    return 'Image file size exceeds the 5 MB maximum limit.';
  }
  const mime = (file.type || '').toLowerCase();
  const ext = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase() || ''
    : '';

  const validMime = PROFILE_PHOTO_ALLOWED_MIME_TYPES.includes(mime);
  const validExt = PROFILE_PHOTO_ALLOWED_EXTENSIONS.includes(ext);

  if (!validMime || !validExt) {
    return 'Unsupported file format. Please choose a JPG, PNG, WEBP, or GIF image.';
  }
  return null;
}

