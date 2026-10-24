import type { Track } from "@repo/design";

import type {
  InterviewEventRow,
  InterviewMessageAuthor,
  InterviewStatus,
} from "@/db";
import type { DesignRevisionEntity } from "@/modules/designs";

import type { InterviewEvent } from "./interview.events";
import type {
  InterviewMessageModel,
  InterviewModel,
  InterviewQuotaModel,
  InterviewReplayModel,
  InterviewSummaryModel,
} from "./interview.model";
import type { InterviewQuota } from "./interview-quota.service";

export interface InterviewEntity {
  id: string;
  ownerId: string;
  problemId: string;
  problemVersion: number;
  designId: string;
  status: InterviewStatus;
  phase: string;
  phaseStartedAt: Date;
  eventSeq: number;
  finalRevision: number | null;
  startedAt: Date;
  endedAt: Date | null;
}

export interface InterviewMessageEntity {
  id: string;
  interviewId: string;
  author: InterviewMessageAuthor;
  body: string;
  turnId: string | null;
  interrupted: boolean;
  createdAt: Date;
}

export interface InterviewProblem {
  track: Track;
  slug: string;
  title: string;
  difficulty: string;
  statement: string;
  phases: Array<{ id: string; minutes: number; goal: string }>;
}

export interface InterviewView {
  interview: InterviewEntity;
  problem: InterviewProblem;
  messages: InterviewMessageEntity[];
}

export interface InterviewSummaryEntity {
  interview: InterviewEntity;
  problem: Pick<InterviewProblem, "slug" | "title" | "difficulty">;
}

export class InterviewMessageEntity {
  public static normalize(
    entity: InterviewMessageEntity,
  ): InterviewMessageModel {
    return {
      id: entity.id,
      author: entity.author,
      body: entity.body,
      turnId: entity.turnId,
      interrupted: entity.interrupted,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}

export interface InterviewReplayView extends InterviewView {
  events: InterviewEventRow[];
  revisions: DesignRevisionEntity[];
  layout: Record<string, { x: number; y: number }>;
}

export class InterviewEntity {
  public static normalizeReplay({
    events,
    revisions,
    layout,
    ...view
  }: InterviewReplayView): InterviewReplayModel {
    return {
      ...InterviewEntity.normalize(view),
      events: events.map((event) => ({
        seq: event.seq,
        type: event.type,
        at: event.createdAt.toISOString(),
        payload: event.payload,
      })),
      revisions: revisions.map((revision) => ({
        number: revision.number,
        author: revision.author,
        at: revision.createdAt.toISOString(),
        ops: revision.ops,
        snapshot: revision.snapshot,
      })),
      layout,
    };
  }

  public static normalize({
    interview,
    problem,
    messages,
  }: InterviewView): InterviewModel {
    return {
      id: interview.id,
      designId: interview.designId,
      problemVersion: interview.problemVersion,
      status: interview.status,
      phase: interview.phase,
      phaseStartedAt: interview.phaseStartedAt.toISOString(),
      finalRevision: interview.finalRevision,
      startedAt: interview.startedAt.toISOString(),
      endedAt: interview.endedAt?.toISOString() ?? null,
      lastSeq: interview.eventSeq,
      problem,
      messages: messages.map(InterviewMessageEntity.normalize),
    };
  }

  public static normalizeQuota(quota: InterviewQuota): InterviewQuotaModel {
    return {
      limit: quota.limit,
      per: quota.per,
      used: quota.used,
      resetsAt: quota.resetsAt.toISOString(),
    };
  }

  public static normalizeSummary({
    interview,
    problem,
  }: InterviewSummaryEntity): InterviewSummaryModel {
    return {
      id: interview.id,
      status: interview.status,
      phase: interview.phase,
      startedAt: interview.startedAt.toISOString(),
      endedAt: interview.endedAt?.toISOString() ?? null,
      problem,
    };
  }
}

export const toInterviewEvent = (row: InterviewEventRow): InterviewEvent => ({
  seq: row.seq,
  type: row.type,
  payload: row.payload,
  at: row.createdAt.toISOString(),
});
