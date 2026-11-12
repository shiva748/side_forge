import { apiClient } from './client';
import type {
  AcceptInvitationRequest,
  InvitationAcceptanceResponse,
  InvitationResponse,
  InvitationVerificationResponse,
  RejectInvitationRequest,
} from '@/types/invitation';

export const invitationApi = {
  verifyToken: async (token: string): Promise<InvitationVerificationResponse> => {
    const encoded = encodeURIComponent(token.trim());
    const res = await apiClient.get<InvitationVerificationResponse>(
      `/api/invitations/verify?token=${encoded}`
    );
    if (!res.data) {
      throw new Error('Invitation verification returned empty data.');
    }
    const raw = res.data;
    return {
      ...raw,
      valid: raw.valid ?? raw.status === 'PENDING',
      roleName: raw.roleName ?? raw.roleCode,
      recipientEmail: raw.recipientEmail ?? raw.email,
      existingAccount: raw.existingAccount ?? raw.existingUserAccount,
    };
  },

  getMyPendingInvitations: async (): Promise<InvitationResponse[]> => {
    const res = await apiClient.get<InvitationResponse[]>('/api/me/invitations');
    return res.data ?? [];
  },

  acceptInvitation: async (
    payload: AcceptInvitationRequest
  ): Promise<InvitationAcceptanceResponse> => {
    const res = await apiClient.post<InvitationAcceptanceResponse>(
      '/api/invitations/accept',
      payload
    );
    if (!res.data) {
      throw new Error('Invitation acceptance failed.');
    }
    return res.data;
  },

  rejectInvitation: async (
    payload: RejectInvitationRequest
  ): Promise<InvitationResponse> => {
    const res = await apiClient.post<InvitationResponse>(
      '/api/invitations/reject',
      payload
    );
    if (!res.data) {
      throw new Error('Invitation rejection failed.');
    }
    return res.data;
  },
};

