import type {
  InterviewEventRow,
  InterviewMessageAuthor,
  InterviewStatus,
} from "@/db";

import type { InterviewEvent } from "./interview.events";
import type {
  InterviewMessageModel,
  InterviewModel,
  InterviewSummaryModel,
} from "./interview.model";

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

export class InterviewEntity {
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
