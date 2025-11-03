// app/(instructor)/create-course.tsx - COMPLETE FULL CODE
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

// ============= Types & Interfaces =============
interface CourseFormData {
  title: string;
  description: string;
  category: string;
  price: string;
  level: "beginner" | "intermediate" | "advanced";
  language: string;
  duration: string;
  requirements: string;
  whatYouWillLearn: string;
  targetAudience: string;
  status: "draft" | "published";
}

interface ValidationError {
  field: string;
  message: string;
}

interface Category {
  label: string;
  value: string;
}

interface Level {
  value: "beginner" | "intermediate" | "advanced";
  label: string;
  icon: string;
}

interface StatusOption {
  value: "draft" | "published";
  label: string;
  icon: string;
  color: string;
}

// ============= Constants =============
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const API_CONFIG = {
  BASE_URL: "https://e-learning-back-14h5.vercel.app",
  ENDPOINTS: {
    COURSES: "/api/courses",
  },
  TIMEOUT: 60000, // 60 seconds for image upload
  MAX_RETRIES: 3,
} as const;

const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
} as const;

const IMAGE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_WIDTH: 1280,
  MAX_HEIGHT: 720,
  QUALITY: 0.7,
  ASPECT: [16, 9] as [number, number],
  ALLOWED_TYPES: ["jpeg", "jpg", "png", "webp"],
} as const;

const FORM_LIMITS = {
  TITLE: { MIN: 3, MAX: 200 },
  DESCRIPTION: { MIN: 10, MAX: 5000 },
  PRICE: { MIN: 0, MAX: 10000 },
  REQUIREMENTS: { MAX: 1000 },
  WHAT_YOU_WILL_LEARN: { MAX: 2000 },
  TARGET_AUDIENCE: { MAX: 1000 },
} as const;

// ============= Data =============
const CATEGORIES: Category[] = [
  { label: "Web Development", value: "web" },
  { label: "Mobile Development", value: "mobile" },
  { label: "Data Science", value: "data-science" },
  { label: "Business", value: "business" },
  { label: "Design", value: "design" },
  { label: "Marketing", value: "marketing" },
  { label: "Programming", value: "programming" },
  { label: "IT & Software", value: "it" },
  { label: "Personal Development", value: "personal-development" },
  { label: "Photography", value: "photography" },
  { label: "Music", value: "music" },
  { label: "Health & Fitness", value: "health" },
  { label: "Academic", value: "academic" },
  { label: "Language", value: "language" },
];

const LEVELS: Level[] = [
  { value: "beginner", label: "Beginner", icon: "school-outline" },
  { value: "intermediate", label: "Intermediate", icon: "trending-up" },
  { value: "advanced", label: "Advanced", icon: "rocket-outline" },
];

const STATUS_OPTIONS: StatusOption[] = [
  { value: "draft", label: "Save as Draft", icon: "document-text", color: "#64748b" },
  { value: "published", label: "Publish Now", icon: "rocket", color: "#10b981" },
];

// ============= Utility Functions =============
const parseJsonSafe = (data: string): any => {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

const formatPrice = (value: string): string => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("");
  }
  if (parts[1] && parts[1].length > 2) {
    return parts[0] + "." + parts[1].substring(0, 2);
  }
  return cleaned;
};

const parseMultilineInput = (input: string): string[] => {
  if (!input.trim()) return [];
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ============= API Service =============
class ApiService {
  private static async getAuthToken(): Promise<string> {
    try {
      const tokenData = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (!tokenData) throw new Error("No authentication token found");

      const parsed = parseJsonSafe(tokenData);
      const token = typeof parsed === "object" ? parsed.token || parsed : parsed;

      if (!token) throw new Error("Invalid token format");
      return token;
    } catch (error) {
      console.error("Failed to get auth token:", error);
      throw new Error("Authentication required. Please login again.");
    }
  }

  private static async makeRequest(
    url: string,
    options: RequestInit,
    retries = API_CONFIG.MAX_RETRIES
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      if (retries > 0 && (error.name === "AbortError" || error.message?.includes("timeout"))) {
        console.log(
          `⏳ Retrying request... (${API_CONFIG.MAX_RETRIES - retries + 1}/${API_CONFIG.MAX_RETRIES})`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.makeRequest(url, options, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Optimize image for upload - resize and compress
   */
  private static async optimizeImage(imageUri: string): Promise<string> {
    try {
      console.log("🔧 Optimizing image...");

      const manipulatedImage = await manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: IMAGE_CONFIG.MAX_WIDTH,
            },
          },
        ],
        {
          compress: IMAGE_CONFIG.QUALITY,
          format: SaveFormat.JPEG,
        }
      );

      console.log("✅ Image optimized successfully");
      return manipulatedImage.uri;
    } catch (error) {
      console.error("⚠️ Image optimization failed, using original:", error);
      return imageUri;
    }
  }

  /**
   * Convert image to Base64 string with compression
   */
  private static async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      console.log("📸 Converting image to Base64...");

      // Optimize image first
      const optimizedUri = await this.optimizeImage(imageUri);

      // Read file as Base64
      const base64 = await FileSystem.readAsStringAsync(optimizedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create data URL (always JPEG after optimization)
      const dataUrl = `data:image/jpeg;base64,${base64}`;

      const sizeKB = (dataUrl.length / 1024).toFixed(2);
      console.log("✅ Image converted to Base64");
      console.log(`📊 Final size: ${sizeKB} KB`);

      // Warn if still large
      if (dataUrl.length > 1024 * 1024) {
        console.warn("⚠️ Base64 image is large (>1MB), upload may be slow");
      }

      return dataUrl;
    } catch (error) {
      console.error("❌ Failed to convert image to Base64:", error);
      throw new Error("Failed to process image");
    }
  }

  /**
   * Parse response safely - handle JSON, HTML, and text responses
   */
  private static async parseResponse(response: Response): Promise<any> {
    const contentType = response.headers.get("content-type");
    const responseText = await response.text();

    console.log("📥 Response status:", response.status, response.statusText);
    console.log("📥 Response content-type:", contentType);
    console.log("📥 Response preview:", responseText.substring(0, 200));

    // Handle JSON responses
    if (contentType && contentType.includes("application/json")) {
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse JSON:", parseError);
        console.error("Response text:", responseText);
        throw new Error("Invalid JSON response from server");
      }
    }

    // Handle HTML error pages
    if (contentType && contentType.includes("text/html")) {
      console.error("❌ Server returned HTML instead of JSON");

      // Extract error from HTML
      if (responseText.includes("413") || responseText.includes("Payload Too Large")) {
        throw new Error("Image too large. Server rejected the upload (413 Payload Too Large)");
      }
      if (responseText.includes("502") || responseText.includes("Bad Gateway")) {
        throw new Error("Server error (502). Please try again in a moment.");
      }
      if (responseText.includes("504") || responseText.includes("Gateway Timeout")) {
        throw new Error("Request timeout (504). Please try with a smaller image.");
      }
      if (responseText.includes("500") || responseText.includes("Internal Server Error")) {
        throw new Error("Server error (500). Please try again.");
      }

      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    // Try to parse as JSON anyway
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.error("❌ Could not parse response as JSON");
      throw new Error(
        `Server returned unexpected response: ${response.status} ${response.statusText}`
      );
    }
  }

  /**
   * Create course with Base64 thumbnail
   */
  static async createCourse(courseData: any, thumbnailUri: string | null): Promise<any> {
    try {
      const token = await this.getAuthToken();

      // Prepare base payload
      const payload: any = {
        title: courseData.title.trim(),
        description: courseData.description.trim(),
        category: courseData.category,
        level: courseData.level,
        price: parseFloat(courseData.price),
        language: courseData.language.trim() || "English",
        duration: courseData.duration.trim(),
        requirements: parseMultilineInput(courseData.requirements),
        whatYouWillLearn: parseMultilineInput(courseData.whatYouWillLearn),
        targetAudience: parseMultilineInput(courseData.targetAudience),
        status: courseData.status,
      };

      // Add thumbnail if provided
      if (thumbnailUri) {
        console.log("📤 Processing thumbnail...");

        try {
          const thumbnailBase64 = await this.convertImageToBase64(thumbnailUri);
          payload.thumbnailBase64 = thumbnailBase64;
          console.log("✅ Thumbnail added to payload");
        } catch (conversionError: any) {
          console.error("❌ Thumbnail processing failed:", conversionError);
          throw new Error(`Failed to process thumbnail: ${conversionError.message}`);
        }
      }

      // Log payload info
      const payloadSize = JSON.stringify(payload).length;
      console.log("📦 Payload size:", (payloadSize / 1024).toFixed(2), "KB");
      console.log("📤 Sending course creation request...");

      if (payloadSize > 5 * 1024 * 1024) {
        console.warn("⚠️ Large payload (>5MB), this may take a while...");
      }

      // Make request
      const response = await this.makeRequest(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.COURSES}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      // Parse response
      const data = await this.parseResponse(response);

      if (!response.ok) {
        console.error("❌ Course creation failed:", data);
        throw new Error(data.message || `Request failed: ${response.status}`);
      }

      console.log("✅ Course created successfully!");
      return data;
    } catch (error: any) {
      console.error("❌ Course creation error:", error);

      // Handle specific errors
      if (error.message?.includes("413") || error.message?.includes("Payload Too Large")) {
        throw new Error("Image is too large. Please choose a smaller image.");
      }
      if (error.message?.includes("401") || error.message?.includes("Authentication")) {
        throw new Error("Session expired. Please login again.");
      }
      if (error.message?.includes("400")) {
        throw new Error(error.message || "Invalid course data. Please check all fields.");
      }
      if (error.message?.includes("502")) {
        throw new Error("Server error. Please try again in a moment.");
      }
      if (error.message?.includes("504") || error.message?.includes("timeout")) {
        throw new Error("Request timeout. Please try with a smaller image.");
      }
      if (error.name === "AbortError") {
        throw new Error("Request timeout. Please check your connection.");
      }

      throw error;
    }
  }
}

// ============= Validation Service =============
class ValidationService {
  static validateTitle(title: string): ValidationError | null {
    const trimmed = title.trim();
    if (!trimmed) {
      return { field: "title", message: "Title is required" };
    }
    if (trimmed.length < FORM_LIMITS.TITLE.MIN) {
      return {
        field: "title",
        message: `Title must be at least ${FORM_LIMITS.TITLE.MIN} characters`,
      };
    }
    if (trimmed.length > FORM_LIMITS.TITLE.MAX) {
      return {
        field: "title",
        message: `Title cannot exceed ${FORM_LIMITS.TITLE.MAX} characters`,
      };
    }
    return null;
  }

  static validateDescription(description: string): ValidationError | null {
    const trimmed = description.trim();
    if (!trimmed) {
      return { field: "description", message: "Description is required" };
    }
    if (trimmed.length < FORM_LIMITS.DESCRIPTION.MIN) {
      return {
        field: "description",
        message: `Description must be at least ${FORM_LIMITS.DESCRIPTION.MIN} characters`,
      };
    }
    if (trimmed.length > FORM_LIMITS.DESCRIPTION.MAX) {
      return {
        field: "description",
        message: `Description cannot exceed ${FORM_LIMITS.DESCRIPTION.MAX} characters`,
      };
    }
    return null;
  }

  static validatePrice(price: string): ValidationError | null {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < FORM_LIMITS.PRICE.MIN) {
      return { field: "price", message: "Price must be a valid positive number" };
    }
    if (numPrice > FORM_LIMITS.PRICE.MAX) {
      return { field: "price", message: `Price cannot exceed $${FORM_LIMITS.PRICE.MAX}` };
    }
    return null;
  }

  static validateForm(data: CourseFormData): ValidationError[] {
    const errors: ValidationError[] = [];

    const titleError = this.validateTitle(data.title);
    if (titleError) errors.push(titleError);

    const descError = this.validateDescription(data.description);
    if (descError) errors.push(descError);

    const priceError = this.validatePrice(data.price);
    if (priceError) errors.push(priceError);

    if (!data.category) {
      errors.push({ field: "category", message: "Category is required" });
    }

    return errors;
  }
}

// ============= Main Component =============
export default function CreateCourseScreen() {
  // State Management
  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    category: "web",
    price: "0",
    level: "beginner",
    language: "English",
    duration: "",
    requirements: "",
    whatYouWillLearn: "",
    targetAudience: "",
    status: "draft",
  });

  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);
  const [thumbnailSize, setThumbnailSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Memoized Values
  const isFree = useMemo(() => parseFloat(formData.price || "0") === 0, [formData.price]);

  const hasUnsavedChanges = useMemo(() => {
    return Object.values(formData).some((value) => value.trim() !== "") || thumbnailUri !== null;
  }, [formData, thumbnailUri]);

  // Form Update Handler
  const updateFormData = useCallback((updates: Partial<CourseFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    const updatedFields = Object.keys(updates);
    setErrors((prev) => {
      const newErrors = { ...prev };
      updatedFields.forEach((field) => delete newErrors[field]);
      return newErrors;
    });
  }, []);

  // Validation
  const validateField = useCallback((field: keyof CourseFormData, value: string) => {
    let error: string | null = null;

    switch (field) {
      case "title":
        const titleError = ValidationService.validateTitle(value);
        error = titleError?.message || null;
        break;
      case "description":
        const descError = ValidationService.validateDescription(value);
        error = descError?.message || null;
        break;
      case "price":
        const priceError = ValidationService.validatePrice(value);
        error = priceError?.message || null;
        break;
    }

    setErrors((prev) => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  }, []);

  // Debounced validation
  const debouncedValidation = useMemo(() => debounce(validateField, 500), [validateField]);

  // Image Handling
  const handleImagePermissions = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please grant access to your photo library to upload course thumbnails.",
        [{ text: "OK" }]
      );
      return false;
    }
    return true;
  };

  const validateImageSize = (fileSize: number | undefined): boolean => {
    if (!fileSize) return true;

    if (fileSize > IMAGE_CONFIG.MAX_SIZE) {
      Alert.alert(
        "File Too Large",
        `Please select an image smaller than ${IMAGE_CONFIG.MAX_SIZE / 1024 / 1024}MB`
      );
      return false;
    }

    return true;
  };

  const pickImageFromGallery = async () => {
    try {
      const hasPermission = await handleImagePermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: IMAGE_CONFIG.ASPECT,
        quality: IMAGE_CONFIG.QUALITY,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        if (!validateImageSize(asset.fileSize)) {
          return;
        }

        setThumbnailUri(asset.uri);
        setThumbnailSize(asset.fileSize || null);
        console.log("✅ Thumbnail selected:", asset.uri);
        console.log(
          "📊 File size:",
          asset.fileSize ? `${(asset.fileSize / 1024).toFixed(2)} KB` : "Unknown"
        );
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const takePhotoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant camera access to take photos.", [
          { text: "OK" },
        ]);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: IMAGE_CONFIG.ASPECT,
        quality: IMAGE_CONFIG.QUALITY,
        exif: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        if (!validateImageSize(asset.fileSize)) {
          return;
        }

        setThumbnailUri(asset.uri);
        setThumbnailSize(asset.fileSize || null);
        console.log("✅ Photo taken:", asset.uri);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const showImageOptions = () => {
    Alert.alert("Add Course Thumbnail", "Choose how to add your course image", [
      { text: "Take Photo", onPress: takePhotoWithCamera },
      { text: "Choose from Gallery", onPress: pickImageFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeImage = () => {
    Alert.alert(
      "Remove Thumbnail",
      "Are you sure you want to remove the course thumbnail?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setThumbnailUri(null);
            setThumbnailSize(null);
            console.log("🗑️ Thumbnail removed");
          },
        },
      ]
    );
  };

  // Course Creation
  const handleCreateCourse = async () => {
    try {
      // Validate form
      const validationErrors = ValidationService.validateForm(formData);
      if (validationErrors.length > 0) {
        const errorMap: Record<string, string> = {};
        validationErrors.forEach((err) => {
          errorMap[err.field] = err.message;
        });
        setErrors(errorMap);

        Alert.alert("Validation Error", validationErrors[0].message);
        return;
      }

      setLoading(true);

      console.log("📤 Creating course...");
      console.log("Form data:", {
        ...formData,
        hasThumbnail: !!thumbnailUri,
      });

      // Create course
      const result = await ApiService.createCourse(formData, thumbnailUri);

      // Success
      Alert.alert(
        "Success! 🎉",
        `Your course "${formData.title}" has been ${
          formData.status === "published" ? "published" : "saved as draft"
        } successfully!`,
        [
          {
            text: "View My Courses",
            onPress: () => router.replace("/(tabs)/instructor"),
          },
          {
            text: "Create Another",
            style: "cancel",
            onPress: resetForm,
          },
        ]
      );
    } catch (error: any) {
      console.error("❌ Course creation error:", error);
      Alert.alert(
        "Creation Failed",
        error.message || "Failed to create course. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "web",
      price: "0",
      level: "beginner",
      language: "English",
      duration: "",
      requirements: "",
      whatYouWillLearn: "",
      targetAudience: "",
      status: "draft",
    });
    setThumbnailUri(null);
    setThumbnailSize(null);
    setErrors({});
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Discard Changes?",
        "You have unsaved changes. Are you sure you want to leave?",
        [
          { text: "Keep Editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // Render Methods
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerButton} onPress={handleCancel} disabled={loading}>
        <Ionicons name="arrow-back" size={24} color="#1e293b" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Create Course</Text>
      <View style={styles.headerButton} />
    </View>
  );

  const renderThumbnailSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Course Thumbnail</Text>
        <Text style={styles.sectionHint}>Recommended: 1280x720px (16:9)</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.thumbnailContainer, pressed && styles.thumbnailPressed]}
        onPress={showImageOptions}
        disabled={loading}
      >
        {thumbnailUri ? (
          <>
            <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} />
            <View style={styles.thumbnailOverlay}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.thumbnailOverlayText}>Change Image</Text>
            </View>
            {thumbnailSize && (
              <View style={styles.fileSizeBadge}>
                <Text style={styles.fileSizeText}>{(thumbnailSize / 1024).toFixed(0)} KB</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="cloud-upload-outline" size={48} color="#667eea" />
            <Text style={styles.thumbnailPlaceholderText}>Add Thumbnail</Text>
            <Text style={styles.thumbnailPlaceholderHint}>JPG, PNG or WebP (max 5MB)</Text>
          </View>
        )}
      </Pressable>

      {thumbnailUri && (
        <TouchableOpacity style={styles.removeButton} onPress={removeImage}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderInput = (label: string, field: keyof CourseFormData, props: any = {}) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label}
        {props.required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          props.multiline && styles.textArea,
          errors[field] && styles.inputError,
        ]}
        value={formData[field]}
        onChangeText={(text) => {
          updateFormData({ [field]: text });
          if (props.validate) {
            debouncedValidation(field, text);
          }
        }}
        editable={!loading}
        {...props}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      {props.maxLength && (
        <Text style={styles.charCount}>
          {formData[field].length}/{props.maxLength}
        </Text>
      )}
      {props.hint && <Text style={styles.hint}>{props.hint}</Text>}
    </View>
  );

  const renderBasicInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Basic Information</Text>

      {renderInput("Course Title", "title", {
        placeholder: "e.g., Complete Web Development Bootcamp 2024",
        maxLength: FORM_LIMITS.TITLE.MAX,
        required: true,
        validate: true,
      })}

      {renderInput("Description", "description", {
        placeholder: "Describe what students will learn...",
        multiline: true,
        numberOfLines: 6,
        textAlignVertical: "top",
        maxLength: FORM_LIMITS.DESCRIPTION.MAX,
        required: true,
        validate: true,
      })}

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.flex1]}>
          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={(value) => updateFormData({ category: value })}
              style={styles.picker}
              enabled={!loading}
            >
              {CATEGORIES.map((cat) => (
                <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={[styles.inputGroup, styles.flex1, styles.ml10]}>
          {renderInput("Language", "language", {
            placeholder: "English",
          })}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Difficulty Level</Text>
        <View style={styles.levelContainer}>
          {LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.levelButton,
                formData.level === level.value && styles.levelButtonActive,
              ]}
              onPress={() => updateFormData({ level: level.value })}
              disabled={loading}
            >
              <Ionicons
                name={level.icon as any}
                size={20}
                color={formData.level === level.value ? "#fff" : "#667eea"}
              />
              <Text
                style={[
                  styles.levelText,
                  formData.level === level.value && styles.levelTextActive,
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderPricing = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pricing & Duration</Text>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.flex1]}>
          <Text style={styles.label}>Price (USD)</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceSymbol}>$</Text>
            <TextInput
              style={[styles.priceInput, errors.price && styles.inputError]}
              value={formData.price}
              onChangeText={(text) => {
                const formatted = formatPrice(text);
                updateFormData({ price: formatted });
                debouncedValidation("price", formatted);
              }}
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          {isFree && (
            <View style={styles.freeBadge}>
              <Ionicons name="gift" size={14} color="#fff" />
              <Text style={styles.freeBadgeText}>FREE COURSE</Text>
            </View>
          )}
        </View>

        <View style={[styles.inputGroup, styles.flex1, styles.ml10]}>
          {renderInput("Duration", "duration", {
            placeholder: "e.g., 10 hours",
          })}
        </View>
      </View>
    </View>
  );

  const renderCourseContent = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Course Content</Text>

      {renderInput("Requirements", "requirements", {
        placeholder: "Basic HTML knowledge\nCSS fundamentals\n(one per line)",
        multiline: true,
        numberOfLines: 4,
        textAlignVertical: "top",
        maxLength: FORM_LIMITS.REQUIREMENTS.MAX,
        hint: "Enter one requirement per line",
      })}

      {renderInput("What Students Will Learn", "whatYouWillLearn", {
        placeholder: "Build responsive websites\nMaster React\n(one per line)",
        multiline: true,
        numberOfLines: 5,
        textAlignVertical: "top",
        maxLength: FORM_LIMITS.WHAT_YOU_WILL_LEARN.MAX,
        hint: "Enter one learning outcome per line",
      })}

      {renderInput("Target Audience", "targetAudience", {
        placeholder: "Beginners\nCareer switchers\n(one per line)",
        multiline: true,
        numberOfLines: 3,
        textAlignVertical: "top",
        maxLength: FORM_LIMITS.TARGET_AUDIENCE.MAX,
        hint: "Enter one audience type per line",
      })}
    </View>
  );

  const renderPublishOptions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Publish Options</Text>
      <Text style={styles.sectionHint}>
        Choose whether to save as draft or publish immediately
      </Text>

      <View style={styles.statusContainer}>
        {STATUS_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.statusButton,
              formData.status === option.value && styles.statusButtonActive,
            ]}
            onPress={() => updateFormData({ status: option.value })}
            disabled={loading}
          >
            <Ionicons
              name={option.icon as any}
              size={20}
              color={formData.status === option.value ? "#fff" : option.color}
            />
            <Text
              style={[
                styles.statusText,
                formData.status === option.value && styles.statusTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {formData.status === "published" && (
        <View style={styles.warningBox}>
          <Ionicons name="information-circle" size={16} color="#f59e0b" />
          <Text style={styles.warningText}>
            Published courses will be immediately visible to all students
          </Text>
        </View>
      )}
    </View>
  );

  const renderActions = () => (
    <View style={styles.actions}>
      <TouchableOpacity
        style={[styles.button, styles.buttonOutline]}
        onPress={handleCancel}
        disabled={loading}
      >
        <Text style={styles.buttonOutlineText}>Cancel</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.buttonPrimary, loading && styles.buttonDisabled]}
        onPress={handleCreateCourse}
        disabled={loading}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.buttonPrimaryText}>Creating...</Text>
          </>
        ) : (
          <>
            <Ionicons
              name={formData.status === "published" ? "rocket" : "save"}
              size={20}
              color="#fff"
            />
            <Text style={styles.buttonPrimaryText}>
              {formData.status === "published" ? "Publish Course" : "Save Draft"}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {renderHeader()}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderThumbnailSection()}
          {renderBasicInfo()}
          {renderPricing()}
          {renderCourseContent()}
          {renderPublishOptions()}
          {renderActions()}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============= Styles =============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  flex: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  ml10: {
    marginLeft: 10,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },

  // Sections
  section: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },

  // Thumbnail
  thumbnailContainer: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
  },
  thumbnailPressed: {
    opacity: 0.9,
  },
  thumbnail: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e0e7ff",
    borderStyle: "dashed",
    borderRadius: 12,
    backgroundColor: "#f0f4ff",
  },
  thumbnailPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#667eea",
  },
  thumbnailPlaceholderHint: {
    marginTop: 4,
    fontSize: 12,
    color: "#94a3b8",
  },
  thumbnailOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailOverlayText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 8,
    fontWeight: "600",
  },
  fileSizeBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(102, 126, 234, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  fileSizeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 8,
    gap: 6,
  },
  removeButtonText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },

  // Form
  row: {
    flexDirection: "row",
    gap: 10,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "right",
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
    fontWeight: "500",
  },

  // Picker
  pickerContainer: {
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    overflow: "hidden",
  },
  picker: {
    height: 48,
    color: "#1e293b",
  },

  // Level Buttons
  levelContainer: {
    flexDirection: "row",
    gap: 10,
  },
  levelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 2,
    borderColor: "transparent",
    gap: 6,
  },
  levelButtonActive: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  levelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  levelTextActive: {
    color: "#fff",
  },

  // Price
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  priceSymbol: {
    paddingLeft: 16,
    fontSize: 16,
    color: "#64748b",
    fontWeight: "600",
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
  },
  freeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
    borderRadius: 20,
    gap: 4,
  },
  freeBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  // Status
  statusContainer: {
    flexDirection: "row",
    gap: 12,
  },
  statusButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 2,
    borderColor: "transparent",
    gap: 8,
  },
  statusButtonActive: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  statusTextActive: {
    color: "#fff",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
  },

  // Actions
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 16,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  buttonOutline: {
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  buttonOutlineText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
  },
  buttonPrimary: {
    backgroundColor: "#667eea",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  bottomPadding: {
    height: 40,
  },
});