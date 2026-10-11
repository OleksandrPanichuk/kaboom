import { Repository } from "@/core/repository";

import type { DraftEntity } from "../draft.entity";

export interface CreateDraftData {
  authorId: string;
  content: unknown;
  forkedFromId: string | null;
}

export abstract class ProblemDraftsRepository extends Repository {
  public abstract create(data: CreateDraftData): Promise<DraftEntity>;

  public abstract findById(id: string): Promise<DraftEntity | null>;

  public abstract listForAuthor(authorId: string): Promise<DraftEntity[]>;

  public abstract countForAuthor(authorId: string): Promise<number>;

  public abstract updateContent(
    id: string,
    content: unknown,
  ): Promise<DraftEntity>;

  public abstract linkProblem(id: string, problemId: string): Promise<void>;

  public abstract delete(id: string): Promise<void>;
}
