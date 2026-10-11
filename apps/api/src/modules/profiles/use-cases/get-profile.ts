import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import {
  LEADERBOARD_FILTER_ALL_TIME,
  LeaderboardRepository,
} from "@/modules/leaderboard";
import { SkillsService } from "@/modules/skills";
import { SubmissionsRepository } from "@/modules/submissions";

import { ProfilesRepository } from "../ports";
import type { PublicProfileView } from "../profile.entity";
import { RECENT_SUBMISSIONS } from "../profiles.constants";
import { ProfileNotFoundError } from "../profiles.errors";

export interface GetProfileUseCaseOptions {
  handle: string;
  viewerId: string;
}

type Options = GetProfileUseCaseOptions;
type Result = PublicProfileView;

export class GetProfileUseCase extends UseCase<Options, Result> {
  private readonly profiles = makeRepository(ProfilesRepository);

  private readonly leaderboard = makeRepository(LeaderboardRepository);

  private readonly submissions = makeRepository(SubmissionsRepository);

  private readonly skills = makeService(SkillsService);

  public async execute({ handle, viewerId }: Options): Promise<Result> {
    const profile = await this.profiles.findByHandle(handle.toLowerCase());
    const own = profile?.userId === viewerId;

    if (!profile || (!profile.visible && !own)) {
      throw new ProfileNotFoundError(`No profile ${handle}`);
    }

    const [standing, skills, recent] = await Promise.all([
      this.leaderboard.standingOf(profile.userId, LEADERBOARD_FILTER_ALL_TIME),
      this.skills.summaryFor(profile.userId),
      this.submissions.listRecentForUser(profile.userId, RECENT_SUBMISSIONS),
    ]);

    return {
      profile,
      own,
      standing,
      skills,
      recent: recent
        .filter((submission) => submission.counted)
        .map(({ problem, score, at }) => ({ problem, score, at })),
    };
  }
}
