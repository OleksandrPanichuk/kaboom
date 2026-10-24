ALTER TABLE "designs" ADD COLUMN "origin" text;--> statement-breakpoint
UPDATE "designs" SET "origin" = 'problem' WHERE "id" IN (SELECT "design_id" FROM "problem_attempts");--> statement-breakpoint
UPDATE "designs" SET "origin" = 'interview' WHERE "origin" IS NULL AND "id" IN (SELECT "design_id" FROM "interviews");--> statement-breakpoint
UPDATE "designs" SET "origin" = 'draft' WHERE "origin" IS NULL AND "id" IN (SELECT "baseline_design_id" FROM "problem_drafts" WHERE "baseline_design_id" IS NOT NULL UNION SELECT "reference_design_id" FROM "problem_drafts" WHERE "reference_design_id" IS NOT NULL);--> statement-breakpoint
UPDATE "designs" AS "schema_design" SET "origin" = 'problem' WHERE "schema_design"."origin" IS NULL AND "schema_design"."kind" = 'schema' AND EXISTS (SELECT 1 FROM "problem_attempts" JOIN "designs" AS "system_design" ON "system_design"."id" = "problem_attempts"."design_id" WHERE "system_design"."graph"::text LIKE '%' || "schema_design"."id"::text || '%');--> statement-breakpoint
UPDATE "designs" SET "origin" = 'sandbox' WHERE "origin" IS NULL;--> statement-breakpoint
ALTER TABLE "designs" ALTER COLUMN "origin" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "designs_owner_id_origin_idx" ON "designs" USING btree ("owner_id","origin");
