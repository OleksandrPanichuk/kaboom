import { Repository } from "@/core/repository";
import type { ShareSubject } from "@/db";

import type { ShareEntity } from "./share.entity";

export interface CreateShareData {
  token: string;
  ownerId: string;
  subject: ShareSubject;
  subjectId: string;
}

export abstract class SharesRepository extends Repository {
  public abstract insertLive(data: CreateShareData): Promise<ShareEntity>;

  public abstract findLive(
    subject: ShareSubject,
    subjectId: string,
  ): Promise<ShareEntity | null>;

  public abstract findLiveByToken(token: string): Promise<ShareEntity | null>;

  public abstract revoke(
    token: string,
    ownerId: string,
  ): Promise<ShareEntity | null>;
}
