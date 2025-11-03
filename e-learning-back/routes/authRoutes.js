// routes/courseRoutes.js - COMPLETE COURSE ROUTES
import express from "express";
import multer from "multer";
import {
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  getInstructorCourses,
  publishCourse,
  unpublishCourse,
  addLesson,
  updateLesson,
  deleteLesson,
  getLessons,
  enrollCourse,
  unenrollCourse,
  getEnrolledCourses,
  checkEnrollment,
  getUserEnrollments,
  getUserEnrolledCoursesWithProgress,
  updateLessonProgress,
  getCourseProgress,
  addReview,
  updateReview,
  deleteReview,
  getCourseReviews,
  getUserReview,
  getCourseStats,
  getInstructorStats,
  getFeaturedCourses,
  getTrendingCourses,
  getCoursesByCategory,
  getEnrolledStudents,
  getCourseCategories,
  uploadCourseImage,
} from "../controllers/courseController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// ============= MULTER CONFIGURATION =============
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG and WebP images are allowed."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Handle multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

// ============= PUBLIC ROUTES =============

/**
 * @route   GET /api/courses
 * @desc    Get all published courses with filtering
 * @access  Public
 */
router.get("/", getCourses);

/**
 * @route   GET /api/courses/featured
 * @desc    Get featured courses
 * @access  Public
 */
router.get("/featured", getFeaturedCourses);

/**
 * @route   GET /api/courses/trending
 * @desc    Get trending courses
 * @access  Public
 */
router.get("/trending", getTrendingCourses);

/**
 * @route   GET /api/courses/categories
 * @desc    Get all course categories with counts
 * @access  Public
 */
router.get("/categories", getCourseCategories);

/**
 * @route   GET /api/courses/category/:category
 * @desc    Get courses by category
 * @access  Public
 */
router.get("/category/:category", getCoursesByCategory);

/**
 * @route   GET /api/courses/:id
 * @desc    Get single course by ID
 * @access  Public (with optional auth for enrollment status)
 */
router.get("/:id", getCourse);

/**
 * @route   GET /api/courses/:courseId/lessons
 * @desc    Get lessons for a course
 * @access  Public (limited) / Private (full access if enrolled)
 */
router.get("/:courseId/lessons", getLessons);

/**
 * @route   GET /api/courses/:courseId/reviews
 * @desc    Get reviews for a course
 * @access  Public
 */
router.get("/:courseId/reviews", getCourseReviews);

// ============= PROTECTED ROUTES (AUTHENTICATED USERS) =============

/**
 * @route   POST /api/courses
 * @desc    Create a new course
 * @access  Private (Instructor/Admin)
 * @note    Supports both file upload and Base64 (thumbnailBase64 in body)
 */
router.post(
  "/",
  protect,
  authorize("instructor", "admin"),
  upload.single("thumbnail"),
  handleMulterError,
  createCourse
);

/**
 * @route   PUT /api/courses/:id
 * @desc    Update a course
 * @access  Private (Course Owner/Admin)
 * @note    Supports both file upload and Base64
 */
router.put(
  "/:id",
  protect,
  authorize("instructor", "admin"),
  upload.single("thumbnail"),
  handleMulterError,
  updateCourse
);

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete a course
 * @access  Private (Course Owner/Admin)
 */
router.delete(
  "/:id",
  protect,
  authorize("instructor", "admin"),
  deleteCourse
);

/**
 * @route   POST /api/courses/upload-image
 * @desc    Upload course image (standalone endpoint)
 * @access  Private (Instructor/Admin)
 * @note    Supports both file upload and Base64
 */
router.post(
  "/upload-image",
  protect,
  authorize("instructor", "admin"),
  upload.single("image"),
  handleMulterError,
  uploadCourseImage
);

/**
 * @route   GET /api/courses/instructor/my-courses
 * @desc    Get instructor's courses
 * @access  Private (Instructor/Admin)
 */
router.get(
  "/instructor/my-courses",
  protect,
  authorize("instructor", "admin"),
  getInstructorCourses
);

/**
 * @route   GET /api/courses/instructor/stats
 * @desc    Get instructor statistics
 * @access  Private (Instructor/Admin)
 */
router.get(
  "/instructor/stats",
  protect,
  authorize("instructor", "admin"),
  getInstructorStats
);

/**
 * @route   POST /api/courses/:id/publish
 * @desc    Publish a course
 * @access  Private (Course Owner/Admin)
 */
router.post(
  "/:id/publish",
  protect,
  authorize("instructor", "admin"),
  publishCourse
);

/**
 * @route   POST /api/courses/:id/unpublish
 * @desc    Unpublish a course
 * @access  Private (Course Owner/Admin)
 */
router.post(
  "/:id/unpublish",
  protect,
  authorize("instructor", "admin"),
  unpublishCourse
);

/**
 * @route   GET /api/courses/:id/stats
 * @desc    Get course statistics
 * @access  Private (Course Owner/Admin)
 */
router.get(
  "/:id/stats",
  protect,
  authorize("instructor", "admin"),
  getCourseStats
);

/**
 * @route   GET /api/courses/:courseId/students
 * @desc    Get enrolled students
 * @access  Private (Course Owner/Admin)
 */
router.get(
  "/:courseId/students",
  protect,
  authorize("instructor", "admin"),
  getEnrolledStudents
);

// ============= LESSON MANAGEMENT ROUTES =============

/**
 * @route   POST /api/courses/:courseId/lessons
 * @desc    Add a lesson to a course
 * @access  Private (Course Owner/Admin)
 * @note    Supports Base64 for thumbnail and attachments
 */
router.post(
  "/:courseId/lessons",
  protect,
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "attachments", maxCount: 10 },
  ]),
  handleMulterError,
  addLesson
);

/**
 * @route   PUT /api/courses/:courseId/lessons/:lessonId
 * @desc    Update a lesson
 * @access  Private (Course Owner/Admin)
 * @note    Supports Base64 for thumbnail and attachments
 */
router.put(
  "/:courseId/lessons/:lessonId",
  protect,
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "attachments", maxCount: 10 },
  ]),
  handleMulterError,
  updateLesson
);

/**
 * @route   DELETE /api/courses/:courseId/lessons/:lessonId
 * @desc    Delete a lesson
 * @access  Private (Course Owner/Admin)
 */
router.delete(
  "/:courseId/lessons/:lessonId",
  protect,
  authorize("instructor", "admin"),
  deleteLesson
);

// ============= ENROLLMENT ROUTES =============

/**
 * @route   POST /api/courses/:courseId/enroll
 * @desc    Enroll in a course
 * @access  Private (Student/Instructor)
 */
router.post("/:courseId/enroll", protect, enrollCourse);

/**
 * @route   POST /api/courses/:courseId/unenroll
 * @desc    Unenroll from a course
 * @access  Private (Enrolled User)
 */
router.post("/:courseId/unenroll", protect, unenrollCourse);

/**
 * @route   GET /api/courses/enrolled/my-courses
 * @desc    Get user's enrolled courses
 * @access  Private
 */
router.get("/enrolled/my-courses", protect, getEnrolledCourses);

/**
 * @route   GET /api/courses/:courseId/enrollment
 * @desc    Check enrollment status
 * @access  Private
 */
router.get("/:courseId/enrollment", protect, checkEnrollment);

/**
 * @route   POST /api/courses/check-enrollments
 * @desc    Check enrollment status for multiple courses
 * @access  Private
 * @body    { courseIds: [string] }
 */
router.post("/check-enrollments", protect, getUserEnrollments);

/**
 * @route   GET /api/courses/my-courses/progress
 * @desc    Get enrolled courses with progress
 * @access  Private
 */
router.get("/my-courses/progress", protect, getUserEnrolledCoursesWithProgress);

/**
 * @route   POST /api/courses/:courseId/lessons/:lessonId/progress
 * @desc    Update lesson progress
 * @access  Private (Enrolled User)
 * @body    { completed: boolean, watchTime: number }
 */
router.post("/:courseId/lessons/:lessonId/progress", protect, updateLessonProgress);

/**
 * @route   GET /api/courses/:courseId/progress
 * @desc    Get course progress
 * @access  Private (Enrolled User)
 */
router.get("/:courseId/progress", protect, getCourseProgress);

// ============= REVIEW ROUTES =============

/**
 * @route   POST /api/courses/:courseId/reviews
 * @desc    Add a review
 * @access  Private (Enrolled User)
 * @body    { rating: number, comment: string }
 */
router.post("/:courseId/reviews", protect, addReview);

/**
 * @route   PUT /api/courses/:courseId/reviews/:reviewId
 * @desc    Update a review
 * @access  Private (Review Owner)
 * @body    { rating: number, comment: string }
 */
router.put("/:courseId/reviews/:reviewId", protect, updateReview);

/**
 * @route   DELETE /api/courses/:courseId/reviews/:reviewId
 * @desc    Delete a review
 * @access  Private (Review Owner/Admin)
 */
router.delete("/:courseId/reviews/:reviewId", protect, deleteReview);

/**
 * @route   GET /api/courses/:courseId/reviews/my-review
 * @desc    Get user's review for a course
 * @access  Private
 */
router.get("/:courseId/reviews/my-review", protect, getUserReview);

// ============= ERROR HANDLING =============

// 404 handler for course routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Course route not found",
    path: req.originalUrl,
  });
});

// Course route error handler
router.use((err, req, res, next) => {
  console.error("Course route error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors,
    });
  }

  if (err.name === "UnauthorizedError") {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

export default router;