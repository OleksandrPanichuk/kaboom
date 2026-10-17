import { getEnv } from "@/configs";

import { escapeXml, truncate } from "./share.card";
import { type SharedView, shareLinks } from "./share.entity";
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "./shares.constants";

const describe = (view: SharedView): string => {
  const by = view.owner ? ` by ${view.owner.displayName}` : "";

  if (view.interview) {
    const score = view.interview.score ?? view.interview.designScore;

    return truncate(
      `A mock interview on ${view.interview.problem.title}${by}, scored ${score}/100. ${view.interview.summary}`,
      200,
    );
  }

  return `A ${view.kind === "schema" ? "data model" : "system design"}${by}, drawn and load-tested on Kaboom.`;
};

const meta = (property: string, content: string, key = "property") =>
  `<meta ${key}="${property}" content="${escapeXml(content)}">`;

export const sharePageHtml = (
  token: string,
  view: SharedView | null,
): string => {
  const { url, pageUrl, imageUrl } = shareLinks(token);
  const target = view ? pageUrl : `${getEnv().APP_URL}/`;
  const title = view ? `${view.title} · Kaboom` : "Kaboom";
  const description = view
    ? describe(view)
    : "This link was turned off by the person who shared it.";
  const tags = view
    ? [
        meta("og:image", imageUrl),
        meta("og:image:width", String(SHARE_IMAGE_WIDTH)),
        meta("og:image:height", String(SHARE_IMAGE_HEIGHT)),
        meta("og:image:alt", view.title),
        meta("twitter:card", "summary_large_image", "name"),
        meta("twitter:image", imageUrl, "name"),
      ]
    : [meta("twitter:card", "summary", "name")];

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    `<title>${escapeXml(title)}</title>`,
    meta("description", description, "name"),
    meta("og:type", "website"),
    meta("og:site_name", "Kaboom"),
    meta("og:title", title),
    meta("og:description", description),
    meta("og:url", url),
    meta("twitter:title", title, "name"),
    meta("twitter:description", description, "name"),
    ...tags,
    `<link rel="canonical" href="${escapeXml(target)}">`,
    `<meta http-equiv="refresh" content="0;url=${escapeXml(target)}">`,
    "</head>",
    "<body>",
    `<p><a href="${escapeXml(target)}">${escapeXml(view ? `Open ${view.title} on Kaboom` : "Open Kaboom")}</a></p>`,
    "</body>",
    "</html>",
  ].join("\n");
};
