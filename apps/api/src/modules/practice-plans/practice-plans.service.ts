import type { Track } from "@repo/design";

import { getEnv } from "@/configs";
import { makeRepository, makeService } from "@/core/registry";
import { Service } from "@/core/service";
import { EmailPreferencesService } from "@/modules/email-preferences";
import { InterviewsService } from "@/modules/interviews";
import { NotificationsService } from "@/modules/notifications";
import { ProblemsRepository } from "@/modules/problems";
import { SkillsService } from "@/modules/skills";
import { SubmissionsService } from "@/modules/submissions";
import { UserEntity, UsersService } from "@/modules/users";

import { PracticePlansRepository } from "./ports";
import type {
  PracticePlanEntity,
  PracticePlanStep,
  PracticePlanView,
} from "./practice-plan.entity";
import { PLAN_SIZE } from "./practice-plans.constants";
import {
  NothingToPracticeError,
  PracticePlanNotFoundError,
} from "./practice-plans.errors";
import { weekBounds, weekStartOf } from "./practice-plans.helpers";

const HOME_PATH = "/home";

export class PracticePlansService extends Service {
  private readonly plans = makeRepository(PracticePlansRepository);

  private readonly problems = makeRepository(ProblemsRepository);

  private readonly skills = makeService(SkillsService);

  private readonly submissions = makeService(SubmissionsService);

  private readonly interviews = makeService(InterviewsService);

  private readonly users = makeService(UsersService);

  private readonly preferences = makeService(EmailPreferencesService);

  private readonly notifications = makeService(NotificationsService);

  public async current(userId: string, now: Date): Promise<PracticePlanView> {
    const plan = await this.plans.findForWeek(userId, weekStartOf(now));

    if (!plan) throw new PracticePlanNotFoundError("No plan this week");

    return this.view(plan);
  }

  public async start(
    userId: string,
    track: Track,
    now: Date,
  ): Promise<PracticePlanView> {
    const pick = await this.skills.planFor(
      userId,
      track,
      PLAN_SIZE,
      await this.submissions.countByProblem(userId),
    );

    if (pick.problemIds.length === 0) {
      throw new NothingToPracticeError("This track has no problems yet");
    }

    const plan = await this.plans.replaceForWeek({
      userId,
      weekStart: weekStartOf(now),
      track,
      skill: pick.skill,
      problemIds: pick.problemIds,
    });

    return this.view(plan);
  }

  public async drop(userId: string, now: Date): Promise<void> {
    if (!(await this.plans.deleteForWeek(userId, weekStartOf(now)))) {
      throw new PracticePlanNotFoundError("No plan this week");
    }
  }

  public async remind(now: Date): Promise<number> {
    let sent = 0;

    for (const plan of await this.plans.listUnreminded(weekStartOf(now))) {
      const { steps } = await this.view(plan);
      const left = steps.filter((step) => !step.done);

      if (left.length > 0 && (await this.reminderSent(plan, steps))) sent += 1;

      await this.plans.markReminded(plan.id, now);
    }

    return sent;
  }

  private async reminderSent(
    plan: PracticePlanEntity,
    steps: readonly PracticePlanStep[],
  ): Promise<boolean> {
    const user = await this.users.findById(plan.userId);

    if (!user || !UserEntity.isEmailVerified(user)) return false;
    if (!(await this.preferences.wants(user.id, "reminders"))) return false;

    await this.notifications.sendPracticeReminder({
      userId: user.id,
      email: user.email,
      name: user.name,
      done: steps.filter((step) => step.done).length,
      total: steps.length,
      left: steps.filter((step) => !step.done).map((step) => step.title),
      planUrl: new URL(HOME_PATH, getEnv().APP_URL).toString(),
    });

    return true;
  }

  private async view(plan: PracticePlanEntity): Promise<PracticePlanView> {
    const items = await this.plans.listItems(plan.id);
    const ids = items.map((item) => item.problemId);
    const { from } = weekBounds(plan.weekStart);
    const [submitted, interviewed, problems] = await Promise.all([
      this.submissions.problemsSubmittedSince(plan.userId, ids, from),
      this.interviews.problemsReviewedSince(plan.userId, ids, from),
      Promise.all(ids.map((id) => this.problems.findById(id))),
    ]);

    return {
      plan,
      steps: items.flatMap((item, index) => {
        const found = problems[index];

        if (!found) return [];

        return [
          {
            position: item.position,
            slug: found.problem.slug,
            title: found.version.content.title,
            difficulty: found.version.content.difficulty,
            interviewable: found.version.content.interview !== undefined,
            done:
              submitted.has(item.problemId) || interviewed.has(item.problemId),
          },
        ];
      }),
    };
  }
}
