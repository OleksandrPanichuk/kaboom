import { cn } from "cn";

interface MessageBubbleProps {
  author: "user" | "interviewer" | "system";
  body: string;
  interrupted?: boolean;
  streaming?: boolean;
}

export function MessageBubble({
  author,
  body,
  interrupted,
  streaming,
}: MessageBubbleProps) {
  if (author === "system") {
    return (
      <li className="self-center rounded-lg bg-amber-50 px-3 py-2 text-center text-xs leading-5 text-amber-900 text-pretty">
        {body}
      </li>
    );
  }

  return (
    <li
      className={cn(
        "flex max-w-[88%] flex-col gap-1",
        author === "user" ? "self-end items-end" : "self-start",
      )}
    >
      <span className="px-1 text-[11px] font-medium text-muted-foreground">
        {author === "user" ? "You" : "Interviewer"}
      </span>
      <p
        className={cn(
          "rounded-2xl px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-pretty",
          author === "user"
            ? "rounded-br-md bg-indigo-600 text-white"
            : "rounded-bl-md bg-zinc-100 text-foreground",
        )}
      >
        {body}
        {streaming ? (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-current align-text-bottom opacity-60"
          />
        ) : null}
      </p>
      {interrupted ? (
        <span className="px-1 text-[11px] text-muted-foreground">
          Interrupted
        </span>
      ) : null}
    </li>
  );
}
