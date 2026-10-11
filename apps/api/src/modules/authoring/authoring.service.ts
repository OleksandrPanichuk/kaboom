import { type DesignGraph, DesignGraphSchema, emptyGraph } from "@repo/design";
import { parseProblem } from "@repo/scoring";

import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";
import { DesignsRepository } from "@/modules/designs";
import { ProblemsRepository } from "@/modules/problems";

import { MAX_DRAFT_BYTES } from "./authoring.constants";
import { DraftNotFoundError, DraftTooLargeError } from "./authoring.errors";
import type { DraftEntity, DraftView } from "./draft.entity";
import {
  type DraftDesignPart,
  ProblemDraftsRepository,
  ProblemReviewsRepository,
} from "./ports";

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export class AuthoringService extends Service {
  private readonly drafts = makeRepository(ProblemDraftsRepository);

  private readonly reviews = makeRepository(ProblemReviewsRepository);

  private readonly problems = makeRepository(ProblemsRepository);

  private readonly designs = makeRepository(DesignsRepository);

  public async ownDraft(
    authorId: string,
    draftId: string,
  ): Promise<DraftEntity> {
    const draft = await this.drafts.findById(draftId);

    if (draft?.authorId !== authorId) {
      throw new DraftNotFoundError(`No draft ${draftId}`);
    }

    return draft;
  }

  public assertSize(content: unknown): void {
    const bytes = new TextEncoder().encode(JSON.stringify(content)).length;

    if (bytes > MAX_DRAFT_BYTES) {
      throw new DraftTooLargeError(
        `A problem may be at most ${MAX_DRAFT_BYTES / 1024} KB; this one is ${Math.ceil(bytes / 1024)} KB`,
      );
    }
  }

  public graphOf(content: unknown, part: DraftDesignPart): DesignGraph {
    const record = asRecord(content);
    const raw =
      part === "baseline" ? record.baseline : asRecord(record.reference).graph;
    const parsed = DesignGraphSchema.safeParse(raw);

    return parsed.success ? parsed.data : emptyGraph();
  }

  public async resolve(draft: DraftEntity, content: unknown = draft.content) {
    const [baseline, reference] = await Promise.all([
      draft.baselineDesignId
        ? this.designs.findOwned(draft.baselineDesignId, draft.authorId)
        : null,
      draft.referenceDesignId
        ? this.designs.findOwned(draft.referenceDesignId, draft.authorId)
        : null,
    ]);

    if (!baseline && !reference) return content;

    const record = asRecord(content);

    return {
      ...record,
      ...(baseline ? { baseline: baseline.graph } : {}),
      ...(reference
        ? {
            reference: {
              ...asRecord(record.reference),
              graph: reference.graph,
            },
          }
        : {}),
    };
  }

  public async view(stored: DraftEntity): Promise<DraftView> {
    const draft = { ...stored, content: await this.resolve(stored) };
    const [reviews, linked, forked] = await Promise.all([
      this.reviews.listForDraft(draft.id),
      draft.problemId ? this.problems.findById(draft.problemId) : null,
      draft.forkedFromId ? this.problems.findById(draft.forkedFromId) : null,
    ]);
    const parsed = parseProblem(draft.content);

    return {
      draft,
      reviews,
      problem: linked
        ? {
            slug: linked.problem.slug,
            title: linked.problem.title,
            currentVersion: linked.problem.currentVersion,
          }
        : null,
      forkedFrom: forked
        ? { slug: forked.problem.slug, title: forked.problem.title }
        : null,
      issues: parsed.ok ? [] : parsed.issues,
    };
  }
}
