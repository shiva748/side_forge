import { apiClient } from '../lib/api-client';
import { PagedResponse } from '../types/onboarding';
import { OrganizationSubscriptionHistoryItem } from '../types/platformDashboard';
import {
  AssignSubscriptionRequest,
  CancelSubscriptionRequest,
  ChangeSubscriptionPlanRequest,
  CreateSubscriptionPlanRequest,
  FullOrganizationSubscriptionResponse,
  OrganizationBillingSummaryResponse,
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
};

