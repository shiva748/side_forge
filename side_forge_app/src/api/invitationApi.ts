import { apiClient } from './client';
import type {
  InvitationAcceptanceResponse,
  InvitationResponse,
  InvitationStatus,
} from '@/types/invitation';

export const invitationApi = {
  getMyInvitations: async (
    status?: InvitationStatus
  ): Promise<InvitationResponse[]> => {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await apiClient.get<InvitationResponse[]>(
      `/api/me/invitations${query}`
    );
    return res.data ?? [];
  },

  getMyPendingInvitations: async (): Promise<InvitationResponse[]> => {
    const res = await apiClient.get<InvitationResponse[]>(
      '/api/me/invitations?status=PENDING'
    );
    return res.data ?? [];
  },

  getMyInvitationById: async (
    invitationId: number
  ): Promise<InvitationResponse> => {
    const res = await apiClient.get<InvitationResponse>(
      `/api/me/invitations/${invitationId}`
    );
    if (!res.data) {
      throw new Error('Invitation details not found.');
    }
    return res.data;
  },

  acceptMyInvitation: async (
    invitationId: number
  ): Promise<InvitationAcceptanceResponse> => {
    const res = await apiClient.post<InvitationAcceptanceResponse>(
      `/api/me/invitations/${invitationId}/accept`
    );
    if (!res.data) {
      throw new Error('Invitation acceptance failed.');
    }
    return res.data;
  },

  rejectMyInvitation: async (
    invitationId: number
  ): Promise<InvitationResponse> => {
    const res = await apiClient.post<InvitationResponse>(
      `/api/me/invitations/${invitationId}/reject`
    );
    if (!res.data) {
      throw new Error('Invitation rejection failed.');
    }
    return res.data;
  },
};


