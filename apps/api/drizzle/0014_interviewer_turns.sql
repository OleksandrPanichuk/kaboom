CREATE TABLE "interviewer_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"triggers" jsonb NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text,
	"tokens" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "interviewer_turns" ADD CONSTRAINT "interviewer_turns_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interviewer_turns_interview_id_started_at_idx" ON "interviewer_turns" USING btree ("interview_id","started_at");