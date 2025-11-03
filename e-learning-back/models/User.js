import { pool } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export class User {
  // Create new user
  static async create(userData) {
    const client = await pool.connect();
    try {
      console.log("📝 Creating user with data:", { 
        email: userData.email, 
        name: userData.name,
        role: userData.role 
      });

      const {
        name,
        email,
        password,
        role = 'student',
        avatar = null,
        googleId = null,
        authMethod = 'local',
        isVerified = true,
        statistics = {},
        profile = {},
        preferences = {}
      } = userData;

      // Generate UUID for the user
      const userId = uuidv4();

      const query = `
        INSERT INTO users (
          id, name, email, password, role, avatar, 
          google_id, auth_method, is_verified, statistics,
          profile, preferences, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        userId,
        name,
        email,
        password,
        role,
        avatar,
        googleId,
        authMethod,
        isVerified,
        JSON.stringify(statistics),
        JSON.stringify(profile),
        JSON.stringify(preferences)
      ];

      console.log("🔄 Executing user creation query with ID:", userId);
      const result = await client.query(query, values);
      
      const user = this.parseJsonFields(result.rows[0]);
      
      console.log("✅ User created successfully:", user.email);
      return user;
    } catch (error) {
      console.error("❌ User creation error:", error);
      
      // Handle specific error cases
      if (error.code === '23505') { // Unique violation
        throw new Error('User with this email already exists');
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper method to parse JSON fields safely
  static parseJsonFields(user) {
    if (!user) return null;
    
    try {
      if (user.statistics) {
        user.statistics = typeof user.statistics === 'string' 
          ? JSON.parse(user.statistics) 
          : user.statistics;
      } else {
        user.statistics = {};
      }

      if (user.profile) {
        user.profile = typeof user.profile === 'string'
          ? JSON.parse(user.profile)
          : user.profile;
      } else {
        user.profile = {};
      }

      if (user.preferences) {
        user.preferences = typeof user.preferences === 'string'
          ? JSON.parse(user.preferences)
          : user.preferences;
      } else {
        user.preferences = {};
      }
    } catch (error) {
      console.error("❌ Error parsing JSON fields:", error);
      // Set default values if parsing fails
      user.statistics = user.statistics || {};
      user.profile = user.profile || {};
      user.preferences = user.preferences || {};
    }
    
    return user;
  }

  // Find user by email
  static async findByEmail(email) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding user by email:", email);
      
      const query = `
        SELECT * FROM users 
        WHERE email = $1 AND is_active = true
        LIMIT 1
      `;
      
      const result = await client.query(query, [email]);
      const user = this.parseJsonFields(result.rows[0]);
      
      console.log("✅ User found by email:", user ? user.email : 'Not found');
      return user;
    } catch (error) {
      console.error("❌ Error finding user by email:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find user by ID
  static async findById(id) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding user by ID:", id);
      
      const query = `
        SELECT * FROM users 
        WHERE id = $1 AND is_active = true
        LIMIT 1
      `;
      
      const result = await client.query(query, [id]);
      const user = this.parseJsonFields(result.rows[0]);
      
      console.log("✅ User found by ID:", user ? user.email : 'Not found');
      return user;
    } catch (error) {
      console.error("❌ Error finding user by ID:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find user by Google ID
  static async findByGoogleId(googleId) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding user by Google ID:", googleId);
      
      const query = `
        SELECT * FROM users 
        WHERE google_id = $1 AND is_active = true
        LIMIT 1
      `;
      
      const result = await client.query(query, [googleId]);
      const user = this.parseJsonFields(result.rows[0]);
      
      console.log("✅ User found by Google ID:", user ? user.email : 'Not found');
      return user;
    } catch (error) {
      console.error("❌ Error finding user by Google ID:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find user by email verification token
  static async findByEmailVerificationToken(token) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding user by email verification token");
      
      const query = `
        SELECT * FROM users 
        WHERE email_verification_token = $1 
        AND email_verification_expires > NOW() 
        AND is_active = true
        LIMIT 1
      `;
      
      const result = await client.query(query, [token]);
      const user = this.parseJsonFields(result.rows[0]);
      
      console.log("✅ User found by verification token:", user ? user.email : 'Not found');
      return user;
    } catch (error) {
      console.error("❌ Error finding user by verification token:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update user
  static async update(id, updateData) {
    const client = await pool.connect();
    try {
      console.log("🔄 Updating user:", id);
      
      const allowedFields = [
        'name', 'email', 'password', 'avatar', 'role', 
        'google_id', 'auth_method', 'is_verified', 
        'email_verification_token', 'email_verification_expires',
        'reset_password_token', 'reset_password_expires',
        'reset_password_otp', 'profile', 'preferences', 'statistics'
      ];
      
      const setClauses = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          // Handle JSON fields
          if (['statistics', 'profile', 'preferences'].includes(key) && typeof value === 'object') {
            setClauses.push(`${key} = $${paramCount}`);
            values.push(JSON.stringify(value));
          } else {
            // Convert camelCase to snake_case for database
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            setClauses.push(`${dbKey} = $${paramCount}`);
            values.push(value);
          }
          paramCount++;
        }
      }

      if (setClauses.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClauses.push('updated_at = NOW()');
      
      const query = `
        UPDATE users 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `;
      
      values.push(id);
      
      const result = await client.query(query, values);
      const user = this.parseJsonFields(result.rows[0]);
      
      console.log("✅ User updated successfully:", user?.email || id);
      return user;
    } catch (error) {
      console.error("❌ Error updating user:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update user statistics
  static async updateStatistics(id, statistics) {
    const client = await pool.connect();
    try {
      console.log("📊 Updating user statistics:", id);
      
      const query = `
        UPDATE users 
        SET statistics = $1, updated_at = NOW()
        WHERE id = $2 AND is_active = true
        RETURNING *
      `;
      
      const result = await client.query(query, [JSON.stringify(statistics), id]);
      const user = this.parseJsonFields(result.rows[0]);
      
      console.log("✅ User statistics updated successfully");
      return user;
    } catch (error) {
      console.error("❌ Error updating user statistics:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Set OTP for password reset
  static async setOTP(id, otp, expiresAt) {
    const client = await pool.connect();
    try {
      console.log("🔑 Setting OTP for user:", id);
      
      const query = `
        UPDATE users 
        SET reset_password_otp = $1, reset_password_expires = $2, updated_at = NOW()
        WHERE id = $3 AND is_active = true
        RETURNING id, email
      `;
      
      const result = await client.query(query, [otp, expiresAt, id]);
      console.log("✅ OTP set successfully");
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error setting OTP:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find user by OTP
  static async findByOTP(email, otp) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding user by OTP:", email);
      
      const query = `
        SELECT * FROM users 
        WHERE email = $1 AND reset_password_otp = $2 
        AND reset_password_expires > NOW() AND is_active = true
        LIMIT 1
      `;
      
      const result = await client.query(query, [email, otp]);
      const user = this.parseJsonFields(result.rows[0]);
      
      console.log("✅ User found by OTP:", user ? user.email : 'Not found');
      return user;
    } catch (error) {
      console.error("❌ Error finding user by OTP:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Set reset token
  static async setResetToken(id, resetToken, expiresAt) {
    const client = await pool.connect();
    try {
      console.log("🔑 Setting reset token for user:", id);
      
      const query = `
        UPDATE users 
        SET reset_password_token = $1, reset_password_expires = $2, updated_at = NOW()
        WHERE id = $3 AND is_active = true
        RETURNING id, email
      `;
      
      const result = await client.query(query, [resetToken, expiresAt, id]);
      console.log("✅ Reset token set successfully");
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error setting reset token:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find user by reset token
  static async findByResetToken(resetToken) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding user by reset token");
      
      const query = `
        SELECT * FROM users 
        WHERE reset_password_token = $1 
        AND reset_password_expires > NOW() AND is_active = true
        LIMIT 1
      `;
      
      const result = await client.query(query, [resetToken]);
      const user = this.parseJsonFields(result.rows[0]);
      
      console.log("✅ User found by reset token:", user ? user.email : 'Not found');
      return user;
    } catch (error) {
      console.error("❌ Error finding user by reset token:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all users (Admin only)
  static async findAll(filters = {}) {
    const client = await pool.connect();
    try {
      console.log("👥 Finding all users with filters:", filters);
      
      const { search, role, isVerified, limit = 10, offset = 0 } = filters;
      
      let query = `
        SELECT * FROM users 
        WHERE is_active = true AND role != 'admin'
      `;
      
      const values = [];
      let paramCount = 1;

      if (search) {
        query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        values.push(`%${search}%`);
        paramCount++;
      }

      if (role) {
        query += ` AND role = $${paramCount}`;
        values.push(role);
        paramCount++;
      }

      if (isVerified !== undefined) {
        query += ` AND is_verified = $${paramCount}`;
        values.push(isVerified);
        paramCount++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);

      const result = await client.query(query, values);
      
      // Parse JSON fields using helper method
      const users = result.rows.map(user => this.parseJsonFields(user));
      
      console.log("✅ Users found:", users.length);
      return users;
    } catch (error) {
      console.error("❌ Error finding all users:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Count users (Admin only)
  static async count(filters = {}) {
    const client = await pool.connect();
    try {
      console.log("🔢 Counting users with filters:", filters);
      
      const { search, role, isVerified } = filters;
      
      let query = `SELECT COUNT(*) FROM users WHERE is_active = true AND role != 'admin'`;
      const values = [];
      let paramCount = 1;

      if (search) {
        query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        values.push(`%${search}%`);
        paramCount++;
      }

      if (role) {
        query += ` AND role = $${paramCount}`;
        values.push(role);
        paramCount++;
      }

      if (isVerified !== undefined) {
        query += ` AND is_verified = $${paramCount}`;
        values.push(isVerified);
        paramCount++;
      }

      const result = await client.query(query, values);
      const count = parseInt(result.rows[0].count);
      
      console.log("✅ User count:", count);
      return count;
    } catch (error) {
      console.error("❌ Error counting users:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete user (soft delete)
  static async delete(id) {
    const client = await pool.connect();
    try {
      console.log("🗑️ Deleting user:", id);
      
      const query = `
        UPDATE users 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id, email
      `;
      
      const result = await client.query(query, [id]);
      console.log("✅ User deleted successfully");
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Sanitize user data (remove sensitive information)
  static sanitizeUser(user) {
    if (!user) return null;
    
    const sanitized = { ...user };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.reset_password_otp;
    delete sanitized.reset_password_token;
    delete sanitized.reset_password_expires;
    delete sanitized.email_verification_token;
    delete sanitized.email_verification_expires;
    
    // Convert snake_case to camelCase for frontend
    const camelCaseUser = {};
    Object.keys(sanitized).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      camelCaseUser[camelKey] = sanitized[key];
    });
    
    return camelCaseUser;
  }
}

export default User;