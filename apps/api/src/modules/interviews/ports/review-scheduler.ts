import { Port } from "@/core/port";

export abstract class ReviewScheduler extends Port {
  public abstract schedule(interviewId: string): Promise<void>;
}
