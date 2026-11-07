import { apiClient } from '../lib/api-client';
import { 
  OnboardingFormData, 
  OnboardingRequestDto, 
  OnboardingRequestResponse,
  OnboardingStatus,
  PagedResponse,
  ApproveOnboardingSubscriptionRequest,
  ApprovedOrganizationResponse,
  SubscriptionPlanSummary,
  PlatformOnboardingAuditItem,
  ApiResponse 
} from '../types/onboarding';

/**
 * School Onboarding API Client
 * 
 * Target Endpoint: POST /api/organizations/onboarding
 * Target Backend: Spring Boot OrganizationOnboardingController.submit()
 * Success Status: HTTP 201 Created
 */

// Retrieve configured API base URL, defaulting to relative path for reverse proxy setups
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const ONBOARDING_ENDPOINT = `${API_BASE_URL}/api/organizations/onboarding`;
const SUBMITTED_ONBOARDING_STORAGE_KEY = 'sideforge.submittedOnboardingRequests';

export interface StoredOnboardingSubmission {
  id: number;
  schoolName: string;
  boardAffiliation: string;
  schoolEmail: string;
  contactPersonName: string;
  contactEmail: string;
  mobileNumber: string;
  status: string;
  requestedBy: number | null;
  submittedAt: string;
}

export function saveSubmittedOnboardingRequest(record: StoredOnboardingSubmission): void {
  try {
    const existing = getSubmittedOnboardingRequests();
    const filtered = existing.filter((item) => item.id !== record.id);
    const updated = [record, ...filtered].slice(0, 10);
    localStorage.setItem(SUBMITTED_ONBOARDING_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
}

export function getSubmittedOnboardingRequests(): StoredOnboardingSubmission[] {
  try {
    const raw = localStorage.getItem(SUBMITTED_ONBOARDING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Maps frontend form data to exact backend OnboardingRequestDto.
 * Strips display-only wrappers and converts numeric fields.
 */
export function mapFormDataToDto(formData: OnboardingFormData): OnboardingRequestDto {
  return {
    schoolName: formData.schoolName.trim(),
    boardAffiliation: formData.boardAffiliation as OnboardingRequestDto['boardAffiliation'],
    schoolEmail: formData.schoolEmail.trim(),
    schoolPhone: formData.schoolPhone.trim(),
    address: formData.address.trim(),
    city: formData.city.trim(),
    state: formData.state.trim(),
    postalCode: formData.postalCode.trim(),
    contactPersonName: formData.contactPersonName.trim(),
    designation: formData.designation.trim(),
    contactEmail: formData.contactEmail.trim(),
    mobileNumber: formData.mobileNumber.trim(),
    studentStrength: formData.studentStrength as OnboardingRequestDto['studentStrength'],
    campusCount: typeof formData.campusCount === 'number' 
      ? Math.max(1, Math.floor(formData.campusCount))
      : Math.max(1, parseInt(String(formData.campusCount), 10) || 1),
    managementSystem: formData.managementSystem as OnboardingRequestDto['managementSystem'],
    additionalRequirements: formData.additionalRequirements?.trim() || undefined
  };
}

/**
 * Submits the school onboarding request to the backend API.
 */
export async function submitSchoolOnboarding(
  formData: OnboardingFormData
): Promise<ApiResponse<OnboardingRequestResponse>> {
  const payload = mapFormDataToDto(formData);

  try {
    const response = await fetch(ONBOARDING_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // Parse response body if present
    let responseData: unknown = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      try {
        responseData = await response.text();
      } catch {
        responseData = null;
      }
    }

    // Success response: HTTP 201 Created (or HTTP 200 OK)
    if (response.status === 201 || (response.ok && response.status === 200)) {
      const created = responseData as OnboardingRequestResponse;
      if (created && typeof created === 'object' && typeof created.id === 'number') {
        saveSubmittedOnboardingRequest({
          id: created.id,
          schoolName: created.schoolName || payload.schoolName,
          boardAffiliation: created.boardAffiliation || payload.boardAffiliation,
          schoolEmail: created.schoolEmail || payload.schoolEmail,
          contactPersonName: created.contactPersonName || payload.contactPersonName,
          contactEmail: created.contactEmail || payload.contactEmail,
          mobileNumber: created.mobileNumber || payload.mobileNumber,
          status: created.status || 'PENDING',
          requestedBy: created.requestedBy ?? null,
          submittedAt: created.createdAt || new Date().toISOString(),
        });
      }
      return {
        success: true,
        statusCode: response.status,
        data: created,
        message: 'Your school onboarding request has been submitted and is pending platform approval.'
      };
    }

    // Handle client/server validation errors (HTTP 400 Bad Request / 422 Unprocessable Entity)
    const fieldErrors: Record<string, string> = {};
    let userMessage = 'Unable to complete submission. Please review the highlighted fields.';

    if (responseData && typeof responseData === 'object') {
      const errObj = responseData as Record<string, unknown>;

      // Spring Boot standard validation error format: { errors: [ { field: '...', defaultMessage: '...' } ] }
      if (Array.isArray(errObj.errors)) {
        for (const err of errObj.errors) {
          if (err && typeof err === 'object') {
            const item = err as { field?: string; defaultMessage?: string; message?: string };
            if (item.field) {
              fieldErrors[item.field] = item.defaultMessage || item.message || 'Invalid value';
            }
          }
        }
      } 
      // Key-value field errors format: { fieldErrors: { schoolEmail: 'Already exists' } }
      else if (errObj.fieldErrors && typeof errObj.fieldErrors === 'object') {
        const fe = errObj.fieldErrors as Record<string, string>;
        for (const [k, v] of Object.entries(fe)) {
          if (typeof v === 'string') fieldErrors[k] = v;
        }
      }

      // GlobalExceptionHandler format: { status: false, message: "fieldName: validation message" }
      if (typeof errObj.message === 'string') {
        const colonIdx = errObj.message.indexOf(':');
        if (colonIdx > 0 && colonIdx < 35) {
          const candidateField = errObj.message.slice(0, colonIdx).trim();
          const candidateMsg = errObj.message.slice(colonIdx + 1).trim();
          if (/^[a-zA-Z]+$/.test(candidateField) && candidateMsg) {
            fieldErrors[candidateField] = candidateMsg;
          }
        }
      }

      // User-friendly message if provided without exposing stack traces
      if (typeof errObj.message === 'string' && !errObj.message.includes('Exception') && !errObj.message.includes('org.springframework')) {
        userMessage = errObj.message;
      } else if (response.status === 409) {
        userMessage = 'An onboarding request for this school or email address has already been submitted.';
      }
    }

    return {
      success: false,
      statusCode: response.status,
      data: responseData as OnboardingRequestResponse,
      message: userMessage,
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined
    };

  } catch (networkError) {
    console.error('Onboarding API Submission Network Error:', networkError);
    return {
      success: false,
      statusCode: 0,
      message: 'Unable to reach the server. Please check your internet connection or try again shortly.'
    };
  }
}

export interface ListOnboardingRequestsParams {
  status?: OnboardingStatus | '';
  search?: string;
  page?: number;
  size?: number;
}

/**
 * Platform Administrator Onboarding Management API Client
 * Connects to `PlatformOnboardingController` (`/api/platform/onboarding/organizations`)
 * and supporting platform endpoints (`PlatformSaaSController`).
 */
export const platformOnboardingApi = {
  /**
   * Lists school onboarding requests with optional status filter, search, and pagination.
   * Requires `platform.organization.view`.
   */
  listRequests: async (
    params: ListOnboardingRequestsParams = {}
  ): Promise<PagedResponse<OnboardingRequestResponse>> => {
    return apiClient.get<PagedResponse<OnboardingRequestResponse>>(
      '/api/platform/onboarding/organizations',
      {
        params: {
          status: params.status || undefined,
          search: params.search?.trim() || undefined,
          page: params.page ?? 0,
          size: params.size ?? 10,
        },
      }
    );
  },

  /**
   * Fetches full details of a single onboarding request by ID.
   * Requires `platform.organization.view`.
   */
  getRequestById: async (requestId: number): Promise<OnboardingRequestResponse> => {
    return apiClient.get<OnboardingRequestResponse>(
      `/api/platform/onboarding/organizations/${requestId}`
    );
  },

  /**
   * Approves a pending or under-review onboarding request and provisions the school organization,
   * initial SCHOOL_ADMIN membership/invitation, and subscription.
   * Requires `platform.organization.manage`.
   */
  approveRequest: async (
    requestId: number,
    subscriptionRequest?: ApproveOnboardingSubscriptionRequest
  ): Promise<ApprovedOrganizationResponse> => {
    return apiClient.post<ApprovedOrganizationResponse>(
      `/api/platform/onboarding/organizations/${requestId}/approve`,
      subscriptionRequest
    );
  },

  /**
   * Rejects a pending or under-review onboarding request with a mandatory reason (max 1000 chars).
   * Requires `platform.organization.manage`.
   */
  rejectRequest: async (requestId: number, rejectionReason: string): Promise<void> => {
    await apiClient.post(
      `/api/platform/onboarding/organizations/${requestId}/reject`,
      undefined,
      {
        params: {
          rejectionReason: rejectionReason.trim(),
        },
      }
    );
  },

  /**
   * Fetches active subscription plans so administrators can optionally select an initial plan on approval.
   * Requires `platform.plan.view`.
   */
  listActivePlans: async (): Promise<SubscriptionPlanSummary[]> => {
    return apiClient.get<SubscriptionPlanSummary[]>('/api/platform/plans', {
      params: { activeOnly: true },
      suppressUnauthorizedEvent: true,
    });
  },

  /**
   * Fetches platform audit logs for onboarding requests (`ONBOARDING_APPROVED`, `ONBOARDING_REJECTED`).
   * Requires `platform.audit.view`.
   */
  getOnboardingAuditLogs: async (
    page = 0,
    size = 50
  ): Promise<PagedResponse<PlatformOnboardingAuditItem>> => {
    return apiClient.get<PagedResponse<PlatformOnboardingAuditItem>>('/api/platform/audit-logs', {
      params: {
        resourceType: 'ONBOARDING_REQUEST',
        page,
        size,
      },
      suppressUnauthorizedEvent: true,
    });
  },
};
