import { makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import type { SkillsView } from "../skill.entity";
import { SkillsService } from "../skills.service";

export interface GetMySkillsUseCaseOptions {
  userId: string;
}

type Options = GetMySkillsUseCaseOptions;
type Result = SkillsView;

export class GetMySkillsUseCase extends UseCase<Options, Result> {
  private readonly skills = makeService(SkillsService);

  public execute({ userId }: Options): Promise<Result> {
    return this.skills.viewFor(userId);
  }
}
