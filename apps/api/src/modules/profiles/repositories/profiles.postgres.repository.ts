import { and, eq, ne } from "drizzle-orm";

import { isUniqueViolation, profilesSchema } from "@/db";
import { type DBExecutor, getExecutor } from "@/db/executor";

import {
  type CreateProfileData,
  ProfilesRepository,
  type UpdateProfileData,
} from "../ports/profiles.repository";
import type { ProfileEntity } from "../profile.entity";

export class PostgresProfilesRepository extends ProfilesRepository {
  constructor(private readonly resolve: () => DBExecutor = getExecutor) {
    super();
  }

  private get db() {
    return this.resolve();
  }

  public async insert(data: CreateProfileData): Promise<ProfileEntity | null> {
    const [row] = await this.db
      .insert(profilesSchema)
      .values(data)
      .onConflictDoNothing()
      .returning();

    return row ?? null;
  }

  public async findByUserId(userId: string): Promise<ProfileEntity | null> {
    const [row] = await this.db
      .select()
      .from(profilesSchema)
      .where(eq(profilesSchema.userId, userId))
      .limit(1);

    return row ?? null;
  }

  public async findByHandle(handle: string): Promise<ProfileEntity | null> {
    const [row] = await this.db
      .select()
      .from(profilesSchema)
      .where(eq(profilesSchema.handle, handle))
      .limit(1);

    return row ?? null;
  }

  public async update(
    userId: string,
    data: UpdateProfileData,
  ): Promise<ProfileEntity | null> {
    if (data.handle !== undefined) {
      const [taken] = await this.db
        .select({ userId: profilesSchema.userId })
        .from(profilesSchema)
        .where(
          and(
            eq(profilesSchema.handle, data.handle),
            ne(profilesSchema.userId, userId),
          ),
        )
        .limit(1);

      if (taken) return null;
    }

    try {
      const [row] = await this.db
        .update(profilesSchema)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(profilesSchema.userId, userId))
        .returning();

      return row ?? null;
    } catch (error) {
      if (isUniqueViolation(error)) return null;

      throw error;
    }
  }
}
