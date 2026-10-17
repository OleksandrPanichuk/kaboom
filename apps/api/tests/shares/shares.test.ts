import { createGuest, createUser, type TestUser } from "@tests/helpers";
import { beforeEach, describe, expect, test } from "bun:test";

import { make } from "@/core/registry";
import { TurnScheduler } from "@/modules/interviews";
import { ProblemsService } from "@/modules/problems";

import { getApp } from "../helpers/app";
import { PATH as INTERVIEWS, startInterview } from "../interviews/helpers";
import { buildReference, model, reviewAnswer } from "../reviews/helpers";

interface Share {
  token: string;
  url: string;
  imageUrl: string;
  subject: string;
  subjectId: string;
}

interface Shared {
  subject: string;
  title: string;
  kind: string;
  owner: { handle: string; displayName: string } | null;
  graph: { nodes: Array<{ id: string }> };
  interview: {
    problem: { slug: string; title: string };
    score: number | null;
    summary: string;
    items: Array<Record<string, unknown>>;
  } | null;
}

interface ErrorBody {
  code?: string;
}

const PNG = [0x89, 0x50, 0x4e, 0x47];

const raw = (path: string) =>
  getApp().handle(new Request(`http://localhost:3000${path}`));

beforeEach(async () => {
  await make(ProblemsService).syncOfficial();
});

const createDesign = async (user: TestUser, name = "Photo sharing") =>
  (await user.post<{ id: string }>("/api/designs", { name })).body.id;

const share = (user: TestUser, subject: string, subjectId: string) =>
  user.post<Share & ErrorBody>("/api/shares", { subject, subjectId });

const reviewedInterview = async (user: TestUser) => {
  const interview = await startInterview(user);

  await make(TurnScheduler).drain();
  await buildReference(user, interview.id);
  model().enqueue(reviewAnswer());
  await user.post(`${INTERVIEWS}/${interview.id}/submit`, {});

  return interview.id;
};

describe("shared links", () => {
  test("a design is shared once, and anyone opens it without signing in", async () => {
    const ada = await createUser();
    const id = await createDesign(ada);

    const first = await share(ada, "design", id);
    const again = await share(ada, "design", id);

    expect(first.status).toBe(200);
    expect(again.body.token).toBe(first.body.token);
    expect(first.body.url).toEndWith(`/api/s/${first.body.token}`);
    expect(
      (await ada.get<Share>(`/api/shares/mine?subject=design&subjectId=${id}`))
        .body.token,
    ).toBe(first.body.token);

    const guest = createGuest();
    const seen = await guest.get<Shared>(`/api/shared/${first.body.token}`);

    expect(seen.status).toBe(200);
    expect(seen.body).toMatchObject({
      subject: "design",
      title: "Photo sharing",
      kind: "system",
      interview: null,
    });
    expect(seen.body.owner).not.toBeNull();
  });

  test("draws a PNG preview and a page crawlers read", async () => {
    const ada = await createUser();
    const { body } = await share(ada, "design", await createDesign(ada));

    const image = await raw(`/api/shared/${body.token}/image.png`);
    const bytes = new Uint8Array(await image.arrayBuffer());

    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
    expect([...bytes.slice(0, 4)]).toEqual(PNG);

    const page = await raw(`/api/s/${body.token}`);
    const html = await page.text();

    expect(page.headers.get("content-type")).toContain("text/html");
    expect(html).toContain(
      'property="og:title" content="Photo sharing · Kaboom"',
    );
    expect(html).toContain(`content="${body.imageUrl}"`);
    expect(html).toContain(`/shared/${body.token}`);
  });

  test("a revoked link stops working, and sharing again makes a new one", async () => {
    const ada = await createUser();
    const id = await createDesign(ada);
    const { body } = await share(ada, "design", id);
    const guest = createGuest();

    expect((await ada.delete(`/api/shares/${body.token}`)).status).toBe(200);

    const gone = await guest.get<ErrorBody>(`/api/shared/${body.token}`);

    expect(gone.status).toBe(404);
    expect(gone.body.code).toBe("SHARE_NOT_FOUND");
    expect((await raw(`/api/shared/${body.token}/image.png`)).status).toBe(404);
    expect(await (await raw(`/api/s/${body.token}`)).text()).toContain(
      "turned off",
    );
    expect(
      (await ada.get(`/api/shares/mine?subject=design&subjectId=${id}`)).status,
    ).toBe(404);

    const renewed = await share(ada, "design", id);

    expect(renewed.body.token).not.toBe(body.token);
  });

  test("only the owner shares or turns off a link", async () => {
    const ada = await createUser();
    const grace = await createUser();
    const id = await createDesign(ada);
    const { body } = await share(ada, "design", id);

    expect((await share(grace, "design", id)).status).toBe(404);
    expect((await grace.delete(`/api/shares/${body.token}`)).status).toBe(404);
    expect(
      (await grace.get(`/api/shares/mine?subject=design&subjectId=${id}`))
        .status,
    ).toBe(404);
    expect(
      (
        await createGuest().post("/api/shares", {
          subject: "design",
          subjectId: id,
        })
      ).status,
    ).toBe(401);
  });

  test("a deleted design takes its link with it", async () => {
    const ada = await createUser();
    const id = await createDesign(ada);
    const { body } = await share(ada, "design", id);

    await ada.delete(`/api/designs/${id}`);

    expect((await createGuest().get(`/api/shared/${body.token}`)).status).toBe(
      404,
    );
  });

  test("a hidden profile is shared without its name", async () => {
    const ada = await createUser();
    const { body } = await share(ada, "design", await createDesign(ada));

    await ada.patch("/api/profiles/me", { visible: false });

    expect(
      (await createGuest().get<Shared>(`/api/shared/${body.token}`)).body.owner,
    ).toBeNull();
  });

  test("an interview is shared with its review once the review is ready", async () => {
    const ada = await createUser();
    const pending = await startInterview(ada);
    const early = await share(ada, "interview", pending.id);

    expect(early.status).toBe(409);
    expect(early.body.code).toBe("SHARE_NEEDS_REVIEW");

    await ada.post(`${INTERVIEWS}/${pending.id}/submit`, {});

    const id = await reviewedInterview(await createUser());
    const owner = await createUser();
    const reviewed = await reviewedInterview(owner);

    expect((await share(ada, "interview", id)).status).toBe(404);

    const { body } = await share(owner, "interview", reviewed);
    const seen = await createGuest().get<Shared>(`/api/shared/${body.token}`);

    expect(seen.body).toMatchObject({
      subject: "interview",
      title: "URL shortener",
      interview: {
        problem: { slug: "url-shortener", title: "URL shortener" },
        summary: "A solid interview with a clear read path.",
      },
    });
    expect(seen.body.graph.nodes.length).toBeGreaterThan(1);
    expect(seen.body.interview!.items[0]).not.toHaveProperty("citations");

    const image = await raw(`/api/shared/${body.token}/image.png`);

    expect(image.status).toBe(200);
  });
});
