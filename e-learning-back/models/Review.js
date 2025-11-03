// models/Review.js
import { pool } from '../config/db.js';

export default class Review {
  // Create review
  static async create(reviewData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const query = `
        INSERT INTO reviews (
          user_id, course_id, rating, comment, is_active
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const values = [
        reviewData.userId,
        reviewData.courseId,
        reviewData.rating,
        reviewData.comment || '',
        reviewData.isActive !== false
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      const review = result.rows[0];
      return await this.enrichReviewData(review);
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Handle unique constraint violation (one review per user per course)
      if (error.code === '23505') {
        throw new Error('You have already reviewed this course');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  // Get review by ID
  static async findById(id) {
    const query = 'SELECT * FROM reviews WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows[0]) {
      return await this.enrichReviewData(result.rows[0]);
    }
    return null;
  }

  // Get reviews for course with pagination and filtering
  static async findByCourseId(courseId, options = {}) {
    let query = `
      SELECT r.*, 
             u.name as user_name, 
             u.avatar as user_avatar,
             c.title as course_title
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
      WHERE r.course_id = $1
    `;
    
    const values = [courseId];
    let paramCount = 2;

    if (options.activeOnly !== false) {
      query += ` AND r.is_active = $${paramCount}`;
      values.push(true);
      paramCount++;
    }

    // Sorting
    if (options.sortBy === 'rating') {
      query += ' ORDER BY r.rating DESC';
    } else if (options.sortBy === 'oldest') {
      query += ' ORDER BY r.created_at ASC';
    } else {
      query += ' ORDER BY r.created_at DESC'; // default: newest first
    }

    // Pagination
    if (options.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(parseInt(options.limit));
      paramCount++;
    }

    if (options.offset) {
      query += ` OFFSET $${paramCount}`;
      values.push(parseInt(options.offset));
    }

    const result = await pool.query(query, values);
    return result.rows.map(review => this.formatReviewResponse(review));
  }

  // Get reviews by user
  static async findByUserId(userId, options = {}) {
    let query = `
      SELECT r.*, 
             u.name as user_name, 
             u.avatar as user_avatar,
             c.title as course_title,
             c.thumbnail as course_thumbnail
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
      WHERE r.user_id = $1
    `;
    
    const values = [userId];
    let paramCount = 2;

    if (options.activeOnly !== false) {
      query += ` AND r.is_active = $${paramCount}`;
      values.push(true);
      paramCount++;
    }

    query += ' ORDER BY r.created_at DESC';

    if (options.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(parseInt(options.limit));
    }

    const result = await pool.query(query, values);
    return result.rows.map(review => this.formatReviewResponse(review));
  }

  // Get course rating stats (replaces the static method)
  static async getCourseRatingStats(courseId) {
    const query = `
      SELECT 
        course_id,
        AVG(rating) as average_rating,
        COUNT(*) as total_ratings,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5
      FROM reviews 
      WHERE course_id = $1 AND is_active = true
      GROUP BY course_id
    `;

    const result = await pool.query(query, [courseId]);
    
    if (result.rows.length > 0) {
      const stats = result.rows[0];
      return {
        courseId: stats.course_id,
        averageRating: parseFloat(stats.average_rating) || 0,
        totalRatings: parseInt(stats.total_ratings) || 0,
        ratingDistribution: {
          1: parseInt(stats.rating_1) || 0,
          2: parseInt(stats.rating_2) || 0,
          3: parseInt(stats.rating_3) || 0,
          4: parseInt(stats.rating_4) || 0,
          5: parseInt(stats.rating_5) || 0
        }
      };
    }

    return {
      courseId,
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  // Update review
  static async update(id, updateData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          fields.push(`${dbKey} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      values.push(id);
      const query = `
        UPDATE reviews 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $${paramCount} 
        RETURNING *
      `;
      
      const result = await client.query(query, values);
      await client.query('COMMIT');
      
      if (result.rows[0]) {
        return await this.enrichReviewData(result.rows[0]);
      }
      return null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete review (soft delete by setting is_active to false)
  static async delete(id) {
    const query = `
      UPDATE reviews 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Check if user has already reviewed a course
  static async userHasReviewed(courseId, userId) {
    const query = `
      SELECT id FROM reviews 
      WHERE course_id = $1 AND user_id = $2 AND is_active = true
    `;
    
    const result = await pool.query(query, [courseId, userId]);
    return result.rows.length > 0;
  }

  // Get user's review for a specific course
  static async getUserCourseReview(courseId, userId) {
    const query = `
      SELECT r.*, 
             u.name as user_name, 
             u.avatar as user_avatar,
             c.title as course_title
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
      WHERE r.course_id = $1 AND r.user_id = $2 AND r.is_active = true
    `;
    
    const result = await pool.query(query, [courseId, userId]);
    
    if (result.rows[0]) {
      return this.formatReviewResponse(result.rows[0]);
    }
    return null;
  }

  // Get recent reviews with user and course data
  static async getRecentReviews(limit = 10) {
    const query = `
      SELECT r.*, 
             u.name as user_name, 
             u.avatar as user_avatar,
             c.title as course_title,
             c.thumbnail as course_thumbnail
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
      WHERE r.is_active = true
      ORDER BY r.created_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows.map(review => this.formatReviewResponse(review));
  }

  // Get reviews with advanced filtering
  static async findReviews(filters = {}) {
    let query = `
      SELECT r.*, 
             u.name as user_name, 
             u.avatar as user_avatar,
             c.title as course_title
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN courses c ON r.course_id = c.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 1;

    if (filters.courseId) {
      query += ` AND r.course_id = $${paramCount}`;
      values.push(filters.courseId);
      paramCount++;
    }

    if (filters.userId) {
      query += ` AND r.user_id = $${paramCount}`;
      values.push(filters.userId);
      paramCount++;
    }

    if (filters.minRating) {
      query += ` AND r.rating >= $${paramCount}`;
      values.push(parseInt(filters.minRating));
      paramCount++;
    }

    if (filters.maxRating) {
      query += ` AND r.rating <= $${paramCount}`;
      values.push(parseInt(filters.maxRating));
      paramCount++;
    }

    if (filters.isActive !== undefined) {
      query += ` AND r.is_active = $${paramCount}`;
      values.push(filters.isActive);
      paramCount++;
    } else {
      query += ` AND r.is_active = true`;
    }

    if (filters.startDate) {
      query += ` AND r.created_at >= $${paramCount}`;
      values.push(new Date(filters.startDate));
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND r.created_at <= $${paramCount}`;
      values.push(new Date(filters.endDate));
      paramCount++;
    }

    // Sorting
    const sortField = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY r.${sortField} ${sortOrder}`;

    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(parseInt(filters.limit));
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      values.push(parseInt(filters.offset));
    }

    const result = await pool.query(query, values);
    return result.rows.map(review => this.formatReviewResponse(review));
  }

  // Count reviews for a course
  static async countCourseReviews(courseId) {
    const query = `
      SELECT COUNT(*) 
      FROM reviews 
      WHERE course_id = $1 AND is_active = true
    `;
    
    const result = await pool.query(query, [courseId]);
    return parseInt(result.rows[0].count);
  }

  // Helper method to enrich review data with user and course info
  static async enrichReviewData(review) {
    if (!review) return null;

    // Get user data
    const userQuery = 'SELECT id, name, avatar FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [review.user_id]);
    
    // Get course data
    const courseQuery = 'SELECT id, title FROM courses WHERE id = $1';
    const courseResult = await pool.query(courseQuery, [review.course_id]);

    return {
      ...review,
      userData: userResult.rows[0] || { id: review.user_id },
      courseData: courseResult.rows[0] || { id: review.course_id }
    };
  }

  // Format review for response (replaces the instance method)
  static formatReviewResponse(review) {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      isActive: review.is_active,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      user: review.user_name ? {
        id: review.user_id,
        name: review.user_name,
        avatar: review.user_avatar
      } : { id: review.user_id },
      course: review.course_title ? {
        id: review.course_id,
        title: review.course_title,
        thumbnail: review.course_thumbnail
      } : { id: review.course_id }
    };
  }

  // Get overall platform rating statistics
  static async getPlatformRatingStats() {
    const query = `
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5,
        COUNT(DISTINCT user_id) as unique_reviewers,
        COUNT(DISTINCT course_id) as reviewed_courses
      FROM reviews 
      WHERE is_active = true
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    return {
      totalReviews: parseInt(stats.total_reviews) || 0,
      averageRating: parseFloat(stats.average_rating) || 0,
      ratingDistribution: {
        1: parseInt(stats.rating_1) || 0,
        2: parseInt(stats.rating_2) || 0,
        3: parseInt(stats.rating_3) || 0,
        4: parseInt(stats.rating_4) || 0,
        5: parseInt(stats.rating_5) || 0
      },
      uniqueReviewers: parseInt(stats.unique_reviewers) || 0,
      reviewedCourses: parseInt(stats.reviewed_courses) || 0
    };
  }
}