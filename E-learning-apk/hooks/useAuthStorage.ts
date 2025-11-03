// hooks/useAuthStorage.ts
import { useState, useEffect, useCallback } from 'react';
import { storage, STORAGE_KEYS, tokenManager, userManager, type User } from '@/services/api';

// Types
interface TokenData {
  token: string;
  expiresAt?: number;
}

interface AuthState {
  isAuthenticated: boolean;
  userData: User | null;
  loading: boolean;
  tokenExpired: boolean;
}

interface AuthStorageHook extends AuthState {
  clearAuth: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setAuthData: (token: string, user: User, expiresInDays?: number) => Promise<void>;
  updateUserData: (userData: Partial<User>) => Promise<void>;
  getToken: () => Promise<string | null>;
  isTokenValid: () => Promise<boolean>;
}

const TOKEN_EXPIRY_DAYS = 30;

export const useAuthStorage = (): AuthStorageHook => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userData: null,
    loading: true,
    tokenExpired: false,
  });

  // Check if token is expired
  const isTokenExpired = useCallback((expiryTimestamp?: number): boolean => {
    if (!expiryTimestamp) return false;
    return Date.now() >= expiryTimestamp;
  }, []);

  // Clear authentication
  const clearAuth = useCallback(async () => {
    try {
      await storage.clearAuthData();
      
      setAuthState({
        isAuthenticated: false,
        userData: null,
        loading: false,
        tokenExpired: false,
      });
    } catch (error) {
      console.error('Error clearing auth:', error);
      throw error;
    }
  }, []);

  // Get valid token
  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const tokenData = await storage.getItem<TokenData | string>(STORAGE_KEYS.ACCESS_TOKEN);
      
      if (!tokenData) return null;

      // Handle both string tokens and token objects
      if (typeof tokenData === 'string') {
        return tokenData;
      }

      // Check expiration for token objects
      if (tokenData.expiresAt && isTokenExpired(tokenData.expiresAt)) {
        console.log('Token expired, clearing auth data');
        await clearAuth();
        return null;
      }

      return tokenData.token || null;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }, [isTokenExpired, clearAuth]);

  // Check if token is valid
  const isTokenValid = useCallback(async (): Promise<boolean> => {
    const token = await getToken();
    return !!token;
  }, [getToken]);

  // Check authentication status
  const checkAuthStatus = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      const [tokenData, user] = await Promise.all([
        storage.getItem<TokenData | string>(STORAGE_KEYS.ACCESS_TOKEN),
        storage.getItem<User>(STORAGE_KEYS.USER_DATA),
      ]);

      if (!tokenData || !user) {
        setAuthState({
          isAuthenticated: false,
          userData: null,
          loading: false,
          tokenExpired: false,
        });
        return;
      }

      // Check token expiration
      let expired = false;
      if (typeof tokenData === 'object' && tokenData.expiresAt) {
        expired = isTokenExpired(tokenData.expiresAt);
      }

      if (expired) {
        console.log('Token expired during auth check');
        await clearAuth();
        setAuthState({
          isAuthenticated: false,
          userData: null,
          loading: false,
          tokenExpired: true,
        });
        return;
      }

      // Set authenticated state
      setAuthState({
        isAuthenticated: true,
        userData: user,
        loading: false,
        tokenExpired: false,
      });
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthState({
        isAuthenticated: false,
        userData: null,
        loading: false,
        tokenExpired: false,
      });
    }
  }, [isTokenExpired, clearAuth]);

  // Set authentication data
  const setAuthData = useCallback(
    async (token: string, user: User, expiresInDays: number = TOKEN_EXPIRY_DAYS) => {
      try {
        const tokenData: TokenData = {
          token,
          expiresAt: Date.now() + (expiresInDays * 24 * 60 * 60 * 1000),
        };

        await Promise.all([
          storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData),
          storage.setItem(STORAGE_KEYS.USER_DATA, user),
        ]);

        setAuthState({
          isAuthenticated: true,
          userData: user,
          loading: false,
          tokenExpired: false,
        });
      } catch (error) {
        console.error('Error setting auth data:', error);
        throw error;
      }
    },
    []
  );

  // Update user data
  const updateUserData = useCallback(async (userData: Partial<User>) => {
    try {
      const currentUser = await storage.getItem<User>(STORAGE_KEYS.USER_DATA);
      
      if (!currentUser) {
        throw new Error('No user data found');
      }

      const updatedUser = { ...currentUser, ...userData };
      
      await storage.setItem(STORAGE_KEYS.USER_DATA, updatedUser);
      
      setAuthState(prev => ({
        ...prev,
        userData: updatedUser,
      }));
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  }, []);

  // Refresh authentication status
  const refreshAuth = useCallback(async () => {
    await checkAuthStatus();
  }, [checkAuthStatus]);

  // Initial auth check
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Auto-refresh auth status periodically (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      checkAuthStatus();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [checkAuthStatus]);

  return {
    ...authState,
    clearAuth,
    refreshAuth,
    setAuthData,
    updateUserData,
    getToken,
    isTokenValid,
  };
};

export default useAuthStorage;