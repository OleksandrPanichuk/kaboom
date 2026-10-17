CREATE TABLE "shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "shares_live_subject_idx" ON "shares" USING btree ("subject","subject_id") WHERE "shares"."revoked_at" is null;--> statement-breakpoint
CREATE INDEX "shares_owner_id_idx" ON "shares" USING btree ("owner_id");