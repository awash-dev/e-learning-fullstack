DROP INDEX "course_categories_parent_idx";--> statement-breakpoint
DROP INDEX "course_progress_user_course_idx";--> statement-breakpoint
DROP INDEX "courses_instructor_idx";--> statement-breakpoint
DROP INDEX "courses_category_idx";--> statement-breakpoint
DROP INDEX "courses_status_idx";--> statement-breakpoint
DROP INDEX "courses_featured_idx";--> statement-breakpoint
DROP INDEX "enrollments_user_idx";--> statement-breakpoint
DROP INDEX "enrollments_course_idx";--> statement-breakpoint
DROP INDEX "enrollments_status_idx";--> statement-breakpoint
DROP INDEX "lessons_section_idx";--> statement-breakpoint
DROP INDEX "notifications_user_idx";--> statement-breakpoint
DROP INDEX "notifications_type_idx";--> statement-breakpoint
DROP INDEX "notifications_read_idx";--> statement-breakpoint
DROP INDEX "password_reset_tokens_user_idx";--> statement-breakpoint
DROP INDEX "payments_user_course_idx";--> statement-breakpoint
DROP INDEX "quiz_attempts_user_quiz_idx";--> statement-breakpoint
DROP INDEX "quiz_attempts_enrollment_idx";--> statement-breakpoint
DROP INDEX "quizzes_course_idx";--> statement-breakpoint
DROP INDEX "quizzes_lesson_idx";--> statement-breakpoint
DROP INDEX "reviews_user_idx";--> statement-breakpoint
DROP INDEX "reviews_course_idx";--> statement-breakpoint
DROP INDEX "reviews_rating_idx";--> statement-breakpoint
DROP INDEX "user_favorites_user_idx";--> statement-breakpoint
DROP INDEX "user_sessions_user_idx";--> statement-breakpoint
CREATE INDEX "course_categories_parent_idx" ON "course_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "course_progress_user_course_idx" ON "course_progress" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "courses_instructor_idx" ON "courses" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "courses_category_idx" ON "courses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "courses_featured_idx" ON "courses" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "enrollments_user_idx" ON "enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "enrollments_course_idx" ON "enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "lessons_section_idx" ON "lessons" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_type_idx" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notifications_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_user_course_idx" ON "payments" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_user_quiz_idx" ON "quiz_attempts" USING btree ("user_id","quiz_id");--> statement-breakpoint
CREATE INDEX "quiz_attempts_enrollment_idx" ON "quiz_attempts" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "quizzes_course_idx" ON "quizzes" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "quizzes_lesson_idx" ON "quizzes" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviews_course_idx" ON "reviews" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "reviews_rating_idx" ON "reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "user_favorites_user_idx" ON "user_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" USING btree ("user_id");