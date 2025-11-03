// controllers/courseController.js - COMPLETE FULL CODE WITH ALL FEATURES
import Course from "../models/Course.js";
import Lesson from "../models/Lesson.js";
import Enrollment from "../models/Enrollment.js";
import User from "../models/User.js";
import {
  uploadCourseThumbnail,
  uploadLessonThumbnail,
  uploadLessonAttachment,
  uploadFromBase64,
  uploadToBlob,
  deleteFromBlob,
  deleteMultipleFromBlob,
} from "../utils/blob.js";
import validator from "validator";
import xss from "xss";

// ==================== CONSTANTS & CONFIGURATION ====================

const VALID_CATEGORIES = {
  "web-development": "web",
  web: "web",
  "mobile-development": "mobile",
  mobile: "mobile",
  "data-science": "data-science",
  data: "data-science",
  business: "business",
  design: "design",
  marketing: "marketing",
  programming: "programming",
  it: "it",
  "personal-development": "personal-development",
  photography: "photography",
  music: "music",
  health: "health",
  fitness: "fitness",
  academic: "academic",
  language: "language",
  other: "other",
};

const VALID_LEVELS = ["beginner", "intermediate", "advanced", "expert", "all-levels"];
const VALID_STATUSES = ["draft", "published", "archived"];
const VALID_LESSON_TYPES = ["video", "article", "quiz", "assignment", "document"];
const VALID_ENROLLMENT_STATUSES = ["active", "completed", "cancelled", "expired"];
const VALID_SORT_FIELDS = ["createdAt", "updatedAt", "title", "price", "rating", "totalEnrollments"];
const VALID_SORT_ORDERS = ["asc", "desc"];

// ==================== HELPER FUNCTIONS ====================

/**
 * Sanitize input to prevent XSS attacks
 */
const sanitizeInput = (input) => {
  if (typeof input === "string") {
    return xss(input.trim());
  }
  return input;
};

/**
 * Parse array from various input formats
 */
const parseArray = (field) => {
  if (!field) return [];
  if (Array.isArray(field)) return field.map((item) => sanitizeInput(String(item)));
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed.map((item) => sanitizeInput(String(item))) : [];
    } catch {
      if (field.includes("\n")) {
        return field
          .split("\n")
          .map((item) => sanitizeInput(item))
          .filter((item) => item.length > 0);
      }
      if (field.includes(",")) {
        return field
          .split(",")
          .map((item) => sanitizeInput(item))
          .filter((item) => item.length > 0);
      }
      return [sanitizeInput(field)];
    }
  }
  return [];
};

/**
 * Validate and normalize pagination parameters
 */
const validatePagination = (page, limit) => {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));
  return { page: validPage, limit: validLimit };
};

/**
 * Send error response
 */
const sendErrorResponse = (res, statusCode, message, error = null) => {
  const response = {
    success: false,
    message: sanitizeInput(String(message)),
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === "development" && error) {
    response.error = error.message || String(error);
    response.stack = error.stack;
  }

  console.error(`❌ [${statusCode}] ${message}`, error ? error.message : "");
  return res.status(statusCode).json(response);
};

/**
 * Send success response
 */
const sendSuccessResponse = (res, statusCode, message, data = {}) => {
  const response = {
    success: true,
    message: sanitizeInput(String(message)),
    timestamp: new Date().toISOString(),
    ...data,
  };

  console.log(`✅ [${statusCode}] ${message}`);
  return res.status(statusCode).json(response);
};

/**
 * Calculate rating distribution
 */
const calculateRatingDistribution = (reviews) => {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  
  if (!Array.isArray(reviews)) return distribution;
  
  const activeReviews = reviews.filter((r) => r && r.isActive !== false);

  activeReviews.forEach((review) => {
    const rating = parseInt(review.rating);
    if (distribution[rating] !== undefined) {
      distribution[rating]++;
    }
  });

  return distribution;
};

/**
 * Validate UUID format
 */
const isValidUUID = (id) => {
  return validator.isUUID(String(id));
};

/**
 * Validate URL format
 */
const isValidURL = (url) => {
  if (!url) return true; // Optional URL
  return validator.isURL(String(url), {
    protocols: ["http", "https"],
    require_protocol: true,
  });
};

/**
 * Validate price
 */
const validatePrice = (price) => {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return { valid: false, error: "Price must be a number" };
  if (numPrice < 0) return { valid: false, error: "Price cannot be negative" };
  if (numPrice > 100000) return { valid: false, error: "Price cannot exceed 100,000" };
  return { valid: true, value: numPrice };
};

/**
 * Validate rating
 */
const validateRating = (rating) => {
  const numRating = parseInt(rating);
  if (isNaN(numRating)) return { valid: false, error: "Rating must be a number" };
  if (numRating < 1 || numRating > 5) return { valid: false, error: "Rating must be between 1 and 5" };
  return { valid: true, value: numRating };
};

// ==================== COURSE CRUD OPERATIONS ====================

/**
 * CREATE COURSE
 * POST /api/courses
 * Supports both Base64 (mobile) and file upload (web)
 */
export const createCourse = async (req, res) => {
  try {
    console.log("📥 [CREATE COURSE] Request received");
    console.log("User ID:", req.user?.id);
    console.log("Body fields:", Object.keys(req.body));
    console.log("File present:", !!req.file);

    const {
      title,
      description,
      category,
      level = "beginner",
      price = 0,
      language = "English",
      duration = "",
      requirements,
      whatYouWillLearn,
      targetAudience,
      tags,
      status = "draft",
      thumbnailBase64,
    } = req.body;

    // ===== VALIDATION =====

    // Required fields
    if (!title?.trim()) {
      return sendErrorResponse(res, 400, "Course title is required");
    }

    if (!description?.trim()) {
      return sendErrorResponse(res, 400, "Course description is required");
    }

    if (!category) {
      return sendErrorResponse(res, 400, "Course category is required");
    }

    // Title validation
    if (title.length < 3) {
      return sendErrorResponse(res, 400, "Title must be at least 3 characters");
    }

    if (title.length > 200) {
      return sendErrorResponse(res, 400, "Title cannot exceed 200 characters");
    }

    // Description validation
    if (description.length < 10) {
      return sendErrorResponse(res, 400, "Description must be at least 10 characters");
    }

    if (description.length > 5000) {
      return sendErrorResponse(res, 400, "Description cannot exceed 5000 characters");
    }

    // Category validation
    const normalizedCategory = VALID_CATEGORIES[category.toLowerCase()];
    if (!normalizedCategory) {
      return sendErrorResponse(
        res,
        400,
        `Invalid category. Valid options: ${Object.keys(VALID_CATEGORIES).join(", ")}`
      );
    }

    // Level validation
    const normalizedLevel = level.toLowerCase();
    if (!VALID_LEVELS.includes(normalizedLevel)) {
      return sendErrorResponse(res, 400, `Invalid level. Valid options: ${VALID_LEVELS.join(", ")}`);
    }

    // Status validation
    const normalizedStatus = status.toLowerCase();
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      return sendErrorResponse(res, 400, `Invalid status. Valid options: ${VALID_STATUSES.join(", ")}`);
    }

    // Price validation
    const priceValidation = validatePrice(price);
    if (!priceValidation.valid) {
      return sendErrorResponse(res, 400, priceValidation.error);
    }

    // ===== THUMBNAIL UPLOAD =====

    let thumbnailUrl = "";

    try {
      if (thumbnailBase64) {
        console.log("📤 Uploading thumbnail from Base64 (Mobile)...");
        thumbnailUrl = await uploadCourseThumbnail(thumbnailBase64, req.user.id);
        console.log("✅ Base64 thumbnail uploaded:", thumbnailUrl);
      } else if (req.file) {
        console.log("📤 Uploading thumbnail from file (Web)...");
        thumbnailUrl = await uploadCourseThumbnail(req.file, req.user.id);
        console.log("✅ File thumbnail uploaded:", thumbnailUrl);
      }
    } catch (uploadError) {
      console.error("❌ Thumbnail upload failed:", uploadError);
      return sendErrorResponse(res, 400, `Thumbnail upload failed: ${uploadError.message}`);
    }

    // ===== GET INSTRUCTOR INFO =====

    const instructor = await User.findById(req.user.id);
    if (!instructor) {
      return sendErrorResponse(res, 404, "Instructor not found");
    }

    // ===== PREPARE COURSE DATA =====

    const courseData = {
      title: sanitizeInput(title),
      description: sanitizeInput(description),
      category: normalizedCategory,
      thumbnail: thumbnailUrl,
      level: normalizedLevel,
      price: priceValidation.value,
      language: sanitizeInput(language),
      duration: sanitizeInput(duration),
      requirements: parseArray(requirements),
      whatYouWillLearn: parseArray(whatYouWillLearn),
      targetAudience: parseArray(targetAudience),
      tags: parseArray(tags),
      instructorId: req.user.id,
      instructorName: sanitizeInput(instructor.name),
      instructorEmail: instructor.email,
      instructorAvatar: instructor.avatar || "",
      instructorBio: sanitizeInput(instructor.profile?.bio || ""),
      status: normalizedStatus,
      totalEnrollments: 0,
      rating: 0,
      totalRatings: 0,
      totalReviews: 0,
      isFeatured: false,
      isPublished: normalizedStatus === "published",
    };

    // ===== CREATE COURSE =====

    const course = await Course.create(courseData);
    console.log("✅ Course created successfully:", course.id);

    return sendSuccessResponse(res, 201, "Course created successfully", {
      course: Course.sanitize ? Course.sanitize(course) : course,
    });
  } catch (err) {
    console.error("❌ [CREATE COURSE] Error:", err);

    // Handle duplicate title error
    if (err.code === "23505" || err.code === "ER_DUP_ENTRY") {
      return sendErrorResponse(res, 400, "A course with this title already exists");
    }

    return sendErrorResponse(res, 500, "Failed to create course", err);
  }
};

/**
 * GET ALL COURSES
 * GET /api/courses
 * With filtering, sorting, and pagination
 */
export const getCourses = async (req, res) => {
  try {
    console.log("📥 [GET COURSES] Request received");

    const {
      category,
      level,
      status = "published",
      featured,
      instructorId,
      minPrice,
      maxPrice,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 10,
      tags,
      language,
      isFree,
    } = req.query;

    // ===== VALIDATE PAGINATION =====

    const { page: validPage, limit: validLimit } = validatePagination(page, limit);

    // ===== BUILD FILTERS =====

    const filters = {
      limit: validLimit,
      offset: (validPage - 1) * validLimit,
      sortBy: VALID_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt",
      sortOrder: VALID_SORT_ORDERS.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : "desc",
    };

    // Status filter
    if (VALID_STATUSES.includes(status)) {
      filters.status = status;
    } else {
      filters.status = "published";
    }

    // Category filter
    if (category) {
      const normalizedCategory = VALID_CATEGORIES[category.toLowerCase()];
      if (normalizedCategory) {
        filters.category = normalizedCategory;
      }
    }

    // Level filter
    if (level && VALID_LEVELS.includes(level.toLowerCase())) {
      filters.level = level.toLowerCase();
    }

    // Featured filter
    if (featured === "true" || featured === true) {
      filters.isFeatured = true;
    }

    // Instructor filter
    if (instructorId && isValidUUID(instructorId)) {
      filters.instructorId = instructorId;
    }

    // Price filters
    if (minPrice !== undefined) {
      const price = parseFloat(minPrice);
      if (!isNaN(price)) {
        filters.minPrice = Math.max(0, price);
      }
    }

    if (maxPrice !== undefined) {
      const price = parseFloat(maxPrice);
      if (!isNaN(price)) {
        filters.maxPrice = Math.min(100000, price);
      }
    }

    // Free courses filter
    if (isFree === "true" || isFree === true) {
      filters.isFree = true;
    }

    // Search filter
    if (search && search.trim()) {
      filters.search = sanitizeInput(search);
    }

    // Tags filter
    if (tags) {
      filters.tags = parseArray(tags);
    }

    // Language filter
    if (language) {
      filters.language = sanitizeInput(language);
    }

    // ===== FETCH COURSES =====

    const courses = await Course.findAll(filters);
    const total = await Course.count(filters);

    const totalPages = Math.ceil(total / validLimit);

    console.log(`✅ Fetched ${courses.length} courses (Total: ${total})`);

    return sendSuccessResponse(res, 200, "Courses fetched successfully", {
      courses: courses.map((course) => (Course.sanitize ? Course.sanitize(course) : course)),
      pagination: {
        page: validPage,
        limit: validLimit,
        total,
        pages: totalPages,
        hasNext: validPage < totalPages,
        hasPrev: validPage > 1,
      },
      filters: {
        category: filters.category,
        level: filters.level,
        status: filters.status,
        search: filters.search,
      },
    });
  } catch (err) {
    console.error("❌ [GET COURSES] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch courses", err);
  }
};

/**
 * GET SINGLE COURSE
 * GET /api/courses/:id
 */
export const getCourse = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📥 [GET COURSE] Request received for ID:", id);

    // ===== VALIDATE ID =====

    if (!isValidUUID(id)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(id);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK PERMISSIONS =====

    // If course is not published, only instructor and admin can view
    if (course.status !== "published") {
      if (!req.user || (course.instructorId !== req.user.id && req.user.role !== "admin")) {
        return sendErrorResponse(res, 403, "You don't have permission to view this course");
      }
    }

    // ===== FETCH LESSONS =====

    let lessons = [];
    try {
      lessons = await Lesson.findByCourseId(id);
      lessons = lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (lessonError) {
      console.error("Error fetching lessons:", lessonError);
    }

    // ===== CHECK ENROLLMENT =====

    let enrollmentStatus = null;
    let progress = null;

    if (req.user) {
      try {
        enrollmentStatus = await Enrollment.findByCourseAndUser(id, req.user.id);
        if (enrollmentStatus) {
          progress = await Enrollment.getProgress(enrollmentStatus.id);
        }
      } catch (enrollmentError) {
        console.error("Error checking enrollment:", enrollmentError);
      }
    }

    // ===== FETCH REVIEWS =====

    let reviews = [];
    let reviewStats = null;

    try {
      reviews = await Course.getReviews(id, { limit: 10, sort: "newest" });
      reviewStats = {
        averageRating: course.rating || 0,
        totalRatings: course.totalRatings || 0,
        totalReviews: course.totalReviews || 0,
        distribution: calculateRatingDistribution(reviews),
      };
    } catch (reviewError) {
      console.error("Error fetching reviews:", reviewError);
    }

    console.log("✅ Course fetched successfully");

    return sendSuccessResponse(res, 200, "Course fetched successfully", {
      course: Course.sanitize ? Course.sanitize(course) : course,
      lessons: lessons.map((lesson) => (Lesson.sanitize ? Lesson.sanitize(lesson) : lesson)),
      reviews: reviews.slice(0, 5), // Return top 5 reviews
      reviewStats,
      enrollment: {
        isEnrolled: !!enrollmentStatus && enrollmentStatus.status === "active",
        status: enrollmentStatus?.status || null,
        progress: progress || null,
        enrolledAt: enrollmentStatus?.enrolledAt || null,
      },
      permissions: {
        isInstructor: req.user && course.instructorId === req.user.id,
        isAdmin: req.user && req.user.role === "admin",
        canEdit: req.user && (course.instructorId === req.user.id || req.user.role === "admin"),
      },
    });
  } catch (err) {
    console.error("❌ [GET COURSE] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch course", err);
  }
};

/**
 * UPDATE COURSE
 * PUT /api/courses/:id
 */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📥 [UPDATE COURSE] Request received for ID:", id);

    // ===== VALIDATE ID =====

    if (!isValidUUID(id)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(id);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK AUTHORIZATION =====

    if (course.instructorId !== req.user.id && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, "Not authorized to update this course");
    }

    // ===== EXTRACT UPDATE DATA =====

    const {
      title,
      description,
      category,
      level,
      price,
      language,
      duration,
      requirements,
      whatYouWillLearn,
      targetAudience,
      tags,
      status,
      thumbnailBase64,
      isFeatured,
    } = req.body;

    const updateData = {};

    // ===== VALIDATE AND PREPARE UPDATES =====

    // Title
    if (title !== undefined) {
      if (title.length < 3 || title.length > 200) {
        return sendErrorResponse(res, 400, "Title must be between 3 and 200 characters");
      }
      updateData.title = sanitizeInput(title);
    }

    // Description
    if (description !== undefined) {
      if (description.length < 10 || description.length > 5000) {
        return sendErrorResponse(res, 400, "Description must be between 10 and 5000 characters");
      }
      updateData.description = sanitizeInput(description);
    }

    // Category
    if (category !== undefined) {
      const normalizedCategory = VALID_CATEGORIES[category.toLowerCase()];
      if (!normalizedCategory) {
        return sendErrorResponse(res, 400, "Invalid category");
      }
      updateData.category = normalizedCategory;
    }

    // Level
    if (level !== undefined) {
      const normalizedLevel = level.toLowerCase();
      if (!VALID_LEVELS.includes(normalizedLevel)) {
        return sendErrorResponse(res, 400, "Invalid level");
      }
      updateData.level = normalizedLevel;
    }

    // Price
    if (price !== undefined) {
      const priceValidation = validatePrice(price);
      if (!priceValidation.valid) {
        return sendErrorResponse(res, 400, priceValidation.error);
      }
      updateData.price = priceValidation.value;
    }

    // Simple text fields
    if (language !== undefined) updateData.language = sanitizeInput(language);
    if (duration !== undefined) updateData.duration = sanitizeInput(duration);

    // Array fields
    if (requirements !== undefined) updateData.requirements = parseArray(requirements);
    if (whatYouWillLearn !== undefined) updateData.whatYouWillLearn = parseArray(whatYouWillLearn);
    if (targetAudience !== undefined) updateData.targetAudience = parseArray(targetAudience);
    if (tags !== undefined) updateData.tags = parseArray(tags);

    // Status
    if (status !== undefined) {
      const normalizedStatus = status.toLowerCase();
      if (!VALID_STATUSES.includes(normalizedStatus)) {
        return sendErrorResponse(res, 400, "Invalid status");
      }
      updateData.status = normalizedStatus;
      updateData.isPublished = normalizedStatus === "published";
    }

    // Featured (admin only)
    if (isFeatured !== undefined && req.user.role === "admin") {
      updateData.isFeatured = Boolean(isFeatured);
    }

    // ===== HANDLE THUMBNAIL UPDATE =====

    if (thumbnailBase64 || req.file) {
      try {
        // Delete old thumbnail if exists
        if (course.thumbnail) {
          console.log("🗑️ Deleting old thumbnail...");
          await deleteFromBlob(course.thumbnail);
        }

        // Upload new thumbnail
        let thumbnailUrl = "";
        if (thumbnailBase64) {
          console.log("📤 Uploading new thumbnail from Base64...");
          thumbnailUrl = await uploadCourseThumbnail(thumbnailBase64, req.user.id);
        } else if (req.file) {
          console.log("📤 Uploading new thumbnail from file...");
          thumbnailUrl = await uploadCourseThumbnail(req.file, req.user.id);
        }

        updateData.thumbnail = thumbnailUrl;
        console.log("✅ Thumbnail updated:", thumbnailUrl);
      } catch (uploadError) {
        console.error("❌ Thumbnail update failed:", uploadError);
        return sendErrorResponse(res, 400, `Thumbnail upload failed: ${uploadError.message}`);
      }
    }

    // ===== UPDATE COURSE =====

    if (Object.keys(updateData).length === 0) {
      return sendErrorResponse(res, 400, "No valid fields to update");
    }

    updateData.updatedAt = new Date();

    const updatedCourse = await Course.update(id, updateData);

    console.log("✅ Course updated successfully");

    return sendSuccessResponse(res, 200, "Course updated successfully", {
      course: Course.sanitize ? Course.sanitize(updatedCourse) : updatedCourse,
    });
  } catch (err) {
    console.error("❌ [UPDATE COURSE] Error:", err);

    if (err.code === "23505" || err.code === "ER_DUP_ENTRY") {
      return sendErrorResponse(res, 400, "A course with this title already exists");
    }

    return sendErrorResponse(res, 500, "Failed to update course", err);
  }
};

/**
 * DELETE COURSE
 * DELETE /api/courses/:id
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📥 [DELETE COURSE] Request received for ID:", id);

    // ===== VALIDATE ID =====

    if (!isValidUUID(id)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(id);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK AUTHORIZATION =====

    if (course.instructorId !== req.user.id && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, "Not authorized to delete this course");
    }

    // ===== CHECK FOR ACTIVE ENROLLMENTS =====

    try {
      const activeEnrollments = await Enrollment.findActiveByCourse(id);
      if (activeEnrollments && activeEnrollments.length > 0) {
        return sendErrorResponse(
          res,
          400,
          `Cannot delete course with ${activeEnrollments.length} active enrollment(s). Please contact support.`
        );
      }
    } catch (enrollmentError) {
      console.error("Error checking enrollments:", enrollmentError);
    }

    // ===== DELETE ALL ASSETS =====

    const assetsToDelete = [];

    // Add course thumbnail
    if (course.thumbnail) {
      assetsToDelete.push(course.thumbnail);
    }

    // Get all lessons and their assets
    try {
      const lessons = await Lesson.findByCourseId(id);
      
      lessons.forEach((lesson) => {
        if (lesson.thumbnail) {
          assetsToDelete.push(lesson.thumbnail);
        }
        if (lesson.attachments && Array.isArray(lesson.attachments)) {
          assetsToDelete.push(...lesson.attachments);
        }
      });

      console.log(`📦 Found ${lessons.length} lessons with assets`);
    } catch (lessonError) {
      console.error("Error fetching lessons:", lessonError);
    }

    // Delete all assets
    if (assetsToDelete.length > 0) {
      console.log(`🗑️ Deleting ${assetsToDelete.length} assets...`);
      try {
        const deleteResult = await deleteMultipleFromBlob(assetsToDelete);
        console.log(`✅ Deleted ${deleteResult.successful || 0} assets`);
      } catch (deleteError) {
        console.error("Warning: Some assets could not be deleted:", deleteError);
      }
    }

    // ===== DELETE LESSONS =====

    try {
      await Lesson.deleteByCourseId(id);
      console.log("✅ All lessons deleted");
    } catch (lessonError) {
      console.error("Error deleting lessons:", lessonError);
    }

    // ===== DELETE COURSE =====

    await Course.delete(id);

    console.log("✅ Course deleted successfully");

    return sendSuccessResponse(res, 200, "Course and all associated data deleted successfully", {
      deletedCourseId: id,
      assetsDeleted: assetsToDelete.length,
    });
  } catch (err) {
    console.error("❌ [DELETE COURSE] Error:", err);
    return sendErrorResponse(res, 500, "Failed to delete course", err);
  }
};

/**
 * GET INSTRUCTOR COURSES
 * GET /api/courses/instructor/my-courses
 */
export const getInstructorCourses = async (req, res) => {
  try {
    console.log("📥 [GET INSTRUCTOR COURSES] Request received");

    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const { status } = req.query;

    const filters = {
      instructorId: req.user.id,
      limit,
      offset: (page - 1) * limit,
    };

    if (status && VALID_STATUSES.includes(status)) {
      filters.status = status;
    }

    // ===== FETCH COURSES =====

    const courses = await Course.findByInstructor(req.user.id, filters);
    const total = await Course.countByInstructor(req.user.id, filters);

    // ===== GET STATS FOR EACH COURSE =====

    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        try {
          const lessons = await Lesson.findByCourseId(course.id);
          const enrollments = await Enrollment.findByCourse(course.id);

          return {
            ...course,
            stats: {
              totalLessons: lessons.length,
              publishedLessons: lessons.filter((l) => l.isPublished).length,
              totalEnrollments: enrollments.length,
              activeEnrollments: enrollments.filter((e) => e.status === "active").length,
              completedEnrollments: enrollments.filter((e) => e.status === "completed").length,
              revenue: course.price * enrollments.length,
            },
          };
        } catch (error) {
          console.error(`Error fetching stats for course ${course.id}:`, error);
          return {
            ...course,
            stats: {
              totalLessons: 0,
              publishedLessons: 0,
              totalEnrollments: 0,
              activeEnrollments: 0,
              completedEnrollments: 0,
              revenue: 0,
            },
          };
        }
      })
    );

    const totalPages = Math.ceil(total / limit);

    console.log(`✅ Fetched ${courses.length} instructor courses`);

    return sendSuccessResponse(res, 200, "Instructor courses fetched successfully", {
      courses: coursesWithStats.map((course) => (Course.sanitize ? Course.sanitize(course) : course)),
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("❌ [GET INSTRUCTOR COURSES] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch instructor courses", err);
  }
};

/**
 * PUBLISH COURSE
 * POST /api/courses/:id/publish
 */
export const publishCourse = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📥 [PUBLISH COURSE] Request received for ID:", id);

    // ===== VALIDATE ID =====

    if (!isValidUUID(id)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(id);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK AUTHORIZATION =====

    if (course.instructorId !== req.user.id && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, "Not authorized to publish this course");
    }

    // ===== CHECK IF ALREADY PUBLISHED =====

    if (course.status === "published") {
      return sendErrorResponse(res, 400, "Course is already published");
    }

    // ===== VALIDATE COURSE IS READY =====

    // Must have at least one lesson
    const lessons = await Lesson.findByCourseId(id);
    if (lessons.length === 0) {
      return sendErrorResponse(res, 400, "Course must have at least one lesson before publishing");
    }

    // Must have thumbnail
    if (!course.thumbnail) {
      return sendErrorResponse(res, 400, "Course must have a thumbnail before publishing");
    }

    // ===== PUBLISH COURSE =====

    const updateData = {
      status: "published",
      isPublished: true,
      publishedAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedCourse = await Course.update(id, updateData);

    console.log("✅ Course published successfully");

    return sendSuccessResponse(res, 200, "Course published successfully", {
      course: Course.sanitize ? Course.sanitize(updatedCourse) : updatedCourse,
    });
  } catch (err) {
    console.error("❌ [PUBLISH COURSE] Error:", err);
    return sendErrorResponse(res, 500, "Failed to publish course", err);
  }
};

/**
 * UNPUBLISH COURSE
 * POST /api/courses/:id/unpublish
 */
export const unpublishCourse = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📥 [UNPUBLISH COURSE] Request received for ID:", id);

    // ===== VALIDATE ID =====

    if (!isValidUUID(id)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(id);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK AUTHORIZATION =====

    if (course.instructorId !== req.user.id && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, "Not authorized to unpublish this course");
    }

    // ===== CHECK IF NOT PUBLISHED =====

    if (course.status !== "published") {
      return sendErrorResponse(res, 400, "Course is not published");
    }

    // ===== UNPUBLISH COURSE =====

    const updateData = {
      status: "draft",
      isPublished: false,
      updatedAt: new Date(),
    };

    const updatedCourse = await Course.update(id, updateData);

    console.log("✅ Course unpublished successfully");

    return sendSuccessResponse(res, 200, "Course unpublished successfully", {
      course: Course.sanitize ? Course.sanitize(updatedCourse) : updatedCourse,
    });
  } catch (err) {
    console.error("❌ [UNPUBLISH COURSE] Error:", err);
    return sendErrorResponse(res, 500, "Failed to unpublish course", err);
  }
};

// ==================== LESSON MANAGEMENT ====================

/**
 * ADD LESSON
 * POST /api/courses/:courseId/lessons
 */
export const addLesson = async (req, res) => {
  try {
    const { courseId } = req.params;

    console.log("📥 [ADD LESSON] Request received for course:", courseId);

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK AUTHORIZATION =====

    if (course.instructorId !== req.user.id && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, "Not authorized to add lessons to this course");
    }

    // ===== EXTRACT LESSON DATA =====

    const {
      title,
      description,
      content,
      videoUrl,
      duration,
      order,
      isFree = false,
      isPublished = true,
      lessonType = "video",
      thumbnailBase64,
      attachments, // Array of Base64 strings
    } = req.body;

    // ===== VALIDATE REQUIRED FIELDS =====

    if (!title?.trim()) {
      return sendErrorResponse(res, 400, "Lesson title is required");
    }

    if (title.length < 3 || title.length > 200) {
      return sendErrorResponse(res, 400, "Lesson title must be between 3 and 200 characters");
    }

    // ===== VALIDATE LESSON TYPE =====

    const normalizedType = lessonType.toLowerCase();
    if (!VALID_LESSON_TYPES.includes(normalizedType)) {
      return sendErrorResponse(res, 400, `Invalid lesson type. Valid types: ${VALID_LESSON_TYPES.join(", ")}`);
    }

    // ===== VALIDATE VIDEO URL =====

    if (videoUrl && !isValidURL(videoUrl)) {
      return sendErrorResponse(res, 400, "Invalid video URL format");
    }

    // ===== HANDLE THUMBNAIL UPLOAD =====

    let thumbnailUrl = "";

    if (thumbnailBase64) {
      try {
        console.log("📤 Uploading lesson thumbnail from Base64...");
        thumbnailUrl = await uploadLessonThumbnail(thumbnailBase64, courseId, null);
        console.log("✅ Lesson thumbnail uploaded:", thumbnailUrl);
      } catch (uploadError) {
        console.error("❌ Lesson thumbnail upload failed:", uploadError);
        return sendErrorResponse(res, 400, `Thumbnail upload failed: ${uploadError.message}`);
      }
    } else if (req.files && req.files.thumbnail) {
      try {
        console.log("📤 Uploading lesson thumbnail from file...");
        thumbnailUrl = await uploadLessonThumbnail(req.files.thumbnail[0], courseId, null);
        console.log("✅ Lesson thumbnail uploaded:", thumbnailUrl);
      } catch (uploadError) {
        console.error("❌ Lesson thumbnail upload failed:", uploadError);
        return sendErrorResponse(res, 400, `Thumbnail upload failed: ${uploadError.message}`);
      }
    }

    // ===== HANDLE ATTACHMENTS UPLOAD =====

    let attachmentUrls = [];

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      try {
        console.log(`📤 Uploading ${attachments.length} attachments from Base64...`);

        for (const [index, attachmentBase64] of attachments.entries()) {
          const attachmentUrl = await uploadLessonAttachment(attachmentBase64, courseId, null, index);
          attachmentUrls.push(attachmentUrl);
        }

        console.log("✅ Attachments uploaded successfully:", attachmentUrls);
      } catch (uploadError) {
        console.error("❌ Attachments upload failed:", uploadError);

        // Clean up uploaded thumbnail
        if (thumbnailUrl) {
          await deleteFromBlob(thumbnailUrl);
        }

        return sendErrorResponse(res, 400, `Attachments upload failed: ${uploadError.message}`);
      }
    } else if (req.files && req.files.attachments) {
      try {
        console.log(`📤 Uploading ${req.files.attachments.length} attachment files...`);

        for (const [index, file] of req.files.attachments.entries()) {
          const attachmentUrl = await uploadLessonAttachment(file, courseId, null, index);
          attachmentUrls.push(attachmentUrl);
        }

        console.log("✅ Attachment files uploaded successfully:", attachmentUrls);
      } catch (uploadError) {
        console.error("❌ Attachment files upload failed:", uploadError);

        // Clean up
        if (thumbnailUrl) {
          await deleteFromBlob(thumbnailUrl);
        }

        return sendErrorResponse(res, 400, `Attachments upload failed: ${uploadError.message}`);
      }
    }

    // ===== PREPARE LESSON DATA =====

    const lessonData = {
      courseId,
      title: sanitizeInput(title),
      description: sanitizeInput(description || ""),
      content: sanitizeInput(content || ""),
      videoUrl: videoUrl ? sanitizeInput(videoUrl) : "",
      duration: sanitizeInput(duration || ""),
      order: Math.max(0, parseInt(order) || 0),
      isFree: Boolean(isFree),
      isPublished: Boolean(isPublished),
      lessonType: normalizedType,
      thumbnail: thumbnailUrl,
      attachments: attachmentUrls,
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // ===== CREATE LESSON =====

    const lesson = await Lesson.create(lessonData);

    console.log("✅ Lesson created successfully:", lesson.id);

    return sendSuccessResponse(res, 201, "Lesson added successfully", {
      lesson: Lesson.sanitize ? Lesson.sanitize(lesson) : lesson,
    });
  } catch (err) {
    console.error("❌ [ADD LESSON] Error:", err);
    return sendErrorResponse(res, 500, "Failed to add lesson", err);
  }
};

/**
 * UPDATE LESSON
 * PUT /api/courses/:courseId/lessons/:lessonId
 */
export const updateLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    console.log("📥 [UPDATE LESSON] Request received");

    // ===== VALIDATE IDS =====

    if (!isValidUUID(courseId) || !isValidUUID(lessonId)) {
      return sendErrorResponse(res, 400, "Invalid course or lesson ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK AUTHORIZATION =====

    if (course.instructorId !== req.user.id && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, "Not authorized to update lessons in this course");
    }

    // ===== FETCH LESSON =====

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return sendErrorResponse(res, 404, "Lesson not found");
    }

    if (lesson.courseId !== courseId) {
      return sendErrorResponse(res, 400, "Lesson does not belong to this course");
    }

    // ===== EXTRACT UPDATE DATA =====

    const {
      title,
      description,
      content,
      videoUrl,
      duration,
      order,
      isFree,
      isPublished,
      lessonType,
      thumbnailBase64,
      attachments,
    } = req.body;

    const updateData = {};

    // ===== VALIDATE AND PREPARE UPDATES =====

    if (title !== undefined) {
      if (title.length < 3 || title.length > 200) {
        return sendErrorResponse(res, 400, "Lesson title must be between 3 and 200 characters");
      }
      updateData.title = sanitizeInput(title);
    }

    if (description !== undefined) updateData.description = sanitizeInput(description);
    if (content !== undefined) updateData.content = sanitizeInput(content);
    if (duration !== undefined) updateData.duration = sanitizeInput(duration);
    if (order !== undefined) updateData.order = Math.max(0, parseInt(order) || 0);
    if (isFree !== undefined) updateData.isFree = Boolean(isFree);
    if (isPublished !== undefined) updateData.isPublished = Boolean(isPublished);

    if (lessonType !== undefined) {
      const normalizedType = lessonType.toLowerCase();
      if (!VALID_LESSON_TYPES.includes(normalizedType)) {
        return sendErrorResponse(res, 400, "Invalid lesson type");
      }
      updateData.lessonType = normalizedType;
    }

    if (videoUrl !== undefined) {
      if (videoUrl && !isValidURL(videoUrl)) {
        return sendErrorResponse(res, 400, "Invalid video URL format");
      }
      updateData.videoUrl = sanitizeInput(videoUrl);
    }

    // ===== HANDLE THUMBNAIL UPDATE =====

    if (thumbnailBase64 || (req.files && req.files.thumbnail)) {
      try {
        // Delete old thumbnail
        if (lesson.thumbnail) {
          console.log("🗑️ Deleting old lesson thumbnail...");
          await deleteFromBlob(lesson.thumbnail);
        }

        let thumbnailUrl = "";

        if (thumbnailBase64) {
          console.log("📤 Uploading new lesson thumbnail from Base64...");
          thumbnailUrl = await uploadLessonThumbnail(thumbnailBase64, courseId, lessonId);
        } else if (req.files && req.files.thumbnail) {
          console.log("📤 Uploading new lesson thumbnail from file...");
          thumbnailUrl = await uploadLessonThumbnail(req.files.thumbnail[0], courseId, lessonId);
        }

        updateData.thumbnail = thumbnailUrl;
        console.log("✅ Lesson thumbnail updated:", thumbnailUrl);
      } catch (uploadError) {
        console.error("❌ Lesson thumbnail update failed:", uploadError);
        return sendErrorResponse(res, 400, `Thumbnail upload failed: ${uploadError.message}`);
      }
    }

    // ===== HANDLE ATTACHMENTS UPDATE =====

    if (attachments !== undefined || (req.files && req.files.attachments)) {
      try {
        // Delete old attachments
        if (lesson.attachments && lesson.attachments.length > 0) {
          console.log(`🗑️ Deleting ${lesson.attachments.length} old attachments...`);
          await deleteMultipleFromBlob(lesson.attachments);
        }

        let attachmentUrls = [];

        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
          console.log(`📤 Uploading ${attachments.length} new attachments from Base64...`);

          for (const [index, attachmentBase64] of attachments.entries()) {
            const attachmentUrl = await uploadLessonAttachment(attachmentBase64, courseId, lessonId, index);
            attachmentUrls.push(attachmentUrl);
          }
        } else if (req.files && req.files.attachments) {
          console.log(`📤 Uploading ${req.files.attachments.length} new attachment files...`);

          for (const [index, file] of req.files.attachments.entries()) {
            const attachmentUrl = await uploadLessonAttachment(file, courseId, lessonId, index);
            attachmentUrls.push(attachmentUrl);
          }
        }

        updateData.attachments = attachmentUrls;
        console.log("✅ Attachments updated successfully");
      } catch (uploadError) {
        console.error("❌ Attachments update failed:", uploadError);
        return sendErrorResponse(res, 400, `Attachments upload failed: ${uploadError.message}`);
      }
    }

    // ===== UPDATE LESSON =====

    if (Object.keys(updateData).length === 0) {
      return sendErrorResponse(res, 400, "No valid fields to update");
    }

    updateData.updatedAt = new Date();

    const updatedLesson = await Lesson.update(lessonId, updateData);

    console.log("✅ Lesson updated successfully");

    return sendSuccessResponse(res, 200, "Lesson updated successfully", {
      lesson: Lesson.sanitize ? Lesson.sanitize(updatedLesson) : updatedLesson,
    });
  } catch (err) {
    console.error("❌ [UPDATE LESSON] Error:", err);
    return sendErrorResponse(res, 500, "Failed to update lesson", err);
  }
};

/**
 * DELETE LESSON
 * DELETE /api/courses/:courseId/lessons/:lessonId
 */
export const deleteLesson = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;

    console.log("📥 [DELETE LESSON] Request received");

    // ===== VALIDATE IDS =====

    if (!isValidUUID(courseId) || !isValidUUID(lessonId)) {
      return sendErrorResponse(res, 400, "Invalid course or lesson ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK AUTHORIZATION =====

    if (course.instructorId !== req.user.id && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, "Not authorized to delete lessons from this course");
    }

    // ===== FETCH LESSON =====

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return sendErrorResponse(res, 404, "Lesson not found");
    }

    if (lesson.courseId !== courseId) {
      return sendErrorResponse(res, 400, "Lesson does not belong to this course");
    }

    // ===== DELETE LESSON ASSETS =====

    const assetsToDelete = [];

    if (lesson.thumbnail) {
      assetsToDelete.push(lesson.thumbnail);
    }

    if (lesson.attachments && lesson.attachments.length > 0) {
      assetsToDelete.push(...lesson.attachments);
    }

    if (assetsToDelete.length > 0) {
      console.log(`🗑️ Deleting ${assetsToDelete.length} lesson assets...`);
      try {
        const deleteResult = await deleteMultipleFromBlob(assetsToDelete);
        console.log(`✅ Deleted ${deleteResult.successful || 0} assets`);
      } catch (deleteError) {
        console.error("Warning: Some assets could not be deleted:", deleteError);
      }
    }

    // ===== DELETE LESSON =====

    await Lesson.delete(lessonId);

    console.log("✅ Lesson deleted successfully");

    return sendSuccessResponse(res, 200, "Lesson and all assets deleted successfully", {
      deletedLessonId: lessonId,
      assetsDeleted: assetsToDelete.length,
    });
  } catch (err) {
    console.error("❌ [DELETE LESSON] Error:", err);
    return sendErrorResponse(res, 500, "Failed to delete lesson", err);
  }
};

/**
 * GET LESSONS
 * GET /api/courses/:courseId/lessons
 */
export const getLessons = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { publishedOnly = "true" } = req.query;

    console.log("📥 [GET LESSONS] Request received for course:", courseId);

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK ACCESS RIGHTS =====

    let canAccessAll = false;

    if (req.user) {
      // Instructor and admin can access all lessons
      if (course.instructorId === req.user.id || req.user.role === "admin") {
        canAccessAll = true;
      } else {
        // Check if user is enrolled
        try {
          const enrollment = await Enrollment.findByCourseAndUser(courseId, req.user.id);
          canAccessAll = !!enrollment && enrollment.status === "active";
        } catch (enrollmentError) {
          console.error("Error checking enrollment:", enrollmentError);
        }
      }
    }

    // ===== FETCH LESSONS =====

    let lessons;

    if (canAccessAll) {
      lessons = await Lesson.findByCourseId(courseId);
    } else {
      // Only published and free lessons for non-enrolled users
      lessons = await Lesson.findPublishedByCourseId(courseId);
    }

    // ===== SORT LESSONS BY ORDER =====

    const sortedLessons = lessons.sort((a, b) => (a.order || 0) - (b.order || 0));

    console.log(`✅ Fetched ${sortedLessons.length} lessons`);

    return sendSuccessResponse(res, 200, "Lessons fetched successfully", {
      lessons: sortedLessons.map((lesson) => (Lesson.sanitize ? Lesson.sanitize(lesson) : lesson)),
      access: {
        canAccessAll,
        isInstructor: req.user && course.instructorId === req.user.id,
        isEnrolled: canAccessAll && req.user && course.instructorId !== req.user.id,
      },
      totalLessons: sortedLessons.length,
    });
  } catch (err) {
    console.error("❌ [GET LESSONS] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch lessons", err);
  }
};

// ==================== ENROLLMENT OPERATIONS ====================

/**
 * ENROLL IN COURSE
 * POST /api/courses/:courseId/enroll
 */
export const enrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { paymentMethodId, promoCode } = req.body;

    console.log("📥 [ENROLL COURSE] Request received for course:", courseId);

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== VALIDATE COURSE STATUS =====

    if (course.status !== "published") {
      return sendErrorResponse(res, 400, "Cannot enroll in unpublished course");
    }

    // ===== CHECK IF USER IS INSTRUCTOR =====

    if (course.instructorId === req.user.id) {
      return sendErrorResponse(res, 400, "Instructors cannot enroll in their own courses");
    }

    // ===== CHECK EXISTING ENROLLMENT =====

    const existingEnrollment = await Enrollment.findByCourseAndUser(courseId, req.user.id);

    if (existingEnrollment) {
      if (existingEnrollment.status === "active") {
        return sendErrorResponse(res, 400, "You are already enrolled in this course");
      }

      if (existingEnrollment.status === "cancelled") {
        // Reactivate enrollment
        const reactivatedEnrollment = await Enrollment.update(existingEnrollment.id, {
          status: "active",
          enrolledAt: new Date(),
          updatedAt: new Date(),
        });

        console.log("✅ Enrollment reactivated");

        return sendSuccessResponse(res, 200, "Enrollment reactivated successfully", {
          enrollment: reactivatedEnrollment,
        });
      }
    }

    // ===== HANDLE PAYMENT FOR PAID COURSES =====

    let finalPrice = course.price;

    if (course.price > 0) {
      if (!paymentMethodId) {
        return sendErrorResponse(res, 400, "Payment method required for paid courses");
      }

      // TODO: Apply promo code if provided
      // TODO: Process payment using payment gateway
      // For now, we simulate successful payment

      console.log(`💳 Processing payment of $${finalPrice}`);
    }

    // ===== CREATE ENROLLMENT =====

    const enrollmentData = {
      courseId,
      userId: req.user.id,
      status: "active",
      enrolledAt: new Date(),
      pricePaid: finalPrice,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const enrollment = await Enrollment.create(enrollmentData);

    // ===== UPDATE COURSE ENROLLMENT COUNT =====

    await Course.incrementEnrollmentCount(courseId);

    console.log("✅ Enrollment created successfully");

    return sendSuccessResponse(res, 200, "Enrolled successfully", {
      enrollment,
      course: {
        id: course.id,
        title: course.title,
        instructorName: course.instructorName,
        thumbnail: course.thumbnail,
      },
    });
  } catch (err) {
    console.error("❌ [ENROLL COURSE] Error:", err);
    return sendErrorResponse(res, 500, "Failed to enroll in course", err);
  }
};

/**
 * UNENROLL FROM COURSE
 * POST /api/courses/:courseId/unenroll
 */
export const unenrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    console.log("📥 [UNENROLL COURSE] Request received for course:", courseId);

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== CHECK ENROLLMENT =====

    const enrollment = await Enrollment.findByCourseAndUser(courseId, req.user.id);

    if (!enrollment) {
      return sendErrorResponse(res, 404, "Enrollment not found");
    }

    if (enrollment.status !== "active") {
      return sendErrorResponse(res, 400, "Enrollment is not active");
    }

    // ===== CANCEL ENROLLMENT =====

    await Enrollment.cancel(enrollment.id);

    // ===== UPDATE COURSE ENROLLMENT COUNT =====

    await Course.decrementEnrollmentCount(courseId);

    console.log("✅ Enrollment cancelled successfully");

    return sendSuccessResponse(res, 200, "Unenrolled successfully");
  } catch (err) {
    console.error("❌ [UNENROLL COURSE] Error:", err);
    return sendErrorResponse(res, 500, "Failed to unenroll from course", err);
  }
};

/**
 * GET ENROLLED COURSES
 * GET /api/courses/enrolled
 */
export const getEnrolledCourses = async (req, res) => {
  try {
    console.log("📥 [GET ENROLLED COURSES] Request received");

    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const { status = "active" } = req.query;

    // ===== FETCH ENROLLMENTS =====

    const enrollments = await Enrollment.findByUser(req.user.id, status);
    const total = enrollments.length;

    // ===== GET COURSE DETAILS FOR EACH ENROLLMENT =====

    const enrolledCourses = await Promise.all(
      enrollments.map(async (enrollment) => {
        try {
          const course = await Course.findById(enrollment.courseId);
          const progress = await Enrollment.getProgress(enrollment.id);

          return {
            enrollment,
            course: Course.sanitize ? Course.sanitize(course) : course,
            progress,
          };
        } catch (error) {
          console.error(`Error fetching course ${enrollment.courseId}:`, error);
          return null;
        }
      })
    );

    // Filter out null results
    const validCourses = enrolledCourses.filter((item) => item !== null);

    // ===== PAGINATE =====

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCourses = validCourses.slice(startIndex, endIndex);

    console.log(`✅ Fetched ${paginatedCourses.length} enrolled courses`);

    return sendSuccessResponse(res, 200, "Enrolled courses fetched successfully", {
      courses: paginatedCourses,
      pagination: {
        page,
        limit,
        total: validCourses.length,
        pages: Math.ceil(validCourses.length / limit),
        hasNext: page < Math.ceil(validCourses.length / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("❌ [GET ENROLLED COURSES] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch enrolled courses", err);
  }
};

/**
 * CHECK ENROLLMENT
 * GET /api/courses/:courseId/enrollment
 */
export const checkEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;

    console.log("📥 [CHECK ENROLLMENT] Request received for course:", courseId);

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK ENROLLMENT =====

    const enrollment = await Enrollment.findByCourseAndUser(courseId, req.user.id);
    const isInstructor = course.instructorId === req.user.id;

    console.log("✅ Enrollment status checked");

    return sendSuccessResponse(res, 200, "Enrollment status fetched successfully", {
      isEnrolled: !!enrollment && enrollment.status === "active",
      isInstructor,
      enrollment,
      course: {
        id: course.id,
        title: course.title,
        price: course.price,
        isFree: course.price === 0,
        status: course.status,
      },
    });
  } catch (err) {
    console.error("❌ [CHECK ENROLLMENT] Error:", err);
    return sendErrorResponse(res, 500, "Failed to check enrollment", err);
  }
};

/**
 * UPDATE LESSON PROGRESS
 * POST /api/courses/:courseId/lessons/:lessonId/progress
 */
export const updateLessonProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const { completed = true, watchTime = 0 } = req.body;

    console.log("📥 [UPDATE LESSON PROGRESS] Request received");

    // ===== VALIDATE IDS =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== CHECK ENROLLMENT =====

    const enrollment = await Enrollment.findByCourseAndUser(courseId, req.user.id);

    if (!enrollment || enrollment.status !== "active") {
      return sendErrorResponse(res, 403, "You must be actively enrolled in the course to update progress");
    }

    // ===== VALIDATE LESSON BELONGS TO COURSE =====

    const lessonExists = await Lesson.existsInCourse(lessonId, courseId);
    if (!lessonExists) {
      return sendErrorResponse(res, 404, "Lesson not found in this course");
    }

    // ===== UPDATE PROGRESS =====

    await Enrollment.updateProgress(enrollment.id, lessonId, completed, watchTime);

    const updatedProgress = await Enrollment.getProgress(enrollment.id);

    console.log("✅ Lesson progress updated");

    return sendSuccessResponse(res, 200, "Progress updated successfully", {
      progress: updatedProgress,
    });
  } catch (err) {
    console.error("❌ [UPDATE LESSON PROGRESS] Error:", err);
    return sendErrorResponse(res, 500, "Failed to update progress", err);
  }
};

/**
 * GET COURSE PROGRESS
 * GET /api/courses/:courseId/progress
 */
export const getCourseProgress = async (req, res) => {
  try {
    const { courseId } = req.params;

    console.log("📥 [GET COURSE PROGRESS] Request received for course:", courseId);

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== CHECK ENROLLMENT =====

    const enrollment = await Enrollment.findByCourseAndUser(courseId, req.user.id);

    if (!enrollment) {
      return sendErrorResponse(res, 403, "You must be enrolled in the course to view progress");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== GET PROGRESS =====

    const progress = await Enrollment.getProgress(enrollment.id);

    console.log("✅ Course progress fetched");

    return sendSuccessResponse(res, 200, "Course progress fetched successfully", {
      progress,
      course: {
        id: course.id,
        title: course.title,
        thumbnail: course.thumbnail,
      },
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
      },
    });
  } catch (err) {
    console.error("❌ [GET COURSE PROGRESS] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch progress", err);
  }
};

// ==================== REVIEWS OPERATIONS ====================

/**
 * ADD REVIEW
 * POST /api/courses/:courseId/reviews
 */
export const addReview = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, comment } = req.body;

    console.log("📥 [ADD REVIEW] Request received for course:", courseId);

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== VALIDATE RATING =====

    const ratingValidation = validateRating(rating);
    if (!ratingValidation.valid) {
      return sendErrorResponse(res, 400, ratingValidation.error);
    }

    // ===== VALIDATE COMMENT =====

    const sanitizedComment = sanitizeInput(comment || "");
    if (sanitizedComment.length > 1000) {
      return sendErrorResponse(res, 400, "Review comment must be less than 1000 characters");
    }

    // ===== CHECK ENROLLMENT =====

    const enrollment = await Enrollment.findByCourseAndUser(courseId, req.user.id);
    if (!enrollment || enrollment.status !== "active") {
      return sendErrorResponse(res, 403, "You must be enrolled in the course to add a review");
    }

    // ===== CHECK IF ALREADY REVIEWED =====

    const existingReview = await Course.getUserReview(courseId, req.user.id);
    if (existingReview) {
      return sendErrorResponse(res, 400, "You have already reviewed this course. Please update your existing review instead.");
    }

    // ===== GET USER INFO =====

    const user = await User.findById(req.user.id);
    if (!user) {
      return sendErrorResponse(res, 404, "User not found");
    }

    // ===== CREATE REVIEW =====

    const reviewData = {
      userId: req.user.id,
      userName: sanitizeInput(user.name),
      userAvatar: user.avatar || "",
      rating: ratingValidation.value,
      comment: sanitizedComment,
      isActive: true,
      createdAt: new Date(),
    };

    const review = await Course.addReview(courseId, reviewData);

    console.log("✅ Review added successfully");

    return sendSuccessResponse(res, 201, "Review added successfully", {
      review,
      courseRating: await Course.getAverageRating(courseId),
      totalRatings: await Course.getTotalRatings(courseId),
    });
  } catch (err) {
    console.error("❌ [ADD REVIEW] Error:", err);
    return sendErrorResponse(res, 500, "Failed to add review", err);
  }
};

/**
 * UPDATE REVIEW
 * PUT /api/courses/:courseId/reviews/:reviewId
 */
export const updateReview = async (req, res) => {
  try {
    const { courseId, reviewId } = req.params;
    const { rating, comment } = req.body;

    console.log("📥 [UPDATE REVIEW] Request received");

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== VALIDATE RATING =====

    const ratingValidation = validateRating(rating);
    if (!ratingValidation.valid) {
      return sendErrorResponse(res, 400, ratingValidation.error);
    }

    // ===== CHECK IF REVIEW EXISTS AND BELONGS TO USER =====

    const existingReview = await Course.getReviewById(courseId, reviewId);
    if (!existingReview) {
      return sendErrorResponse(res, 404, "Review not found");
    }

    if (existingReview.userId !== req.user.id) {
      return sendErrorResponse(res, 403, "Not authorized to update this review");
    }

    // ===== UPDATE REVIEW =====

    const updatedReview = await Course.updateReview(courseId, reviewId, {
      rating: ratingValidation.value,
      comment: sanitizeInput(comment || existingReview.comment),
      updatedAt: new Date(),
    });

    console.log("✅ Review updated successfully");

    return sendSuccessResponse(res, 200, "Review updated successfully", {
      review: updatedReview,
      courseRating: await Course.getAverageRating(courseId),
      totalRatings: await Course.getTotalRatings(courseId),
    });
  } catch (err) {
    console.error("❌ [UPDATE REVIEW] Error:", err);
    return sendErrorResponse(res, 500, "Failed to update review", err);
  }
};

/**
 * DELETE REVIEW
 * DELETE /api/courses/:courseId/reviews/:reviewId
 */
export const deleteReview = async (req, res) => {
  try {
    const { courseId, reviewId } = req.params;

    console.log("📥 [DELETE REVIEW] Request received");

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== CHECK IF REVIEW EXISTS AND BELONGS TO USER =====

    const existingReview = await Course.getReviewById(courseId, reviewId);
    if (!existingReview) {
      return sendErrorResponse(res, 404, "Review not found");
    }

    if (existingReview.userId !== req.user.id && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, "Not authorized to delete this review");
    }

    // ===== DELETE REVIEW =====

    await Course.deleteReview(courseId, reviewId);

    console.log("✅ Review deleted successfully");

    return sendSuccessResponse(res, 200, "Review deleted successfully", {
      courseRating: await Course.getAverageRating(courseId),
      totalRatings: await Course.getTotalRatings(courseId),
    });
  } catch (err) {
    console.error("❌ [DELETE REVIEW] Error:", err);
    return sendErrorResponse(res, 500, "Failed to delete review", err);
  }
};

/**
 * GET COURSE REVIEWS
 * GET /api/courses/:courseId/reviews
 */
export const getCourseReviews = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const { sort = "newest" } = req.query;

    console.log("📥 [GET COURSE REVIEWS] Request received for course:", courseId);

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== FETCH REVIEWS =====

    const reviews = await Course.getReviews(courseId, { page, limit, sort });
    const total = await Course.getTotalReviews(courseId);

    const ratingDistribution = calculateRatingDistribution(reviews);

    console.log(`✅ Fetched ${reviews.length} reviews`);

    return sendSuccessResponse(res, 200, "Reviews fetched successfully", {
      reviews,
      stats: {
        totalReviews: total,
        averageRating: course.rating || 0,
        totalRatings: course.totalRatings || 0,
        ratingDistribution,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("❌ [GET COURSE REVIEWS] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch reviews", err);
  }
};

/**
 * GET USER REVIEW
 * GET /api/courses/:courseId/reviews/my-review
 */
export const getUserReview = async (req, res) => {
  try {
    const { courseId } = req.params;

    console.log("📥 [GET USER REVIEW] Request received for course:", courseId);

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== GET USER REVIEW =====

    const userReview = await Course.getUserReview(courseId, req.user.id);

    console.log("✅ User review fetched");

    return sendSuccessResponse(res, 200, "User review fetched successfully", {
      review: userReview || null,
      hasReviewed: !!userReview,
    });
  } catch (err) {
    console.error("❌ [GET USER REVIEW] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch user review", err);
  }
};

// ==================== STATISTICS OPERATIONS ====================

/**
 * GET COURSE STATS
 * GET /api/courses/:id/stats
 */
export const getCourseStats = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📥 [GET COURSE STATS] Request received for course:", id);

    // ===== VALIDATE ID =====

    if (!isValidUUID(id)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(id);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK AUTHORIZATION =====

    if (course.instructorId !== req.user.id && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, "Not authorized to view course statistics");
    }

    // ===== FETCH DATA =====

    const enrollments = await Enrollment.findByCourse(id);
    const lessons = await Lesson.findByCourseId(id);
    const reviews = await Course.getReviews(id);

    // ===== CALCULATE STATS =====

    const enrollmentStats = {
      total: enrollments.length,
      active: enrollments.filter((e) => e.status === "active").length,
      completed: enrollments.filter((e) => e.status === "completed").length,
      cancelled: enrollments.filter((e) => e.status === "cancelled").length,
    };

    const revenueStats = {
      total: course.price * enrollments.length,
      projected: course.price * enrollmentStats.active,
      completed: course.price * enrollmentStats.completed,
    };

    const stats = {
      course: {
        id: course.id,
        title: course.title,
        status: course.status,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        publishedAt: course.publishedAt,
      },
      enrollments: enrollmentStats,
      revenue: revenueStats,
      content: {
        totalLessons: lessons.length,
        publishedLessons: lessons.filter((l) => l.isPublished).length,
        totalDuration: course.duration || "N/A",
      },
      ratings: {
        average: course.rating || 0,
        total: course.totalRatings || 0,
        distribution: calculateRatingDistribution(reviews),
      },
    };

    console.log("✅ Course stats fetched successfully");

    return sendSuccessResponse(res, 200, "Course statistics fetched successfully", { stats });
  } catch (err) {
    console.error("❌ [GET COURSE STATS] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch statistics", err);
  }
};

/**
 * GET INSTRUCTOR STATISTICS
 * GET /api/courses/instructor/stats
 */
export const getInstructorStats = async (req, res) => {
  try {
    console.log("📥 [GET INSTRUCTOR STATS] Request received");

    // ===== FETCH INSTRUCTOR COURSES =====

    const courses = await Course.findByInstructor(req.user.id);

    // ===== CALCULATE STATS FOR EACH COURSE =====

    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        try {
          const enrollments = await Enrollment.findByCourse(course.id);
          const lessons = await Lesson.findByCourseId(course.id);

          return {
            ...course,
            enrollments: enrollments.length,
            revenue: course.price * enrollments.length,
            totalLessons: lessons.length,
          };
        } catch (error) {
          console.error(`Error fetching stats for course ${course.id}:`, error);
          return {
            ...course,
            enrollments: 0,
            revenue: 0,
            totalLessons: 0,
          };
        }
      })
    );

    // ===== AGGREGATE STATS =====

    const stats = {
      totalCourses: coursesWithStats.length,
      publishedCourses: coursesWithStats.filter((c) => c.status === "published").length,
      draftCourses: coursesWithStats.filter((c) => c.status === "draft").length,
      archivedCourses: coursesWithStats.filter((c) => c.status === "archived").length,
      totalStudents: coursesWithStats.reduce((sum, c) => sum + c.enrollments, 0),
      totalRevenue: coursesWithStats.reduce((sum, c) => sum + c.revenue, 0),
      averageRating:
        coursesWithStats.length > 0
          ? coursesWithStats.reduce((sum, c) => sum + (c.rating || 0), 0) / coursesWithStats.length
          : 0,
      totalReviews: coursesWithStats.reduce((sum, c) => sum + (c.totalRatings || 0), 0),
      totalLessons: coursesWithStats.reduce((sum, c) => sum + c.totalLessons, 0),
    };

    // ===== GET TOP COURSES =====

    const topCourses = coursesWithStats
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        title: c.title,
        thumbnail: c.thumbnail,
        enrollments: c.enrollments,
        rating: c.rating || 0,
        revenue: c.revenue,
        status: c.status,
      }));

    console.log("✅ Instructor stats fetched successfully");

    return sendSuccessResponse(res, 200, "Instructor statistics fetched successfully", {
      stats,
      topCourses,
    });
  } catch (err) {
    console.error("❌ [GET INSTRUCTOR STATS] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch statistics", err);
  }
};

// ==================== ADDITIONAL FEATURES ====================

/**
 * GET FEATURED COURSES
 * GET /api/courses/featured
 */
export const getFeaturedCourses = async (req, res) => {
  try {
    console.log("📥 [GET FEATURED COURSES] Request received");

    const { limit: queryLimit } = validatePagination(1, req.query.limit || 10);

    const courses = await Course.findAll({
      status: "published",
      isFeatured: true,
      limit: queryLimit,
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    console.log(`✅ Fetched ${courses.length} featured courses`);

    return sendSuccessResponse(res, 200, "Featured courses fetched successfully", {
      courses: courses.map((course) => (Course.sanitize ? Course.sanitize(course) : course)),
      total: courses.length,
    });
  } catch (err) {
    console.error("❌ [GET FEATURED COURSES] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch featured courses", err);
  }
};

/**
 * GET TRENDING COURSES
 * GET /api/courses/trending
 */
export const getTrendingCourses = async (req, res) => {
  try {
    console.log("📥 [GET TRENDING COURSES] Request received");

    const { limit: queryLimit } = validatePagination(1, req.query.limit || 10);

    const courses = await Course.findAll({
      status: "published",
      limit: queryLimit,
      sortBy: "totalEnrollments",
      sortOrder: "desc",
    });

    console.log(`✅ Fetched ${courses.length} trending courses`);

    return sendSuccessResponse(res, 200, "Trending courses fetched successfully", {
      courses: courses.map((course) => (Course.sanitize ? Course.sanitize(course) : course)),
      total: courses.length,
    });
  } catch (err) {
    console.error("❌ [GET TRENDING COURSES] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch trending courses", err);
  }
};

/**
 * GET COURSES BY CATEGORY
 * GET /api/courses/category/:category
 */
export const getCoursesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);

    console.log("📥 [GET COURSES BY CATEGORY] Request received for category:", category);

    // ===== VALIDATE CATEGORY =====

    const normalizedCategory = VALID_CATEGORIES[category.toLowerCase()];
    if (!normalizedCategory) {
      return sendErrorResponse(res, 400, `Invalid category. Valid options: ${Object.keys(VALID_CATEGORIES).join(", ")}`);
    }

    // ===== FETCH COURSES =====

    const courses = await Course.findAll({
      category: normalizedCategory,
      status: "published",
      limit,
      offset: (page - 1) * limit,
    });

    const total = await Course.count({
      category: normalizedCategory,
      status: "published",
    });

    const totalPages = Math.ceil(total / limit);

    console.log(`✅ Fetched ${courses.length} courses in category: ${normalizedCategory}`);

    return sendSuccessResponse(res, 200, "Courses fetched successfully", {
      courses: courses.map((course) => (Course.sanitize ? Course.sanitize(course) : course)),
      category: normalizedCategory,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("❌ [GET COURSES BY CATEGORY] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch courses", err);
  }
};

/**
 * GET ENROLLED STUDENTS
 * GET /api/courses/:courseId/students
 */
export const getEnrolledStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);

    console.log("📥 [GET ENROLLED STUDENTS] Request received for course:", courseId);

    // ===== VALIDATE COURSE ID =====

    if (!isValidUUID(courseId)) {
      return sendErrorResponse(res, 400, "Invalid course ID format");
    }

    // ===== FETCH COURSE =====

    const course = await Course.findById(courseId);
    if (!course) {
      return sendErrorResponse(res, 404, "Course not found");
    }

    // ===== CHECK AUTHORIZATION =====

    if (course.instructorId !== req.user.id && req.user.role !== "admin") {
      return sendErrorResponse(res, 403, "Not authorized to view enrolled students");
    }

    // ===== FETCH ENROLLMENTS =====

    const enrollments = await Enrollment.findByCourse(courseId);

    // ===== GET USER DETAILS FOR EACH ENROLLMENT =====

    const studentsWithDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        try {
          const user = await User.findById(enrollment.userId);
          const progress = await Enrollment.getProgress(enrollment.id);

          return {
            ...enrollment,
            user: user
              ? {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  avatar: user.avatar,
                }
              : null,
            progress,
          };
        } catch (error) {
          console.error(`Error fetching user ${enrollment.userId}:`, error);
          return {
            ...enrollment,
            user: null,
            progress: null,
          };
        }
      })
    );

    // ===== PAGINATE =====

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStudents = studentsWithDetails.slice(startIndex, endIndex);

    console.log(`✅ Fetched ${paginatedStudents.length} enrolled students`);

    return sendSuccessResponse(res, 200, "Enrolled students fetched successfully", {
      students: paginatedStudents,
      pagination: {
        page,
        limit,
        total: studentsWithDetails.length,
        pages: Math.ceil(studentsWithDetails.length / limit),
        hasNext: page < Math.ceil(studentsWithDetails.length / limit),
        hasPrev: page > 1,
      },
      stats: {
        totalEnrollments: studentsWithDetails.length,
        activeEnrollments: studentsWithDetails.filter((s) => s.status === "active").length,
        completedEnrollments: studentsWithDetails.filter((s) => s.status === "completed").length,
        courseTitle: course.title,
        courseId: course.id,
      },
    });
  } catch (err) {
    console.error("❌ [GET ENROLLED STUDENTS] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch enrolled students", err);
  }
};

/**
 * GET COURSE CATEGORIES
 * GET /api/courses/categories
 */
export const getCourseCategories = async (req, res) => {
  try {
    console.log("📥 [GET COURSE CATEGORIES] Request received");

    // ===== GET UNIQUE CATEGORIES =====

    const categories = Object.values(VALID_CATEGORIES)
      .filter((value, index, self) => self.indexOf(value) === index)
      .map((cat) => ({
        value: cat,
        label: cat
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      }));

    // ===== GET COURSE COUNT FOR EACH CATEGORY =====

    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        try {
          const count = await Course.count({
            category: category.value,
            status: "published",
          });

          return {
            ...category,
            courseCount: count,
          };
        } catch (error) {
          console.error(`Error counting courses for category ${category.value}:`, error);
          return {
            ...category,
            courseCount: 0,
          };
        }
      })
    );

    console.log("✅ Categories fetched successfully");

    return sendSuccessResponse(res, 200, "Categories fetched successfully", {
      categories: categoriesWithCounts,
      total: categoriesWithCounts.length,
    });
  } catch (err) {
    console.error("❌ [GET COURSE CATEGORIES] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch categories", err);
  }
};

/**
 * UPLOAD COURSE IMAGE (Standalone endpoint)
 * POST /api/courses/upload-image
 */
export const uploadCourseImage = async (req, res) => {
  try {
    console.log("📥 [UPLOAD COURSE IMAGE] Request received");

    if (!req.file && !req.body.thumbnailBase64) {
      return sendErrorResponse(res, 400, "No image file or Base64 data provided");
    }

    let imageUrl = "";

    // ===== HANDLE BASE64 UPLOAD =====

    if (req.body.thumbnailBase64) {
      try {
        console.log("📤 Uploading course image from Base64...");
        imageUrl = await uploadCourseThumbnail(req.body.thumbnailBase64, req.user.id);
        console.log("✅ Course image uploaded from Base64:", imageUrl);
      } catch (uploadError) {
        console.error("❌ Base64 image upload failed:", uploadError);
        return sendErrorResponse(res, 400, `Image upload failed: ${uploadError.message}`);
      }
    }
    // ===== HANDLE FILE UPLOAD =====
    else if (req.file) {
      try {
        console.log("📤 Uploading course image from file...");
        imageUrl = await uploadCourseThumbnail(req.file, req.user.id);
        console.log("✅ Course image uploaded from file:", imageUrl);
      } catch (uploadError) {
        console.error("❌ File image upload failed:", uploadError);
        return sendErrorResponse(res, 400, `Image upload failed: ${uploadError.message}`);
      }
    }

    return sendSuccessResponse(res, 200, "Course image uploaded successfully", {
      url: imageUrl,
    });
  } catch (err) {
    console.error("❌ [UPLOAD COURSE IMAGE] Error:", err);
    return sendErrorResponse(res, 500, `Failed to upload course image: ${err.message}`);
  }
};

/**
 * GET USER ENROLLMENTS (Multiple courses)
 * POST /api/courses/check-enrollments
 */
export const getUserEnrollments = async (req, res) => {
  try {
    const { courseIds } = req.body;

    console.log("📥 [GET USER ENROLLMENTS] Request received");

    if (!courseIds || !Array.isArray(courseIds)) {
      return sendErrorResponse(res, 400, "Course IDs array is required");
    }

    // ===== CHECK ENROLLMENTS FOR ALL COURSES =====

    const enrollments = await Promise.all(
      courseIds.map(async (courseId) => {
        try {
          if (!isValidUUID(courseId)) {
            return {
              courseId,
              isEnrolled: false,
              enrollment: null,
              error: "Invalid course ID format",
            };
          }

          const enrollment = await Enrollment.findByCourseAndUser(courseId, req.user.id);

          return {
            courseId,
            isEnrolled: !!enrollment && enrollment.status === "active",
            enrollment,
          };
        } catch (error) {
          console.error(`Error checking enrollment for course ${courseId}:`, error);
          return {
            courseId,
            isEnrolled: false,
            enrollment: null,
            error: "Failed to check enrollment",
          };
        }
      })
    );

    console.log("✅ User enrollments fetched successfully");

    return sendSuccessResponse(res, 200, "Enrollment status fetched successfully", {
      enrollments,
    });
  } catch (err) {
    console.error("❌ [GET USER ENROLLMENTS] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch enrollment status", err);
  }
};

/**
 * GET USER ENROLLED COURSES WITH PROGRESS
 * GET /api/courses/my-courses/progress
 */
export const getUserEnrolledCoursesWithProgress = async (req, res) => {
  try {
    console.log("📥 [GET USER ENROLLED COURSES WITH PROGRESS] Request received");

    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const { status = "active" } = req.query;

    // ===== FETCH ENROLLMENTS =====

    const enrollments = await Enrollment.findByUser(req.user.id, status);

    // ===== GET COURSE DETAILS WITH PROGRESS =====

    const coursesWithProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        try {
          const course = await Course.findById(enrollment.courseId);
          if (!course) {
            return null;
          }

          const progress = await Enrollment.getProgress(enrollment.id);

          return {
            ...course,
            enrollment,
            progress,
          };
        } catch (error) {
          console.error(`Error getting course ${enrollment.courseId}:`, error);
          return null;
        }
      })
    );

    const validCourses = coursesWithProgress.filter((course) => course !== null);

    // ===== PAGINATE =====

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCourses = validCourses.slice(startIndex, endIndex);

    console.log(`✅ Fetched ${paginatedCourses.length} enrolled courses with progress`);

    return sendSuccessResponse(res, 200, "Enrolled courses with progress fetched successfully", {
      courses: paginatedCourses.map((course) => ({
        ...(Course.sanitize ? Course.sanitize(course) : course),
        enrollment: course.enrollment,
        progress: course.progress,
      })),
      pagination: {
        page,
        limit,
        total: validCourses.length,
        pages: Math.ceil(validCourses.length / limit),
        hasNext: page < Math.ceil(validCourses.length / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("❌ [GET USER ENROLLED COURSES WITH PROGRESS] Error:", err);
    return sendErrorResponse(res, 500, "Failed to fetch enrolled courses", err);
  }
};

// ==================== EXPORT ALL FUNCTIONS ====================

export default {
  // Course CRUD
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  
  // Course Management
  getInstructorCourses,
  publishCourse,
  unpublishCourse,

  // Lesson Management
  addLesson,
  updateLesson,
  deleteLesson,
  getLessons,

  // Enrollment
  enrollCourse,
  unenrollCourse,
  getEnrolledCourses,
  checkEnrollment,
  getUserEnrollments,
  getUserEnrolledCoursesWithProgress,
  updateLessonProgress,
  getCourseProgress,

  // Reviews
  addReview,
  updateReview,
  deleteReview,
  getCourseReviews,
  getUserReview,

  // Statistics
  getCourseStats,
  getInstructorStats,

  // Additional Features
  getFeaturedCourses,
  getTrendingCourses,
  getCoursesByCategory,
  getEnrolledStudents,
  getCourseCategories,
  
  // Upload
  uploadCourseImage,
};