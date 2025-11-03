// models/Lesson.js - COMPATIBLE WITH EXISTING COURSE MODEL
import { pool } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

export default class Lesson {
  /**
   * Create lessons table (if you want separate table instead of JSONB)
   * This is optional - your Course model stores lessons in JSONB
   */
  static async createTable() {
    const client = await pool.connect();
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS lessons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          content TEXT,
          video_url VARCHAR(500),
          thumbnail VARCHAR(500),
          attachments JSONB DEFAULT '[]',
          duration VARCHAR(50),
          order_index INTEGER DEFAULT 0,
          lesson_type VARCHAR(50) DEFAULT 'video',
          is_free BOOLEAN DEFAULT FALSE,
          is_published BOOLEAN DEFAULT TRUE,
          created_by UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
        CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(course_id, order_index);
        CREATE INDEX IF NOT EXISTS idx_lessons_published ON lessons(is_published);
      `;

      await client.query(query);
      console.log("✅ Lessons table created successfully");
    } catch (error) {
      console.error("❌ Error creating lessons table:", error);
      // Don't throw error if table already exists
      if (error.code !== '42P07') {
        throw error;
      }
    } finally {
      client.release();
    }
  }

  /**
   * Create a new lesson (compatible with both JSONB and table storage)
   */
  static async create(lessonData) {
    const client = await pool.connect();
    try {
      const {
        courseId,
        title,
        description,
        content,
        videoUrl,
        thumbnail,
        attachments,
        duration,
        order,
        lessonType,
        isFree,
        isPublished,
        createdBy,
      } = lessonData;

      const lessonId = uuidv4();

      const query = `
        INSERT INTO lessons (
          id, course_id, title, description, content, video_url,
          thumbnail, attachments, duration, order_index, lesson_type,
          is_free, is_published, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        lessonId,
        courseId,
        title,
        description || '',
        content || '',
        videoUrl || '',
        thumbnail || '',
        JSON.stringify(attachments || []),
        duration || '',
        order || 0,
        lessonType || 'video',
        isFree !== undefined ? isFree : false,
        isPublished !== undefined ? isPublished : true,
        createdBy,
      ];

      const result = await client.query(query, values);
      return this.mapLesson(result.rows[0]);
    } catch (error) {
      console.error("❌ Create lesson error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find lesson by ID
   */
  static async findById(id) {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM lessons WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) return null;
      return this.mapLesson(result.rows[0]);
    } catch (error) {
      console.error("❌ Find lesson by ID error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find all lessons for a course
   */
  static async findByCourseId(courseId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM lessons 
        WHERE course_id = $1 
        ORDER BY order_index ASC, created_at ASC
      `;
      
      const result = await client.query(query, [courseId]);
      return result.rows.map(row => this.mapLesson(row));
    } catch (error) {
      console.error("❌ Find lessons by course error:", error);
      // Return empty array if table doesn't exist yet
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find published lessons for a course
   */
  static async findPublishedByCourseId(courseId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT * FROM lessons 
        WHERE course_id = $1 AND is_published = TRUE
        ORDER BY order_index ASC, created_at ASC
      `;
      
      const result = await client.query(query, [courseId]);
      return result.rows.map(row => this.mapLesson(row));
    } catch (error) {
      console.error("❌ Find published lessons error:", error);
      if (error.code === '42P01') {
        return [];
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a lesson
   */
  static async update(id, updateData) {
    const client = await pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = {
        title: 'title',
        description: 'description',
        content: 'content',
        videoUrl: 'video_url',
        thumbnail: 'thumbnail',
        attachments: 'attachments',
        duration: 'duration',
        order: 'order_index',
        lessonType: 'lesson_type',
        isFree: 'is_free',
        isPublished: 'is_published',
      };

      Object.keys(updateData).forEach(key => {
        if (allowedFields[key]) {
          fields.push(`${allowedFields[key]} = $${paramCount}`);
          
          if (key === 'attachments' && Array.isArray(updateData[key])) {
            values.push(JSON.stringify(updateData[key]));
          } else {
            values.push(updateData[key]);
          }
          
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      fields.push('updated_at = NOW()');
      values.push(id);

      const query = `
        UPDATE lessons 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await client.query(query, values);
      if (result.rows.length === 0) return null;
      return this.mapLesson(result.rows[0]);
    } catch (error) {
      console.error("❌ Update lesson error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a lesson
   */
  static async delete(id) {
    const client = await pool.connect();
    try {
      const query = 'DELETE FROM lessons WHERE id = $1 RETURNING *';
      const result = await client.query(query, [id]);
      return result.rows.length > 0;
    } catch (error) {
      console.error("❌ Delete lesson error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete all lessons for a course
   */
  static async deleteByCourseId(courseId) {
    const client = await pool.connect();
    try {
      const query = 'DELETE FROM lessons WHERE course_id = $1';
      const result = await client.query(query, [courseId]);
      return result.rowCount;
    } catch (error) {
      console.error("❌ Delete lessons by course error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if lesson exists in course
   */
  static async existsInCourse(lessonId, courseId) {
    const client = await pool.connect();
    try {
      const query = 'SELECT id FROM lessons WHERE id = $1 AND course_id = $2';
      const result = await client.query(query, [lessonId, courseId]);
      return result.rows.length > 0;
    } catch (error) {
      console.error("❌ Check lesson existence error:", error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Get lesson count for a course
   */
  static async countByCourse(courseId) {
    const client = await pool.connect();
    try {
      const query = 'SELECT COUNT(*) FROM lessons WHERE course_id = $1';
      const result = await client.query(query, [courseId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error("❌ Count lessons error:", error);
      return 0;
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to lesson object
   */
  static mapLesson(row) {
    if (!row) return null;

    return {
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      description: row.description,
      content: row.content,
      videoUrl: row.video_url,
      thumbnail: row.thumbnail,
      attachments: typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments,
      duration: row.duration,
      order: row.order_index,
      lessonType: row.lesson_type,
      isFree: row.is_free,
      isPublished: row.is_published,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Sanitize lesson data
   */
  static sanitize(lesson) {
    if (!lesson) return null;
    return { ...lesson };
  }
}