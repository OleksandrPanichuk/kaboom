import {
  appName,
  renderActionEmail,
  type RenderedEmail,
} from "./auth-email.templates";

export const renderReviewReadyEmail = (options: {
  name?: string;
  actionUrl: string;
}): RenderedEmail => ({
  subject: "Your interview review is ready",
  ...renderActionEmail({
    name: options.name,
    actionUrl: options.actionUrl,
    title: "Your interview review is ready",
    preheader: `The review of your ${appName()} interview is ready to read.`,
    description:
      "Your interview has been reviewed: a score for each part of the rubric, what went well and what to practise next.",
    actionLabel: "Read the review",
    noteText: "",
    ignoreText: `You get this email because you finished an interview on ${appName()}.`,
  }),
});
