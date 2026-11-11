import { ApiError, apiClient, buildUrl } from '../lib/api-client';
import { PagedResponse } from '../types/onboarding';
import { OrganizationSubscriptionHistoryItem } from '../types/platformDashboard';
import {
  AssignSubscriptionRequest,
  CancelSubscriptionRequest,
  ChangeSubscriptionPlanRequest,
  CreateSubscriptionPlanRequest,
  FullOrganizationSubscriptionResponse,
  OrganizationBillingSummaryResponse,
  ReceiptExportFormat,
  RecordSubscriptionPaymentRequest,
  RenewSubscriptionRequest,
  SubscriptionPaymentResponse,
  SubscriptionPaymentStatus,
  SubscriptionPlanResponse,
  UpdateSubscriptionPlanRequest,
  UpdateSubscriptionStatusRequest,
} from '../types/platformSubscription';

export interface ListSubscriptionPaymentsParams {
  organizationId?: number;
  status?: SubscriptionPaymentStatus | '';
  page?: number;
  size?: number;
}

/**
 * Platform Administrator Subscription, Plan & Billing API Service.
 * Connects to existing `PlatformSaaSController` endpoints (`/api/platform/*`).
 */
export const platformSubscriptionApi = {
  // 1. Subscription Plans (`platform.plan.view` / `platform.plan.manage`)
  listPlans: async (activeOnly?: boolean): Promise<SubscriptionPlanResponse[]> => {
    return apiClient.get<SubscriptionPlanResponse[]>('/api/platform/plans', {
      params: activeOnly !== undefined ? { activeOnly } : undefined,
    });
  },

  getPlanById: async (planId: number): Promise<SubscriptionPlanResponse> => {
    return apiClient.get<SubscriptionPlanResponse>(`/api/platform/plans/${planId}`);
  },

  createPlan: async (
    payload: CreateSubscriptionPlanRequest
  ): Promise<SubscriptionPlanResponse> => {
    return apiClient.post<SubscriptionPlanResponse>('/api/platform/plans', payload);
  },

  updatePlan: async (
    planId: number,
    payload: UpdateSubscriptionPlanRequest
  ): Promise<SubscriptionPlanResponse> => {
    return apiClient.put<SubscriptionPlanResponse>(
      `/api/platform/plans/${planId}`,
      payload
    );
  },

  changePlanStatus: async (
    planId: number,
    active: boolean
  ): Promise<SubscriptionPlanResponse> => {
    return apiClient.patch<SubscriptionPlanResponse>(
      `/api/platform/plans/${planId}/status`,
      { active }
    );
  },
  // 2. Organization Subscriptions (`platform.subscription.view` / `manage`)
  getCurrentSubscription: async (
    organizationId: number
  ): Promise<FullOrganizationSubscriptionResponse | null> => {
    return apiClient.get<FullOrganizationSubscriptionResponse | null>(
      `/api/platform/organizations/${organizationId}/subscriptions/current`
    );
  },

  getSubscriptionRecords: async (
    organizationId: number
  ): Promise<FullOrganizationSubscriptionResponse[]> => {
    return apiClient.get<FullOrganizationSubscriptionResponse[]>(
      `/api/platform/organizations/${organizationId}/subscriptions/records`
    );
  },

  getSubscriptionHistory: async (
    organizationId: number
  ): Promise<OrganizationSubscriptionHistoryItem[]> => {
    return apiClient.get<OrganizationSubscriptionHistoryItem[]>(
      `/api/platform/organizations/${organizationId}/subscriptions/history`
    );
  },

  assignSubscription: async (
    organizationId: number,
    payload: AssignSubscriptionRequest
  ): Promise<FullOrganizationSubscriptionResponse> => {
    return apiClient.post<FullOrganizationSubscriptionResponse>(
      `/api/platform/organizations/${organizationId}/subscriptions`,
      payload
    );
  },

  changeSubscriptionPlan: async (
    organizationId: number,
    payload: ChangeSubscriptionPlanRequest
  ): Promise<FullOrganizationSubscriptionResponse> => {
    return apiClient.post<FullOrganizationSubscriptionResponse>(
      `/api/platform/organizations/${organizationId}/subscriptions/change-plan`,
      payload
    );
  },

  renewSubscription: async (
    organizationId: number,
    payload?: RenewSubscriptionRequest
  ): Promise<FullOrganizationSubscriptionResponse> => {
    return apiClient.post<FullOrganizationSubscriptionResponse>(
      `/api/platform/organizations/${organizationId}/subscriptions/renew`,
      payload || {}
    );
  },

  updateSubscriptionStatus: async (
    organizationId: number,
    payload: UpdateSubscriptionStatusRequest
  ): Promise<FullOrganizationSubscriptionResponse> => {
    return apiClient.patch<FullOrganizationSubscriptionResponse>(
      `/api/platform/organizations/${organizationId}/subscriptions/status`,
      payload
    );
  },

  cancelSubscription: async (
    organizationId: number,
    payload: CancelSubscriptionRequest
  ): Promise<FullOrganizationSubscriptionResponse> => {
    return apiClient.post<FullOrganizationSubscriptionResponse>(
      `/api/platform/organizations/${organizationId}/subscriptions/cancel`,
      payload
    );
  },

  // 3. Subscription Billing & Payments (`platform.billing.view`)
  getOrganizationBillingSummary: async (
    organizationId: number
  ): Promise<OrganizationBillingSummaryResponse> => {
    return apiClient.get<OrganizationBillingSummaryResponse>(
      `/api/platform/organizations/${organizationId}/billing`
    );
  },

  getOrganizationPayments: async (
    organizationId: number
  ): Promise<SubscriptionPaymentResponse[]> => {
    return apiClient.get<SubscriptionPaymentResponse[]>(
      `/api/platform/organizations/${organizationId}/billing/payments`
    );
  },

  listAllPayments: async (
    params: ListSubscriptionPaymentsParams = {}
  ): Promise<PagedResponse<SubscriptionPaymentResponse>> => {
    return apiClient.get<PagedResponse<SubscriptionPaymentResponse>>(
      '/api/platform/billing/payments',
      {
        params: {
          organizationId: params.organizationId || undefined,
          status: params.status || undefined,
          page: params.page ?? 0,
          size: params.size ?? 15,
        },
      }
    );
  },

  /**
   * Records a manual offline subscription payment for an organization.
   * Target: `POST /api/platform/organizations/{organizationId}/billing/payments`
   * Permission: `platform.billing.manage` (`PermissionCode.PLATFORM_BILLING_MANAGE`)
   */
  recordManualPayment: async (
    organizationId: number,
    payload: RecordSubscriptionPaymentRequest
  ): Promise<SubscriptionPaymentResponse> => {
    return apiClient.post<SubscriptionPaymentResponse>(
      `/api/platform/organizations/${organizationId}/billing/payments`,
      payload
    );
  },

  /**
   * Downloads a subscription payment receipt in `PDF`, `EXCEL`, or `CSV` format.
   * Target: `GET /api/platform/organizations/{organizationId}/billing/payments/{paymentId}/receipt/export?format=...`
   * Permission: `platform.billing.view` (`PermissionCode.PLATFORM_BILLING_VIEW`)
   */
  downloadPaymentReceipt: async (
    organizationId: number,
    paymentId: number,
    format: ReceiptExportFormat = 'PDF'
  ): Promise<{ blob: Blob; filename: string; contentType: string }> => {
    const url = buildUrl(
      `/api/platform/organizations/${organizationId}/billing/payments/${paymentId}/receipt/export`,
      { format }
    );
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      let message = `Receipt download failed (HTTP ${response.status})`;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const json = (await response.json()) as { message?: string; error?: string };
          message = json.message || json.error || message;
        } catch {
          // Ignore parse error
        }
      } else {
        try {
          const text = await response.text();
          if (text.trim()) message = text.trim();
        } catch {
          // Ignore text error
        }
      }
      throw new ApiError(message, response.status);
    }

    const contentDisposition = response.headers.get('content-disposition') || '';
    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const ext = format === 'EXCEL' ? 'xlsx' : format === 'CSV' ? 'csv' : 'pdf';
    let filename = `subscription-receipt-${paymentId}.${ext}`;

    const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (filenameMatch && filenameMatch[1]) {
      try {
        filename = decodeURIComponent(filenameMatch[1].trim());
      } catch {
        filename = filenameMatch[1].trim();
      }
    }

    const blob = await response.blob();
    const typedBlob =
      blob.type && blob.type !== 'application/octet-stream'
        ? blob
        : new Blob([blob], { type: contentType });

    const objectUrl = URL.createObjectURL(typedBlob);
    try {
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } finally {
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    }

    return { blob: typedBlob, filename, contentType };
  },
};

