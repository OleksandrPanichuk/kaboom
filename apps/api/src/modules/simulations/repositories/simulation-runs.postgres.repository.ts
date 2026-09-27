import type { Finding, LoadScenario } from "@repo/design";
import { and, eq } from "drizzle-orm";

import type { Page, PageRequest } from "@/core/pagination";
import { type SimulationRunRow, simulationRunsSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";
import { Keyset } from "@/db/pagination";

import {
  type CreateSimulationRunData,
  SimulationRunsRepository,
} from "../ports/simulation-runs.repository";
import type {
  SimulationRunEntity,
  SimulationSummary,
} from "../simulation-run.entity";

const NEWEST_FIRST = new Keyset<SimulationRunEntity>({
  sort: simulationRunsSchema.createdAt,
  id: simulationRunsSchema.id,
  direction: "desc",
  key: (run) => [run.createdAt, run.id],
});

const toEntity = (row: SimulationRunRow): SimulationRunEntity => ({
  ...row,
  scenario: row.scenario as LoadScenario,
  findings: row.findings as Finding[],
  summary: row.summary as SimulationSummary,
});

export class PostgresSimulationRunsRepository extends SimulationRunsRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(
    data: CreateSimulationRunData,
  ): Promise<SimulationRunEntity> {
    const [row] = await this.db
      .insert(simulationRunsSchema)
      .values(data)
      .returning();

    return toEntity(row!);
  }

  public async list(
    designId: string,
    page: PageRequest,
  ): Promise<Page<SimulationRunEntity>> {
    const rows = await this.db
      .select()
      .from(simulationRunsSchema)
      .where(
        and(
          eq(simulationRunsSchema.designId, designId),
          NEWEST_FIRST.after(page.cursor),
        ),
      )
      .orderBy(...NEWEST_FIRST.orderBy())
      .limit(NEWEST_FIRST.limit(page));

    return NEWEST_FIRST.page(rows.map(toEntity), page);
  }

  public async findById(
    designId: string,
    id: string,
  ): Promise<SimulationRunEntity | null> {
    const [row] = await this.db
      .select()
      .from(simulationRunsSchema)
      .where(
        and(
          eq(simulationRunsSchema.designId, designId),
          eq(simulationRunsSchema.id, id),
        ),
      )
      .limit(1);

    return row ? toEntity(row) : null;
  }
}
