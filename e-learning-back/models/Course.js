import { pool } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

export default class Course {
  // Helper method to safely parse JSON fields
  static parseJsonFields(course) {
    if (!course) return null;

    try {
      // Safely parse lessons
      if (course.lessons) {
        if (typeof course.lessons === 'string') {
          course.lessons = course.lessons.trim() ? JSON.parse(course.lessons) : [];
        }
      } else {
        course.lessons = [];
      }

      // Safely parse what_you_will_learn
      if (course.what_you_will_learn) {
        if (typeof course.what_you_will_learn === 'string') {
          course.what_you_will_learn = course.what_you_will_learn.trim() ? JSON.parse(course.what_you_will_learn) : [];
        }
      } else {
        course.what_you_will_learn = [];
      }

      // Safely parse requirements
      if (course.requirements) {
        if (typeof course.requirements === 'string') {
          course.requirements = course.requirements.trim() ? JSON.parse(course.requirements) : [];
        }
      } else {
        course.requirements = [];
      }

      // Safely parse target_audience
      if (course.target_audience) {
        if (typeof course.target_audience === 'string') {
          course.target_audience = course.target_audience.trim() ? JSON.parse(course.target_audience) : [];
        }
      } else {
        course.target_audience = [];
      }

      // Safely parse reviews
      if (course.reviews) {
        if (typeof course.reviews === 'string') {
          course.reviews = course.reviews.trim() ? JSON.parse(course.reviews) : [];
        }
      } else {
        course.reviews = [];
      }
    } catch (error) {
      console.error("❌ Error parsing JSON fields for course:", course.id, error);
      // Set default values if parsing fails
      course.lessons = course.lessons || [];
      course.what_you_will_learn = course.what_you_will_learn || [];
      course.requirements = course.requirements || [];
      course.target_audience = course.target_audience || [];
      course.reviews = course.reviews || [];
    }

    return course;
  }

  // Create new course - UPDATED with better error handling
  static async create(courseData) {
    const client = await pool.connect();
    try {
      console.log("📝 Creating course with data:", {
        title: courseData.title,
        created_by: courseData.created_by,
        instructor_user_id: courseData.instructor_user_id,
        instructor_name: courseData.instructor_name,
        instructor_email: courseData.instructor_email
      });

      // Validate required fields
      if (!courseData.created_by) {
        throw new Error("created_by field is required");
      }
      if (!courseData.instructor_user_id) {
        throw new Error("instructor_user_id field is required");
      }
      if (!courseData.instructor_name) {
        throw new Error("instructor_name field is required");
      }
      if (!courseData.instructor_email) {
        throw new Error("instructor_email field is required");
      }
      if (!courseData.title) {
        throw new Error("title field is required");
      }
      if (!courseData.description) {
        throw new Error("description field is required");
      }
      if (!courseData.category) {
        throw new Error("category field is required");
      }

      // Generate course ID
      const courseId = uuidv4();

      const query = `
        INSERT INTO courses (
          id, title, description, category, thumbnail, price, level, language,
          duration, created_by, instructor_name, instructor_email, instructor_user_id,
          instructor_avatar, instructor_bio, lessons, what_you_will_learn,
          requirements, target_audience, reviews, status, featured,
          total_enrollments, rating, total_ratings, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        courseId,
        courseData.title,
        courseData.description,
        courseData.category,
        courseData.thumbnail || '',
        courseData.price || 0,
        courseData.level || 'beginner',
        courseData.language || 'English',
        courseData.duration || '',
        courseData.created_by, // This must not be null
        courseData.instructor_name, // This must not be null
        courseData.instructor_email, // This must not be null
        courseData.instructor_user_id, // This must not be null
        courseData.instructor_avatar || '',
        courseData.instructor_bio || '',
        JSON.stringify(courseData.lessons || []),
        JSON.stringify(courseData.what_you_will_learn || []),
        JSON.stringify(courseData.requirements || []),
        JSON.stringify(courseData.target_audience || []),
        JSON.stringify(courseData.reviews || []),
        courseData.status || 'draft',
        courseData.featured || false,
        courseData.total_enrollments || 0,
        courseData.rating || 0,
        courseData.total_ratings || 0,
        courseData.is_active !== undefined ? courseData.is_active : true
      ];

      console.log("🔄 Executing course creation query with ID:", courseId);
      console.log("🔑 Created by user ID:", courseData.created_by);

      const result = await client.query(query, values);

      const course = this.parseJsonFields(result.rows[0]);
      console.log("✅ Course created successfully:", course.title);

      return course;
    } catch (error) {
      console.error("❌ Course creation error:", error);
      console.error("Error details:", {
        code: error.code,
        constraint: error.constraint,
        detail: error.detail,
        message: error.message
      });

      // Handle specific error cases with better messages
      if (error.code === '23505') { // Unique violation
        if (error.constraint === 'courses_instructor_idx') {
          throw new Error('Database configuration error: instructors should be able to create multiple courses. Please contact administrator.');
        } else if (error.constraint === 'courses_title_idx') {
          throw new Error('A course with this title already exists. Please choose a different title.');
        } else {
          throw new Error('A course with similar details already exists.');
        }
      } else if (error.code === '23503') { // Foreign key violation
        throw new Error('Instructor user not found or invalid user reference.');
      } else if (error.code === '23502') { // Not null violation
        const field = error.detail?.match(/column "([^"]+)"/)?.[1] || 'unknown field';
        throw new Error(`Required field '${field}' is missing.`);
      }

      throw error;
    } finally {
      client.release();
    }
  }

  // Find course by ID
  static async findById(id) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding course by ID:", id);

      const query = `
        SELECT * FROM courses 
        WHERE id = $1 AND is_active = true
      `;
      const result = await client.query(query, [id]);

      if (result.rows[0]) {
        const course = this.parseJsonFields(result.rows[0]);
        console.log("✅ Course found by ID:", course.title);
        return course;
      }

      console.log("❌ Course not found by ID:", id);
      return null;
    } catch (error) {
      console.error("❌ Find course by ID error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find courses with filters
  static async find(filters = {}) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding courses with filters:", filters);

      const {
        category,
        level,
        status,
        featured,
        instructorId,
        minPrice,
        maxPrice,
        search,
        limit = 10,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = filters;

      let query = `
        SELECT * FROM courses 
        WHERE is_active = true
      `;

      const values = [];
      let paramCount = 1;

      if (category) {
        values.push(category);
        query += ` AND category = $${paramCount}`;
        paramCount++;
      }

      if (level) {
        values.push(level);
        query += ` AND level = $${paramCount}`;
        paramCount++;
      }

      if (status) {
        values.push(status);
        query += ` AND status = $${paramCount}`;
        paramCount++;
      }

      if (featured !== undefined) {
        values.push(featured);
        query += ` AND featured = $${paramCount}`;
        paramCount++;
      }

      if (instructorId) {
        values.push(instructorId);
        query += ` AND created_by = $${paramCount}`;
        paramCount++;
      }

      if (minPrice !== undefined) {
        values.push(minPrice);
        query += ` AND price >= $${paramCount}`;
        paramCount++;
      }

      if (maxPrice !== undefined) {
        values.push(maxPrice);
        query += ` AND price <= $${paramCount}`;
        paramCount++;
      }

      if (search) {
        values.push(`%${search}%`);
        query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        paramCount++;
      }

      // Validate sortBy to prevent SQL injection
      const validSortColumns = ['created_at', 'updated_at', 'title', 'price', 'rating', 'total_enrollments'];
      const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      query += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
      values.push(limit, offset);

      console.log("🔄 Executing courses query");
      const result = await client.query(query, values);

      // Parse JSON fields for all courses using helper method
      const courses = result.rows.map(course => this.parseJsonFields(course));

      console.log("✅ Courses found:", courses.length);
      return courses;
    } catch (error) {
      console.error("❌ Find courses error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update course
  static async update(id, updateData) {
    const client = await pool.connect();
    try {
      console.log("🔄 Updating course:", id, "with data:", updateData);

      const allowedFields = [
        'title', 'description', 'category', 'thumbnail', 'price', 'level',
        'language', 'duration', 'instructor_name', 'instructor_email',
        'instructor_avatar', 'instructor_bio', 'lessons', 'what_you_will_learn',
        'requirements', 'target_audience', 'reviews', 'status', 'featured',
        'total_enrollments', 'rating', 'total_ratings', 'is_active'
      ];

      const setClauses = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          setClauses.push(`${key} = $${paramCount}`);

          // Handle JSON fields
          if (['lessons', 'what_you_will_learn', 'requirements', 'target_audience', 'reviews'].includes(key)) {
            values.push(JSON.stringify(updateData[key] || []));
          } else {
            values.push(updateData[key]);
          }

          paramCount++;
        }
      });

      if (setClauses.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClauses.push('updated_at = NOW()');
      values.push(id);

      const query = `
        UPDATE courses 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramCount} AND is_active = true
        RETURNING *
      `;

      console.log("🔄 Executing course update query");
      const result = await client.query(query, values);

      if (result.rows[0]) {
        const course = this.parseJsonFields(result.rows[0]);
        console.log("✅ Course updated successfully:", course.title);
        return course;
      }

      console.log("❌ Course not found for update:", id);
      return null;
    } catch (error) {
      console.error("❌ Update course error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete course (soft delete)
  static async delete(id) {
    const client = await pool.connect();
    try {
      console.log("🗑️ Deleting course:", id);

      const query = `
        UPDATE courses 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id, title
      `;

      const result = await client.query(query, [id]);
      console.log("✅ Course deleted successfully:", result.rows[0]?.title);
      return result.rows[0] || null;
    } catch (error) {
      console.error("❌ Delete course error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Find courses by instructor
  static async findByInstructor(instructorId) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding courses by instructor:", instructorId);

      const query = `
        SELECT * FROM courses 
        WHERE created_by = $1 AND is_active = true
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [instructorId]);

      // Parse JSON fields for all courses using helper method
      const courses = result.rows.map(course => this.parseJsonFields(course));

      console.log("✅ Courses found for instructor:", courses.length);
      return courses;
    } catch (error) {
      console.error("❌ Find courses by instructor error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Publish course
  static async publish(id) {
    const client = await pool.connect();
    try {
      console.log("📢 Publishing course:", id);

      const query = `
        UPDATE courses 
        SET status = 'published', published_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING *
      `;

      const result = await client.query(query, [id]);

      if (result.rows[0]) {
        const course = this.parseJsonFields(result.rows[0]);
        console.log("✅ Course published successfully");
        return course;
      }

      console.log("❌ Course not found for publishing:", id);
      return null;
    } catch (error) {
      console.error("❌ Publish course error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Unpublish course
  static async unpublish(id) {
    const client = await pool.connect();
    try {
      console.log("📝 Unpublishing course:", id);

      const query = `
        UPDATE courses 
        SET status = 'draft', updated_at = NOW()
        WHERE id = $1 AND is_active = true
        RETURNING *
      `;

      const result = await client.query(query, [id]);

      if (result.rows[0]) {
        const course = this.parseJsonFields(result.rows[0]);
        console.log("✅ Course unpublished successfully");
        return course;
      }

      console.log("❌ Course not found for unpublishing:", id);
      return null;
    } catch (error) {
      console.error("❌ Unpublish course error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Add lesson to course
  static async addLesson(courseId, lessonData) {
    const client = await pool.connect();
    try {
      console.log("📚 Adding lesson to course:", courseId, "with data:", lessonData);

      // First get the current course
      const course = await this.findById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      // Generate lesson ID
      const lessonId = uuidv4();
      const newLesson = {
        id: lessonId,
        ...lessonData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add new lesson to lessons array
      const updatedLessons = [...course.lessons, newLesson];

      // Update course with new lessons array
      const updatedCourse = await this.update(courseId, { lessons: updatedLessons });
      console.log("✅ Lesson added successfully to course:", courseId);
      return updatedCourse;
    } catch (error) {
      console.error("❌ Add lesson error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update lesson in course
  static async updateLesson(courseId, lessonId, updateData) {
    const client = await pool.connect();
    try {
      console.log("📝 Updating lesson:", lessonId, "in course:", courseId);

      // First get the current course
      const course = await this.findById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      // Find and update the lesson
      const updatedLessons = course.lessons.map(lesson => {
        if (lesson.id === lessonId) {
          return {
            ...lesson,
            ...updateData,
            updated_at: new Date().toISOString()
          };
        }
        return lesson;
      });

      // Update course with updated lessons array
      const updatedCourse = await this.update(courseId, { lessons: updatedLessons });
      console.log("✅ Lesson updated successfully");
      return updatedCourse;
    } catch (error) {
      console.error("❌ Update lesson error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete lesson from course
  static async deleteLesson(courseId, lessonId) {
    const client = await pool.connect();
    try {
      console.log("🗑️ Deleting lesson:", lessonId, "from course:", courseId);

      // First get the current course
      const course = await this.findById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      // Filter out the lesson to delete
      const updatedLessons = course.lessons.filter(lesson => lesson.id !== lessonId);

      // Update course with filtered lessons array
      const updatedCourse = await this.update(courseId, { lessons: updatedLessons });
      console.log("✅ Lesson deleted successfully");
      return updatedCourse;
    } catch (error) {
      console.error("❌ Delete lesson error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Check if user is enrolled in course
  static async isUserEnrolled(courseId, userId) {
    const client = await pool.connect();
    try {
      console.log("🔍 Checking if user is enrolled:", { courseId, userId });

      const query = `
        SELECT 1 FROM enrollments 
        WHERE course_id = $1 AND user_id = $2 AND status = 'active'
        LIMIT 1
      `;

      const result = await client.query(query, [courseId, userId]);
      const isEnrolled = result.rows.length > 0;

      console.log("✅ Enrollment check result:", isEnrolled);
      return isEnrolled;
    } catch (error) {
      console.error("❌ Check user enrollment error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update course enrollment count
  static async updateEnrollmentCount(courseId, increment = true) {
    const client = await pool.connect();
    try {
      console.log("📊 Updating enrollment count for course:", courseId, "increment:", increment);

      const operator = increment ? '+' : '-';
      const query = `
        UPDATE courses 
        SET total_enrollments = total_enrollments ${operator} 1, 
            updated_at = NOW()
        WHERE id = $1
        RETURNING total_enrollments
      `;

      const result = await client.query(query, [courseId]);
      console.log("✅ Enrollment count updated:", result.rows[0].total_enrollments);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Update enrollment count error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get course enrollment statistics
  static async getEnrollmentStats(courseId) {
    const client = await pool.connect();
    try {
      console.log("📈 Getting enrollment stats for course:", courseId);

      const query = `
        SELECT 
          COUNT(*) as total_enrollments,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_enrollments,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_enrollments,
          AVG(progress) as average_progress
        FROM enrollments 
        WHERE course_id = $1
      `;

      const result = await client.query(query, [courseId]);
      console.log("✅ Enrollment stats retrieved");
      return result.rows[0];
    } catch (error) {
      console.error("❌ Get enrollment stats error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Add review to course
  static async addReview(courseId, reviewData) {
    const client = await pool.connect();
    try {
      console.log("⭐ Adding review to course:", courseId, "with data:", reviewData);

      // First get the current course
      const course = await this.findById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      // Generate review ID
      const reviewId = uuidv4();
      const newReview = {
        id: reviewId,
        ...reviewData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true
      };

      // Add new review to reviews array
      const updatedReviews = [...course.reviews, newReview];

      // Update course with new reviews array
      await this.update(courseId, { reviews: updatedReviews });

      // Recalculate course rating
      await this.calculateRatingStats(courseId);

      console.log("✅ Review added successfully");
      return this.findById(courseId);
    } catch (error) {
      console.error("❌ Add review error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Calculate course rating statistics
  static async calculateRatingStats(courseId) {
    const client = await pool.connect();
    try {
      console.log("📊 Calculating rating stats for course:", courseId);

      const course = await this.findById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      const activeReviews = course.reviews.filter(review => review.is_active);

      if (activeReviews.length === 0) {
        // No reviews, set default values
        await this.update(courseId, {
          rating: 0,
          total_ratings: 0
        });
        console.log("✅ Rating stats reset (no reviews)");
        return;
      }

      const totalRating = activeReviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / activeReviews.length;

      await this.update(courseId, {
        rating: parseFloat(averageRating.toFixed(2)),
        total_ratings: activeReviews.length
      });

      console.log("✅ Rating stats calculated:", { averageRating, totalReviews: activeReviews.length });
    } catch (error) {
      console.error("❌ Calculate rating stats error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get featured courses
  static async getFeaturedCourses(limit = 10) {
    const client = await pool.connect();
    try {
      console.log("🌟 Getting featured courses, limit:", limit);

      const query = `
        SELECT * FROM courses 
        WHERE featured = true AND status = 'published' AND is_active = true
        ORDER BY created_at DESC
        LIMIT $1
      `;

      const result = await client.query(query, [limit]);

      // Parse JSON fields for all courses using helper method
      const courses = result.rows.map(course => this.parseJsonFields(course));

      console.log("✅ Featured courses found:", courses.length);
      return courses;
    } catch (error) {
      console.error("❌ Get featured courses error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get popular courses
  static async getPopularCourses(limit = 10) {
    const client = await pool.connect();
    try {
      console.log("🔥 Getting popular courses, limit:", limit);

      const query = `
        SELECT * FROM courses 
        WHERE status = 'published' AND is_active = true
        ORDER BY total_enrollments DESC, rating DESC
        LIMIT $1
      `;

      const result = await client.query(query, [limit]);

      // Parse JSON fields for all courses using helper method
      const courses = result.rows.map(course => this.parseJsonFields(course));

      console.log("✅ Popular courses found:", courses.length);
      return courses;
    } catch (error) {
      console.error("❌ Get popular courses error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Search courses
  static async search(searchTerm, filters = {}) {
    const client = await pool.connect();
    try {
      console.log("🔍 Searching courses for:", searchTerm, "with filters:", filters);

      const {
        category,
        level,
        minPrice,
        maxPrice,
        limit = 10,
        offset = 0
      } = filters;

      let query = `
        SELECT * FROM courses 
        WHERE is_active = true AND status = 'published'
        AND (title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
      `;

      const values = [`%${searchTerm}%`];
      let paramCount = 2;

      if (category) {
        values.push(category);
        query += ` AND category = $${paramCount}`;
        paramCount++;
      }

      if (level) {
        values.push(level);
        query += ` AND level = $${paramCount}`;
        paramCount++;
      }

      if (minPrice !== undefined) {
        values.push(minPrice);
        query += ` AND price >= $${paramCount}`;
        paramCount++;
      }

      if (maxPrice !== undefined) {
        values.push(maxPrice);
        query += ` AND price <= $${paramCount}`;
        paramCount++;
      }

      query += ` ORDER BY 
        CASE 
          WHEN title ILIKE $1 THEN 1
          WHEN description ILIKE $1 THEN 2
          ELSE 3
        END,
        total_enrollments DESC, rating DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

      values.push(limit, offset);

      console.log("🔄 Executing search query");
      const result = await client.query(query, values);

      // Parse JSON fields for all courses using helper method
      const courses = result.rows.map(course => this.parseJsonFields(course));

      console.log("✅ Search results found:", courses.length);
      return courses;
    } catch (error) {
      console.error("❌ Search courses error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get course by slug or ID
  static async findBySlugOrId(identifier) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding course by slug or ID:", identifier);

      // Check if it's a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

      let query, values;

      if (isUuid) {
        query = `SELECT * FROM courses WHERE id = $1 AND is_active = true`;
        values = [identifier];
      } else {
        // For slug, you might need to add a slug column to your courses table
        // For now, we'll search by title (you should add proper slug support)
        query = `SELECT * FROM courses WHERE title ILIKE $1 AND is_active = true AND status = 'published'`;
        values = [`%${identifier}%`];
      }

      const result = await client.query(query, values);

      if (result.rows[0]) {
        const course = this.parseJsonFields(result.rows[0]);
        console.log("✅ Course found:", course.title);
        return course;
      }

      console.log("❌ Course not found:", identifier);
      return null;
    } catch (error) {
      console.error("❌ Find course by slug or ID error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get courses by multiple IDs
  static async findByIds(ids) {
    const client = await pool.connect();
    try {
      console.log("🔍 Finding courses by IDs:", ids);

      if (!ids || ids.length === 0) {
        return [];
      }

      const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
      const query = `
        SELECT * FROM courses 
        WHERE id IN (${placeholders}) AND is_active = true
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, ids);

      // Parse JSON fields for all courses using helper method
      const courses = result.rows.map(course => this.parseJsonFields(course));

      console.log("✅ Courses found by IDs:", courses.length);
      return courses;
    } catch (error) {
      console.error("❌ Find courses by IDs error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Increment view count
  static async incrementViewCount(courseId) {
    const client = await pool.connect();
    try {
      console.log("👀 Incrementing view count for course:", courseId);

      // Note: You'll need to add a view_count column to your courses table
      const query = `
        UPDATE courses 
        SET view_count = COALESCE(view_count, 0) + 1, 
            updated_at = NOW()
        WHERE id = $1
        RETURNING view_count
      `;

      const result = await client.query(query, [courseId]);
      console.log("✅ View count incremented:", result.rows[0]?.view_count);
      return result.rows[0];
    } catch (error) {
      console.error("❌ Increment view count error:", error);
      // Don't throw error for view count updates as they're not critical
      return null;
    } finally {
      client.release();
    }
  }

  // Get course completion stats
  static async getCompletionStats(courseId) {
    const client = await pool.connect();
    try {
      console.log("📊 Getting completion stats for course:", courseId);

      const query = `
        SELECT 
          COUNT(*) as total_enrollments,
          COUNT(CASE WHEN progress = 100 THEN 1 END) as completed_enrollments,
          AVG(progress) as average_progress,
          COUNT(CASE WHEN progress >= 50 AND progress < 100 THEN 1 END) as half_completed,
          COUNT(CASE WHEN progress < 50 THEN 1 END) as just_started
        FROM enrollments 
        WHERE course_id = $1 AND status = 'active'
      `;

      const result = await client.query(query, [courseId]);
      console.log("✅ Completion stats retrieved");
      return result.rows[0];
    } catch (error) {
      console.error("❌ Get completion stats error:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Bulk update courses
  static async bulkUpdate(ids, updateData) {
    const client = await pool.connect();
    try {
      console.log("🔄 Bulk updating courses:", ids, "with data:", updateData);

      if (!ids || ids.length === 0) {
        throw new Error('No course IDs provided');
      }

      const allowedFields = [
        'status', 'featured', 'is_active'
      ];

      const setClauses = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          setClauses.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (setClauses.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClauses.push('updated_at = NOW()');

      // Create placeholders for IDs
      const idPlaceholders = ids.map((_, index) => `$${paramCount + index}`).join(',');
      values.push(...ids);

      const query = `
        UPDATE courses 
        SET ${setClauses.join(', ')}
        WHERE id IN (${idPlaceholders})
        RETURNING id, title, status
      `;

      const result = await client.query(query, values);
      console.log("✅ Bulk update completed, affected:", result.rows.length);
      return result.rows;
    } catch (error) {
      console.error("❌ Bulk update courses error:", error);
      throw error;
    } finally {
      client.release();
    }
  }
}