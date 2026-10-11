CREATE TABLE "problem_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"problem_id" uuid,
	"forked_from_id" uuid,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problem_drafts_problem_id_unique" UNIQUE("problem_id")
);
--> statement-breakpoint
CREATE TABLE "problem_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"track" text NOT NULL,
	"difficulty" text NOT NULL,
	"content" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewer_id" uuid,
	"feedback" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "forked_from_id" uuid;--> statement-breakpoint
ALTER TABLE "problem_drafts" ADD CONSTRAINT "problem_drafts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_drafts" ADD CONSTRAINT "problem_drafts_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_drafts" ADD CONSTRAINT "problem_drafts_forked_from_id_problems_id_fk" FOREIGN KEY ("forked_from_id") REFERENCES "public"."problems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_reviews" ADD CONSTRAINT "problem_reviews_draft_id_problem_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."problem_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_reviews" ADD CONSTRAINT "problem_reviews_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_reviews" ADD CONSTRAINT "problem_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "problem_drafts_author_id_updated_at_idx" ON "problem_drafts" USING btree ("author_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "problem_reviews_one_pending_per_draft_idx" ON "problem_reviews" USING btree ("draft_id") WHERE "problem_reviews"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "problem_reviews_status_submitted_at_idx" ON "problem_reviews" USING btree ("status","submitted_at","id");--> statement-breakpoint
CREATE INDEX "problem_reviews_draft_id_submitted_at_idx" ON "problem_reviews" USING btree ("draft_id","submitted_at");--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_forked_from_id_problems_id_fk" FOREIGN KEY ("forked_from_id") REFERENCES "public"."problems"("id") ON DELETE set null ON UPDATE no action;