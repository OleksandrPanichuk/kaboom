CREATE TABLE "billing_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"email" text,
	"name" text,
	"address_line1" text,
	"address_line2" text,
	"address_city" text,
	"address_state" text,
	"address_postal_code" text,
	"address_country" text,
	"provider_payment_method_id" text,
	"card_brand" text,
	"card_last4" text,
	"tax_exempt" text DEFAULT 'none' NOT NULL,
	"balance" bigint DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"type" text NOT NULL,
	"provider_object_id" text,
	"live" boolean NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"provider_created_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "billing_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_price_id" text NOT NULL,
	"lookup_key" text,
	"plan_key" text NOT NULL,
	"type" text NOT NULL,
	"interval" text,
	"interval_count" integer,
	"unit_amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"tax_behavior" text DEFAULT 'unspecified' NOT NULL,
	"active" boolean NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_tax_ids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text NOT NULL,
	"provider_tax_id" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"type" text NOT NULL,
	"value" text NOT NULL,
	"verification_status" text,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text NOT NULL,
	"provider_dispute_id" text NOT NULL,
	"provider_attempt_id" text NOT NULL,
	"provider_payment_id" text,
	"status" text NOT NULL,
	"reason" text NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"evidence_due_by" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"provider_created_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text NOT NULL,
	"provider_invoice_id" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"provider_subscription_id" text,
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
	"invoice_pdf_url" text,
	"due_date" timestamp with time zone,
	"finalized_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"provider_created_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_attempt_id" text NOT NULL,
	"provider_payment_id" text,
	"provider_customer_id" text,
	"status" text NOT NULL,
	"amount" bigint NOT NULL,
	"amount_refunded" bigint DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"outcome_type" text,
	"risk_level" text,
	"failure_code" text,
	"failure_message" text,
	"provider_transaction_id" text,
	"fee" bigint,
	"net" bigint,
	"provider_created_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text NOT NULL,
	"provider_payment_id" text NOT NULL,
	"provider_customer_id" text,
	"provider_invoice_id" text,
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
	"provider_created_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"provider_price_id" text NOT NULL,
	"provider_invoice_id" text NOT NULL,
	"provider_payment_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount" bigint NOT NULL,
	"amount_refunded" bigint DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text NOT NULL,
	"provider_refund_id" text NOT NULL,
	"provider_attempt_id" text,
	"provider_payment_id" text,
	"provider_invoice_id" text,
	"provider_credit_note_id" text,
	"status" text NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"reason" text,
	"failure_reason" text,
	"provider_created_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"from_provider_price_id" text,
	"to_provider_price_id" text,
	"from_quantity" integer,
	"to_quantity" integer,
	"actor" text NOT NULL,
	"actor_user_id" uuid,
	"billing_event_id" uuid,
	"effective_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text NOT NULL,
	"provider_subscription_id" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"provider_price_id" text NOT NULL,
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
	"latest_provider_invoice_id" text,
	"provider_created_at" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
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
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_billing_event_id_billing_events_id_fk" FOREIGN KEY ("billing_event_id") REFERENCES "public"."billing_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customers_provider_provider_customer_id_idx" ON "billing_customers" USING btree ("provider","provider_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_customers_provider_user_idx" ON "billing_customers" USING btree ("provider","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_events_provider_provider_event_id_idx" ON "billing_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "billing_events_status_received_at_idx" ON "billing_events" USING btree ("status","received_at");--> statement-breakpoint
CREATE INDEX "billing_events_provider_object_idx" ON "billing_events" USING btree ("provider","provider_object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_prices_provider_provider_price_id_idx" ON "billing_prices" USING btree ("provider","provider_price_id");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_prices_provider_lookup_key_idx" ON "billing_prices" USING btree ("provider","lookup_key");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_tax_ids_provider_provider_tax_id_idx" ON "billing_tax_ids" USING btree ("provider","provider_tax_id");--> statement-breakpoint
CREATE INDEX "billing_tax_ids_customer_idx" ON "billing_tax_ids" USING btree ("provider","provider_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "disputes_provider_provider_dispute_id_idx" ON "disputes" USING btree ("provider","provider_dispute_id");--> statement-breakpoint
CREATE INDEX "disputes_attempt_idx" ON "disputes" USING btree ("provider","provider_attempt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_provider_provider_invoice_id_idx" ON "invoices" USING btree ("provider","provider_invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_user_created_idx" ON "invoices" USING btree ("user_id","provider_created_at","id");--> statement-breakpoint
CREATE INDEX "invoices_subscription_idx" ON "invoices" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_attempts_provider_provider_attempt_id_idx" ON "payment_attempts" USING btree ("provider","provider_attempt_id");--> statement-breakpoint
CREATE INDEX "payment_attempts_payment_idx" ON "payment_attempts" USING btree ("provider","provider_payment_id","provider_created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_idx" ON "payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "payments_user_created_idx" ON "payments" USING btree ("user_id","provider_created_at","id");--> statement-breakpoint
CREATE INDEX "payments_invoice_idx" ON "payments" USING btree ("provider","provider_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_provider_provider_invoice_id_idx" ON "purchases" USING btree ("provider","provider_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_one_live_per_customer_idx" ON "purchases" USING btree ("provider","provider_customer_id") WHERE "purchases"."status" in ('pending', 'paid', 'partially_refunded');--> statement-breakpoint
CREATE INDEX "purchases_user_id_idx" ON "purchases" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_provider_provider_refund_id_idx" ON "refunds" USING btree ("provider","provider_refund_id");--> statement-breakpoint
CREATE INDEX "refunds_payment_idx" ON "refunds" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "refunds_user_created_idx" ON "refunds" USING btree ("user_id","provider_created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_changes_event_kind_idx" ON "subscription_changes" USING btree ("subscription_id","billing_event_id","kind");--> statement-breakpoint
CREATE INDEX "subscription_changes_subscription_effective_at_idx" ON "subscription_changes" USING btree ("subscription_id","effective_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_provider_subscription_id_idx" ON "subscriptions" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_one_live_per_customer_idx" ON "subscriptions" USING btree ("provider","provider_customer_id") WHERE "subscriptions"."status" not in ('canceled', 'incomplete_expired');--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");