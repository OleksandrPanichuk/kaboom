import type {
  ProblemCommentModel,
  ProblemCommentThreadModel,
} from "@repo/api-client";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { errorMessage } from "@/features/auth";
import {
  editCommentMutation,
  postCommentMutation,
} from "@/features/discussion/api";

import { CommentComposer } from "./CommentComposer";
import { CommentItem } from "./CommentItem";

interface CommentThreadProps {
  slug: string;
  thread: ProblemCommentThreadModel;
  moderator: boolean;
  canPost: boolean;
  onRemove: (comment: ProblemCommentModel) => void;
}

export function CommentThread({
  slug,
  thread,
  moderator,
  canPost,
  onRemove,
}: CommentThreadProps) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const reply = useMutation(postCommentMutation);
  const edit = useMutation(editCommentMutation);

  const item = (comment: ProblemCommentModel) => (
    <CommentItem
      key={comment.id}
      comment={comment}
      canRemove={moderator}
      editor={
        editing === comment.id ? (
          <CommentComposer
            initialBody={comment.body}
            initialSpoiler={comment.spoiler}
            placeholder="Edit your comment"
            submitLabel="Save"
            pending={edit.isPending}
            error={edit.error ? errorMessage(edit.error) : null}
            autoFocus
            onCancel={() => setEditing(null)}
            onSubmit={(body, spoiler) =>
              edit.mutate(
                { slug, id: comment.id, body, spoiler },
                { onSuccess: () => setEditing(null) },
              )
            }
          />
        ) : null
      }
      onReply={() => setReplying(true)}
      onEdit={() => {
        edit.reset();
        setEditing(comment.id);
      }}
      onRemove={() => onRemove(comment)}
    />
  );

  return (
    <li className="flex flex-col gap-3 border-b px-4 py-4 last:border-b-0">
      {item(thread)}
      {thread.replies.length > 0 || replying ? (
        <ol className="ml-4 flex flex-col gap-3 border-l pl-4">
          {thread.replies.map((comment) => (
            <li key={comment.id}>{item(comment)}</li>
          ))}
          {replying ? (
            <li>
              {canPost ? (
                <CommentComposer
                  placeholder="Write a reply"
                  submitLabel="Reply"
                  pending={reply.isPending}
                  error={reply.error ? errorMessage(reply.error) : null}
                  autoFocus
                  onCancel={() => setReplying(false)}
                  onSubmit={(body, spoiler, reset) =>
                    reply.mutate(
                      { slug, body, spoiler, parentId: thread.id },
                      {
                        onSuccess: () => {
                          reset();
                          setReplying(false);
                        },
                      },
                    )
                  }
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Verify your email to reply.
                </p>
              )}
            </li>
          ) : null}
        </ol>
      ) : null}
    </li>
  );
}
