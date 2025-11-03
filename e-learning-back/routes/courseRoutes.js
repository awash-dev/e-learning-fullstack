import express from 'express';
import {
  createCourse,
  uploadCourseImage,
  updateCourse,
  getCourses,
  getCourse,
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
  getEnrolledStudents
} from '../controllers/courseController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// ==================== PUBLIC COURSE ROUTES ====================

// Course discovery (public)
router.get('/', getCourses);
router.get('/featured', getFeaturedCourses); // ✅ Fixed: removed duplicate path
router.get('/trending', getTrendingCourses); // ✅ Fixed: removed duplicate path
router.get('/category/:category', getCoursesByCategory);
router.get('/:id', getCourse);
router.get('/:id/reviews', getCourseReviews);

// ==================== COURSE CRUD (INSTRUCTOR/ADMIN) ====================

router.post('/', protect, authorize('instructor', 'admin'), upload.single('thumbnail'), createCourse);
router.post('/upload-image', protect, authorize('instructor', 'admin'), upload.single('image'), uploadCourseImage);
router.put('/:id', protect, authorize('instructor', 'admin'), upload.single('thumbnail'), updateCourse);
router.delete('/:id', protect, authorize('instructor', 'admin'), deleteCourse);

// ==================== INSTRUCTOR DASHBOARD ROUTES ====================

router.get('/instructor/my-courses', protect, authorize('instructor', 'admin'), getInstructorCourses);
router.get('/instructor/stats', protect, authorize('instructor', 'admin'), getInstructorStats);
router.put('/:id/publish', protect, authorize('instructor', 'admin'), publishCourse);
router.put('/:id/unpublish', protect, authorize('instructor', 'admin'), unpublishCourse);
router.get('/:id/stats', protect, authorize('instructor', 'admin'), getCourseStats);
router.get('/:courseId/enrolled-students', protect, authorize('instructor', 'admin'), getEnrolledStudents);

// ==================== LESSON MANAGEMENT (INSTRUCTOR/ADMIN) ====================

router.post('/:courseId/lessons', protect, authorize('instructor', 'admin'), addLesson); // ✅ Removed file upload for lessons
router.put('/:courseId/lessons/:lessonId', protect, authorize('instructor', 'admin'), updateLesson); // ✅ Removed file upload for lessons
router.delete('/:courseId/lessons/:lessonId', protect, authorize('instructor', 'admin'), deleteLesson);
router.get('/:courseId/lessons', protect, getLessons); // ✅ Added protection for lessons

// ==================== ENROLLMENT & PROGRESS ROUTES ====================

router.post('/:courseId/enroll', protect, enrollCourse);
router.delete('/:courseId/unenroll', protect, unenrollCourse);
router.get('/enrolled/my-courses', protect, getEnrolledCourses);
router.get('/:courseId/check-enrollment', protect, checkEnrollment);
router.post('/check-enrollments', protect, getUserEnrollments);
router.get('/enrolled/with-progress', protect, getUserEnrolledCoursesWithProgress);
router.put('/:courseId/lessons/:lessonId/progress', protect, updateLessonProgress);
router.get('/:courseId/progress', protect, getCourseProgress);

// ==================== REVIEW ROUTES ====================

router.post('/:courseId/reviews', protect, addReview);
router.put('/:courseId/reviews/:reviewId', protect, updateReview);
router.delete('/:courseId/reviews/:reviewId', protect, deleteReview);
router.get('/:courseId/my-review', protect, getUserReview);

export default router;