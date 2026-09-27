import { Repository } from "@/core/repository";
import type { EvidenceNoteRow } from "@/db";

export interface CreateEvidenceNoteData {
  interviewId: string;
  rubricItemKey: string;
  note: string;
  quote?: string | null;
  messageId?: string | null;
  revision?: number | null;
}

export abstract class EvidenceNotesRepository extends Repository {
  public abstract insert(
    data: CreateEvidenceNoteData,
  ): Promise<EvidenceNoteRow>;

  public abstract listFor(interviewId: string): Promise<EvidenceNoteRow[]>;
}
