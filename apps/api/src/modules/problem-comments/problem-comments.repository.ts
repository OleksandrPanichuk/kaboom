import type { Page, PageRequest } from "@/core/pagination";
import { Repository } from "@/core/repository";
import type { CommentRemover } from "@/db";

import type {
  ListedComment,
  ProblemCommentEntity,
} from "./problem-comment.entity";

export interface PostProblemCommentData {
  problemId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  spoiler: boolean;
}

export interface EditProblemCommentData {
  body?: string;
  spoiler?: boolean;
}

export abstract class ProblemCommentsRepository extends Repository {
  public abstract insert(
    data: PostProblemCommentData,
  ): Promise<ProblemCommentEntity>;

  public abstract findById(id: string): Promise<ProblemCommentEntity | null>;

  public abstract findListed(id: string): Promise<ListedComment | null>;

  public abstract listThreads(
    problemId: string,
    page: PageRequest,
  ): Promise<Page<ListedComment>>;

  public abstract listReplies(
    parentIds: readonly string[],
  ): Promise<ListedComment[]>;

  public abstract countReplies(parentId: string): Promise<number>;

  public abstract edit(
    id: string,
    data: EditProblemCommentData,
  ): Promise<ProblemCommentEntity | null>;

  public abstract remove(
    id: string,
    by: CommentRemover,
  ): Promise<ProblemCommentEntity | null>;
}
