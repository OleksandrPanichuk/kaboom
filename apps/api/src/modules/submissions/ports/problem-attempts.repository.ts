import { Repository } from "@/core/repository";

import type { AttemptEntity } from "../submission.entity";

export interface CreateAttemptData {
  userId: string;
  problemId: string;
  problemVersion: number;
  designId: string;
}

export abstract class ProblemAttemptsRepository extends Repository {
  public abstract find(
    userId: string,
    problemId: string,
  ): Promise<AttemptEntity | null>;

  public abstract insert(data: CreateAttemptData): Promise<AttemptEntity>;

  public abstract moveToVersion(
    id: string,
    version: number,
    hints: number,
  ): Promise<AttemptEntity | null>;

  public abstract revealHint(
    id: string,
    index: number,
  ): Promise<AttemptEntity | null>;
}
