import { apiClient } from './client';
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponseData,
  RegisterUserRequest,
  UpdateUserProfileRequest,
  UserMembershipResponse,
  UserResponse,
} from '@/types/auth';

export const authApi = {
  register: async (payload: RegisterUserRequest): Promise<UserResponse> => {
    const res = await apiClient.post<UserResponse>(
      '/api/auth/register',
      payload,
      {
        skipAuth: true,
        skipUnauthorizedRedirect: true,
      }
    );
    if (!res.data) {
      throw new Error('Account registration returned empty data.');
    }
    return res.data;
  },

  login: async (payload: LoginRequest) => {
    return apiClient.post<LoginResponseData>('/api/auth/login', payload, {
      skipAuth: true,
      skipUnauthorizedRedirect: true,
    });
  },

  logout: async () => {
    return apiClient.post<void>('/api/auth/logout', undefined, {
      skipUnauthorizedRedirect: true,
    });
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    const res = await apiClient.get<UserResponse>('/api/me');
    if (!res.data) {
      throw new Error('Unable to load user profile.');
    }
    return res.data;
  },

  getCurrentMemberships: async (): Promise<UserMembershipResponse[]> => {
    const user = await authApi.getCurrentUser();
    return user.organizations ?? [];
  },

  updateProfile: async (
    payload: UpdateUserProfileRequest
  ): Promise<UserResponse> => {
    const res = await apiClient.put<UserResponse>('/api/me', payload);
    if (!res.data) {
      throw new Error('Unable to update user profile.');
    }
    return res.data;
  },

  changePassword: async (payload: ChangePasswordRequest): Promise<void> => {
    await apiClient.post<void>('/api/me/change-password', payload);
  },
};

