/**
 * Invitation verification and acceptance contracts aligned with
 * `com.side.forge.invitation.dto.InvitationDtos`.
 */

export type InvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'REJECTED';

export type InvitationTargetType =
  | 'SCHOOL_ADMIN'
  | 'STAFF'
  | 'TEACHER'
  | 'GUARDIAN'
  | 'GENERAL';

export interface InvitationResponse {
  id: number;
  organizationId: number;
  organizationName: string;
  email: string;
  roleCode: string;
  targetType: InvitationTargetType;
  targetProfileId: number | null;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  recipientPhone: string | null;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface InvitationVerificationResponse {
  invitationId: number;
  organizationId: number;
  organizationName: string;
  email: string;
  recipientEmail?: string;
  roleCode: string;
  roleName?: string;
  targetType: InvitationTargetType;
  targetProfileId: number | null;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  recipientPhone: string | null;
  existingUserAccount: boolean;
  existingAccount?: boolean;
  status: InvitationStatus;
  valid?: boolean;
  expiresAt: string;
}

export type PendingInvitationItem = InvitationResponse;

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
  user?: {
    accessToken?: string;
    organizationId?: number;
    roleCode?: string;
  };
}
