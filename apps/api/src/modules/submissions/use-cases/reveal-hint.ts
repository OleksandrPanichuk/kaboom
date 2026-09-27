import { type RevealedHint, revealedHints } from "@repo/design";

import { makeRepository, makeService } from "@/core/registry";
import { UseCase } from "@/core/use-case";

import { ProblemAttemptsRepository } from "../ports";
import { HintNotFoundError, HintOutOfOrderError } from "../submissions.errors";
import { SubmissionsService } from "../submissions.service";

export interface RevealHintUseCaseOptions {
  userId: string;
  slug: string;
  index: number;
}

type Options = RevealHintUseCaseOptions;
type Result = RevealedHint;

export class RevealHintUseCase extends UseCase<Options, Result> {
  private readonly service = makeService(SubmissionsService);

  private readonly attempts = makeRepository(ProblemAttemptsRepository);

  public async execute({ userId, slug, index }: Options): Promise<Result> {
    const { attempt, version } = await this.service.attempt(userId, slug);
    const { hints } = version.content;

    if (index >= hints.length) {
      throw new HintNotFoundError("The problem has no such hint", {
        hints: hints.length,
      });
    }

    let revealed = attempt.hintsRevealed;

    if (index === revealed) {
      const updated = await this.attempts.revealHint(attempt.id, index);

      revealed = updated?.hintsRevealed ?? revealed;
    }

    if (index >= revealed) {
      throw new HintOutOfOrderError("Reveal the hints before this one first", {
        next: revealed,
      });
    }

    return revealedHints(version.content, revealed)[index]!;
  }
}
