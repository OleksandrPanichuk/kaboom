CREATE TABLE "leaderboard_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_profiles_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "leaderboard_profiles" ADD CONSTRAINT "leaderboard_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;