import {
  appName,
  renderActionEmail,
  type RenderedEmail,
} from "./auth-email.templates";

interface PracticeReminderEmailOptions {
  name?: string;
  done: number;
  total: number;
  left: string[];
  planUrl: string;
}

const listOf = (titles: readonly string[]): string =>
  titles.length === 1
    ? titles[0]!
    : `${titles.slice(0, -1).join(", ")} and ${titles.at(-1)}`;

export const renderPracticeReminderEmail = (
  options: PracticeReminderEmailOptions,
): RenderedEmail => {
  const remaining = options.left.length;
  const title =
    options.done === 0
      ? "Your practice plan is waiting"
      : `${options.done} of ${options.total} done, ${remaining} to go`;

  return {
    subject: title,
    ...renderActionEmail({
      label: "Practice plan",
      name: options.name,
      actionUrl: options.planUrl,
      title,
      preheader: `Still on this week's plan: ${listOf(options.left)}.`,
      description: `Still on this week's plan: ${listOf(options.left)}. The week ends on Sunday, so there is time for ${remaining === 1 ? "it" : "them"}.`,
      actionLabel: "Open your plan",
      noteText: "",
      ignoreText: `You get this email because you made a practice plan on ${appName()}. Turn reminders off in your settings, under Notifications.`,
    }),
  };
};
