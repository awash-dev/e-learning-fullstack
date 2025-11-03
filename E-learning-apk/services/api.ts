// services/api.ts - COMPLETE FIXED VERSION
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// ==================== TYPES ====================
export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "instructor" | "admin";
  avatar?: string;
  is_verified?: boolean;
  is_active?: boolean;
  auth_method?: "local" | "google" | "both";
  google_id?: string;
  profile?: {
    bio?: string;
    phone?: string;
    address?: string;
    social_links?: {
      website?: string;
      twitter?: string;
      linkedin?: string;
      github?: string;
    };
    education?: Array<{
      institution: string;
      degree: string;
      field: string;
      year: number;
    }>;
    skills?: string[];
  };
  preferences?: {
    email_notifications?: boolean;
    course_updates?: boolean;
    newsletter?: boolean;
    language?: string;
    theme?: string;
  };
  statistics?: {
    last_login?: string;
    login_count?: number;
    courses_enrolled?: number;
    courses_completed?: number;
    total_learning_time?: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface Lesson {
  id?: string;
  title: string;
  description: string;
  videoUrl: string;
  order?: number;
  isPublished?: boolean;
  isFree?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Review {
  id?: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  comment: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id?: string;
  title: string;
  description: string;
  category: string;
  thumbnail?: string;
  price?: number;
  level?: "beginner" | "intermediate" | "advanced";
  language?: string;
  duration?: string;
  requirements?: string[];
  whatYouWillLearn?: string[];
  targetAudience?: string[];
  created_by?: string;
  instructor_name?: string;
  instructor_email?: string;
  instructor_user_id?: string;
  instructor_avatar?: string;
  instructor_bio?: string;
  lessons?: Lesson[];
  reviews?: Review[];
  status?: "draft" | "published";
  is_active?: boolean;
  featured?: boolean;
  total_enrollments?: number;
  rating?: number | string;
  total_ratings?: number;
  created_at?: string;
  updated_at?: string;
  published_at?: string;
}

export interface Enrollment {
  id?: string;
  course_id: string;
  user_id: string;
  status?: "active" | "completed" | "cancelled";
  progress?: number;
  completed_lessons?: string[];
  current_lesson_id?: string;
  last_accessed_at?: string;
  enrolled_at?: string;
}

export interface CourseProgress {
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  lastAccessed: string | null;
  completed: boolean;
  currentLessonId?: string;
}

export interface EnrollmentStatus {
  courseId: string;
  isEnrolled: boolean;
  enrollment?: Enrollment;
}

export interface LearningStats {
  totalEnrolledCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  notStartedCourses: number;
  totalLearningTime: number;
  averageCompletionRate: number;
  certificatesEarned: number;
  recentActivity: Array<{
    courseId: string;
    courseTitle: string;
    lastAccessed: string;
    percentage: number;
  }>;
}

export interface CertificateData {
  certificateId: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  completionDate: string;
  duration: string;
  certificateUrl: string;
}

interface TokenData {
  token: string;
  expires_at: number;
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    [key: string]: any;
  };
  status?: number;
  message?: string;
}

// ==================== CONFIGURATION ====================
export const API_CONFIG = {
  BASE_URL: "https://e-learning-back-14h5.vercel.app",
  ENDPOINTS: {
    // Auth endpoints
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    VERIFY_EMAIL: "/api/auth/verify-email",
    RESEND_VERIFICATION: "/api/auth/resend-verification",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    VERIFY_OTP: "/api/auth/verify-otp",
    RESET_PASSWORD: "/api/auth/reset-password",
    UPDATE_EMAIL: "/api/auth/email",
    PROFILE: "/api/auth/profile",
    UPDATE_PROFILE: "/api/auth/profile",
    CHANGE_PASSWORD: "/api/auth/change-password",
    UPLOAD_AVATAR: "/api/auth/avatar",
    REMOVE_AVATAR: "/api/auth/avatar",
    GET_ALL_USERS: "/api/auth/users",
    DELETE_USER: "/api/auth/users/:userId",

    // OAuth endpoints
    GOOGLE_OAUTH: "/api/auth/google",
    GOOGLE_CALLBACK: "/api/auth/google/callback",
    GOOGLE_MOBILE_AUTH: "/api/auth/google/mobile",
    GOOGLE_TEST: "/api/auth/google/test",
    OAUTH_DEBUG: "/api/auth/oauth-debug",

    // Course endpoints
    COURSES: "/api/courses",
    MY_COURSES: "/api/courses/enrolled/my-courses",
    INSTRUCTOR_COURSES: "/api/courses/instructor/my-courses",
    COURSE_ENROLL: "/api/courses/:courseId/enroll",
    COURSE_UNENROLL: "/api/courses/:courseId/unenroll",
    COURSE_PUBLISH: "/api/courses/:id/publish",
    COURSE_UNPUBLISH: "/api/courses/:id/unpublish",
    COURSE_STATS: "/api/courses/:id/stats",
    INSTRUCTOR_STATS: "/api/courses/instructor/stats",
    FEATURED_COURSES: "/api/courses/featured",
    TRENDING_COURSES: "/api/courses/trending",
    CATEGORY_COURSES: "/api/courses/category/:category",
    ENROLLMENT_STATUS: "/api/courses/:courseId/check-enrollment",
    CHECK_MULTIPLE_ENROLLMENTS: "/api/courses/check-enrollments",
    ENROLLED_WITH_PROGRESS: "/api/courses/enrolled/with-progress",
    COURSE_PROGRESS: "/api/courses/:courseId/progress",
    LESSON_PROGRESS: "/api/courses/:courseId/lessons/:lessonId/progress",
    UPLOAD_COURSE_IMAGE: "/api/courses/upload-image",
    ENROLLED_STUDENTS: "/api/courses/:courseId/enrolled-students",

    // Lesson endpoints
    COURSE_LESSONS: "/api/courses/:courseId/lessons",
    ADD_LESSON: "/api/courses/:courseId/lessons",
    UPDATE_LESSON: "/api/courses/:courseId/lessons/:lessonId",
    DELETE_LESSON: "/api/courses/:courseId/lessons/:lessonId",

    // Review endpoints
    COURSE_REVIEWS: "/api/courses/:id/reviews",
    ADD_REVIEW: "/api/courses/:courseId/reviews",
    UPDATE_REVIEW: "/api/courses/:courseId/reviews/:reviewId",
    DELETE_REVIEW: "/api/courses/:courseId/reviews/:reviewId",
    USER_REVIEW: "/api/courses/:courseId/my-review",

    // Health check
    HEALTH: "/health",
  },
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  USER_DATA: "userData",
  TOKEN_EXPIRY: "tokenExpiry",
} as const;

const TOKEN_EXPIRY_DAYS = 30;

// ==================== STORAGE UTILITIES ====================
export const storage = {
  setItem: async (key: string, value: any): Promise<void> => {
    try {
      const stringValue = typeof value === "object" ? JSON.stringify(value) : String(value);
      await SecureStore.setItemAsync(key, stringValue);
    } catch (error) {
      console.error(`Storage set error for key "${key}":`, error);
      throw error;
    }
  },

  getItem: async <T = any>(key: string): Promise<T | null> => {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      console.error(`Storage get error for key "${key}":`, error);
      return null;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Storage remove error for key "${key}":`, error);
    }
  },

  clearAuthData: async (): Promise<void> => {
    try {
      await Promise.all([
        storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
        storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        storage.removeItem(STORAGE_KEYS.USER_DATA),
        storage.removeItem(STORAGE_KEYS.TOKEN_EXPIRY),
      ]);
      console.log("✅ Auth data cleared");
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  },

  debugPrintAll: async (): Promise<void> => {
    if (__DEV__) {
      console.log("=== STORAGE DEBUG ===");
      for (const key of Object.values(STORAGE_KEYS)) {
        const value = await storage.getItem(key);
        console.log(`${key}:`, value);
      }
      console.log("===================");
    }
  },
};

// ==================== TOKEN MANAGEMENT ====================
export const tokenManager = {
  setToken: async (token: string, expiresInDays: number = TOKEN_EXPIRY_DAYS): Promise<void> => {
    if (!token) return;
    const tokenData: TokenData = {
      token,
      expires_at: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    };
    await storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData);
  },

  getToken: async (): Promise<string | null> => {
    const tokenData = await storage.getItem<TokenData | string>(STORAGE_KEYS.ACCESS_TOKEN);
    if (!tokenData) return null;
    if (typeof tokenData === "string") return tokenData;
    return tokenData.token || null;
  },

  getValidToken: async (): Promise<string | null> => {
    const tokenData = await storage.getItem<TokenData | string>(STORAGE_KEYS.ACCESS_TOKEN);
    if (!tokenData) return null;
    if (typeof tokenData === "string") return tokenData;
    if (tokenData.expires_at && Date.now() >= tokenData.expires_at) {
      await storage.clearAuthData();
      return null;
    }
    return tokenData.token || null;
  },

  isTokenExpired: async (): Promise<boolean> => {
    const tokenData = await storage.getItem<TokenData | string>(STORAGE_KEYS.ACCESS_TOKEN);
    if (!tokenData) return true;
    if (typeof tokenData === "string") return false;
    return tokenData.expires_at ? Date.now() >= tokenData.expires_at : false;
  },

  getTokenExpiry: async (): Promise<Date | null> => {
    const tokenData = await storage.getItem<TokenData>(STORAGE_KEYS.ACCESS_TOKEN);
    if (!tokenData || typeof tokenData === "string") return null;
    return tokenData.expires_at ? new Date(tokenData.expires_at) : null;
  },

  clearToken: async (): Promise<void> => {
    await storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  },

  setRefreshToken: async (refreshToken: string): Promise<void> => {
    if (refreshToken) {
      await storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  },

  getRefreshToken: async (): Promise<string | null> => {
    return await storage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  },
};

// ==================== USER MANAGEMENT ====================
export const userManager = {
  setUser: async (userData: User): Promise<void> => {
    await storage.setItem(STORAGE_KEYS.USER_DATA, userData);
  },

  getUser: async (): Promise<User | null> => {
    return await storage.getItem<User>(STORAGE_KEYS.USER_DATA);
  },

  updateUser: async (userData: Partial<User>): Promise<User | null> => {
    const currentUser = await userManager.getUser();
    if (!currentUser) return null;
    const updatedUser = { ...currentUser, ...userData };
    await userManager.setUser(updatedUser);
    return updatedUser;
  },

  clearUser: async (): Promise<void> => {
    await storage.removeItem(STORAGE_KEYS.USER_DATA);
  },
};

// ==================== AXIOS INSTANCE ====================
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==================== REQUEST INTERCEPTOR ====================
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await tokenManager.getValidToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (__DEV__) {
        console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    } catch (error) {
      console.error("Request interceptor error:", error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// ==================== RESPONSE INTERCEPTOR ====================
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`📥 ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = await tokenManager.getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(`${API_CONFIG.BASE_URL}/api/auth/refresh-token`, { refreshToken });
          if (response.data.token) {
            const newToken = response.data.token;
            await tokenManager.setToken(newToken);
            refreshSubscribers.forEach((cb) => cb(newToken));
            refreshSubscribers = [];
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        }
        await storage.clearAuthData();
      } catch (refreshError) {
        await storage.clearAuthData();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    if (__DEV__) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }
    return Promise.reject(error);
  }
);

// ==================== API RESPONSE HANDLER ====================
const handleResponse = async <T = any>(apiCall: Promise<any>): Promise<APIResponse<T>> => {
  try {
    const response = await apiCall;
    return {
      success: true,
      data: response.data,
      status: response.status,
      message: response.data?.message,
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || "An error occurred";
    const errorData = error.response?.data || { message: errorMessage };
    if (__DEV__) {
      console.error("API Error:", {
        url: error.config?.url,
        status: error.response?.status,
        message: errorMessage,
      });
    }
    return {
      success: false,
      error: errorData,
      status: error.response?.status,
      message: errorMessage,
    };
  }
};

// ==================== AUTH APIs ====================
export const authAPI = {
  login: async (email: string, password: string): Promise<APIResponse<{ token: string; user: User }>> => {
    const result = await handleResponse(api.post(API_CONFIG.ENDPOINTS.LOGIN, { email, password }));
    if (result.success && result.data) {
      const token = result.data.token || result.data.access_token;
      const user = result.data.user || result.data;
      if (token) {
        await tokenManager.setToken(token);
        await userManager.setUser(user);
      }
    }
    return result;
  },

  register: async (userData: { name: string; email: string; password: string; role?: "student" | "instructor" }): Promise<APIResponse<{ user: User }>> => {
    return await handleResponse(api.post(API_CONFIG.ENDPOINTS.REGISTER, userData));
  },

  oauthLogin: async (params: { provider: "google"; token: string; platform: string }): Promise<APIResponse<{ token: string; user: User }>> => {
    try {
      const result = await handleResponse(
        api.post(API_CONFIG.ENDPOINTS.GOOGLE_MOBILE_AUTH, {
          access_token: params.token,
          id_token: params.token,
          platform: params.platform,
        })
      );
      if (result.success && result.data) {
        const token = result.data.token || result.data.access_token;
        const user = result.data.user;
        if (token && user) {
          await tokenManager.setToken(token, TOKEN_EXPIRY_DAYS);
          await userManager.setUser(user);
        }
      }
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: { message: error.response?.data?.message || "OAuth login failed" },
        status: error.response?.status,
      };
    }
  },

  verifyEmail: async (token: string): Promise<APIResponse> => {
    return await handleResponse(api.get(`${API_CONFIG.ENDPOINTS.VERIFY_EMAIL}/${token}`));
  },

  resendVerification: async (email: string): Promise<APIResponse> => {
    return await handleResponse(api.post(API_CONFIG.ENDPOINTS.RESEND_VERIFICATION, { email }));
  },

  forgotPassword: async (email: string): Promise<APIResponse<{ otp_expires: string }>> => {
    return await handleResponse(api.post(API_CONFIG.ENDPOINTS.FORGOT_PASSWORD, { email }));
  },

  verifyOTP: async (email: string, otp: string): Promise<APIResponse<{ reset_token: string; expires: string }>> => {
    return await handleResponse(api.post(API_CONFIG.ENDPOINTS.VERIFY_OTP, { email, otp }));
  },

  resetPassword: async (resetToken: string, newPassword: string): Promise<APIResponse> => {
    return await handleResponse(api.post(API_CONFIG.ENDPOINTS.RESET_PASSWORD, { resetToken, newPassword }));
  },

  updateEmail: async (newEmail: string, password: string): Promise<APIResponse> => {
    return await handleResponse(api.put(API_CONFIG.ENDPOINTS.UPDATE_EMAIL, { newEmail, password }));
  },

  getProfile: async (): Promise<APIResponse<{ user: User }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.PROFILE));
  },

  updateProfile: async (profileData: any): Promise<APIResponse<{ user: User }>> => {
    const result = await handleResponse(api.put(API_CONFIG.ENDPOINTS.UPDATE_PROFILE, profileData));
    if (result.success && result.data?.user) {
      await userManager.updateUser(result.data.user);
    }
    return result;
  },

  changePassword: async (passwordData: { current_password: string; new_password: string }): Promise<APIResponse> => {
    return await handleResponse(api.put(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, passwordData));
  },

  uploadAvatar: async (formData: FormData): Promise<APIResponse<{ avatar_url: string; user: User }>> => {
    const result = await handleResponse(
      api.post(API_CONFIG.ENDPOINTS.UPLOAD_AVATAR, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
    if (result.success && result.data?.user) {
      await userManager.updateUser(result.data.user);
    }
    return result;
  },

  removeAvatar: async (): Promise<APIResponse<{ user: User }>> => {
    const result = await handleResponse(api.delete(API_CONFIG.ENDPOINTS.REMOVE_AVATAR));
    if (result.success && result.data?.user) {
      await userManager.updateUser(result.data.user);
    }
    return result;
  },

  getAllUsers: async (params?: any): Promise<APIResponse<{ users: User[] }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.GET_ALL_USERS, { params }));
  },

  deleteUser: async (userId: string): Promise<APIResponse> => {
    return await handleResponse(api.delete(API_CONFIG.ENDPOINTS.DELETE_USER.replace(':userId', userId)));
  },

  googleOAuth: (): string => {
    return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GOOGLE_OAUTH}`;
  },

  handleOAuthSuccess: async (token: string): Promise<APIResponse> => {
    if (!token) return { success: false, error: { message: "No token provided" } };
    try {
      await tokenManager.setToken(token);
      const profileResult = await authAPI.getProfile();
      if (profileResult.success && profileResult.data?.user) {
        await userManager.setUser(profileResult.data.user);
        return { success: true };
      }
      throw new Error("Failed to get user profile");
    } catch (error: any) {
      return {
        success: false,
        error: { message: error.message || "OAuth authentication failed" },
      };
    }
  },

  logout: async (): Promise<APIResponse> => {
    await storage.clearAuthData();
    return { success: true };
  },

  isAuthenticated: async (): Promise<boolean> => {
    const token = await tokenManager.getValidToken();
    const user = await userManager.getUser();
    return !!token && !!user;
  },

  getUserData: async (): Promise<User | null> => {
    return await userManager.getUser();
  },

  getCurrentToken: async (): Promise<string | null> => {
    return await tokenManager.getValidToken();
  },

  isUserVerified: async (): Promise<boolean> => {
    const user = await userManager.getUser();
    return user?.is_verified || false;
  },

  isUserAdmin: async (): Promise<boolean> => {
    const user = await userManager.getUser();
    return user?.role === "admin";
  },

  isUserInstructor: async (): Promise<boolean> => {
    const user = await userManager.getUser();
    return user?.role === "instructor";
  },

  getOAuthDebugInfo: async (): Promise<APIResponse> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.OAUTH_DEBUG));
  },
};

// ==================== COURSE APIs ====================
export const courseAPI = {
  getAllCourses: async (params = {}): Promise<APIResponse<{ courses: Course[]; pagination: any }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.COURSES, { params }));
  },

  getCourseById: async (id: string): Promise<APIResponse<{ course: Course }>> => {
    return await handleResponse(api.get(`${API_CONFIG.ENDPOINTS.COURSES}/${id}`));
  },

  createCourse: async (formData: FormData): Promise<APIResponse<{ course: Course }>> => {
    try {
      console.log('📤 Creating course...');
      
      // Log form data for debugging
      const formDataEntries: any = {};
      for (const [key, value] of (formData as any)._parts || []) {
        formDataEntries[key] = typeof value === 'string' ? value : `[FILE: ${value.name}]`;
      }
      console.log('📋 FormData entries:', formDataEntries);

      const response = await api.post(API_CONFIG.ENDPOINTS.COURSES, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Accept": "application/json"
        },
        timeout: 60000,
        transformRequest: (data) => data,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          console.log(`📤 Upload Progress: ${progress}%`);
        },
      });

      console.log('✅ Course created successfully:', response.status, response.data);

      return {
        success: true,
        data: response.data,
        status: response.status,
        message: response.data?.message || 'Course created successfully',
      };
    } catch (error: any) {
      console.error('❌ Create course error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Enhanced error handling
      let errorMessage = 'Failed to create course. Please try again.';
      let errorDetails = error.response?.data;

      if (error.response?.status === 400) {
        errorMessage = 'Invalid course data. Please check all fields and try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Please login again to create courses.';
      } else if (error.response?.status === 413) {
        errorMessage = 'File too large. Please use a smaller thumbnail image.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      return {
        success: false,
        error: errorDetails || { message: errorMessage },
        status: error.response?.status,
        message: errorMessage,
      };
    }
  },

  updateCourse: async (id: string, formData: FormData): Promise<APIResponse<{ course: Course }>> => {
    try {
      const response = await api.put(`${API_CONFIG.ENDPOINTS.COURSES}/${id}`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Accept": "application/json"
        },
        timeout: 60000,
        transformRequest: (data) => data,
      });

      return {
        success: true,
        data: response.data,
        status: response.status,
        message: response.data?.message || 'Course updated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data || { message: 'Failed to update course' },
        status: error.response?.status,
        message: error.response?.data?.message || 'Failed to update course',
      };
    }
  },

  deleteCourse: async (id: string): Promise<APIResponse> => {
    return await handleResponse(api.delete(`${API_CONFIG.ENDPOINTS.COURSES}/${id}`));
  },

  getInstructorCourses: async (): Promise<APIResponse<{ courses: Course[]; stats: any }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.INSTRUCTOR_COURSES));
  },

  getMyEnrolledCourses: async (): Promise<APIResponse<{ courses: Course[] }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.MY_COURSES));
  },

  enrollCourse: async (courseId: string): Promise<APIResponse<{ course: Course; enrollment: Enrollment }>> => {
    return await handleResponse(api.post(API_CONFIG.ENDPOINTS.COURSE_ENROLL.replace(":courseId", courseId)));
  },

  unenrollCourse: async (courseId: string): Promise<APIResponse> => {
    return await handleResponse(api.delete(API_CONFIG.ENDPOINTS.COURSE_UNENROLL.replace(":courseId", courseId)));
  },

  checkEnrollment: async (courseId: string): Promise<APIResponse<{ isEnrolled: boolean; enrollment?: Enrollment }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.ENROLLMENT_STATUS.replace(":courseId", courseId)));
  },

  checkMultipleEnrollments: async (courseIds: string[]): Promise<APIResponse<{ enrollments: EnrollmentStatus[] }>> => {
    return await handleResponse(api.post(API_CONFIG.ENDPOINTS.CHECK_MULTIPLE_ENROLLMENTS, { courseIds }));
  },

  getEnrolledCoursesWithProgress: async (params?: any): Promise<APIResponse<{ courses: any[] }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.ENROLLED_WITH_PROGRESS, { params }));
  },

  getCourseProgress: async (courseId: string): Promise<APIResponse<{ progress: CourseProgress }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.COURSE_PROGRESS.replace(":courseId", courseId)));
  },

  updateLessonProgress: async (courseId: string, lessonId: string, progressData: any): Promise<APIResponse<{ progress: any }>> => {
    return await handleResponse(
      api.put(
        API_CONFIG.ENDPOINTS.LESSON_PROGRESS.replace(":courseId", courseId).replace(":lessonId", lessonId),
        progressData
      )
    );
  },

  publishCourse: async (id: string): Promise<APIResponse<{ course: Course }>> => {
    return await handleResponse(api.put(API_CONFIG.ENDPOINTS.COURSE_PUBLISH.replace(":id", id)));
  },

  unpublishCourse: async (id: string): Promise<APIResponse<{ course: Course }>> => {
    return await handleResponse(api.put(API_CONFIG.ENDPOINTS.COURSE_UNPUBLISH.replace(":id", id)));
  },

  getCourseStats: async (id: string): Promise<APIResponse<{ stats: any }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.COURSE_STATS.replace(":id", id)));
  },

  getInstructorStats: async (): Promise<APIResponse<{ stats: any; topCourses: any[] }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.INSTRUCTOR_STATS));
  },

  searchCourses: async (query: string, params = {}): Promise<APIResponse<{ courses: Course[] }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.COURSES, { params: { q: query, ...params } }));
  },

  getFeaturedCourses: async (limit?: number): Promise<APIResponse<{ courses: Course[] }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.FEATURED_COURSES, { params: { limit } }));
  },

  getTrendingCourses: async (limit?: number): Promise<APIResponse<{ courses: Course[] }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.TRENDING_COURSES, { params: { limit } }));
  },

  getCoursesByCategory: async (category: string, params?: any): Promise<APIResponse<{ courses: Course[] }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.CATEGORY_COURSES.replace(":category", category), { params }));
  },

  getCourseCategories: async (): Promise<APIResponse<{ categories: string[] }>> => {
    return {
      success: true,
      data: {
        categories: [
          'web', 'mobile', 'data-science', 'business', 'design',
          'marketing', 'programming', 'it', 'personal-development',
          'photography', 'music', 'health', 'fitness', 'academic', 'language'
        ]
      }
    };
  },

  uploadCourseImage: async (formData: FormData): Promise<APIResponse<{ url: string }>> => {
    return await handleResponse(
      api.post(API_CONFIG.ENDPOINTS.UPLOAD_COURSE_IMAGE, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
  },

  getEnrolledStudents: async (courseId: string, params?: any): Promise<APIResponse<{ students: Enrollment[] }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.ENROLLED_STUDENTS.replace(":courseId", courseId), { params }));
  },

  getRecommendedCourses: async (): Promise<APIResponse<{ courses: Course[] }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.COURSES, { params: { recommended: true, limit: 10 } }));
  },

  getLearningStats: async (): Promise<APIResponse<{ stats: LearningStats }>> => {
    return {
      success: true,
      data: {
        stats: {
          totalEnrolledCourses: 0,
          completedCourses: 0,
          inProgressCourses: 0,
          notStartedCourses: 0,
          totalLearningTime: 0,
          averageCompletionRate: 0,
          certificatesEarned: 0,
          recentActivity: [],
        },
      },
    };
  },
};

// ==================== LESSON APIs ====================
export const lessonAPI = {
  getLessonsByCourse: async (courseId: string): Promise<APIResponse<{ lessons: Lesson[] }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.COURSE_LESSONS.replace(":courseId", courseId)));
  },

  createLesson: async (courseId: string, lessonData: {
    title: string;
    description?: string;
    videoUrl: string;
    order?: number;
    isPublished?: boolean;
    isFree?: boolean;
  }): Promise<APIResponse<{ course: Course }>> => {
    return await handleResponse(api.post(API_CONFIG.ENDPOINTS.ADD_LESSON.replace(":courseId", courseId), lessonData));
  },

  updateLesson: async (courseId: string, lessonId: string, lessonData: any): Promise<APIResponse<{ course: Course }>> => {
    return await handleResponse(
      api.put(API_CONFIG.ENDPOINTS.UPDATE_LESSON.replace(":courseId", courseId).replace(":lessonId", lessonId), lessonData)
    );
  },

  deleteLesson: async (courseId: string, lessonId: string): Promise<APIResponse> => {
    return await handleResponse(
      api.delete(API_CONFIG.ENDPOINTS.DELETE_LESSON.replace(":courseId", courseId).replace(":lessonId", lessonId))
    );
  },
};

// ==================== REVIEW APIs ====================
export const reviewAPI = {
  getCourseReviews: async (courseId: string, params?: any): Promise<APIResponse<{ data: { reviews: Review[] } }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.COURSE_REVIEWS.replace(":id", courseId), { params }));
  },

  getUserReview: async (courseId: string): Promise<APIResponse<{ data: { review: Review | null } }>> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.USER_REVIEW.replace(":courseId", courseId)));
  },

  addReview: async (courseId: string, reviewData: { rating: number; comment: string }): Promise<APIResponse<{ data: { review: Review } }>> => {
    return await handleResponse(api.post(API_CONFIG.ENDPOINTS.ADD_REVIEW.replace(":courseId", courseId), reviewData));
  },

  updateReview: async (courseId: string, reviewId: string, reviewData: any): Promise<APIResponse<{ data: { review: Review } }>> => {
    return await handleResponse(
      api.put(API_CONFIG.ENDPOINTS.UPDATE_REVIEW.replace(":courseId", courseId).replace(":reviewId", reviewId), reviewData)
    );
  },

  deleteReview: async (courseId: string, reviewId: string): Promise<APIResponse> => {
    return await handleResponse(
      api.delete(API_CONFIG.ENDPOINTS.DELETE_REVIEW.replace(":courseId", courseId).replace(":reviewId", reviewId))
    );
  },
};

// ==================== TEST APIs ====================
export const testAPI = {
  testConnection: async (): Promise<APIResponse> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.HEALTH));
  },

  testAuth: async (): Promise<APIResponse> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.PROFILE));
  },

  testGoogleOAuth: async (): Promise<APIResponse> => {
    return await handleResponse(api.get(API_CONFIG.ENDPOINTS.GOOGLE_TEST));
  },

  debugStorage: async () => {
    if (__DEV__) {
      await storage.debugPrintAll();
    }
  },

  debugTokenExpiry: async () => {
    if (__DEV__) {
      const expiry = await tokenManager.getTokenExpiry();
      const isExpired = await tokenManager.isTokenExpired();
      console.log("Token Expiry:", expiry?.toLocaleString());
      console.log("Is Expired:", isExpired);
    }
  },
};

// ==================== COURSE FORM HELPER - FIXED ====================
export const courseFormHelper = {
  normalizeCategory: (category: string): string => {
    const normalized = category.toLowerCase().trim();
    const validCategories = [
      'web', 'mobile', 'data-science', 'business', 'design', 
      'marketing', 'programming', 'it', 'personal-development',
      'photography', 'music', 'health', 'fitness', 'academic', 'language'
    ];

    if (validCategories.includes(normalized)) return normalized;

    const categoryMap: { [key: string]: string } = {
      'web-development': 'web',
      'mobile-development': 'mobile',
      'data': 'data-science',
      'data science': 'data-science',
      'personal development': 'personal-development',
    };

    return categoryMap[normalized] || 'web';
  },

  createCourseFormData: (courseData: {
    title: string;
    description: string;
    category: string;
    level: "beginner" | "intermediate" | "advanced";
    price: number | string;
    language: string;
    duration: string;
    requirements?: string[];
    whatYouWillLearn?: string[];
    targetAudience?: string[];
    status?: "draft" | "published";
  }, thumbnailUri?: string): FormData => {
    const formData = new FormData();
    
    // Basic fields
    formData.append('title', courseData.title.trim());
    formData.append('description', courseData.description.trim());
    formData.append('category', courseFormHelper.normalizeCategory(courseData.category));
    formData.append('level', courseData.level);
    formData.append('price', courseData.price.toString());
    formData.append('language', courseData.language);
    formData.append('duration', courseData.duration.trim() || "");
    formData.append('status', courseData.status || 'draft');
    
    // Array fields - append as individual fields for better backend compatibility
    if (courseData.requirements && courseData.requirements.length > 0) {
      courseData.requirements.forEach((req, index) => {
        if (req.trim()) {
          formData.append(`requirements[${index}]`, req.trim());
        }
      });
    }
    
    if (courseData.whatYouWillLearn && courseData.whatYouWillLearn.length > 0) {
      courseData.whatYouWillLearn.forEach((item, index) => {
        if (item.trim()) {
          formData.append(`whatYouWillLearn[${index}]`, item.trim());
        }
      });
    }
    
    if (courseData.targetAudience && courseData.targetAudience.length > 0) {
      courseData.targetAudience.forEach((audience, index) => {
        if (audience.trim()) {
          formData.append(`targetAudience[${index}]`, audience.trim());
        }
      });
    }
    
    // Thumbnail
    if (thumbnailUri) {
      const uri = Platform.OS === 'ios' ? thumbnailUri.replace('file://', '') : thumbnailUri;
      const filename = thumbnailUri.split('/').pop() || `course-${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('thumbnail', {
        uri: uri,
        type: type,
        name: filename,
      } as any);
    }
    
    return formData;
  },
};

// ==================== EXPORTS ====================
export default api;
export { api, handleResponse };
export type { APIResponse, TokenData };