import { and, eq, sql } from "drizzle-orm";

import { problemsSchema, weeklyChallengesSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import {
  WeeklyChallengesRepository,
  type WeeklyWindow,
} from "../ports/weekly-challenges.repository";
import type {
  FeaturedProblem,
  FeaturedWeek,
  WeeklyMine,
  WeeklyStanding,
  WeeklyStandings,
} from "../weekly-challenge.entity";

interface StandingRow extends Record<string, unknown> {
  user_id: string;
  position: number | string;
  handle: string;
  display_name: string;
  avatar_key: string | null;
  score: number | string;
}

interface MineRow extends Record<string, unknown> {
  score: number | string | null;
  attempts: number | string;
  position: number | string | null;
}

const PROBLEM = {
  id: problemsSchema.id,
  slug: problemsSchema.slug,
  title: problemsSchema.title,
  summary: problemsSchema.summary,
  track: problemsSchema.track,
  difficulty: problemsSchema.difficulty,
};

const best = ({ problemId, from, to }: WeeklyWindow) => sql`
  select s.user_id, max(s.score) as score, count(*) as attempts
  from submissions s
  where s.problem_id = ${problemId}
    and s.counted
    and s.created_at >= ${from.toISOString()}::timestamptz
    and s.created_at < ${to.toISOString()}::timestamptz
  group by s.user_id`;

export class PostgresWeeklyChallengesRepository extends WeeklyChallengesRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async findWeek(weekStart: string): Promise<FeaturedProblem | null> {
    const [row] = await this.db
      .select(PROBLEM)
      .from(weeklyChallengesSchema)
      .innerJoin(
        problemsSchema,
        eq(problemsSchema.id, weeklyChallengesSchema.problemId),
      )
      .where(eq(weeklyChallengesSchema.weekStart, weekStart))
      .limit(1);

    return row ?? null;
  }

  public candidates(): Promise<FeaturedProblem[]> {
    return this.db
      .select(PROBLEM)
      .from(problemsSchema)
      .where(
        and(
          eq(problemsSchema.source, "official"),
          eq(problemsSchema.status, "published"),
        ),
      );
  }

  public history(): Promise<FeaturedWeek[]> {
    return this.db
      .select({
        weekStart: weeklyChallengesSchema.weekStart,
        problemId: weeklyChallengesSchema.problemId,
        track: problemsSchema.track,
      })
      .from(weeklyChallengesSchema)
      .innerJoin(
        problemsSchema,
        eq(problemsSchema.id, weeklyChallengesSchema.problemId),
      );
  }

  public async feature(weekStart: string, problemId: string): Promise<void> {
    await this.db
      .insert(weeklyChallengesSchema)
      .values({ weekStart, problemId })
      .onConflictDoNothing({ target: weeklyChallengesSchema.weekStart });
  }

  public async standings(
    window: WeeklyWindow,
    limit: number,
  ): Promise<WeeklyStandings> {
    const [counted] = (await this.db.execute(
      sql`select count(*) as participants from (${best(window)}) b`,
    )) as unknown as Array<{ participants: number | string }>;
    const rows = (await this.db.execute(sql`
      select
        b.user_id,
        rank() over (order by b.score desc) as position,
        p.handle,
        p.display_name,
        p.avatar_key,
        b.score
      from (${best(window)}) b
      join profiles p on p.user_id = b.user_id and p.visible
      order by position, p.handle
      limit ${limit}
    `)) as unknown as StandingRow[];

    return {
      participants: Number(counted?.participants ?? 0),
      entries: rows.map((row): WeeklyStanding => ({
        userId: row.user_id,
        position: Number(row.position),
        handle: row.handle,
        displayName: row.display_name,
        avatarKey: row.avatar_key,
        score: Number(row.score),
      })),
    };
  }

  public async standingOf(
    window: WeeklyWindow,
    userId: string,
  ): Promise<WeeklyMine> {
    const [row] = (await this.db.execute(sql`
      select
        b.score,
        b.attempts,
        case when p.visible then 1 + (
          select count(*)
          from (${best(window)}) o
          join profiles op on op.user_id = o.user_id and op.visible
          where o.score > b.score
        ) end as position
      from (${best(window)}) b
      left join profiles p on p.user_id = b.user_id
      where b.user_id = ${userId}
    `)) as unknown as MineRow[];

    if (!row) return { score: null, attempts: 0, position: null };

    return {
      score: Number(row.score),
      attempts: Number(row.attempts),
      position: row.position === null ? null : Number(row.position),
    };
  }
}
