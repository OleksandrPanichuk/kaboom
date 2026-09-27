import type { DesignGraph } from "../graph";
import { type ProblemContent, ProblemContentSchema } from "./schema";
import { scoreSubmission } from "./score";

export interface PublicDrill {
  id: string;
  title: string;
  description: string;
  visibility: "public" | "hidden";
}

export interface PublicProblem {
  slug: string;
  title: string;
  track: ProblemContent["track"];
  difficulty: ProblemContent["difficulty"];
  tags: string[];
  summary: string;
  statement: string;
  baseline: DesignGraph;
  drills: PublicDrill[];
  rubric: Array<{ key: string; title: string; weight: number }>;
}

export const publicProblem = (problem: ProblemContent): PublicProblem => ({
  slug: problem.slug,
  title: problem.title,
  track: problem.track,
  difficulty: problem.difficulty,
  tags: problem.tags,
  summary: problem.summary,
  statement: problem.statement,
  baseline: problem.baseline,
  drills: problem.drills.map((drill) => ({
    id: drill.id,
    title: drill.title,
    description: drill.visibility === "public" ? drill.description : "",
    visibility: drill.visibility,
  })),
  rubric: problem.rubric.map(({ key, title, weight }) => ({
    key,
    title,
    weight,
  })),
});

export type PublishCheck =
  { ok: true; problem: ProblemContent } | { ok: false; issues: string[] };

const duplicates = (values: string[]) => [
  ...new Set(values.filter((value, index) => values.indexOf(value) !== index)),
];

export const checkPublishable = (input: unknown): PublishCheck => {
  const parsed = ProblemContentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  }

  const problem = parsed.data;
  const issues: string[] = [];
  const drillIds = problem.drills.map((drill) => drill.id);

  for (const id of duplicates(drillIds))
    issues.push(`Two drills share the id ${id}.`);
  for (const key of duplicates(problem.rubric.map((item) => item.key))) {
    issues.push(`Two rubric items share the key ${key}.`);
  }

  for (const item of problem.rubric) {
    if ("drillId" in item.check && !drillIds.includes(item.check.drillId)) {
      issues.push(
        `Rubric item ${item.key} names a drill, ${item.check.drillId}, the problem does not have.`,
      );
    }
  }

  if (!problem.drills.some((drill) => drill.visibility === "public")) {
    issues.push(
      "A problem needs at least one public drill for solvers to run.",
    );
  }

  if (issues.length === 0) {
    const reference = scoreSubmission(problem, problem.reference.graph);

    if (reference.score !== 100) {
      const missed = reference.items.filter((item) => !item.passed);

      issues.push(
        `The reference solution scores ${reference.score}, not 100: ${missed.map((item) => `${item.title} (${item.evidence})`).join("; ")}`,
      );
    }
  }

  return issues.length === 0 ? { ok: true, problem } : { ok: false, issues };
};
