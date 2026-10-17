import type { CommentRemover } from "@/db";
import { avatarUrl } from "@/modules/profiles/profile.avatar";

import type {
  ProblemCommentModel,
  ProblemCommentThreadModel,
} from "./problem-comment.model";

export interface ProblemCommentEntity {
  id: string;
  problemId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  spoiler: boolean;
  createdAt: Date;
  editedAt: Date | null;
  removedAt: Date | null;
  removedBy: CommentRemover | null;
}

export interface CommentAuthor {
  handle: string;
  displayName: string;
  avatarKey: string | null;
}

export interface ListedComment extends ProblemCommentEntity {
  author: CommentAuthor | null;
}

export interface CommentThread extends ListedComment {
  replies: ListedComment[];
}

export interface CommentViewer {
  userId: string;
  problemAuthorId: string | null;
}

export class ProblemCommentEntity {
  public static normalize(
    comment: ListedComment,
    viewer: CommentViewer,
  ): ProblemCommentModel {
    const removed = comment.removedAt !== null;

    return {
      id: comment.id,
      parentId: comment.parentId,
      body: removed ? "" : comment.body,
      spoiler: comment.spoiler,
      author:
        removed || comment.author === null
          ? null
          : {
              handle: comment.author.handle,
              displayName: comment.author.displayName,
              avatarUrl: avatarUrl(comment.author.avatarKey),
            },
      byProblemAuthor: !removed && comment.authorId === viewer.problemAuthorId,
      mine: comment.authorId === viewer.userId,
      createdAt: comment.createdAt.toISOString(),
      editedAt: comment.editedAt?.toISOString() ?? null,
      removed: comment.removedBy,
    };
  }

  public static normalizeThread(
    thread: CommentThread,
    viewer: CommentViewer,
  ): ProblemCommentThreadModel {
    return {
      ...ProblemCommentEntity.normalize(thread, viewer),
      replies: thread.replies.map((reply) =>
        ProblemCommentEntity.normalize(reply, viewer),
      ),
    };
  }
}
