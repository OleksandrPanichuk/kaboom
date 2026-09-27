import { captureException } from "@/core/error-reporting";
import { make, makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { UsageLedger } from "@/platform/llm";

import type { InterviewEntity } from "../interview.entity";
import { InterviewsService } from "../interviews.service";
import {
  InterviewerTurnsRepository,
  InterviewMessagesRepository,
  InterviewsRepository,
} from "../ports";
import { publishLive } from "./live";
import { InterviewerRunner } from "./runner";
import { coalesce, isUnprompted, type Trigger } from "./triggers";

export const TURN_TOKEN_ESTIMATE = 30_000;
export const INTERJECTION_GAP_MS = 60_000;
export const MAX_CONSECUTIVE_FAILURES = 2;

export const BUDGET_MESSAGE =
  "You have reached today's interviewer budget. The interviewer will be back tomorrow; your design and messages are kept.";
export const FAILURE_MESSAGE =
  "The interviewer ran into a problem and paused. Send a message to try again.";

interface Mailbox {
  pending: Trigger[];
  running: Promise<void> | null;
  controller: AbortController | null;
  turnId: string | null;
  failures: number;
  lastUnprompted: number;
  budgetNotified: string | null;
}

export class TurnScheduler extends Service {
  private readonly boxes = new Map<string, Mailbox>();

  private readonly timersFired = new Set<string>();

  private accepting = true;

  private ticker: ReturnType<typeof setInterval> | null = null;

  private now: () => number = () => Date.now();

  private box(interviewId: string): Mailbox {
    let box = this.boxes.get(interviewId);

    if (!box) {
      box = {
        pending: [],
        running: null,
        controller: null,
        turnId: null,
        failures: 0,
        lastUnprompted: Number.NEGATIVE_INFINITY,
        budgetNotified: null,
      };
      this.boxes.set(interviewId, box);
    }

    return box;
  }

  public start({ tickMs, now }: { tickMs: number; now?: () => number }): void {
    this.accepting = true;
    if (now) this.now = now;
    if (tickMs > 0) {
      this.ticker = setInterval(() => void this.checkPhases(), tickMs);
    }
  }

  public enqueue(interviewId: string, trigger: Trigger): void {
    if (!this.accepting) return;

    const box = this.box(interviewId);

    box.pending = coalesce(box.pending, trigger);
    box.running ??= this.pump(interviewId, box);
  }

  public interrupt(interviewId: string): boolean {
    const controller = this.boxes.get(interviewId)?.controller;

    if (!controller) return false;

    controller.abort();

    return true;
  }

  public currentTurn(interviewId: string): string | null {
    return this.boxes.get(interviewId)?.turnId ?? null;
  }

  public async drain(): Promise<void> {
    for (;;) {
      const running = [...this.boxes.values()]
        .map((box) => box.running)
        .filter((value): value is Promise<void> => value !== null);

      if (running.length === 0) return;

      await Promise.all(running);
    }
  }

  public reset(): void {
    this.boxes.clear();
    this.timersFired.clear();
    this.now = () => Date.now();
  }

  public async shutdown(): Promise<void> {
    this.accepting = false;
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;

    for (const box of this.boxes.values()) {
      box.pending = [];
      box.controller?.abort();
    }

    await this.drain();
  }

  public async checkPhases(): Promise<void> {
    const interviews = makeService(InterviewsService);
    const now = this.now();

    for (const interview of await makeRepository(
      InterviewsRepository,
    ).listActive()) {
      const key = `${interview.id}:${interview.phase}:${interview.phaseStartedAt.getTime()}`;

      if (this.timersFired.has(key)) continue;

      const { interview: plan } = await interviews.pinned(interview);
      const minutes = plan.phases.find(
        (phase) => phase.id === interview.phase,
      )?.minutes;

      if (minutes === undefined) continue;

      if (now - interview.phaseStartedAt.getTime() >= minutes * 60_000) {
        this.timersFired.add(key);
        this.enqueue(interview.id, "phase-timer");
      }
    }
  }

  private async pump(interviewId: string, box: Mailbox): Promise<void> {
    try {
      while (box.pending.length > 0 && this.accepting) {
        const triggers = box.pending;

        box.pending = [];
        await this.turn(interviewId, box, triggers);
      }
    } finally {
      box.running = null;
    }
  }

  private async turn(
    interviewId: string,
    box: Mailbox,
    triggers: Trigger[],
  ): Promise<void> {
    const interview =
      await makeRepository(InterviewsRepository).findById(interviewId);

    if (interview?.status !== "active") return;

    if (isUnprompted(triggers)) {
      if (this.now() - box.lastUnprompted < INTERJECTION_GAP_MS) return;

      box.lastUnprompted = this.now();
    }

    if (
      !(await make(UsageLedger).reserve(interview.ownerId, TURN_TOKEN_ESTIMATE))
    ) {
      await this.notifyBudget(interview, box);

      return;
    }

    const turns = makeRepository(InterviewerTurnsRepository);
    const row = await turns.start(interviewId, triggers);
    const controller = new AbortController();

    box.controller = controller;
    box.turnId = row.id;
    await publishLive(interviewId, {
      type: "turn",
      turnId: row.id,
      state: "thinking",
    });

    try {
      const result = await makeService(InterviewerRunner).run({
        interview,
        triggers,
        turnId: row.id,
        signal: controller.signal,
      });

      box.failures = 0;
      await turns.finish(row.id, {
        status: result.status,
        tokens: result.tokens,
      });
    } catch (error) {
      box.failures += 1;
      captureException(error, {
        source: "TurnScheduler",
        tags: { interviewId },
      });
      await turns.finish(row.id, {
        status: "failed",
        tokens: 0,
        error: error instanceof Error ? error.message : String(error),
      });

      if (box.failures >= MAX_CONSECUTIVE_FAILURES) {
        box.failures = 0;
        box.pending = [];
        await this.system(interviewId, FAILURE_MESSAGE);
      }
    } finally {
      box.controller = null;
      box.turnId = null;
      await publishLive(interviewId, {
        type: "turn",
        turnId: row.id,
        state: "idle",
      });
    }
  }

  private async notifyBudget(interview: InterviewEntity, box: Mailbox) {
    const day = new Date(this.now()).toISOString().slice(0, 10);

    if (box.budgetNotified === day) return;

    box.budgetNotified = day;
    await this.system(interview.id, BUDGET_MESSAGE);
  }

  private system(interviewId: string, body: string) {
    return makeService(InterviewsService).commit(interviewId, async (emit) => {
      const message = await makeRepository(InterviewMessagesRepository).insert({
        interviewId,
        author: "system",
        body,
      });

      await emit("message", { messageId: message.id });
    });
  }
}
