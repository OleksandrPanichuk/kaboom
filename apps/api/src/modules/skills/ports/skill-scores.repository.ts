import { Repository } from "@/core/repository";

import type { SkillScoreEntity } from "../skill.entity";

export type CreateSkillScoreData = Omit<SkillScoreEntity, "id" | "createdAt">;

export abstract class SkillScoresRepository extends Repository {
  public abstract insertMany(rows: CreateSkillScoreData[]): Promise<void>;

  public abstract listFor(userId: string): Promise<SkillScoreEntity[]>;
}
