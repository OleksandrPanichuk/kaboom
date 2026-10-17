import type { ProblemCommentModel } from "@repo/api-client";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import { Button } from "@/components/ui/Button";
import { currentUserQuery, errorMessage } from "@/features/auth";
import {
  commentsQuery,
  postCommentMutation,
  rateProblemMutation,
  ratingQuery,
  removeCommentMutation,
} from "@/features/discussion/api";

import { CommentComposer } from "./CommentComposer";
import { CommentThread } from "./CommentThread";
import { RatingSection } from "./RatingSection";

interface DiscussionPanelProps {
  slug: string;
}

export function DiscussionPanel({ slug }: DiscussionPanelProps) {
  const user = useQuery(currentUserQuery);
  const rating = useQuery(ratingQuery(slug));
  const comments = useInfiniteQuery(commentsQuery(slug));
  const rate = useMutation(rateProblemMutation);
  const post = useMutation(postCommentMutation);
  const remove = useMutation(removeCommentMutation);
  const [removing, setRemoving] = useState<ProblemCommentModel | null>(null);
  const moderator =
    user.data?.role === "moderator" || user.data?.role === "admin";
  const canPost = user.data?.emailVerified ?? false;
  const threads = comments.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-3 border-b px-4 py-4">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Rating
        </h3>
        {rating.data ? (
          <RatingSection
            rating={rating.data}
            pending={rate.isPending}
            error={rate.error ? errorMessage(rate.error) : null}
            onRate={(stars) => rate.mutate({ slug, stars })}
          />
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            {rating.isError ? "Could not load the rating." : "Loading…"}
          </p>
        )}
      </section>
      <section className="flex flex-col gap-3 border-b px-4 py-4">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Discussion
        </h3>
        {canPost ? (
          <CommentComposer
            placeholder="Ask a question or share what you learned"
            submitLabel="Comment"
            pending={post.isPending}
            error={post.error ? errorMessage(post.error) : null}
            onSubmit={(body, spoiler, reset) =>
              post.mutate({ slug, body, spoiler }, { onSuccess: reset })
            }
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Verify your email to join the discussion.
          </p>
        )}
      </section>
      {comments.isPending ? (
        <p role="status" className="px-4 py-6 text-sm text-muted-foreground">
          Loading comments…
        </p>
      ) : comments.isError ? (
        <p role="alert" className="px-4 py-6 text-sm text-destructive">
          Could not load the comments.
        </p>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
          <MessageSquare aria-hidden="true" className="size-5" />
          No comments yet. Start the conversation.
        </div>
      ) : (
        <ol className="flex flex-col">
          {threads.map((thread) => (
            <CommentThread
              key={thread.id}
              slug={slug}
              thread={thread}
              moderator={moderator}
              canPost={canPost}
              onRemove={setRemoving}
            />
          ))}
        </ol>
      )}
      {comments.hasNextPage ? (
        <div className="px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={comments.isFetchingNextPage}
            onClick={() => void comments.fetchNextPage()}
          >
            {comments.isFetchingNextPage ? "Loading…" : "Show older comments"}
          </Button>
        </div>
      ) : null}
      <AlertDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.mine
                ? "It will show as removed while it has replies, and disappear once it has none."
                : "It will show as removed by a moderator."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (removing) {
                  remove.mutate(
                    { slug, id: removing.id },
                    { onSettled: () => setRemoving(null) },
                  );
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
