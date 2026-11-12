import { apiClient, getActiveApiBaseUrl } from './client';
import { STORAGE_KEYS } from '@/constants/env';
import { secureStorage } from '@/utils/secureStorage';
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponseData,
  RegisterUserRequest,
  UpdateUserProfileRequest,
  UserMembershipResponse,
  UserResponse,
} from '@/types/auth';
import type { StoredFileResponse } from '@/types/parentPortal';

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

export interface PickedProfilePhotoAsset {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number | null;
  webFile?: File | null;
}

export function validatePickedProfilePhoto(
  asset: PickedProfilePhotoAsset
): string | null {
  if (!asset || !asset.uri) {
    return 'Please select an image file to upload.';
  }
  if (
    typeof asset.sizeBytes === 'number' &&
    asset.sizeBytes > PROFILE_PHOTO_MAX_BYTES
  ) {
    return 'Image file size exceeds the 5 MB maximum limit.';
  }
  if (typeof asset.sizeBytes === 'number' && asset.sizeBytes <= 0) {
    return 'Selected image file is empty.';
  }

  const mime = (asset.mimeType || '').toLowerCase().trim();
  const ext = asset.name.includes('.')
    ? (asset.name.split('.').pop() || '').toLowerCase().trim()
    : '';

  if (mime && !PROFILE_PHOTO_ALLOWED_MIME_TYPES.includes(mime)) {
    return 'Only JPG, PNG, WEBP, or GIF images are allowed.';
  }
  if (ext && !PROFILE_PHOTO_ALLOWED_EXTENSIONS.includes(ext)) {
    return 'Only .jpg, .jpeg, .png, .webp, or .gif image files are allowed.';
  }
  return null;
}

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

  uploadProfilePhoto: async (
    asset: PickedProfilePhotoAsset,
    replaceExisting = false
  ): Promise<StoredFileResponse> => {
    const validationError = validatePickedProfilePhoto(asset);
    if (validationError) {
      throw new Error(validationError);
    }

    const formData = new FormData();
    if (asset.webFile) {
      formData.append('file', asset.webFile, asset.name);
    } else {
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || 'profile-photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as unknown as Blob);
    }

    const res = replaceExisting
      ? await apiClient.put<StoredFileResponse>('/api/me/profile-photo', formData)
      : await apiClient.post<StoredFileResponse>('/api/me/profile-photo', formData);

    if (!res.data) {
      throw new Error('Unable to upload profile photo.');
    }
    return res.data;
  },

  deleteProfilePhoto: async (): Promise<void> => {
    await apiClient.delete<void>('/api/me/profile-photo');
  },

  buildAuthorizedUserPhotoSource: (
    profilePhotoUrl?: string | null,
    version?: number
  ): { uri: string; headers: Record<string, string> } | null => {
    if (!profilePhotoUrl) return null;
    const baseUrl = getActiveApiBaseUrl();
    const rawUri = profilePhotoUrl.startsWith('http')
      ? profilePhotoUrl
      : `${baseUrl}${
          profilePhotoUrl.startsWith('/')
            ? profilePhotoUrl
            : `/${profilePhotoUrl}`
        }`;
    const separator = rawUri.includes('?') ? '&' : '?';
    const uri =
      typeof version === 'number' ? `${rawUri}${separator}v=${version}` : rawUri;

    const token = secureStorage.getSync(STORAGE_KEYS.ACCESS_TOKEN);
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['Cookie'] = `jwt=${token}`;
    }
    return { uri, headers };
  },
};


