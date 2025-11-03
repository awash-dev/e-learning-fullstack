// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Main authentication middleware
export const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by ID from token
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      // Attach sanitized user to request object
      req.user = User.sanitizeUser(user);
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Admin only middleware
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Instructor only middleware
export const instructorOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Instructor privileges required.'
    });
  }

  next();
};

// Student only middleware
export const studentOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Students, instructors, and admins can access student resources
  const allowedRoles = ['student', 'instructor', 'admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Student privileges required.'
    });
  }

  next();
};

// Authorize middleware for multiple roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Rate limiting middleware for auth routes
export const authRateLimiter = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + ':' + req.path;
    const now = Date.now();

    if (!attempts.has(key)) {
      attempts.set(key, []);
    }

    const userAttempts = attempts.get(key).filter(timestamp => now - timestamp < windowMs);

    if (userAttempts.length >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.'
      });
    }

    userAttempts.push(now);
    attempts.set(key, userAttempts);

    // Clean up old entries
    if (Math.random() < 0.1) { // 10% chance to clean up
      for (const [k, v] of attempts.entries()) {
        const validAttempts = v.filter(timestamp => now - timestamp < windowMs);
        if (validAttempts.length === 0) {
          attempts.delete(k);
        } else {
          attempts.set(k, validAttempts);
        }
      }
    }

    next();
  };
};

// Validate request body middleware
export const validateBody = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    next();
  };
};

// Check resource ownership
export const checkOwnership = (resourceGetter) => {
  return async (req, res, next) => {
    try {
      const resource = await resourceGetter(req);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }

      // Check if user owns the resource
      if (resource.userId !== req.user.id && resource.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking resource ownership'
      });
    }
  };
};

// Optional middleware
export const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // No token provided, but that's okay for optional auth
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (user && user.isVerified) {
        req.user = User.sanitizeUser(user);
      } else {
        req.user = null;
      }
    } catch (error) {
      // Token is invalid, but that's okay for optional auth
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    req.user = null;
    next();
  }
};

// Check if user is verified
export const requireVerified = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email to access this resource'
    });
  }

  next();
};

// Check if user has specific permission
export const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Define permissions for each role
    const rolePermissions = {
      admin: ['all'], // Admin has all permissions
      instructor: ['create_course', 'edit_course', 'delete_course', 'view_students', 'grade_assignments'],
      student: ['view_course', 'enroll_course', 'submit_assignment', 'view_grades']
    };

    const userPermissions = rolePermissions[req.user.role] || [];

    if (!userPermissions.includes('all') && !userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Missing permission: ${permission}`
      });
    }

    next();
  };
};

// Default export with all middleware
export default {
  protect,
  adminOnly,
  instructorOnly,
  studentOnly,
  authorize,
  authRateLimiter,
  validateBody,
  checkOwnership,
  optionalAuth,
  requireVerified,
  hasPermission
};