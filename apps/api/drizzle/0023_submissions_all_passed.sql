ALTER TABLE "submissions" ADD COLUMN "all_passed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "submissions_user_id_problem_id_all_passed_idx" ON "submissions" USING btree ("user_id","problem_id") WHERE "submissions"."all_passed";--> statement-breakpoint
UPDATE "submissions" s SET "all_passed" = CASE
	WHEN d.tests IS NOT NULL AND jsonb_typeof(d.tests) = 'object' THEN
		coalesce((d.tests->'summary'->>'passed')::int, 0) > 0
		AND coalesce((d.tests->'summary'->>'failed')::int, 0) = 0
		AND coalesce((d.tests->'summary'->>'flaky')::int, 0) = 0
		AND coalesce((d.tests->'summary'->>'skipped')::int, 0) = 0
	WHEN jsonb_typeof(d.drills) = 'array' AND jsonb_typeof(d.items) = 'array' THEN
		jsonb_array_length(d.drills) > 0
		AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(d.drills) e WHERE (e->>'passed')::boolean IS NOT TRUE)
		AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(d.items) e WHERE (e->>'passed')::boolean IS NOT TRUE)
	ELSE false
END
FROM (
	SELECT
		"id",
		CASE WHEN jsonb_typeof("tests") = 'string' THEN ("tests" #>> '{}')::jsonb ELSE "tests" END AS tests,
		CASE WHEN jsonb_typeof("drills") = 'string' THEN ("drills" #>> '{}')::jsonb ELSE "drills" END AS drills,
		CASE WHEN jsonb_typeof("items") = 'string' THEN ("items" #>> '{}')::jsonb ELSE "items" END AS items
	FROM "submissions"
) d
WHERE d."id" = s."id";
