import { OFFICIAL_PROBLEMS } from "@repo/problem-library";
import { describe, expect, test } from "bun:test";

import {
  dimensionShares,
  escapeXml,
  positionsOf,
  shareCardSvg,
  wrapText,
} from "./share.card";
import type { SharedInterview, SharedView } from "./share.entity";

const shortener = OFFICIAL_PROBLEMS.find(
  (problem) => problem.slug === "url-shortener",
)!;
const fonts = { sans: "Geist", mono: "Geist Mono" };

const view = (over: Partial<SharedView> = {}): SharedView => ({
  share: {
    id: "share",
    token: "token-token-token-token",
    ownerId: "owner",
    subject: "design",
    subjectId: "design",
    createdAt: new Date(),
    revokedAt: null,
  },
  title: "Links <fast> & cheap",
  kind: "system",
  graph: shortener.reference.graph,
  layout: {},
  owner: null,
  interview: null,
  ...over,
});

describe("the share card", () => {
  test("escapes what people typed", () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;",
    );
    expect(shareCardSvg(view(), fonts)).toContain(
      "Links &lt;fast&gt; &amp; cheap",
    );
  });

  test("wraps a title to its lines and marks what it cut", () => {
    expect(wrapText("Team chat across two regions", 12, 2)).toEqual([
      "Team chat",
      "across two …",
    ]);
    expect(wrapText("Short", 12, 2)).toEqual(["Short"]);
  });

  test("lays out by the saved layout, or in layers along the edges", () => {
    const { graph } = view();
    const layered = positionsOf(graph, {});
    const users = layered.get("users")!;
    const balancer = layered.get("balancer") ?? [...layered.values()][1]!;

    expect(layered.size).toBe(graph.nodes.length);
    expect(balancer.x).toBeGreaterThan(users.x);

    const saved = Object.fromEntries(
      graph.nodes.map((node, index) => [node.id, { x: index, y: 0 }]),
    );

    expect(positionsOf(graph, saved).get(graph.nodes[2]!.id)).toEqual({
      x: 2,
      y: 0,
    });
  });

  test("weighs an interview's items into shares per dimension", () => {
    const interview: SharedInterview = {
      problem: {
        slug: "url-shortener",
        title: "URL shortener",
        track: "system-design",
        difficulty: "easy",
      },
      score: 80,
      designScore: 100,
      summary: "",
      strengths: [],
      improvements: [],
      endedAt: null,
      items: [
        {
          title: "a",
          dimension: "scaling",
          weight: 10,
          score: 3,
          rationale: "",
        },
        {
          title: "b",
          dimension: "scaling",
          weight: 30,
          score: 0,
          rationale: "",
        },
        {
          title: "c",
          dimension: "design",
          weight: 5,
          score: null,
          rationale: "",
        },
      ],
    };

    expect(dimensionShares(interview)).toEqual([
      { dimension: "scaling", share: 0.25 },
    ]);
    expect(shareCardSvg(view({ interview }), fonts)).toContain(">80<");
  });
});
