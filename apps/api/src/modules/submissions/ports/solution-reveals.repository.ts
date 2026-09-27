import { Repository } from "@/core/repository";

export interface SolutionReveal {
  problemId: string;
  revealedAt: Date;
}

export abstract class SolutionRevealsRepository extends Repository {
  public abstract find(
    userId: string,
    problemId: string,
  ): Promise<SolutionReveal | null>;

  public abstract listForUser(userId: string): Promise<SolutionReveal[]>;

  public abstract reveal(
    userId: string,
    problemId: string,
    at: Date,
  ): Promise<SolutionReveal>;
}
