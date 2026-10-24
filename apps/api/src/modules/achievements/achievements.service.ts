import { TRACKS } from "@repo/design";

import { makeRepository } from "@/core/registry";
import { Service } from "@/core/service";
import { InterviewsRepository } from "@/modules/interviews";
import { ProblemsRepository } from "@/modules/problems";
import { ReviewsRepository } from "@/modules/reviews";
import { SubmissionsRepository } from "@/modules/submissions";

import { computeAchievements } from "./achievements.compute";
import type { AchievementsView } from "./achievements.entity";

const REVIEWS_READ = 1_000;

export class AchievementsService extends Service {
  private readonly submissions = makeRepository(SubmissionsRepository);

  private readonly interviews = makeRepository(InterviewsRepository);

  private readonly reviews = makeRepository(ReviewsRepository);

  private readonly problems = makeRepository(ProblemsRepository);

  public async of(userId: string, now = new Date()): Promise<AchievementsView> {
    const [submissions, interviewsStarted, reviewed, authored] =
      await Promise.all([
        this.submissions.listFactsForUser(userId),
        this.interviews.startedAtsFor(userId),
        this.reviews.listForUser(userId, REVIEWS_READ),
        this.problems.listPublishedByAuthor(userId),
      ]);

    return computeAchievements(
      {
        submissions,
        interviewsStarted,
        interviewsReviewed: reviewed.map((review) => review.at),
        problemsPublished: authored.flatMap((problem) =>
          problem.publishedAt ? [problem.publishedAt] : [],
        ),
        tracks: TRACKS,
      },
      now,
    );
  }
}
