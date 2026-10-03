import type { Page, PageRequest } from "@/core/pagination";
import { Repository } from "@/core/repository";
import type { InterviewStatus } from "@/db";

import type {
  InterviewEntity,
  InterviewSummaryEntity,
} from "../interview.entity";

export interface CreateInterviewData {
  ownerId: string;
  problemId: string;
  problemVersion: number;
  designId: string;
  phase: string;
}

export abstract class InterviewsRepository extends Repository {
  public abstract insert(data: CreateInterviewData): Promise<InterviewEntity>;

  public abstract findOwned(
    id: string,
    ownerId: string,
  ): Promise<InterviewEntity | null>;

  public abstract findActive(ownerId: string): Promise<InterviewEntity | null>;

  public abstract listOwned(
    ownerId: string,
    page: PageRequest,
  ): Promise<Page<InterviewSummaryEntity>>;

  public abstract nextSeq(id: string): Promise<number>;

  public abstract findById(id: string): Promise<InterviewEntity | null>;

  public abstract listActive(): Promise<InterviewEntity[]>;

  public abstract setPhase(id: string, phase: string): Promise<InterviewEntity>;

  public abstract transition(
    id: string,
    from: InterviewStatus,
    to: InterviewStatus,
  ): Promise<InterviewEntity | null>;

  public abstract markReviewing(
    id: string,
    finalRevision: number,
  ): Promise<InterviewEntity | null>;
}
