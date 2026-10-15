CREATE TABLE "billing_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"plan_key" text NOT NULL,
	"type" text NOT NULL,
	"interval" text,
	"interval_count" integer,
	"lookup_key" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_offers_key_unique" UNIQUE("key"),
	CONSTRAINT "billing_offers_lookup_key_unique" UNIQUE("lookup_key")
);
--> statement-breakpoint
ALTER TABLE "billing_prices" ADD COLUMN "offer_id" uuid;--> statement-breakpoint
ALTER TABLE "billing_prices" ADD CONSTRAINT "billing_prices_offer_id_billing_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."billing_offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_prices_offer_idx" ON "billing_prices" USING btree ("provider","offer_id");--> statement-breakpoint
INSERT INTO "billing_offers" ("key", "plan_key", "type", "interval", "interval_count", "lookup_key", "position") VALUES
	('pro_monthly', 'pro', 'recurring', 'month', 1, 'pro_monthly', 1),
	('pro_lifetime', 'pro', 'one_time', NULL, NULL, 'pro_lifetime', 2)
ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
UPDATE "billing_prices" SET "offer_id" = "billing_offers"."id" FROM "billing_offers" WHERE "billing_prices"."lookup_key" = "billing_offers"."lookup_key";--> statement-breakpoint
ALTER TABLE "billing_prices" DROP COLUMN "plan_key";
