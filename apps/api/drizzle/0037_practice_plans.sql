CREATE TABLE "practice_plan_items" (
	"plan_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"problem_id" uuid NOT NULL,
	CONSTRAINT "practice_plan_items_plan_id_position_pk" PRIMARY KEY("plan_id","position")
);
--> statement-breakpoint
CREATE TABLE "practice_plans" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"track" text NOT NULL,
	"skill" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reminded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "email_preferences" ADD COLUMN "reminders" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_plan_items" ADD CONSTRAINT "practice_plan_items_plan_id_practice_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."practice_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_plan_items" ADD CONSTRAINT "practice_plan_items_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_plans" ADD CONSTRAINT "practice_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "practice_plans_user_id_week_start_idx" ON "practice_plans" USING btree ("user_id","week_start");