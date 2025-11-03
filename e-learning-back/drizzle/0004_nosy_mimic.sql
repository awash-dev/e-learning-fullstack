ALTER TYPE "public"."course_level" ADD VALUE 'all-levels';--> statement-breakpoint
CREATE TABLE "course_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0,
	"is_published" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"section_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"content" text,
	"video_url" text,
	"video_duration" integer,
	"thumbnail" text,
	"resources" json DEFAULT '[]'::json,
	"order" integer DEFAULT 0,
	"is_published" boolean DEFAULT true,
	"is_free" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"payment_method" varchar(50),
	"payment_intent_id" text,
	"status" varchar(20) DEFAULT 'pending',
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"answers" json DEFAULT '[]'::json,
	"score" integer DEFAULT 0,
	"total_questions" integer DEFAULT 0,
	"passed" boolean DEFAULT false,
	"time_spent" integer DEFAULT 0,
	"attempt_number" integer DEFAULT 1,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"lesson_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"questions" json DEFAULT '[]'::json,
	"passing_score" integer DEFAULT 70,
	"time_limit" integer,
	"max_attempts" integer DEFAULT 1,
	"is_published" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "certificates" DROP CONSTRAINT "certificates_enrollment_id_enrollments_id_fk";
--> statement-breakpoint
ALTER TABLE "course_progress" DROP CONSTRAINT "course_progress_enrollment_id_enrollments_id_fk";
--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "courses" DROP CONSTRAINT "courses_instructor_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "enrollments" DROP CONSTRAINT "enrollments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "user_favorites" DROP CONSTRAINT "user_favorites_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_favorites" DROP CONSTRAINT "user_favorites_course_id_courses_id_fk";
--> statement-breakpoint
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "type" SET DEFAULT 'info';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_verified" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "verification_code" text;--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "download_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "course_categories" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "course_categories" ADD COLUMN "course_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "course_categories" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "course_progress" ADD COLUMN "course_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "course_progress" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "course_progress" ADD COLUMN "lesson_title" text;--> statement-breakpoint
ALTER TABLE "course_progress" ADD COLUMN "bookmarked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "course_progress" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "subtitle" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "promo_video" text;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "discount_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "is_free" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "total_lessons" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "total_hours" numeric(5, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "resources" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "total_students" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "view_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "rating_distribution" json DEFAULT '{}'::json;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "payment_status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "payment_amount" numeric(10, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "payment_method" varchar(50);--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "last_lesson_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "total_time_spent" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "certificate_issued" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "enrollments" ADD COLUMN "certificate_issued_at" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "enrollment_id" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "is_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "helpful" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "not_helpful" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "instructor_reply" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "instructor_reply_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "course_sections" ADD CONSTRAINT "course_sections_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_section_id_course_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."course_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_sections_course_order_idx" ON "course_sections" USING btree ("course_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_course_order_idx" ON "lessons" USING btree ("course_id","order");--> statement-breakpoint
CREATE UNIQUE INDEX "lessons_section_idx" ON "lessons" USING btree ("section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_payment_intent_idx" ON "payments" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_user_course_idx" ON "payments" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempts_user_quiz_idx" ON "quiz_attempts" USING btree ("user_id","quiz_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempts_enrollment_idx" ON "quiz_attempts" USING btree ("enrollment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quizzes_course_idx" ON "quizzes" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quizzes_lesson_idx" ON "quizzes" USING btree ("lesson_id");--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_categories" ADD CONSTRAINT "course_categories_parent_id_course_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."course_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_user_id_users_id_fk" FOREIGN KEY ("instructor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_verification_code_idx" ON "certificates" USING btree ("verification_code");--> statement-breakpoint
CREATE UNIQUE INDEX "course_categories_parent_idx" ON "course_categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_progress_user_course_idx" ON "course_progress" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_featured_idx" ON "courses" USING btree ("featured");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_title_idx" ON "courses" USING btree ("title");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_read_idx" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE UNIQUE INDEX "user_favorites_user_idx" ON "user_favorites" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_verification_code_unique" UNIQUE("verification_code");