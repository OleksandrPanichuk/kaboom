ALTER TABLE "problem_attempts" ADD COLUMN "hints_revealed" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "hint_penalty" integer DEFAULT 0 NOT NULL;