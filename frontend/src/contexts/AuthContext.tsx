"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Cookies from 'js-cookie';
import { User, Permission, LoginRequest } from '@/types/auth';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  permissions: Permission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (module: string, submodule?: string, action?: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchCurrentUser = useCallback(async () => {
    const token = Cookies.get('accessToken');
    if (!token) {
      setUser(null);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.getMe();
      if (response.data.success && response.data.data) {
        const raw = response.data.data as any;
        if (raw.user) {
          setUser(raw.user);
          setPermissions(raw.permissions || []);
        } else {
          setUser(raw);
        }
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        Cookies.remove('accessToken', { path: '/' });
        Cookies.remove('refreshToken', { path: '/' });
        setUser(null);
        setPermissions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      if (response.data.success && response.data.data) {
        const raw = response.data.data as any;
        const loggedInUser: User = raw.user;
        const accessToken: string | undefined = raw.tokens?.accessToken || raw.accessToken;
        const refreshToken: string | undefined = raw.tokens?.refreshToken || raw.refreshToken;

        if (accessToken) {
          Cookies.set('accessToken', accessToken, { expires: 1, sameSite: 'lax', path: '/' });
        }
        if (refreshToken) {
          Cookies.set('refreshToken', refreshToken, { expires: 7, sameSite: 'lax', path: '/' });
        }
        setUser(loggedInUser);
        try {
          await fetchCurrentUser();
        } catch {
          // If profile fetch is slow, proceed with loggedInUser
        }
        router.push('/dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore API errors during logout
    } finally {
      Cookies.remove('accessToken', { path: '/' });
      Cookies.remove('refreshToken', { path: '/' });
      setUser(null);
      setPermissions([]);
      router.push('/login');
    }
  };

  const refreshAuth = async () => {
    await fetchCurrentUser();
  };

  const hasPermission = (module: string, submodule?: string, action?: string): boolean => {
    if (!user) return false;
    // Super Admin has unrestricted access everywhere
    if (user.roleName === 'Super Admin') return true;

    // Strict security rule: non-superadmins NEVER have 'delete' action
    if (action === 'delete') return false;

    return permissions.some((p) => {
      const matchModule = p.module === module || p.module === '*';
      const matchSub = !submodule || p.submodule === submodule || p.submodule === 'all' || !p.submodule;
      const matchAction = !action || p.action === action || p.action === 'all';
      return matchModule && matchSub && matchAction && p.granted;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshAuth,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

