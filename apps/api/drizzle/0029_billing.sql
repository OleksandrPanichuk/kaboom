CREATE TABLE "billing_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"stripe_customer_id" text NOT NULL,
	"email" text,
	"name" text,
	"address_line1" text,
	"address_line2" text,
	"address_city" text,
	"address_state" text,
	"address_postal_code" text,
	"address_country" text,
	"default_payment_method_id" text,
	"card_brand" text,
	"card_last4" text,
	"tax_exempt" text DEFAULT 'none' NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"stripe_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_customers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "billing_customers_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "billing_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_price_id" text NOT NULL,
	"lookup_key" text,
	"plan_key" text NOT NULL,
	"type" text NOT NULL,
	"interval" text,
	"interval_count" integer,
	"unit_amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"tax_behavior" text DEFAULT 'unspecified' NOT NULL,
	"active" boolean NOT NULL,
	"stripe_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_prices_stripe_price_id_unique" UNIQUE("stripe_price_id"),
	CONSTRAINT "billing_prices_lookup_key_unique" UNIQUE("lookup_key")
);
--> statement-breakpoint
CREATE TABLE "billing_tax_ids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"stripe_tax_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"verification_status" text,
	"stripe_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_tax_ids_stripe_tax_id_unique" UNIQUE("stripe_tax_id")
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"stripe_dispute_id" text NOT NULL,
	"stripe_charge_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"status" text NOT NULL,
	"reason" text NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"evidence_due_by" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"stripe_created_at" timestamp with time zone NOT NULL,
	"stripe_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disputes_stripe_dispute_id_unique" UNIQUE("stripe_dispute_id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"stripe_invoice_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"number" text,
	"status" text NOT NULL,
	"billing_reason" text,
	"currency" text NOT NULL,
	"subtotal" bigint NOT NULL,
	"tax" bigint DEFAULT 0 NOT NULL,
	"total" bigint NOT NULL,
	"amount_due" bigint NOT NULL,
	"amount_paid" bigint NOT NULL,
	"amount_remaining" bigint NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"customer_name" text,
	"address_line1" text,
	"address_line2" text,
	"address_city" text,
	"address_state" text,
	"address_postal_code" text,
	"address_country" text,
	"hosted_invoice_url" text,
	"invoice_pdf" text,
	"due_date" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"stripe_created_at" timestamp with time zone NOT NULL,
	"stripe_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_charge_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_customer_id" text,
	"status" text NOT NULL,
	"amount" bigint NOT NULL,
	"amount_refunded" bigint DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"outcome_type" text,
	"risk_level" text,
	"failure_code" text,
	"failure_message" text,
	"stripe_balance_transaction_id" text,
	"fee" bigint,
	"net" bigint,
	"stripe_created_at" timestamp with time zone NOT NULL,
	"stripe_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_attempts_stripe_charge_id_unique" UNIQUE("stripe_charge_id")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"stripe_payment_intent_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_invoice_id" text,
	"status" text NOT NULL,
	"amount" bigint NOT NULL,
	"amount_received" bigint DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"payment_method_type" text,
	"card_brand" text,
	"card_last4" text,
	"failure_code" text,
	"decline_code" text,
	"failure_message" text,
	"succeeded_at" timestamp with time zone,
	"stripe_created_at" timestamp with time zone NOT NULL,
	"stripe_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"stripe_customer_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"stripe_invoice_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount" bigint NOT NULL,
	"amount_refunded" bigint DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchases_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"stripe_refund_id" text NOT NULL,
	"stripe_charge_id" text,
	"stripe_payment_intent_id" text,
	"stripe_invoice_id" text,
	"stripe_credit_note_id" text,
	"status" text NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"reason" text,
	"failure_reason" text,
	"stripe_created_at" timestamp with time zone NOT NULL,
	"stripe_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_stripe_refund_id_unique" UNIQUE("stripe_refund_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"object_id" text,
	"livemode" boolean NOT NULL,
	"api_version" text,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"stripe_created_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscription_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"from_stripe_price_id" text,
	"to_stripe_price_id" text,
	"from_quantity" integer,
	"to_quantity" integer,
	"actor" text NOT NULL,
	"actor_user_id" uuid,
	"stripe_event_id" text,
	"effective_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"stripe_subscription_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"status" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"cancel_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"cancellation_reason" text,
	"ended_at" timestamp with time zone,
	"trial_start" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"latest_stripe_invoice_id" text,
	"stripe_created_at" timestamp with time zone NOT NULL,
	"stripe_synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_tax_ids" ADD CONSTRAINT "billing_tax_ids_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_tax_ids_customer_idx" ON "billing_tax_ids" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "disputes_charge_idx" ON "disputes" USING btree ("stripe_charge_id");--> statement-breakpoint
CREATE INDEX "invoices_user_created_idx" ON "invoices" USING btree ("user_id","stripe_created_at","id");--> statement-breakpoint
CREATE INDEX "invoices_stripe_subscription_id_idx" ON "invoices" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_payment_intent_idx" ON "payment_attempts" USING btree ("stripe_payment_intent_id","stripe_created_at");--> statement-breakpoint
CREATE INDEX "payments_user_created_idx" ON "payments" USING btree ("user_id","stripe_created_at","id");--> statement-breakpoint
CREATE INDEX "payments_stripe_invoice_id_idx" ON "payments" USING btree ("stripe_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_one_live_per_customer_idx" ON "purchases" USING btree ("stripe_customer_id") WHERE "purchases"."status" in ('pending', 'paid', 'partially_refunded');--> statement-breakpoint
CREATE INDEX "purchases_user_id_idx" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refunds_payment_intent_idx" ON "refunds" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "refunds_user_created_idx" ON "refunds" USING btree ("user_id","stripe_created_at");--> statement-breakpoint
CREATE INDEX "stripe_events_status_received_at_idx" ON "stripe_events" USING btree ("status","received_at");--> statement-breakpoint
CREATE INDEX "stripe_events_object_id_idx" ON "stripe_events" USING btree ("object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_changes_event_kind_idx" ON "subscription_changes" USING btree ("subscription_id","stripe_event_id","kind");--> statement-breakpoint
CREATE INDEX "subscription_changes_subscription_effective_at_idx" ON "subscription_changes" USING btree ("subscription_id","effective_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_one_live_per_customer_idx" ON "subscriptions" USING btree ("stripe_customer_id") WHERE "subscriptions"."status" not in ('canceled', 'incomplete_expired');--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");