// backend/utils/blob.js - COMPLETE WITH BASE64 & FILE UPLOAD
import { put, del } from "@vercel/blob";

// ==================== CONFIGURATION ====================
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate unique filename with timestamp and random string
 */
const generateUniqueFilename = (originalName = "file", prefix = "upload") => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  
  // Extract extension from original name or use default
  let extension = ".jpg";
  if (originalName) {
    const parts = originalName.split('.');
    if (parts.length > 1) {
      extension = `.${parts[parts.length - 1].toLowerCase()}`;
    }
  }
  
  // Sanitize filename
  const sanitizedName = (originalName || "file")
    .toLowerCase()
    .replace(/\.[^/.]+$/, "") // Remove extension
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 30);

  return `${prefix}-${sanitizedName}-${timestamp}-${randomString}${extension}`;
};

/**
 * Validate Base64 string
 */
const validateBase64File = (base64String, allowedTypes = ALLOWED_IMAGE_TYPES) => {
  if (!base64String || typeof base64String !== "string") {
    throw new Error("No Base64 file provided");
  }

  // Check if it starts with data URL scheme
  if (!base64String.startsWith("data:")) {
    throw new Error("Invalid Base64 format. Expected data URL.");
  }

  // Calculate file size from Base64
  const base64Data = base64String.split(",")[1] || base64String;
  const padding = (base64Data.match(/=/g) || []).length;
  const base64Size = (base64Data.length * 3) / 4 - padding;

  if (base64Size === 0) {
    throw new Error("File is empty");
  }

  if (base64Size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  // Extract and validate MIME type
  const mimeMatch = base64String.match(/^data:([^;]+);base64/);
  if (!mimeMatch) {
    throw new Error("Invalid Base64 data URL format");
  }

  const mimeType = mimeMatch[1];
  
  // Check if MIME type is allowed
  const allAllowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];
  if (!allAllowedTypes.includes(mimeType)) {
    throw new Error(`Invalid file type: ${mimeType}. Allowed: ${allowedTypes.join(", ")}`);
  }

  return { mimeType, size: base64Size };
};

/**
 * Convert Base64 to Buffer
 */
const base64ToBuffer = (base64String) => {
  try {
    // Remove data URL prefix if present
    const base64Data = base64String.includes(",")
      ? base64String.split(",")[1]
      : base64String;
    
    return Buffer.from(base64Data, "base64");
  } catch (error) {
    throw new Error(`Invalid Base64 data: ${error.message}`);
  }
};

/**
 * Extract MIME type from Base64 string
 */
const getMimeTypeFromBase64 = (base64String) => {
  const match = base64String.match(/^data:([^;]+);base64/);
  return match ? match[1] : "image/jpeg";
};

/**
 * Extract file extension from MIME type
 */
const getExtensionFromMimeType = (mimeType) => {
  const mimeToExt = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "application/pdf": ".pdf",
  };
  return mimeToExt[mimeType] || ".bin";
};

// ==================== UPLOAD FUNCTIONS ====================

/**
 * Upload from Base64 string (for React Native / Mobile apps)
 * @param {string} base64String - Base64 encoded file data
 * @param {string} folder - Destination folder path
 * @param {string} filename - Original filename
 * @returns {Promise<string>} - Uploaded file URL
 */
export const uploadFromBase64 = async (base64String, folder = "uploads", filename = "file") => {
  try {
    console.log(`📤 [Base64] Uploading to folder: ${folder}`);

    // Validate Base64 file
    const { mimeType, size } = validateBase64File(base64String);
    console.log(`✓ Validation passed - Type: ${mimeType}, Size: ${(size / 1024).toFixed(2)}KB`);

    // Generate unique filename with correct extension
    const extension = getExtensionFromMimeType(mimeType);
    const uniqueFilename = generateUniqueFilename(filename + extension, folder.split("/").pop() || "file");
    const blobPath = `${folder}/${uniqueFilename}`;

    // Convert Base64 to Buffer
    const fileBuffer = base64ToBuffer(base64String);

    console.log(`📝 Uploading to path: ${blobPath}`);

    // Upload to Vercel Blob with timeout
    const uploadPromise = put(blobPath, fileBuffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: false,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Upload timeout after 30 seconds")), 30000);
    });

    const blob = await Promise.race([uploadPromise, timeoutPromise]);

    console.log(`✅ [Base64] Upload successful: ${blob.url}`);
    return blob.url;

  } catch (error) {
    console.error("❌ [Base64] Upload failed:", error.message);
    
    // User-friendly error messages
    if (error.message?.includes("size")) {
      throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    } else if (error.message?.includes("type")) {
      throw new Error(`Invalid file type. ${error.message}`);
    } else if (error.message?.includes("timeout")) {
      throw new Error("Upload timed out. Please try again with a smaller file");
    } else {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
};

/**
 * Upload regular file (for web/form uploads)
 * @param {Object} file - Multer file object
 * @param {string} folder - Destination folder path
 * @returns {Promise<string>} - Uploaded file URL
 */
export const uploadToBlob = async (file, folder = "uploads") => {
  try {
    console.log(`📤 [File] Uploading to folder: ${folder}`);

    if (!file) {
      throw new Error("No file provided");
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    // Validate file type
    const allAllowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];
    if (!allAllowedTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type: ${file.mimetype}`);
    }

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.originalname, folder.split("/").pop() || "file");
    const blobPath = `${folder}/${uniqueFilename}`;

    console.log(`📝 Uploading file: ${file.originalname} (${(file.size / 1024).toFixed(2)}KB)`);

    // Upload to Vercel Blob
    const uploadPromise = put(blobPath, file.buffer, {
      access: "public",
      contentType: file.mimetype,
      addRandomSuffix: false,
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Upload timeout after 30 seconds")), 30000);
    });

    const blob = await Promise.race([uploadPromise, timeoutPromise]);

    console.log(`✅ [File] Upload successful: ${blob.url}`);
    return blob.url;

  } catch (error) {
    console.error("❌ [File] Upload failed:", error.message);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

/**
 * Upload course thumbnail (supports both Base64 and file upload)
 */
export const uploadCourseThumbnail = async (fileOrBase64, userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const folder = `courses/${userId}/thumbnails`;

    // Check if it's Base64 string
    if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
      console.log("🖼️ Uploading course thumbnail from Base64");
      return await uploadFromBase64(fileOrBase64, folder, "course-thumbnail");
    }
    
    // Otherwise, it's a file object
    if (fileOrBase64 && fileOrBase64.buffer) {
      console.log("🖼️ Uploading course thumbnail from file");
      return await uploadToBlob(fileOrBase64, folder);
    }

    throw new Error("Invalid file format");

  } catch (error) {
    console.error("❌ Course thumbnail upload failed:", error.message);
    throw error;
  }
};

/**
 * Upload lesson thumbnail
 */
export const uploadLessonThumbnail = async (fileOrBase64, courseId, lessonId) => {
  try {
    if (!courseId) {
      throw new Error("Course ID is required");
    }

    const folder = `courses/${courseId}/lessons/${lessonId || "new"}/thumbnails`;

    // Check if it's Base64 string
    if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
      console.log("🖼️ Uploading lesson thumbnail from Base64");
      return await uploadFromBase64(fileOrBase64, folder, "lesson-thumbnail");
    }
    
    // Otherwise, it's a file object
    if (fileOrBase64 && fileOrBase64.buffer) {
      console.log("🖼️ Uploading lesson thumbnail from file");
      return await uploadToBlob(fileOrBase64, folder);
    }

    throw new Error("Invalid file format");

  } catch (error) {
    console.error("❌ Lesson thumbnail upload failed:", error.message);
    throw error;
  }
};

/**
 * Upload lesson attachment
 */
export const uploadLessonAttachment = async (fileOrBase64, courseId, lessonId, index = 0) => {
  try {
    if (!courseId) {
      throw new Error("Course ID is required");
    }

    const folder = `courses/${courseId}/lessons/${lessonId || "new"}/attachments`;

    // Check if it's Base64 string
    if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
      console.log(`📎 Uploading lesson attachment ${index} from Base64`);
      return await uploadFromBase64(fileOrBase64, folder, `attachment-${index}`);
    }
    
    // Otherwise, it's a file object
    if (fileOrBase64 && fileOrBase64.buffer) {
      console.log(`📎 Uploading lesson attachment ${index} from file`);
      return await uploadToBlob(fileOrBase64, folder);
    }

    throw new Error("Invalid file format");

  } catch (error) {
    console.error(`❌ Lesson attachment ${index} upload failed:`, error.message);
    throw error;
  }
};

/**
 * Upload user avatar
 */
export const uploadAvatar = async (fileOrBase64, userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required");
    }

    const folder = `users/${userId}/avatars`;

    // Check if it's Base64 string
    if (typeof fileOrBase64 === "string" && fileOrBase64.startsWith("data:")) {
      console.log("👤 Uploading avatar from Base64");
      return await uploadFromBase64(fileOrBase64, folder, "avatar");
    }
    
    // Otherwise, it's a file object
    if (fileOrBase64 && fileOrBase64.buffer) {
      console.log("👤 Uploading avatar from file");
      return await uploadToBlob(fileOrBase64, folder);
    }

    throw new Error("Invalid file format");

  } catch (error) {
    console.error("❌ Avatar upload failed:", error.message);
    throw error;
  }
};

/**
 * Delete file from Vercel Blob
 */
export const deleteFromBlob = async (fileUrl) => {
  try {
    if (!fileUrl) {
      console.warn("⚠️ No URL provided for deletion");
      return { success: false, message: "No URL provided" };
    }

    if (!fileUrl.startsWith("http")) {
      console.warn("⚠️ Invalid URL format:", fileUrl);
      return { success: false, message: "Invalid URL format" };
    }

    console.log("🗑️ Deleting blob:", fileUrl);
    await del(fileUrl);

    console.log("✅ Blob deleted successfully");
    return { success: true, message: "File deleted successfully" };

  } catch (error) {
    console.error("❌ Blob delete error:", error.message);
    return {
      success: false,
      message: error.message || "Failed to delete file",
    };
  }
};

/**
 * Delete multiple files from Vercel Blob
 */
export const deleteMultipleFromBlob = async (fileUrls = []) => {
  try {
    if (!Array.isArray(fileUrls) || fileUrls.length === 0) {
      return { success: false, message: "No URLs provided" };
    }

    console.log(`🗑️ Deleting ${fileUrls.length} files...`);

    const results = await Promise.allSettled(
      fileUrls.map(url => deleteFromBlob(url))
    );

    const successful = results.filter(r => r.status === "fulfilled").length;
    const failed = results.length - successful;

    console.log(`✅ Deleted ${successful}/${fileUrls.length} files`);

    return {
      success: failed === 0,
      message: `Deleted ${successful}/${fileUrls.length} files`,
      successful,
      failed,
    };

  } catch (error) {
    console.error("❌ Multiple delete error:", error.message);
    return {
      success: false,
      message: error.message || "Failed to delete files",
    };
  }
};

// ==================== EXPORTS ====================

export default {
  // Core upload functions
  uploadFromBase64,
  uploadToBlob,
  
  // Specialized upload functions
  uploadCourseThumbnail,
  uploadLessonThumbnail,
  uploadLessonAttachment,
  uploadAvatar,
  
  // Delete functions
  deleteFromBlob,
  deleteMultipleFromBlob,
  
  // Helper functions (optional export)
  generateUniqueFilename,
  validateBase64File,
  base64ToBuffer,
  getMimeTypeFromBase64,
  
  // Constants
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_DOCUMENT_TYPES,
};