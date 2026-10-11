import { eq, sql } from "drizzle-orm";

import { profilesSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";
import { DIFFICULTY_WEIGHT, MIN_SOLUTION_SCORE } from "@/modules/submissions";

import type {
  LeaderboardFilter,
  LeaderboardProfileEntity,
  Standing,
} from "../leaderboard.entity";
import { LeaderboardRepository } from "../ports/leaderboard.repository";

interface StandingRow extends Record<string, unknown> {
  user_id: string;
  handle: string | null;
  display_name: string | null;
  avatar_key: string | null;
  visible: boolean | null;
  points: number | string;
  solved: number | string;
}

export class PostgresLeaderboardRepository extends LeaderboardRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async standings({
    track,
    since,
  }: LeaderboardFilter): Promise<Standing[]> {
    const rows = (await this.db.execute(sql`
      with best as (
        select s.user_id, s.problem_id, max(s.score) as best
        from submissions s
        join problems p on p.id = s.problem_id
        where s.counted
          and p.source = 'official'
          ${track ? sql`and p.track = ${track}` : sql``}
          ${since ? sql`and s.created_at >= ${since}` : sql``}
        group by s.user_id, s.problem_id
      ),
      totals as (
        select
          b.user_id,
          sum(
            b.best * case p.difficulty
              when 'easy' then ${DIFFICULTY_WEIGHT.easy}
              when 'medium' then ${DIFFICULTY_WEIGHT.medium}
              else ${DIFFICULTY_WEIGHT.hard}
            end
          ) as points,
          count(*) filter (where b.best >= ${MIN_SOLUTION_SCORE}) as solved
        from best b
        join problems p on p.id = b.problem_id
        group by b.user_id
      )
      select t.user_id, l.handle, l.display_name, l.avatar_key, l.visible, t.points, t.solved
      from totals t
      left join profiles l on l.user_id = t.user_id
      where t.points > 0
      order by t.points desc, l.handle asc nulls last
    `)) as unknown as StandingRow[];

    return rows.map((row) => ({
      userId: row.user_id,
      handle: row.handle,
      displayName: row.display_name,
      avatarKey: row.avatar_key,
      visible: row.visible ?? false,
      points: Number(row.points),
      solved: Number(row.solved),
    }));
  }

  public async findProfile(
    userId: string,
  ): Promise<LeaderboardProfileEntity | null> {
    const [row] = await this.db
      .select()
      .from(profilesSchema)
      .where(eq(profilesSchema.userId, userId))
      .limit(1);

    return row
      ? { userId: row.userId, handle: row.handle, visible: row.visible }
      : null;
  }
}
