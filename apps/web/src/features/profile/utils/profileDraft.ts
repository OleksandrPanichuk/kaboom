import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  HANDLE_PATTERN,
  LINK_PATTERN,
  MAX_LINKS,
} from "@/features/profile/constants";

export interface ProfileDraft {
  handle: string;
  displayName: string;
  bio: string;
  links: string[];
  visible: boolean;
}

export type ProfileDraftErrors = Partial<
  Record<"handle" | "displayName" | "bio" | "links", string>
>;

export const filledLinks = (links: readonly string[]): string[] =>
  links.map((link) => link.trim()).filter((link) => link !== "");

export const profileDraftErrors = (draft: ProfileDraft): ProfileDraftErrors => {
  const errors: ProfileDraftErrors = {};
  const links = filledLinks(draft.links);

  if (!HANDLE_PATTERN.test(draft.handle)) {
    errors.handle =
      "3 to 20 lowercase letters, digits, hyphens or underscores, starting and ending with a letter or digit.";
  }

  if (draft.displayName.trim() === "") {
    errors.displayName = "Enter a name to show.";
  } else if (draft.displayName.trim().length > DISPLAY_NAME_MAX_LENGTH) {
    errors.displayName = `At most ${DISPLAY_NAME_MAX_LENGTH} characters.`;
  }

  if (draft.bio.trim().length > BIO_MAX_LENGTH) {
    errors.bio = `At most ${BIO_MAX_LENGTH} characters.`;
  }

  if (links.length > MAX_LINKS) {
    errors.links = `At most ${MAX_LINKS} links.`;
  } else if (links.some((link) => !LINK_PATTERN.test(link))) {
    errors.links = "Each link starts with https:// or http://.";
  }

  return errors;
};

export const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0]?.toUpperCase() ?? "")
    .join("");

export const linkLabel = (link: string): string => {
  try {
    const url = new URL(link);
    const path = url.pathname === "/" ? "" : url.pathname;

    return `${url.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return link;
  }
};
