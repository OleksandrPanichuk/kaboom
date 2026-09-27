CREATE TABLE "evidence_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"rubric_item_key" text NOT NULL,
	"note" text NOT NULL,
	"quote" text,
	"message_id" uuid,
	"revision" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_events" (
	"interview_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interview_events_interview_id_seq_pk" PRIMARY KEY("interview_id","seq")
);
--> statement-breakpoint
CREATE TABLE "interview_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"author" text NOT NULL,
	"body" text NOT NULL,
	"turn_id" uuid,
	"interrupted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"problem_id" uuid NOT NULL,
	"problem_version" integer NOT NULL,
	"design_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"phase" text NOT NULL,
	"phase_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_seq" integer DEFAULT 0 NOT NULL,
	"final_revision" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "interviews_design_id_unique" UNIQUE("design_id")
);
--> statement-breakpoint
ALTER TABLE "designs" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "evidence_notes" ADD CONSTRAINT "evidence_notes_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_notes" ADD CONSTRAINT "evidence_notes_message_id_interview_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."interview_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_events" ADD CONSTRAINT "interview_events_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_messages" ADD CONSTRAINT "interview_messages_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_design_id_designs_id_fk" FOREIGN KEY ("design_id") REFERENCES "public"."designs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidence_notes_interview_id_idx" ON "evidence_notes" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "interview_messages_interview_id_created_at_idx" ON "interview_messages" USING btree ("interview_id","created_at","id");--> statement-breakpoint
CREATE INDEX "interviews_owner_id_started_at_idx" ON "interviews" USING btree ("owner_id","started_at","id");