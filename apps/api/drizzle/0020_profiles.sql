CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"links" text[] DEFAULT '{}'::text[] NOT NULL,
	"avatar_key" text,
	"visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "profiles" ("user_id", "handle", "display_name", "visible", "created_at")
SELECT
	u."id",
	coalesce(
		l."handle",
		coalesce(
			nullif(left(trim(both '-' from regexp_replace(lower(u."name"), '[^a-z0-9]+', '-', 'g')), 11), ''),
			'user'
		) || '-' || left(replace(u."id"::text, '-', ''), 8)
	),
	left(u."name", 50),
	coalesce(l."visible", true),
	u."created_at"
FROM "users" u
LEFT JOIN "leaderboard_profiles" l ON l."user_id" = u."id";
