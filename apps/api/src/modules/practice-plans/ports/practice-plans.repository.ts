import type { Track } from "@repo/design";
import type { InterviewDimension } from "@repo/scoring";

import { Repository } from "@/core/repository";

import type { PracticePlanEntity } from "../practice-plan.entity";

export interface StartPracticePlanData {
  userId: string;
  weekStart: string;
  track: Track;
  skill: InterviewDimension | null;
  problemIds: readonly string[];
}

export interface PlannedProblem {
  position: number;
  problemId: string;
}

export abstract class PracticePlansRepository extends Repository {
  public abstract replaceForWeek(
    data: StartPracticePlanData,
  ): Promise<PracticePlanEntity>;

  public abstract findForWeek(
    userId: string,
    weekStart: string,
  ): Promise<PracticePlanEntity | null>;

  public abstract listItems(planId: string): Promise<PlannedProblem[]>;

  public abstract deleteForWeek(
    userId: string,
    weekStart: string,
  ): Promise<boolean>;

  public abstract listUnreminded(
    weekStart: string,
  ): Promise<PracticePlanEntity[]>;

  public abstract markReminded(id: string, at: Date): Promise<void>;
}
