import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";
import {
  LEADERBOARD_FILTER_ALL_TIME,
  LeaderboardRepository,
} from "@/modules/leaderboard";
import { ProblemsRepository } from "@/modules/problems";
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

  private readonly problems = makeRepository(ProblemsRepository);

  private readonly skills = makeService(SkillsService);

  private async authoredBy(userId: string) {
    const problems = await this.problems.listPublishedByAuthor(userId);
    const solvers = await this.submissions.countSolvers(
      problems.map((problem) => problem.id),
      userId,
    );

    return problems.map((problem) => ({
      slug: problem.slug,
      title: problem.title,
      summary: problem.summary,
      track: problem.track,
      difficulty: problem.difficulty,
      publishedAt: problem.publishedAt,
      solvers: solvers.get(problem.id) ?? 0,
    }));
  }

  public async execute({ handle, viewerId }: Options): Promise<Result> {
    const profile = await this.profiles.findByHandle(handle.toLowerCase());
    const own = profile?.userId === viewerId;

    if (!profile || (!profile.visible && !own)) {
      throw new ProfileNotFoundError(`No profile ${handle}`);
    }

    const [standing, skills, recent, problems] = await Promise.all([
      this.leaderboard.standingOf(profile.userId, LEADERBOARD_FILTER_ALL_TIME),
      this.skills.summaryFor(profile.userId),
      this.submissions.listRecentForUser(profile.userId, RECENT_SUBMISSIONS),
      this.authoredBy(profile.userId),
    ]);

    return {
      profile,
      own,
      standing,
      skills,
      recent: recent
        .filter((submission) => submission.counted)
        .map(({ problem, score, at }) => ({ problem, score, at })),
      problems,
    };
  }
}
