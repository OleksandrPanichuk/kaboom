import { Port } from "@/core/port";

export abstract class ScoreBoard extends Port {
  public abstract scored(userId: string, problemId: string): Promise<void>;
}
