CREATE TABLE "leaderboard_points" (
	"user_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"best_score" integer NOT NULL,
	"achieved_at" timestamp with time zone NOT NULL,
	CONSTRAINT "leaderboard_points_user_id_problem_id_pk" PRIMARY KEY("user_id","problem_id")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"fingerprint" text NOT NULL,
	"rebuilt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_totals" (
	"user_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"points" integer NOT NULL,
	"solved" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_totals_user_id_scope_pk" PRIMARY KEY("user_id","scope")
);
--> statement-breakpoint
ALTER TABLE "leaderboard_points" ADD CONSTRAINT "leaderboard_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_points" ADD CONSTRAINT "leaderboard_points_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_totals" ADD CONSTRAINT "leaderboard_totals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leaderboard_points_problem_id_idx" ON "leaderboard_points" USING btree ("problem_id");--> statement-breakpoint
CREATE INDEX "leaderboard_totals_scope_points_idx" ON "leaderboard_totals" USING btree ("scope","points" DESC NULLS LAST,"user_id");--> statement-breakpoint
CREATE INDEX "submissions_created_at_idx" ON "submissions" USING btree ("created_at");