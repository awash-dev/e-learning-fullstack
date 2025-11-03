ALTER TABLE "courses" ALTER COLUMN "rating" SET DATA TYPE numeric(3, 2);--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "rating" SET DEFAULT '0.00';