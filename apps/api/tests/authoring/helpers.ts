import { createVerifiedUser, type TestUser } from "@tests/helpers";

import { makeService } from "@/core/registry";
import { UsersService } from "@/modules/users";

interface Draft {
  id: string;
  content: Record<string, unknown>;
}

export const createModerator = async (): Promise<TestUser> => {
  const user = await createVerifiedUser();

  await makeService(UsersService).setRole(user.id, "moderator");

  return user;
};

export const publishFork = async (
  author: TestUser,
  moderator: TestUser,
  title: string,
): Promise<string> => {
  const draft = (
    await author.post<Draft>("/api/problem-drafts", { forkOf: "url-shortener" })
  ).body;
  const slug = `community-${Math.random().toString(36).slice(2, 8)}`;

  await author.put(`/api/problem-drafts/${draft.id}`, {
    content: { ...draft.content, slug, title },
  });
  await author.post(`/api/problem-drafts/${draft.id}/submit`, {});

  const reviews = await moderator.get<{
    items: Array<{ id: string; slug: string }>;
  }>("/api/problem-reviews");
  const review = reviews.body.items.find((item) => item.slug === slug)!;

  await moderator.post(`/api/problem-reviews/${review.id}/approve`, {});

  return slug;
};
