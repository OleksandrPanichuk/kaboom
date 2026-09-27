import type { ProblemContent } from "@repo/design";

import type { Page, PageRequest } from "@/core/pagination";
import { Repository } from "@/core/repository";
import type { ProblemDifficulty } from "@/db";

import type {
  ProblemEntity,
  ProblemVersionEntity,
  ProblemWithContent,
} from "../problem.entity";

export interface ProblemFilter {
  track?: string;
  difficulty?: ProblemDifficulty;
}

export interface OfficialProblemSync {
  content: ProblemContent;
  contentHash: string;
}

export type SyncOutcome = "created" | "versioned" | "unchanged";

export abstract class ProblemsRepository extends Repository {
  public abstract listPublished(
    filter: ProblemFilter,
    page: PageRequest,
  ): Promise<Page<ProblemEntity>>;

  public abstract findPublishedBySlug(
    slug: string,
  ): Promise<ProblemWithContent | null>;

  public abstract findVersion(
    problemId: string,
    version: number,
  ): Promise<ProblemVersionEntity | null>;

  public abstract syncOfficial(
    problem: OfficialProblemSync,
  ): Promise<SyncOutcome>;
}
