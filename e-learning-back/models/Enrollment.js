import { pool } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

export class Enrollment {
  // Create new enrollment
  static async create(enrollmentData) {
    const client = await pool.connect();
    try {
      console.log("📝 Creating enrollment with data:", enrollmentData);

      const {
        courseId,
        userId,
        status = 'active'
      } = enrollmentData;

      // Generate enrollment ID
      const enrollmentId = uuidv4();

      const query = `
        INSERT INTO enrollments (
          id, course_id, user_id, status, progress, 
          completed_lessons, current_lesson_id, last_accessed_at,
          enrolled_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        enrollmentId,
        courseId,
        userId,
        status,
        0, // progress
        JSON.stringify([]), // completed_lessons
        null, // current_lesson_id
        new Date().toISOString(), // last_accessed_at
        new Date().toISOString(), // enrolled_at
        new Date().toISOString() // updated_at
      ];

      console.log("🔄 Executing enrollment creation query with ID:", enrollmentId);
      const result = await client.query(query, values);
      
      const enrollment = result.rows[0];
      
      // Parse JSON fields
      if (enrollment.completed_lessons) {
        enrollment.completed_lessons = typeof enrollment.completed_lessons === 'string' 
          ? JSON.parse(enrollment.completed_lessons) 
          : enrollment.completed_lessons;
      } else {
        enrollment.completed_lessons = [];
      }
      
      console.log("✅ Enrollment created successfully for user:", userId);
      return enrollment;
    } catch (error) {
      console.error("❌ Enrollment creation error:", error);
      
      // Handle specific error cases
      if (error.code === '23505') { // Unique violation
        throw new Error('User is already enrolled in this course');
      } else if (error.code === '23503') { // Foreign key violation
        if (error.constraint.includes('course_id')) {
          throw new Error('Course not found');
        } else if (error.constraint.includes('user_id')) {
          throw new Error('User not found');
        }
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  // Find enrollment by course and user
  static async findByCourseAndUser(courseId, userId) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding enrollment by course and user:", { courseId, userId });
      
      const query = `
        SELECT * FROM enrollments 
        WHERE course_id = $1 AND user_id = $2 AND status != 'cancelled'
        LIMIT 1
      `;
      
      const result = await client.query(query, [courseId, userId]);
      const enrollment = result.rows[0];
      
      if (enrollment) {
        // Parse JSON fields
        if (enrollment.completed_lessons) {
          enrollment.completed_lessons = typeof enrollment.completed_lessons === 'string' 
            ? JSON.parse(enrollment.completed_lessons) 
            : enrollment.completed_lessons;
        } else {
          enrollment.completed_lessons = [];
        }
      }
      
      console.log("✅ Enrollment found:", enrollment ? "Yes" : "No");
      return enrollment;
    } catch (error) {
      console.error("❌ Error finding enrollment by course and user:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find enrollments by user
  static async findByUser(userId, filters = {}) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding enrollments by user:", userId, "with filters:", filters);
      
      const { status, limit = 10, offset = 0 } = filters;
      
      let query = `
        SELECT e.*, c.title as course_title, c.thumbnail as course_thumbnail,
               c.instructor_name, c.price as course_price, c.level as course_level
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.user_id = $1 AND e.status != 'cancelled'
      `;
      
      const values = [userId];
      let paramCount = 2;

      if (status) {
        query += ` AND e.status = $${paramCount}`;
        values.push(status);
        paramCount++;
      }

      query += ` ORDER BY e.enrolled_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);

      const result = await client.query(query, values);
      
      // Parse JSON fields for all enrollments
      const enrollments = result.rows.map(enrollment => {
        if (enrollment.completed_lessons) {
          enrollment.completed_lessons = typeof enrollment.completed_lessons === 'string' 
            ? JSON.parse(enrollment.completed_lessons) 
            : enrollment.completed_lessons;
        } else {
          enrollment.completed_lessons = [];
        }
        return enrollment;
      });
      
      console.log("✅ Enrollments found for user:", enrollments.length);
      return enrollments;
    } catch (error) {
      console.error("❌ Error finding enrollments by user:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find enrollments by course
  static async findByCourse(courseId, filters = {}) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding enrollments by course:", courseId, "with filters:", filters);
      
      const { status, limit = 10, offset = 0 } = filters;
      
      let query = `
        SELECT e.*, u.name as user_name, u.email as user_email, u.avatar as user_avatar
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        WHERE e.course_id = $1 AND e.status != 'cancelled'
      `;
      
      const values = [courseId];
      let paramCount = 2;

      if (status) {
        query += ` AND e.status = $${paramCount}`;
        values.push(status);
        paramCount++;
      }

      query += ` ORDER BY e.enrolled_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);

      const result = await client.query(query, values);
      
      // Parse JSON fields for all enrollments
      const enrollments = result.rows.map(enrollment => {
        if (enrollment.completed_lessons) {
          enrollment.completed_lessons = typeof enrollment.completed_lessons === 'string' 
            ? JSON.parse(enrollment.completed_lessons) 
            : enrollment.completed_lessons;
        } else {
          enrollment.completed_lessons = [];
        }
        return enrollment;
      });
      
      console.log("✅ Enrollments found for course:", enrollments.length);
      return enrollments;
    } catch (error) {
      console.error("❌ Error finding enrollments by course:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update enrollment progress
  static async updateProgress(enrollmentId, progressData) {
    const client = await pool.connect();
    try {
      console.log("📊 Updating enrollment progress:", enrollmentId, "with data:", progressData);

      const {
        completedLessons = [],
        progress = 0,
        currentLessonId = null
      } = progressData;

      const query = `
        UPDATE enrollments 
        SET completed_lessons = $1, progress = $2, current_lesson_id = $3, 
            last_accessed_at = $4, updated_at = $5
        WHERE id = $6
        RETURNING *
      `;

      const values = [
        JSON.stringify(completedLessons),
        progress,
        currentLessonId,
        new Date().toISOString(), // last_accessed_at
        new Date().toISOString(), // updated_at
        enrollmentId
      ];

      const result = await client.query(query, values);
      const enrollment = result.rows[0];
      
      if (enrollment && enrollment.completed_lessons) {
        enrollment.completed_lessons = typeof enrollment.completed_lessons === 'string' 
          ? JSON.parse(enrollment.completed_lessons) 
          : enrollment.completed_lessons;
      }
      
      console.log("✅ Enrollment progress updated successfully");
      return enrollment;
    } catch (error) {
      console.error("❌ Error updating enrollment progress:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Cancel enrollment
  static async cancel(enrollmentId) {
    const client = await pool.connect();
    try {
      console.log("🗑️ Canceling enrollment:", enrollmentId);
      
      const query = `
        UPDATE enrollments 
        SET status = 'cancelled', updated_at = $1
        WHERE id = $2
        RETURNING id, course_id, user_id
      `;
      
      const result = await client.query(query, [new Date().toISOString(), enrollmentId]);
      console.log("✅ Enrollment cancelled successfully");
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error canceling enrollment:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Complete enrollment
  static async complete(enrollmentId) {
    const client = await pool.connect();
    try {
      console.log("🎓 Completing enrollment:", enrollmentId);
      
      const query = `
        UPDATE enrollments 
        SET status = 'completed', progress = 100, updated_at = $1, completed_at = $2
        WHERE id = $3
        RETURNING id, course_id, user_id
      `;
      
      const result = await client.query(query, [
        new Date().toISOString(), // updated_at
        new Date().toISOString(), // completed_at
        enrollmentId
      ]);
      console.log("✅ Enrollment completed successfully");
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error completing enrollment:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get enrollment statistics for a course
  static async getStats(courseId) {
    const client = await pool.connect();
    try {
      console.log("📈 Getting enrollment stats for course:", courseId);
      
      const query = `
        SELECT 
          COUNT(*) as total_enrollments,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_enrollments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_enrollments,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_enrollments,
          AVG(progress) as average_progress,
          MAX(last_accessed_at) as last_activity
        FROM enrollments 
        WHERE course_id = $1
      `;
      
      const result = await client.query(query, [courseId]);
      const stats = result.rows[0];
      
      console.log("✅ Enrollment stats retrieved");
      return stats;
    } catch (error) {
      console.error("❌ Error getting enrollment stats:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user enrollment statistics
  static async getUserStats(userId) {
    const client = await pool.connect();
    try {
      console.log("📈 Getting user enrollment stats:", userId);
      
      const query = `
        SELECT 
          COUNT(*) as total_enrollments,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_enrollments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_enrollments,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_enrollments,
          AVG(progress) as average_progress,
          SUM(CASE WHEN progress = 100 THEN 1 ELSE 0 END) as completed_courses
        FROM enrollments 
        WHERE user_id = $1
      `;
      
      const result = await client.query(query, [userId]);
      const stats = result.rows[0];
      
      console.log("✅ User enrollment stats retrieved");
      return stats;
    } catch (error) {
      console.error("❌ Error getting user enrollment stats:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find enrollment by ID
  static async findById(enrollmentId) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding enrollment by ID:", enrollmentId);
      
      const query = `
        SELECT e.*, c.title as course_title, c.thumbnail as course_thumbnail,
               c.instructor_name, u.name as user_name, u.email as user_email
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users u ON e.user_id = u.id
        WHERE e.id = $1
      `;
      
      const result = await client.query(query, [enrollmentId]);
      const enrollment = result.rows[0];
      
      if (enrollment && enrollment.completed_lessons) {
        enrollment.completed_lessons = typeof enrollment.completed_lessons === 'string' 
          ? JSON.parse(enrollment.completed_lessons) 
          : enrollment.completed_lessons;
      }
      
      console.log("✅ Enrollment found by ID:", enrollment ? "Yes" : "No");
      return enrollment;
    } catch (error) {
      console.error("❌ Error finding enrollment by ID:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update enrollment status
  static async updateStatus(enrollmentId, status) {
    const client = await pool.connect();
    try {
      console.log("🔄 Updating enrollment status:", enrollmentId, "to:", status);
      
      const validStatuses = ['active', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid enrollment status');
      }
      
      const query = `
        UPDATE enrollments 
        SET status = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `;
      
      const result = await client.query(query, [status, new Date().toISOString(), enrollmentId]);
      console.log("✅ Enrollment status updated successfully");
      return result.rows[0];
    } catch (error) {
      console.error("❌ Error updating enrollment status:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Export as default
export default Enrollment;