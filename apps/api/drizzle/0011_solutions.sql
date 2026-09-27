CREATE TABLE "solution_reveals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"revealed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "counted" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "graph" jsonb;--> statement-breakpoint
ALTER TABLE "solution_reveals" ADD CONSTRAINT "solution_reveals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_reveals" ADD CONSTRAINT "solution_reveals_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "solution_reveals_user_id_problem_id_idx" ON "solution_reveals" USING btree ("user_id","problem_id");--> statement-breakpoint
CREATE INDEX "submissions_problem_id_score_idx" ON "submissions" USING btree ("problem_id","score");