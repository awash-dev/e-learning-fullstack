import express from "express";
import { verifyToken, requireAdmin } from "../middleware/authMiddleware.js";
import {
  getUserProfile,
  updateUserProfile,
  getUserStats,
  searchUsers
} from "../controllers/userController.js";

const router = express.Router();

// Public routes (if any)

// Protected routes
router.get("/profile", verifyToken, getUserProfile);
router.put("/profile", verifyToken, updateUserProfile);

// Admin routes
router.get("/stats", verifyToken, requireAdmin, getUserStats);
router.get("/search", verifyToken, requireAdmin, searchUsers);

export default router;