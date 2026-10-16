ALTER TABLE "designs" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "interviews" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "problem_comments" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "problem_reviews" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "problems" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "simulation_runs" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "submissions" ALTER COLUMN "id" SET DEFAULT uuidv7();--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuidv7();