import { eq } from "drizzle-orm";

import { emailPreferencesSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import {
  DEFAULT_EMAIL_PREFERENCES,
  type EmailPreferencesEntity,
} from "../email-preference.entity";
import { EmailPreferencesRepository } from "../email-preferences.repository";

export class PostgresEmailPreferencesRepository extends EmailPreferencesRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async find(userId: string): Promise<EmailPreferencesEntity | null> {
    const [row] = await this.db
      .select({ comments: emailPreferencesSchema.comments })
      .from(emailPreferencesSchema)
      .where(eq(emailPreferencesSchema.userId, userId))
      .limit(1);

    return row ?? null;
  }

  public async save(
    userId: string,
    patch: Partial<EmailPreferencesEntity>,
  ): Promise<EmailPreferencesEntity> {
    const updatedAt = new Date();
    const [row] = await this.db
      .insert(emailPreferencesSchema)
      .values({ userId, ...DEFAULT_EMAIL_PREFERENCES, ...patch, updatedAt })
      .onConflictDoUpdate({
        target: emailPreferencesSchema.userId,
        set: { ...patch, updatedAt },
      })
      .returning({ comments: emailPreferencesSchema.comments });

    return row!;
  }
}
