import type { Track } from "@repo/design";
import type { ProblemContent } from "@repo/scoring";

import type { Page, PageRequest } from "@/core/pagination";
import { Repository } from "@/core/repository";
import type { ProblemDifficulty } from "@/db";

import type {
  ProblemCredit,
  ProblemEntity,
  ProblemVersionEntity,
  ProblemWithContent,
} from "../problem.entity";

export interface ProblemFilter {
  track?: Track;
  difficulty?: ProblemDifficulty;
}

export interface OfficialProblemSync {
  content: ProblemContent;
  contentHash: string;
}

export type SyncOutcome = "created" | "versioned" | "unchanged";

export interface CommunityProblemData {
  authorId: string;
  forkedFromId: string | null;
  content: ProblemContent;
  contentHash: string;
}

export interface ProblemVersionData {
  problemId: string;
  content: ProblemContent;
  contentHash: string;
}

export abstract class ProblemsRepository extends Repository {
  public abstract listPublished(
    filter: ProblemFilter,
    page: PageRequest,
  ): Promise<Page<ProblemEntity>>;

  public abstract listPublishedContent(): Promise<ProblemWithContent[]>;

  public abstract findPublishedBySlug(
    slug: string,
  ): Promise<ProblemWithContent | null>;

  public abstract findVersion(
    problemId: string,
    version: number,
  ): Promise<ProblemVersionEntity | null>;

  public abstract findBySlug(slug: string): Promise<ProblemEntity | null>;

  public abstract credits(
    ids: readonly string[],
  ): Promise<Map<string, ProblemCredit>>;

  public abstract findById(id: string): Promise<ProblemWithContent | null>;

  public abstract publishCommunity(
    data: CommunityProblemData,
  ): Promise<ProblemEntity>;

  public abstract addVersion(data: ProblemVersionData): Promise<ProblemEntity>;

  public abstract syncOfficial(
    problem: OfficialProblemSync,
  ): Promise<SyncOutcome>;
}
