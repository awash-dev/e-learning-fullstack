import express from "express";
import { verifyToken, requireAdmin } from "../middleware/authMiddleware.js";
import {
  getReviews,
  getUserReviews,
  getCourseReviews,
  getReviewStats,
  getPlatformStats
} from "../controllers/reviewController.js";

const router = express.Router();

// Public routes
router.get("/", getReviews);
router.get("/course/:courseId", getCourseReviews);
router.get("/stats", getReviewStats);
router.get("/platform-stats", getPlatformStats);

// Protected routes
router.get("/user/:userId", verifyToken, getUserReviews);

export default router;