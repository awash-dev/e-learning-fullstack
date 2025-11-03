ALTER TABLE "courses" ALTER COLUMN "thumbnail" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "instructor_avatar" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "instructor_bio" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "comment" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "avatar" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_expires" timestamp;