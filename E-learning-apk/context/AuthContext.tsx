// context/AuthContext.tsx
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from "expo-auth-session";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Alert, Platform } from "react-native";
import {
  authAPI,
  tokenManager,
  userManager,
  storage,
  type User,
} from "@/services/api";

// ==================== TYPES ====================
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoadingGoogle: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; message?: string }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; user?: User; message?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<{ success: boolean; message?: string }>;
  changePassword: (passwordData: { currentPassword: string; newPassword: string; }) => Promise<{ success: boolean; message?: string }>;
  uploadAvatar: (imageUri: string) => Promise<{ success: boolean; avatarUrl?: string; message?: string }>;
  refreshUser: () => Promise<User | undefined>;
  googleLogin: () => Promise<void>;
  handleOAuthSuccess: (token: string, provider: 'google') => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: "student" | "instructor";
}

// ==================== OAUTH CONFIGURATION ====================
// Complete WebBrowser authentication session
WebBrowser.maybeCompleteAuthSession();

// OAuth Configuration
const useProxy = Platform.select({ web: false, default: true });
const redirectUri = makeRedirectUri({
  useProxy,
  scheme: 'learnhub', // Your app scheme from app.json
  path: 'auth/callback',
});

// Google OAuth Discovery Document
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Google OAuth Client Configuration
const GOOGLE_CONFIG = {
  clientId: Platform.select({
    web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
    android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || ''
  }),
  scopes: ['openid', 'profile', 'email'],
  redirectUri,
  responseType: AuthSession.ResponseType.IdToken,
  extraParams: {
    access_type: 'offline',
  },
};

// ==================== CREATE CONTEXT ====================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_EXPIRY_DAYS = 30;

// ==================== HELPER FUNCTIONS ====================
// Normalize user data from different sources
const normalizeUser = (userData: any): User => {
  if (!userData) throw new Error("No user data provided");
  return {
    id: userData._id || userData.id || "",
    name: userData.name || "",
    email: userData.email || "",
    role: (userData.role || "student").toLowerCase() as User["role"],
    avatar: userData.avatar,
    isVerified: userData.isVerified,
    authMethod: userData.authMethod,
    googleId: userData.googleId,
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
    profile: userData.profile,
    preferences: userData.preferences,
    statistics: userData.statistics,
  };
};

// Navigate based on user role
const navigateByRole = (role: User["role"]) => {
  setTimeout(() => {
    switch (role.toLowerCase()) {
      case "admin": 
        router.replace("/(admin)/"); 
        break;
      case "instructor": 
        router.replace("/(instructor)/"); 
        break;
      default: 
        router.replace("/(student)/"); 
        break;
    }
  }, 300);
};

// ==================== AUTH PROVIDER ====================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    loadUser();
  }, []);

  // Load user from storage on app start
  const loadUser = async () => {
    try {
      setLoading(true);
      const token = await tokenManager.getValidToken();
      
      if (!token) {
        await storage.clearAuthData();
        setUser(null);
        console.log("⚠️ No valid token found");
        return;
      }

      const storedUser = await userManager.getUser();
      
      if (storedUser) {
        setUser(storedUser);
        console.log(`✅ Loaded user from storage: ${storedUser.name} (${storedUser.email})`);
        
        // Refresh user data in background
        refreshUser().catch(err => 
          console.warn("Background refresh failed:", err.message)
        );
      } else {
        await refreshUser();
      }
    } catch (error) {
      console.error("❌ Error loading user:", error);
      await storage.clearAuthData();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Refresh user data from server
  const refreshUser = async (): Promise<User | undefined> => {
    try {
      const token = await tokenManager.getValidToken();
      
      if (!token) {
        throw new Error("No valid token available");
      }

      console.log("🔄 Refreshing user profile...");
      const result = await authAPI.getProfile();
      
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to get profile");
      }

      const rawData = result.data as any;
      const userData = rawData?.user ?? (rawData?._id || rawData?.id ? rawData : null);

      if (!userData) {
        throw new Error("No user data received from server");
      }

      const normalizedUser = normalizeUser(userData);
      
      if (!normalizedUser.id) {
        throw new Error("Invalid user data received from server");
      }

      setUser(normalizedUser);
      await userManager.setUser(normalizedUser);
      console.log(`✅ Refreshed user data: ${normalizedUser.name}`);
      
      return normalizedUser;
    } catch (error: any) {
      console.error("❌ Failed to refresh user profile:", error);
      
      // Clear auth data if token-related error
      if (error.message?.includes("token") || error.response?.status === 401) {
        await storage.clearAuthData();
        setUser(null);
      }
      
      throw error;
    }
  };

  // ==================== GOOGLE OAUTH ====================
  const googleLogin = async (): Promise<void> => {
    if (!GOOGLE_CONFIG.clientId) {
      Alert.alert(
        'Configuration Error',
        'Google OAuth is not configured. Please check your environment variables.'
      );
      console.error('❌ Missing Google Client ID');
      return;
    }

    setIsLoadingGoogle(true);
    
    try {
      console.log('🔑 Starting Google OAuth...');
      console.log('📱 Platform:', Platform.OS);
      console.log('🔗 Redirect URI:', redirectUri);
      console.log('🆔 Client ID:', GOOGLE_CONFIG.clientId?.substring(0, 20) + '...');

      // Create auth request
      const authRequest = new AuthSession.AuthRequest({
        clientId: GOOGLE_CONFIG.clientId,
        scopes: GOOGLE_CONFIG.scopes,
        redirectUri: redirectUri,
        responseType: GOOGLE_CONFIG.responseType,
        extraParams: GOOGLE_CONFIG.extraParams,
      });

      console.log('📤 Loading auth request...');
      await authRequest.makeAuthUrlAsync(discovery);

      console.log('🌐 Opening OAuth prompt...');
      const result = await authRequest.promptAsync(discovery, { useProxy });

      console.log('📥 OAuth result type:', result.type);

      if (result.type === 'cancel') {
        console.log('⚠️ User cancelled OAuth');
        Alert.alert('Cancelled', 'Google sign-in was cancelled');
        return;
      }

      if (result.type === 'error') {
        console.error('❌ OAuth error:', result.error);
        throw new Error(result.error?.message || 'OAuth failed');
      }

      if (result.type !== 'success') {
        throw new Error(`Unexpected OAuth result type: ${result.type}`);
      }

      // Extract ID token from params
      const { id_token, access_token } = result.params;
      const token = id_token || access_token;

      if (!token) {
        throw new Error('No token received from Google');
      }

      console.log('✅ Google token received');
      console.log('📨 Token type:', id_token ? 'ID Token' : 'Access Token');
      console.log('📏 Token length:', token.length);

      // Send token to backend
      await handleOAuthSuccess(token, 'google');

    } catch (error: any) {
      console.error('❌ Google OAuth error:', error);
      
      let errorMessage = 'Google sign-in failed. Please try again.';
      
      if (error.message?.includes('cancelled')) {
        errorMessage = 'Google sign-in was cancelled.';
      } else if (error.message?.includes('No token')) {
        errorMessage = 'Authentication failed. No token received from Google.';
      } else if (error.message?.includes('Configuration')) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Google Sign-In Failed', errorMessage);
      throw error;
      
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  // Handle OAuth success - send token to backend
  const handleOAuthSuccess = async (token: string, provider: 'google'): Promise<void> => {
    try {
      setIsLoadingGoogle(true);
      
      console.log('🔐 Sending OAuth token to backend...');
      console.log('🏢 Provider:', provider);
      console.log('📱 Platform:', Platform.OS);
      
      // Send the OAuth token to your backend
      const result = await authAPI.oauthLogin({
        provider,
        token,
        platform: Platform.OS
      });

      console.log('📥 Backend response:', result.success ? 'Success' : 'Failed');

      if (!result.success) {
        throw new Error(result.error?.message || 'OAuth authentication failed');
      }

      const rawData = result.data as any;
      const accessToken = rawData?.token || rawData?.accessToken;
      const userData = rawData?.user ?? (rawData?._id || rawData?.id ? rawData : null);

      if (!accessToken || !userData) {
        console.error('❌ Invalid response:', { hasToken: !!accessToken, hasUser: !!userData });
        throw new Error('Invalid response from server');
      }

      console.log('✅ Received user data:', userData.email);

      const normalizedUser = normalizeUser(userData);
      
      if (!normalizedUser.id) {
        throw new Error('Invalid user data from server');
      }

      // Store tokens and user data
      await tokenManager.setToken(accessToken, TOKEN_EXPIRY_DAYS);
      await userManager.setUser(normalizedUser);
      setUser(normalizedUser);

      console.log('✅ OAuth login successful');
      console.log('👤 User:', normalizedUser.name);
      console.log('📧 Email:', normalizedUser.email);
      console.log('👔 Role:', normalizedUser.role);

      // Show success message
      Alert.alert(
        'Success!',
        `Welcome back, ${normalizedUser.name}!`,
        [{ text: 'OK', onPress: () => navigateByRole(normalizedUser.role) }]
      );

    } catch (error: any) {
      console.error('❌ OAuth success handling error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Authentication failed. Please try again.';
      
      Alert.alert('Authentication Failed', errorMessage);
      throw error;
      
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  // ==================== REGULAR LOGIN ====================
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      console.log('🔑 Logging in:', email);

      const result = await authAPI.login(email, password);
      
      if (!result.success) {
        throw new Error(result.error?.message || "Login failed");
      }

      const rawData = result.data as any;
      const accessToken = rawData?.token || rawData?.accessToken;
      const userData = rawData?.user ?? (rawData?._id || rawData?.id ? rawData : null);

      if (!accessToken || !userData) {
        throw new Error("Invalid response from server");
      }

      const normalizedUser = normalizeUser(userData);
      
      if (!normalizedUser.id) {
        throw new Error("Invalid user data from server");
      }

      await tokenManager.setToken(accessToken, TOKEN_EXPIRY_DAYS);
      await userManager.setUser(normalizedUser);
      setUser(normalizedUser);

      console.log('✅ Login successful:', normalizedUser.email);

      navigateByRole(normalizedUser.role);
      
      return { 
        success: true, 
        user: normalizedUser, 
        message: "Login successful" 
      };
      
    } catch (error: any) {
      console.error("❌ Login error:", error);
      await storage.clearAuthData();
      setUser(null);
      throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== REGISTER ====================
  const register = async (userData: RegisterData) => {
    try {
      setLoading(true);
      
      if (!userData.name || !userData.email || !userData.password) {
        throw new Error("Name, email, and password are required");
      }
      
      console.log('📝 Registering user:', userData.email);

      const result = await authAPI.register(userData);
      
      if (!result.success) {
        throw new Error(result.error?.message || "Registration failed");
      }

      const rawData = result.data as any;
      const accessToken = rawData?.token || rawData?.accessToken;
      const registeredUser = rawData?.user ?? (rawData?._id || rawData?.id ? rawData : null);
      
      if (!accessToken || !registeredUser) {
        throw new Error("Invalid response from server");
      }
      
      const normalizedUser = normalizeUser(registeredUser);
      
      if (!normalizedUser.id) {
        throw new Error("Invalid user data from server");
      }

      await tokenManager.setToken(accessToken, TOKEN_EXPIRY_DAYS);
      await userManager.setUser(normalizedUser);
      setUser(normalizedUser);
      
      console.log('✅ Registration successful:', normalizedUser.email);

      navigateByRole(normalizedUser.role);
      
      return { 
        success: true, 
        user: normalizedUser, 
        message: "Registration successful" 
      };
      
    } catch (error: any) {
      console.error("❌ Registration error:", error);
      await storage.clearAuthData();
      setUser(null);
      throw new Error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ==================== LOGOUT ====================
  const logout = async () => {
    try {
      setLoading(true);
      console.log('👋 Logging out...');
      
      await authAPI.logout();
      await storage.clearAuthData();
      setUser(null);
      
      console.log('✅ Logout successful');
      router.replace("/(auth)/login");
      
    } catch (error) {
      console.error("❌ Logout error:", error);
      
      // Force cleanup even if API call fails
      await storage.clearAuthData();
      setUser(null);
      router.replace("/(auth)/login");
      
    } finally {
      setLoading(false);
    }
  };

  // ==================== UPDATE USER ====================
  const updateUser = async (data: Partial<User>) => { 
    const currentUser = await userManager.getUser();
    
    if (currentUser) {
      const updatedUser = { ...currentUser, ...data };
      await userManager.setUser(updatedUser);
      setUser(updatedUser);
      console.log('✅ User updated locally');
    }
  };

  // ==================== UPDATE PROFILE ====================
  const updateProfile = async (data: Partial<User>) => { 
    try {
      console.log('📝 Updating profile...');
      const result = await authAPI.updateProfile(data);
      
      if (result.success && result.data?.user) {
        const updatedUser = normalizeUser(result.data.user);
        await userManager.setUser(updatedUser);
        setUser(updatedUser);
        console.log('✅ Profile updated successfully');
      }
      
      return { 
        success: result.success, 
        message: result.message || 'Profile updated' 
      };
    } catch (error: any) {
      console.error('❌ Profile update error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to update profile' 
      };
    }
  };

  // ==================== CHANGE PASSWORD ====================
  const changePassword = async (data: { 
    currentPassword: string; 
    newPassword: string; 
  }) => { 
    try {
      console.log('🔒 Changing password...');
      const result = await authAPI.changePassword(data);
      console.log(result.success ? '✅ Password changed' : '❌ Password change failed');
      
      return { 
        success: result.success, 
        message: result.message || 'Password changed' 
      };
    } catch (error: any) {
      console.error('❌ Password change error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to change password' 
      };
    }
  };

  // ==================== UPLOAD AVATAR ====================
  const uploadAvatar = async (uri: string) => { 
    try {
      console.log('📸 Uploading avatar...');
      
      const formData = new FormData();
      formData.append('avatar', {
        uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);
      
      const result = await authAPI.uploadAvatar(formData);
      
      if (result.success && result.data?.user) {
        const updatedUser = normalizeUser(result.data.user);
        await userManager.setUser(updatedUser);
        setUser(updatedUser);
        console.log('✅ Avatar uploaded successfully');
      }
      
      return { 
        success: result.success, 
        avatarUrl: result.data?.avatarUrl,
        message: result.message || 'Avatar uploaded'
      };
    } catch (error: any) {
      console.error('❌ Avatar upload error:', error);
      return { 
        success: false, 
        message: error.message || 'Failed to upload avatar' 
      };
    }
  };

  // ==================== CONTEXT VALUE ====================
  const value: AuthContextType = {
    user,
    loading,
    isLoadingGoogle,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    updateProfile,
    changePassword,
    uploadAvatar,
    refreshUser,
    googleLogin,
    handleOAuthSuccess,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ==================== CUSTOM HOOK ====================
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  
  return context;
}

// ==================== DEFAULT EXPORT ====================
export default AuthContext;