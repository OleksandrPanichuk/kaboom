import { asc, eq } from "drizzle-orm";

import { type EvidenceNoteRow, evidenceNotesSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import {
  type CreateEvidenceNoteData,
  EvidenceNotesRepository,
} from "../ports/evidence-notes.repository";

export class PostgresEvidenceNotesRepository extends EvidenceNotesRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(data: CreateEvidenceNoteData): Promise<EvidenceNoteRow> {
    const [row] = await this.db
      .insert(evidenceNotesSchema)
      .values(data)
      .returning();

    return row!;
  }

  public listFor(interviewId: string): Promise<EvidenceNoteRow[]> {
    return this.db
      .select()
      .from(evidenceNotesSchema)
      .where(eq(evidenceNotesSchema.interviewId, interviewId))
      .orderBy(asc(evidenceNotesSchema.createdAt));
  }
}
