import { User } from '@/types';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '123';
const AUTH_STORAGE_KEY = 'story-map-auth';

export function login(username: string, password: string): boolean {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const user: User = {
      username: ADMIN_USERNAME,
      isAuthenticated: true,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    return true;
  }
  return false;
}

export function logout(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const user = JSON.parse(stored) as User;
      return user.isAuthenticated ? user : null;
    }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  return null;
}

export function isAuthenticated(): boolean {
  const user = getCurrentUser();
  return user?.isAuthenticated ?? false;
}