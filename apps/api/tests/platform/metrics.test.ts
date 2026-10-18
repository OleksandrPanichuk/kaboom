import { createGuest, createUser } from "@tests/helpers";
import { describe, expect, test } from "bun:test";

import type { ScriptedLanguageModel } from "@/adapters/llm/scripted.language-model";
import type { MemoryMetrics } from "@/adapters/metrics/memory.metrics";
import { make } from "@/core/registry";
import { TurnScheduler } from "@/modules/interviews";
import { ProblemsService } from "@/modules/problems";
import { LanguageModel, type MeasuredLanguageModel } from "@/platform/llm";
import { type LabelsOf, Metrics, UNMATCHED_ROUTE } from "@/platform/metrics";

import { PATH, startInterview } from "../interviews/helpers";

const metrics = (): MemoryMetrics => make(Metrics) as MemoryMetrics;

const scripted = () =>
  (make(LanguageModel) as MeasuredLanguageModel).inner as ScriptedLanguageModel;

type RequestLabels = LabelsOf<"httpDuration">;

interface Measurement extends RequestLabels {
  durationMs: number;
}

const recorded = async (
  match: (measurement: Measurement) => boolean,
): Promise<Measurement | undefined> => {
  for (let i = 0; i < 50; i += 1) {
    const found = metrics()
      .of("httpDuration")
      .map(({ value, labels }) => ({ ...labels, durationMs: value }))
      .find(match);

    if (found) return found;

    await Bun.sleep(5);
  }

  return undefined;
};

describe("request metrics", () => {
  test("record the route template, not the path with its ids", async () => {
    const user = await createUser();

    await user.delete(`/api/sessions/${crypto.randomUUID()}`);

    const measurement = await recorded(({ method }) => method === "DELETE");

    expect(measurement).toMatchObject({
      route: "/api/sessions/:id",
      status_class: "4xx",
    });
    expect(measurement?.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("record the status the caller got", async () => {
    await createGuest().post("/api/auth/sign-in", {
      email: "nobody@example.test",
      password: "wrong-password",
    });

    const measurement = await recorded(
      ({ route }) => route === "/api/auth/sign-in",
    );

    expect(measurement).toMatchObject({ method: "POST", status_class: "4xx" });
  });

  test("group every unknown path under one route", async () => {
    await createGuest().get("/api/nowhere/at/all");

    const measurement = await recorded(
      ({ route }) => route === UNMATCHED_ROUTE,
    );

    expect(measurement?.status_class).toBe("4xx");
  });

  test("count each request beside its duration", async () => {
    await createGuest().get("/api/nowhere/at/all");
    await recorded(({ route }) => route === UNMATCHED_ROUTE);

    expect(
      metrics()
        .of("httpRequests")
        .some(({ labels }) => labels.route === UNMATCHED_ROUTE),
    ).toBe(true);
  });
});

describe("measured work", () => {
  test("an interviewer turn records its duration, stop reason and tokens", async () => {
    await make(ProblemsService).syncOfficial();

    const user = await createUser();
    const interview = await startInterview(user);

    scripted().enqueue([
      { type: "text-delta", text: "Tell me about the traffic." },
      {
        type: "usage",
        usage: {
          inputTokens: 1200,
          outputTokens: 80,
          cacheReadTokens: 900,
          cacheWriteTokens: 0,
        },
      },
      { type: "stop", reason: "end" },
    ]);
    await user.post(`${PATH}/${interview.id}/messages`, { body: "Hello" });
    await make(TurnScheduler).drain();

    expect(
      metrics()
        .of("llmTurns")
        .map(({ labels }) => labels),
    ).toContainEqual({
      role: "interviewer",
      stop_reason: "end",
    });
    expect(metrics().of("llmFirstToken")).toHaveLength(1);
    expect(
      metrics()
        .of("llmTokens")
        .map(({ value, labels }) => [labels.type, value]),
    ).toEqual([
      ["input", 1200],
      ["output", 80],
      ["cache_read", 900],
    ]);
    const events = metrics()
      .of("productEvents")
      .map(({ labels }) => labels.event);

    expect(events).toContain("sign_up");
    expect(events).toContain("interview_started");
  });

  test("a submission records its design test and the product event", async () => {
    const user = await createUser();

    await make(ProblemsService).syncOfficial();
    await user.post("/api/problems/url-shortener/start");
    await user.post("/api/problems/url-shortener/submissions", {});

    expect(
      metrics()
        .of("designTests")
        .map(({ labels }) => labels),
    ).toContainEqual({ task: "test", outcome: "done" });
    expect(metrics().of("designTestDuration")).not.toHaveLength(0);
    expect(
      metrics()
        .of("productEvents")
        .some(({ labels }) => labels.event === "submission"),
    ).toBe(true);
  });

  test("billing gauges read the inbox", async () => {
    expect(await metrics().read("billingEventsFailed")).toBe(0);
    expect(await metrics().read("billingOldestPending")).toBe(0);
  });
});
