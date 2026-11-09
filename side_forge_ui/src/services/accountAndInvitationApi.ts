/**
 * API Service for Invitation Verification/Acceptance (`/api/invitations/**`)
 * and Personal Account Management (`/api/me/**`).
 */

import { apiClient, buildUrl } from '../lib/api-client';
import type { UserProfile } from '../types/auth';
import type {
  AcceptInvitationRequest,
  ChangePasswordRequest,
  InvitationAcceptanceResponse,
  InvitationResponse,
  InvitationVerificationResponse,
  RejectInvitationRequest,
  StoredFileResponse,
  UpdateUserProfileRequest,
} from '../types/accountAndInvitations';

export const accountAndInvitationApi = {
  // =========================================================================
  // PART A — PUBLIC & AUTHENTICATED INVITATION VERIFICATION & ACCEPTANCE
  // =========================================================================

  /**
   * Verifies an invitation token via `GET /api/invitations/verify?token={token}`.
   * Accessible publicly without authentication.
   */
  verifyInvitation(token: string): Promise<InvitationVerificationResponse> {
    return apiClient.get<InvitationVerificationResponse>(
      '/api/invitations/verify',
      {
        params: { token: token.trim() },
        suppressUnauthorizedEvent: true,
      }
    );
  },

  /**
   * Accepts an invitation via `POST /api/invitations/accept`.
   * Sets the HttpOnly `jwt` cookie on response and returns `InvitationAcceptanceResponse`.
   */
  acceptInvitation(
    payload: AcceptInvitationRequest
  ): Promise<InvitationAcceptanceResponse> {
    return apiClient.post<InvitationAcceptanceResponse>(
      '/api/invitations/accept',
      payload,
      {
        suppressUnauthorizedEvent: true,
      }
    );
  },

  /**
   * Declines/rejects an invitation via `POST /api/invitations/reject`.
   */
  rejectInvitation(
    payload: RejectInvitationRequest
  ): Promise<InvitationResponse> {
    return apiClient.post<InvitationResponse>(
      '/api/invitations/reject',
      payload,
      {
        suppressUnauthorizedEvent: true,
      }
    );
  },

  /**
   * Lists pending invitations belonging to the currently authenticated user
   * via `GET /api/me/invitations`.
   */
  getMyPendingInvitations(): Promise<InvitationResponse[]> {
    return apiClient.get<InvitationResponse[]>('/api/me/invitations', {
      suppressUnauthorizedEvent: true,
    });
  },

  // =========================================================================
  // PART B — PERSONAL PROFILE, PROFILE PHOTO & PASSWORD MANAGEMENT (`/api/me`)
  // =========================================================================

  /**
   * Updates the authenticated user's profile (`firstName`, `lastName`, `phoneNumber`)
   * via `PUT /api/me`.
   */
  updateProfile(payload: UpdateUserProfileRequest): Promise<UserProfile> {
    return apiClient.put<UserProfile>('/api/me', payload);
  },

  /**
   * Partially updates the authenticated user's profile via `PATCH /api/me`.
   */
  patchProfile(payload: UpdateUserProfileRequest): Promise<UserProfile> {
    return apiClient.patch<UserProfile>('/api/me', payload);
  },

  /**
   * Changes the authenticated user's password via `POST /api/me/change-password`.
   */
  changePassword(payload: ChangePasswordRequest): Promise<void> {
    return apiClient.post<void>('/api/me/change-password', payload);
  },

  /**
   * Uploads or replaces the authenticated user's profile photo
   * via `POST /api/me/profile-photo` (`multipart/form-data`, part `"file"`).
   */
  uploadProfilePhoto(file: File): Promise<StoredFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<StoredFileResponse>(
      '/api/me/profile-photo',
      formData
    );
  },

  /**
   * Fetches the authenticated user's profile photo binary as a `Blob`
   * via `GET /api/me/profile-photo`.
   */
  async fetchProfilePhotoBlob(): Promise<Blob | null> {
    const response = await fetch(buildUrl('/api/me/profile-photo'), {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      return null;
    }
    return response.blob();
  },

  /**
   * Removes the authenticated user's profile photo via `DELETE /api/me/profile-photo`.
   */
  deleteProfilePhoto(): Promise<void> {
    return apiClient.delete<void>('/api/me/profile-photo');
  },
};
