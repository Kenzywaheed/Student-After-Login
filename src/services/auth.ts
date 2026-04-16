import { apiClient, apiRequest } from './api';
import type { RoleType } from '../constants/roles';

export interface StrapiRole {
  id: number;
  name: string;
  type: RoleType;
}

export interface StrapiUser {
  id: number;
  username: string;
  email: string;
  displayName?: string;
  universityId?: string;
  bio?: string;
  phoneNumber?: string;
  avatar?: {
    id: number;
    url: string;
  } | null;
  role?: StrapiRole;
}

interface AuthResponse {
  jwt: string;
  user: StrapiUser;
}

function normalizeAuthError(err: unknown, mode: 'login' | 'register'): Error {
  const message = err instanceof Error ? err.message : String(err);

  if (message.toLowerCase() === 'forbidden') {
    if (mode === 'register') {
      return new Error('Registration is currently disabled by the server. Please contact an administrator.');
    }
    return new Error('Login is forbidden for this account. Check if the account is blocked or not permitted.');
  }

  if (mode === 'login' && /invalid identifier or password/i.test(message)) {
    return new Error('Invalid email/username or password.');
  }

  return new Error(message || 'Authentication failed.');
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  displayName: string;
  role: 'visitor' | 'college-member';
  universityId?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  password: string;
  passwordConfirmation: string;
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  phoneNumber?: string;
  avatar?: number;
}

export async function login(identifier: string, password: string): Promise<AuthResponse> {
  try {
    return await apiRequest<AuthResponse>('/api/auth/local', {
      method: 'POST',
      auth: false,
      body: {
        identifier,
        password,
      },
    });
  } catch (err) {
    throw normalizeAuthError(err, 'login');
  }
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  // Some Strapi setups reject custom fields on /auth/local/register.
  // Try role-aware payload first, then gracefully fall back.
  try {
    return await apiRequest<AuthResponse>('/api/auth/local/register', {
      method: 'POST',
      auth: false,
      body: {
        username: payload.username,
        email: payload.email,
        password: payload.password,
        displayName: payload.displayName,
        role: payload.role,
        universityId: payload.universityId,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (/invalid parameter role/i.test(message)) {
      try {
        return await apiRequest<AuthResponse>('/api/auth/local/register', {
          method: 'POST',
          auth: false,
          body: {
            username: payload.username,
            email: payload.email,
            password: payload.password,
            displayName: payload.displayName,
            universityId: payload.universityId,
          },
        });
      } catch (fallbackErr) {
        throw normalizeAuthError(fallbackErr, 'register');
      }
    }

    throw normalizeAuthError(err, 'register');
  }
}

export async function me(token: string): Promise<StrapiUser> {
  const response = await apiClient.get<StrapiUser>('/api/users/me', {
    params: {
      'populate[role]': '*',
      'populate[avatar]': '*',
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<void> {
  await apiClient.post('/api/auth/change-password', payload);
}

export async function updateProfile(userId: number, data: UpdateProfilePayload): Promise<StrapiUser> {
  const response = await apiClient.put<StrapiUser>(`/api/users/${userId}`, data);
  return response.data;
}

export async function uploadAvatar(file: File): Promise<{ id: number; url: string }> {
  const formData = new FormData();
  formData.append('files', file);

  const response = await apiClient.post<Array<{ id: number; url: string }>>('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data[0];
}
