// controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { uploadToBlob } from "../utils/blob.js";

// Check if Google OAuth credentials are available
const hasGoogleCredentials = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;

console.log('🔧 Google OAuth Status:', hasGoogleCredentials ? '✅ Configured' : '❌ Not Configured');

// Email transporter - will be initialized when needed
let transporter;

// Initialize email transporter when first used
const getTransporter = () => {
  if (!transporter) {
    console.log('📧 Initializing email transporter...');

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    transporter.verify((error, success) => {
      if (error) {
        console.log(' Email configuration error:', error.message);
      } else {
        console.log(' Email server is ready to send messages');
      }
    });
  }
  return transporter;
};

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Only configure Google OAuth if credentials exist
if (hasGoogleCredentials) {
  console.log(' Configuring Google OAuth Strategy...');

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.NODE_ENV === 'production'
          ? "https://e-learning-backs.vercel.app/api/auth/google/callback"
          : "/api/auth/google/callback",
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          console.log('🔑 Google OAuth profile received:', profile.id);
          console.log('📧 User email:', profile.emails[0].value);

          let user = await User.findByGoogleId(profile.id);

          if (user) {
            const statistics = user.statistics || {};
            statistics.lastLogin = new Date().toISOString();
            await User.updateStatistics(user.id, statistics);
            return done(null, User.sanitizeUser(user));
          }

          user = await User.findByEmail(profile.emails[0].value);

          if (user) {
            await User.update(user.id, {
              googleId: profile.id,
              isVerified: true,
              authMethod: 'both',
              avatar: profile.photos?.[0]?.value || user.avatar
            });
            
            const statistics = user.statistics || {};
            statistics.lastLogin = new Date().toISOString();
            await User.updateStatistics(user.id, statistics);
            
            const updatedUser = await User.findById(user.id);
            return done(null, User.sanitizeUser(updatedUser));
          }

          const newUser = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            password: null,
            avatar: profile.photos?.[0]?.value,
            isVerified: true,
            authMethod: 'google',
            statistics: {
              lastLogin: new Date().toISOString(),
              loginCount: 1,
              coursesEnrolled: 0,
              coursesCompleted: 0,
              totalLearningTime: 0
            }
          });

          console.log('✅ New OAuth user created:', newUser.email);
          return done(null, User.sanitizeUser(newUser));
        } catch (error) {
          console.error('Google OAuth error:', error);
          return done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, User.sanitizeUser(user));
    } catch (error) {
      done(error, null);
    }
  });
} else {
  console.warn('❌ Google OAuth credentials not found. Google authentication will be disabled.');
}

// Debug endpoint for OAuth configuration
export const oauthDebug = (req, res) => {
  const callbackURL = process.env.NODE_ENV === 'production'
    ? "https://e-learning-backs.vercel.app/api/auth/google/callback"
    : "/api/auth/google/callback";

  res.json({
    success: true,
    message: "OAuth Debug Information",
    config: {
      clientId: process.env.GOOGLE_CLIENT_ID ? '✅ Present' : '❌ Missing',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '✅ Present' : '❌ Missing',
      clientUrl: process.env.CLIENT_URL,
      mobileScheme: process.env.MOBILE_SCHEME,
      callbackUrl: callbackURL,
      environment: process.env.NODE_ENV
    },
    expected_redirect_uris: [
      "https://e-learning-backs.vercel.app/api/auth/google/callback",
      `${process.env.MOBILE_SCHEME || 'elearningapp'}://oauth`
    ]
  });
};

// Get all users (Admin only) - EXCLUDES ADMIN USERS
export const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const { page = 1, limit = 10, search, role, isVerified } = req.query;
    const offset = (page - 1) * limit;

    const filters = {
      search,
      role,
      isVerified: isVerified !== undefined ? isVerified === 'true' : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const users = await User.findAll(filters);
    const total = await User.count(filters);

    res.json({
      success: true,
      users: users.map(user => User.sanitizeUser(user)),
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalUsers: total
    });

  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Delete user account by ID (Admin only)
export const deleteUserById = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own admin account"
      });
    }

    const userToDelete = await User.findById(userId);
    
    if (!userToDelete) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Prevent deletion of other admin accounts
    if (userToDelete.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: "Cannot delete admin accounts"
      });
    }

    await User.delete(userId);

    res.json({
      success: true,
      message: "User account deleted successfully"
    });

  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Register a new user - ALL ACCOUNTS ARE ACTIVE AND VERIFIED BY DEFAULT
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email"
      });
    }

    // Stronger password validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long"
      });
    }

    // Check for password strength
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
      authMethod: 'local',
      isVerified: true,
      statistics: {
        lastLogin: new Date().toISOString(),
        loginCount: 1,
        coursesEnrolled: 0,
        coursesCompleted: 0,
        totalLearningTime: 0
      }
    });

    const sanitizedUser = User.sanitizeUser(user);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Send welcome email
    await sendWelcomeEmail(sanitizedUser);

    res.status(201).json({
      success: true,
      message: "User registered successfully! Welcome to our platform.",
      token,
      user: sanitizedUser
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Verify email endpoint
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Since all accounts are verified by default, this is mostly for legacy support
    const user = await User.findByEmailVerificationToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    await User.update(user.id, {
      isVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    const statistics = user.statistics || {};
    statistics.lastLogin = new Date().toISOString();
    await User.updateStatistics(user.id, statistics);

    const authToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const sanitizedUser = User.sanitizeUser(user);

    await sendWelcomeEmail(sanitizedUser);

    res.json({
      success: true,
      message: "Email verified successfully! Welcome to our e-learning platform.",
      token: authToken,
      user: sanitizedUser
    });

  } catch (err) {
    console.error('Verify email error:', err);
    res.status(500).json({
      success: false,
      message: "Error verifying email"
    });
  }
};

// Resend verification email
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    const user = await User.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified"
      });
    }

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

    await User.update(user.id, {
      emailVerificationToken,
      emailVerificationExpires: new Date(emailVerificationExpires)
    });

    await sendVerificationEmail({ ...user, emailVerificationToken });

    res.json({
      success: true,
      message: "Verification email sent successfully"
    });

  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({
      success: false,
      message: "Error sending verification email"
    });
  }
};

// Login a user with improved security
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (user.authMethod === 'google' && !user.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google authentication. Please login with Google."
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Update statistics
    const statistics = user.statistics || {};
    statistics.lastLogin = new Date().toISOString();
    statistics.loginCount = (statistics.loginCount || 0) + 1;
    await User.updateStatistics(user.id, statistics);

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const sanitizedUser = User.sanitizeUser(user);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: sanitizedUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

// Google OAuth routes
export const googleAuth = (req, res, next) => {
  console.log('🔑 Google OAuth initiated');
  console.log('📱 User Agent:', req.get('User-Agent'));
  console.log('🔗 Query params:', req.query);

  if (!hasGoogleCredentials) {
    return res.status(503).json({
      success: false,
      message: "Google authentication is not configured"
    });
  }

  if (req.query.mobile === 'true') {
    req.session.mobile = true;
  }

  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: req.query.mobile ? 'mobile' : 'web'
  })(req, res, next);
};

export const googleCallback = (req, res, next) => {
  console.log('🔑 Google OAuth callback received');
  console.log('📱 Query params:', req.query);
  console.log('🔗 State:', req.query.state);

  if (!hasGoogleCredentials) {
    return res.status(503).json({
      success: false,
      message: "Google authentication is not configured"
    });
  }

  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err) {
      console.error('Google callback error:', err);
      if (req.query.state === 'mobile' || req.query.mobile === 'true') {
        return res.redirect(`${process.env.MOBILE_SCHEME || 'elearningapp'}://oauth/error?message=auth_failed`);
      }
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }

    if (!user) {
      if (req.query.state === 'mobile' || req.query.mobile === 'true') {
        return res.redirect(`${process.env.MOBILE_SCHEME || 'elearningapp'}://oauth/error?message=user_not_found`);
      }
      return res.redirect(`${process.env.CLIENT_URL}/login?error=user_not_found`);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    console.log('✅ OAuth successful for user:', user.email);

    if (req.query.state === 'mobile' || req.query.mobile === 'true') {
      const redirectUrl = `${process.env.MOBILE_SCHEME || 'elearningapp'}://oauth/success?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      }))}`;
      console.log('📱 Mobile redirect URL:', redirectUrl);
      return res.redirect(redirectUrl);
    } else {
      res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);
    }
  })(req, res, next);
};

// Direct OAuth token endpoint for mobile apps
export const googleMobileAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: "Access token is required"
      });
    }

    const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
    const profile = await response.json();

    if (!profile.email) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token"
      });
    }

    let user = await User.findByGoogleId(profile.sub);

    if (!user) {
      user = await User.findByEmail(profile.email);
    }

    if (!user) {
      user = await User.create({
        googleId: profile.sub,
        name: profile.name,
        email: profile.email,
        password: null,
        avatar: profile.picture,
        isVerified: true,
        authMethod: 'google',
        statistics: {
          lastLogin: new Date().toISOString(),
          loginCount: 1,
          coursesEnrolled: 0,
          coursesCompleted: 0,
          totalLearningTime: 0
        }
      });
    } else {
      await User.update(user.id, {
        googleId: profile.sub,
        isVerified: true,
        authMethod: user.authMethod === 'local' ? 'both' : 'google',
        avatar: profile.picture || user.avatar
      });
      
      const statistics = user.statistics || {};
      statistics.lastLogin = new Date().toISOString();
      await User.updateStatistics(user.id, statistics);
    }

    const updatedUser = await User.findById(user.id);
    const sanitizedUser = User.sanitizeUser(updatedUser);

    const token = jwt.sign(
      { id: sanitizedUser.id, role: sanitizedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      message: "Google authentication successful",
      token,
      user: sanitizedUser
    });

  } catch (error) {
    console.error('Google mobile auth error:', error);
    res.status(500).json({
      success: false,
      message: "Google authentication failed"
    });
  }
};

// Test endpoint for Google OAuth
export const googleTest = (req, res) => {
  console.log('🧪 Google OAuth test endpoint called');
  const callbackURL = process.env.NODE_ENV === 'production'
    ? "https://e-learning-backs.vercel.app/api/auth/google/callback"
    : "/api/auth/google/callback";

  res.json({
    success: true,
    message: "Google OAuth test endpoint is working!",
    oauth_configured: hasGoogleCredentials,
    callback_url: callbackURL,
    mobile_scheme: process.env.MOBILE_SCHEME,
    client_url: process.env.CLIENT_URL,
    test_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/google`,
    mobile_test_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/google?mobile=true`
  });
};

// Forgot Password with OTP
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      // Return success even if user doesn't exist for security
      return res.json({
        success: true,
        message: "If an account with that email exists, an OTP has been sent"
      });
    }

    const otp = generateOTP();
    const otpExpires = Date.now() + 15 * 60 * 1000;

    await User.setOTP(user.id, otp, new Date(otpExpires));

    await sendOTPEmail(user, otp);

    res.json({
      success: true,
      message: "If an account with that email exists, an OTP has been sent",
      otpExpires: new Date(otpExpires).toISOString()
    });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({
      success: false,
      message: "Error sending OTP"
    });
  }
};

// Verify OTP for password reset
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    const user = await User.findByOTP(email, otp);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP or OTP has expired"
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await User.setResetToken(user.id, resetToken, new Date(Date.now() + 3600000));

    res.json({
      success: true,
      message: "OTP verified successfully",
      resetToken,
      expires: new Date(Date.now() + 3600000).toISOString()
    });

  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({
      success: false,
      message: "Error verifying OTP"
    });
  }
};

// Reset Password with stronger validation
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required"
      });
    }

    // Stronger password validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long"
      });
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
      });
    }

    const user = await User.findByResetToken(resetToken);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.update(user.id, {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      authMethod: user.authMethod === 'google' ? 'both' : 'local'
    });

    await sendPasswordResetConfirmationEmail(user);

    res.json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({
      success: false,
      message: "Error resetting password"
    });
  }
};

// Update email with validation
export const updateEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "New email and current password are required"
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    const existingUser = await User.findByEmail(newEmail);
    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(409).json({
        success: false,
        message: "Email already exists"
      });
    }

    const oldEmail = user.email;
    await User.update(user.id, { email: newEmail });

    await sendEmailUpdateConfirmation({ ...user, email: newEmail }, oldEmail);

    res.json({
      success: true,
      message: "Email updated successfully"
    });

  } catch (err) {
    console.error('Update email error:', err);
    res.status(500).json({
      success: false,
      message: "Error updating email"
    });
  }
};

// Get User Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const sanitizedUser = User.sanitizeUser(user);

    res.json({
      success: true,
      user: sanitizedUser
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Update User Profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, bio, phone, address, socialLinks, education, skills, preferences } = req.body;

    const updateData = {};

    if (name) updateData.name = name;

    if (email && email !== req.user.email) {
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address"
        });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({
          success: false,
          message: "Email already exists"
        });
      }
      updateData.email = email;
    }

    // Handle profile fields
    const profileUpdate = {};
    if (bio !== undefined) profileUpdate.bio = bio;
    if (phone !== undefined) profileUpdate.phone = phone;
    if (address !== undefined) profileUpdate.address = address;
    if (socialLinks !== undefined) profileUpdate.socialLinks = socialLinks;
    if (education !== undefined) profileUpdate.education = education;
    if (skills !== undefined) profileUpdate.skills = skills;

    if (Object.keys(profileUpdate).length > 0) {
      const currentUser = await User.findById(req.user.id);
      const currentProfile = currentUser.profile || {};
      updateData.profile = { ...currentProfile, ...profileUpdate };
    }

    if (preferences !== undefined) {
      updateData.preferences = preferences;
    }

    if (req.file) {
      try {
        const avatarUrl = await uploadToBlob('avatars', req.file);
        updateData.avatar = avatarUrl;
      } catch (blobError) {
        console.error('Vercel Blob upload error:', blobError);
        return res.status(500).json({
          success: false,
          message: 'Error uploading avatar image'
        });
      }
    }

    const user = await User.update(req.user.id, updateData);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const sanitizedUser = User.sanitizeUser(user);

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: sanitizedUser
    });

  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// Upload Avatar Only
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }

    const avatarUrl = await uploadToBlob('avatars', req.file);

    const user = await User.update(req.user.id, { avatar: avatarUrl });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const sanitizedUser = User.sanitizeUser(user);

    res.json({
      success: true,
      message: "Avatar uploaded successfully",
      avatarUrl: avatarUrl,
      user: sanitizedUser
    });

  } catch (err) {
    console.error('Upload avatar error:', err);
    res.status(500).json({
      success: false,
      message: "Error uploading avatar"
    });
  }
};

// Remove Avatar
export const removeAvatar = async (req, res) => {
  try {
    const user = await User.update(req.user.id, { avatar: '' });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const sanitizedUser = User.sanitizeUser(user);

    res.json({
      success: true,
      message: "Avatar removed successfully",
      user: sanitizedUser
    });

  } catch (err) {
    console.error('Remove avatar error:', err);
    res.status(500).json({
      success: false,
      message: "Error removing avatar"
    });
  }
};

// Change Password with stronger validation
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required"
      });
    }

    // Stronger password validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long"
      });
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Prevent using the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as current password"
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.update(user.id, { password: hashedPassword });

    await sendPasswordChangeConfirmationEmail(user);

    res.json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({
      success: false,
      message: "Error changing password"
    });
  }
};

// Email Helper Functions
const sendWelcomeEmail = async (user) => {
  try {
    const emailTransporter = getTransporter();

    const mailOptions = {
      from: `"E-Learning Platform" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Welcome to Our E-Learning Platform! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px;">
          <div style="text-align: center; padding: 30px 20px;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to E-Learning Platform! 🎓</h1>
            <p style="font-size: 18px; margin: 20px 0;">Hello <strong>${user.name}</strong>,</p>
          </div>
          
          <div style="background: white; color: #333; padding: 30px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #667eea; text-align: center;">Your Learning Journey Begins Now! 🚀</h2>
            
            <p>We're thrilled to have you join our community of learners. Here's what you can do:</p>
            
            <ul style="line-height: 1.6;">
              <li>📚 Explore hundreds of courses</li>
              <li>🎯 Learn from expert instructors</li>
              <li>🏆 Earn certificates and badges</li>
              <li>👥 Connect with other learners</li>
              <li>📱 Learn anytime, anywhere</li>
            </ul>
          </div>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${user.email}`);

  } catch (error) {
    console.error('❌ Error sending welcome email:', error.message);
  }
};

const sendVerificationEmail = async (user) => {
  try {
    const emailTransporter = getTransporter();
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${user.emailVerificationToken}`;

    const mailOptions = {
      from: `"E-Learning Platform" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Verify Your Email - E-Learning Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Verify Your Email</h1>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Please verify your email address to complete your registration and start learning!</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This link will expire in 24 hours. If you didn't create an account, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${user.email}`);

  } catch (error) {
    console.error('❌ Error sending verification email:', error.message);
    throw error;
  }
};

const sendOTPEmail = async (user, otp) => {
  try {
    const emailTransporter = getTransporter();

    const mailOptions = {
      from: `"E-Learning Platform" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset OTP - E-Learning Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Password Reset OTP</h1>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>You requested to reset your password. Use the OTP below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; padding: 15px 30px; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #495057;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #dc3545; font-weight: bold;">
              ⚠️ This OTP will expire in 15 minutes.
            </p>
          </div>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${user.email}`);

  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    throw error;
  }
};

const sendPasswordResetConfirmationEmail = async (user) => {
  try {
    const emailTransporter = getTransporter();

    const mailOptions = {
      from: `"E-Learning Platform" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Successful - E-Learning Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Password Reset Successful ✅</h1>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Your password has been successfully reset.</p>
          </div>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Password reset confirmation sent to ${user.email}`);

  } catch (error) {
    console.error('❌ Error sending password reset confirmation:', error.message);
  }
};

const sendPasswordChangeConfirmationEmail = async (user) => {
  try {
    const emailTransporter = getTransporter();

    const mailOptions = {
      from: `"E-Learning Platform" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Changed - E-Learning Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Password Changed Successfully ✅</h1>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Your password has been changed successfully.</p>
          </div>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Password change confirmation sent to ${user.email}`);

  } catch (error) {
    console.error('❌ Error sending password change confirmation:', error.message);
  }
};

const sendEmailUpdateConfirmation = async (user, oldEmail) => {
  try {
    const emailTransporter = getTransporter();

    const mailOptions = {
      from: `"E-Learning Platform" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Email Updated Successfully - E-Learning Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">Email Updated Successfully</h1>
          </div>
          
          <div style="padding: 30px; background: white; border-radius: 0 0 10px 10px;">
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>Your email address has been successfully updated from <strong>${oldEmail}</strong> to <strong>${user.email}</strong>.</p>
            <p>You can now use your new email address to login to your account.</p>
          </div>
        </div>
      `,
    };

    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email update confirmation sent to ${user.email}`);

  } catch (error) {
    console.error('❌ Error sending email update confirmation:', error.message);
  }
};