ALTER TABLE "skill_scores" ADD COLUMN "submission_id" uuid;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "deterministic_score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "review_status" text DEFAULT 'skipped' NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "review_score" integer;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "review" jsonb;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "review_model" text;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "review_prompt_version" integer;--> statement-breakpoint
ALTER TABLE "skill_scores" ADD CONSTRAINT "skill_scores_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_scores" ADD CONSTRAINT "skill_scores_submission_id_skill_unique" UNIQUE("submission_id","skill");--> statement-breakpoint
UPDATE "submissions" SET "deterministic_score" = LEAST(100, "score" + "hint_penalty");