import {
  appName,
  renderActionEmail,
  type RenderedEmail,
} from "./auth-email.templates";

interface CommentDigestEmailOptions {
  name?: string;
  problemTitle: string;
  problemUrl: string;
  count: number;
  asAuthor: boolean;
  first: { author: string; excerpt: string; spoiler: boolean };
}

const plural = (count: number, one: string, many: string) =>
  count === 1 ? one : many;

export const renderCommentDigestEmail = (
  options: CommentDigestEmailOptions,
): RenderedEmail => {
  const { count, first, problemTitle } = options;
  const noun = options.asAuthor
    ? plural(count, "comment", "comments")
    : plural(count, "reply", "replies");
  const title = options.asAuthor
    ? `${count} new ${noun} on ${problemTitle}`
    : `${count} new ${noun} to your comment on ${problemTitle}`;
  const quote = first.spoiler
    ? `${first.author} wrote something marked as a spoiler.`
    : `${first.author} wrote: “${first.excerpt}”`;
  const more =
    count > 1
      ? ` And ${count - 1} more ${plural(count - 1, options.asAuthor ? "comment" : "reply", options.asAuthor ? "comments" : "replies")}.`
      : "";

  return {
    subject: title,
    ...renderActionEmail({
      label: "Discussion",
      name: options.name,
      actionUrl: options.problemUrl,
      title,
      preheader: quote,
      description: `${quote}${more}`,
      actionLabel: "Read the discussion",
      noteText: "",
      ignoreText: options.asAuthor
        ? `You get this email because you wrote this problem on ${appName()}. Turn comment emails off in your settings, under Notifications.`
        : `You get this email because you commented on this problem on ${appName()}. Turn comment emails off in your settings, under Notifications.`,
    }),
  };
};
