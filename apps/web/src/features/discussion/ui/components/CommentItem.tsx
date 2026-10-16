import type { ProblemCommentModel } from "@repo/api-client";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { EyeOff, MoreHorizontal, Pencil, Reply, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { formatCommentedAt } from "@/features/discussion/utils";
import { UserAvatar } from "@/features/profile";

interface CommentItemProps {
  comment: ProblemCommentModel;
  canRemove: boolean;
  editor: ReactNode;
  onReply: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

const REMOVED = {
  author: "Removed by its writer",
  moderator: "Removed by a moderator",
} as const;

export function CommentItem({
  comment,
  canRemove,
  editor,
  onReply,
  onEdit,
  onRemove,
}: CommentItemProps) {
  const [revealed, setRevealed] = useState(false);
  const name = comment.author?.displayName ?? "A solver";

  if (comment.removed) {
    return (
      <article className="flex items-center gap-3 py-1 text-sm text-muted-foreground italic">
        <span className="size-8 shrink-0 rounded-full border border-dashed" />
        {REMOVED[comment.removed]}
      </article>
    );
  }

  return (
    <article className="flex gap-3">
      <UserAvatar
        name={name}
        url={comment.author?.avatarUrl ?? null}
        size="sm"
        className="mt-0.5 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <header className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          {comment.author ? (
            <Link
              to="/u/$handle"
              params={{ handle: comment.author.handle }}
              className="truncate font-medium hover:underline"
            >
              {name}
            </Link>
          ) : (
            <span className="font-medium text-muted-foreground">{name}</span>
          )}
          {comment.byProblemAuthor ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
              Author
            </Badge>
          ) : null}
          <time
            dateTime={comment.createdAt}
            title={new Date(comment.createdAt).toLocaleString()}
            className="text-xs text-muted-foreground"
          >
            {formatCommentedAt(comment.createdAt)}
            {comment.editedAt ? " · edited" : ""}
          </time>
        </header>
        {editor ?? (
          <>
            {comment.spoiler && !revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="group relative w-full overflow-hidden rounded-lg border border-dashed text-left"
              >
                <p
                  aria-hidden="true"
                  className="pointer-events-none line-clamp-3 px-3 py-2 text-sm whitespace-pre-wrap blur-sm select-none"
                >
                  {comment.body}
                </p>
                <span className="absolute inset-0 flex items-center justify-center gap-1.5 bg-background/40 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  <EyeOff aria-hidden="true" className="size-3.5" />
                  Spoiler, click to show
                </span>
              </button>
            ) : (
              <p
                className={cn(
                  "text-sm leading-6 break-words whitespace-pre-wrap",
                  comment.spoiler && "rounded-lg bg-muted/50 px-3 py-2",
                )}
              >
                {comment.body}
              </p>
            )}
            <div className="-ml-2 flex items-center gap-1">
              <Button variant="ghost" size="xs" onClick={onReply}>
                <Reply aria-hidden="true" data-icon="inline-start" />
                Reply
              </Button>
              {comment.mine || canRemove ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Comment actions"
                      />
                    }
                  >
                    <MoreHorizontal aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {comment.mine ? (
                      <DropdownMenuItem onClick={onEdit}>
                        <Pencil aria-hidden="true" />
                        Edit
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem variant="destructive" onClick={onRemove}>
                      <Trash2 aria-hidden="true" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
