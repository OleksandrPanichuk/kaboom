CREATE TABLE "problem_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"body" text NOT NULL,
	"spoiler" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"removed_by" text
);
--> statement-breakpoint
CREATE TABLE "problem_ratings" (
	"problem_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"stars" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problem_ratings_problem_id_user_id_pk" PRIMARY KEY("problem_id","user_id"),
	CONSTRAINT "problem_ratings_stars_check" CHECK ("problem_ratings"."stars" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "problem_comments" ADD CONSTRAINT "problem_comments_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_comments" ADD CONSTRAINT "problem_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_comments" ADD CONSTRAINT "problem_comments_parent_id_problem_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."problem_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_ratings" ADD CONSTRAINT "problem_ratings_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_ratings" ADD CONSTRAINT "problem_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "problem_comments_threads_idx" ON "problem_comments" USING btree ("problem_id","created_at","id") WHERE "problem_comments"."parent_id" is null;--> statement-breakpoint
CREATE INDEX "problem_comments_parent_id_idx" ON "problem_comments" USING btree ("parent_id","created_at");--> statement-breakpoint
CREATE INDEX "problem_comments_author_id_idx" ON "problem_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "problem_ratings_user_id_idx" ON "problem_ratings" USING btree ("user_id");