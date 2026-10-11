import { eq, type SQL, sql } from "drizzle-orm";

import { leaderboardStateSchema, profilesSchema } from "@/db";
import { type DBExecutor, getExecutor, transaction } from "@/db/executor";
import { DIFFICULTY_WEIGHT, MIN_SOLUTION_SCORE } from "@/modules/submissions";

import { ALL_SCOPE } from "../leaderboard.constants";
import type {
  LeaderboardFilter,
  LeaderboardProfileEntity,
  ListedStanding,
  OfficialRule,
  UserStanding,
} from "../leaderboard.entity";
import { LeaderboardRepository } from "../ports/leaderboard.repository";

interface ListedRow extends Record<string, unknown> {
  user_id: string;
  handle: string;
  display_name: string;
  avatar_key: string | null;
  points: number | string;
  solved: number | string;
  position: number | string;
}

interface StandingRow extends Record<string, unknown> {
  points: number | string;
  solved: number | string;
  position: number | string | null;
}

const STATE_ID = 1;

const weighted = (
  score: SQL,
  difficulty: SQL,
): SQL => sql`${score} * case ${difficulty}
  when 'easy' then ${DIFFICULTY_WEIGHT.easy}
  when 'medium' then ${DIFFICULTY_WEIGHT.medium}
  else ${DIFFICULTY_WEIGHT.hard}
end`;

const userLock = (userId: string): SQL =>
  sql`select pg_advisory_xact_lock(hashtext(${`leaderboard:${userId}`}))`;

export class PostgresLeaderboardRepository extends LeaderboardRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  private totals({ track, since }: LeaderboardFilter): SQL {
    if (since === null) {
      return sql`
        select user_id, points, solved
        from leaderboard_totals
        where scope = ${track ?? ALL_SCOPE}`;
    }

    return sql`
      select
        b.user_id,
        sum(${weighted(sql`b.best`, sql`p.difficulty`)}) as points,
        count(*) filter (where b.best >= ${MIN_SOLUTION_SCORE}) as solved
      from (
        select s.user_id, s.problem_id, max(s.score) as best
        from submissions s
        join problems p on p.id = s.problem_id
        where s.counted
          and p.source = 'official'
          and s.created_at >= ${since}
          ${track ? sql`and p.track = ${track}` : sql``}
        group by s.user_id, s.problem_id
      ) b
      join problems p on p.id = b.problem_id
      group by b.user_id`;
  }

  public async board(
    filter: LeaderboardFilter,
    limit: number,
  ): Promise<ListedStanding[]> {
    const rows = (await this.db.execute(sql`
      with totals as ${this.materialized(filter)} (${this.totals(filter)})
      select
        t.user_id, l.handle, l.display_name, l.avatar_key, t.points, t.solved,
        rank() over (order by t.points desc) as position
      from totals t
      join profiles l on l.user_id = t.user_id
      where l.visible and t.points > 0
      order by t.points desc, l.handle asc
      limit ${limit}
    `)) as unknown as ListedRow[];

    return rows.map((row) => ({
      userId: row.user_id,
      position: Number(row.position),
      handle: row.handle,
      displayName: row.display_name,
      avatarKey: row.avatar_key,
      points: Number(row.points),
      solved: Number(row.solved),
    }));
  }

  public async standingOf(
    userId: string,
    filter: LeaderboardFilter,
  ): Promise<UserStanding> {
    const [row] = (await this.db.execute(sql`
      with totals as ${this.materialized(filter)} (${this.totals(filter)})
      select
        t.points,
        t.solved,
        case when l.visible and t.points > 0 then (
          select count(*) + 1
          from totals o
          join profiles ol on ol.user_id = o.user_id
          where ol.visible and o.points > t.points
        ) end as position
      from totals t
      left join profiles l on l.user_id = t.user_id
      where t.user_id = ${userId}
    `)) as unknown as StandingRow[];

    return {
      points: Number(row?.points ?? 0),
      solved: Number(row?.solved ?? 0),
      position:
        row?.position === null || row?.position === undefined
          ? null
          : Number(row.position),
    };
  }

  public refresh(userId: string, problemId: string): Promise<void> {
    return transaction(async () => {
      await this.db.execute(userLock(userId));
      await this.db.execute(sql`
        delete from leaderboard_points
        where user_id = ${userId} and problem_id = ${problemId}
      `);
      await this.db.execute(sql`
        insert into leaderboard_points (user_id, problem_id, best_score, achieved_at)
        select s.user_id, s.problem_id, s.score, s.created_at
        from submissions s
        join problems p on p.id = s.problem_id
        where s.user_id = ${userId}
          and s.problem_id = ${problemId}
          and s.counted
          and p.source = 'official'
        order by s.score desc, s.created_at asc
        limit 1
      `);
      await this.db.execute(sql`
        delete from leaderboard_totals where user_id = ${userId}
      `);
      await this.db.execute(this.totalsInsert(sql`lp.user_id = ${userId}`));
    });
  }

  public rebuild(fingerprint: string): Promise<boolean> {
    return transaction(async () => {
      await this.db.execute(
        sql`select pg_advisory_xact_lock(hashtext('leaderboard:rebuild'))`,
      );

      if ((await this.fingerprint()) === fingerprint) return false;

      await this.db.execute(sql`delete from leaderboard_totals`);
      await this.db.execute(sql`delete from leaderboard_points`);
      await this.db.execute(sql`
        insert into leaderboard_points (user_id, problem_id, best_score, achieved_at)
        select distinct on (s.user_id, s.problem_id)
          s.user_id, s.problem_id, s.score, s.created_at
        from submissions s
        join problems p on p.id = s.problem_id
        where s.counted and p.source = 'official'
        order by s.user_id, s.problem_id, s.score desc, s.created_at asc
      `);
      await this.db.execute(this.totalsInsert(sql`true`));
      await this.db
        .insert(leaderboardStateSchema)
        .values({ id: STATE_ID, fingerprint })
        .onConflictDoUpdate({
          target: leaderboardStateSchema.id,
          set: { fingerprint, rebuiltAt: new Date() },
        });

      return true;
    });
  }

  public async fingerprint(): Promise<string | null> {
    const [row] = await this.db
      .select({ fingerprint: leaderboardStateSchema.fingerprint })
      .from(leaderboardStateSchema)
      .where(eq(leaderboardStateSchema.id, STATE_ID))
      .limit(1);

    return row?.fingerprint ?? null;
  }

  public async officialRules(): Promise<OfficialRule[]> {
    const rows = (await this.db.execute(sql`
      select id, difficulty, track
      from problems
      where source = 'official'
      order by id
    `)) as unknown as OfficialRule[];

    return rows.map(({ id, difficulty, track }) => ({ id, difficulty, track }));
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

  private materialized({ since }: LeaderboardFilter): SQL {
    return since === null ? sql`not materialized` : sql`materialized`;
  }

  private totalsInsert(users: SQL): SQL {
    return sql`
      insert into leaderboard_totals (user_id, scope, points, solved)
      select
        lp.user_id,
        case when grouping(p.track) = 1 then ${ALL_SCOPE} else p.track end,
        sum(${weighted(sql`lp.best_score`, sql`p.difficulty`)}),
        count(*) filter (where lp.best_score >= ${MIN_SOLUTION_SCORE})
      from leaderboard_points lp
      join problems p on p.id = lp.problem_id
      where p.source = 'official' and ${users}
      group by lp.user_id, rollup (p.track)
    `;
  }
}
