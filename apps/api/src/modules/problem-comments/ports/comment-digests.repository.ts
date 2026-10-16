import { Repository } from "@/core/repository";

export abstract class CommentDigestsRepository extends Repository {
  public abstract sentUpTo(
    userId: string,
    problemId: string,
  ): Promise<Date | null>;

  public abstract markSent(
    userId: string,
    problemId: string,
    upTo: Date,
  ): Promise<void>;
}
