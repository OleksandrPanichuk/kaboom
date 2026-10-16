import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";
import { registerJob } from "@/platform/jobs";

import { SendCommentDigestJob } from "./jobs";
import { CommentDigestsRepository, ProblemCommentsRepository } from "./ports";
import { problemCommentsRoutes } from "./problem-comments.routes";
import {
  PostgresCommentDigestsRepository,
  PostgresProblemCommentsRepository,
} from "./repositories";
import {
  EditProblemCommentUseCase,
  ListProblemCommentsUseCase,
  PostProblemCommentUseCase,
  RemoveProblemCommentUseCase,
} from "./use-cases";

export const problemCommentsModule = defineModule({
  name: "problem-comments",

  register: () => {
    bind(
      ProblemCommentsRepository,
      () => new PostgresProblemCommentsRepository(),
    );
    bind(
      CommentDigestsRepository,
      () => new PostgresCommentDigestsRepository(),
    );
    registerJob(SendCommentDigestJob);
  },

  routes: () =>
    problemCommentsRoutes({
      listProblemComments: makeUseCase(ListProblemCommentsUseCase),
      postProblemComment: makeUseCase(PostProblemCommentUseCase),
      editProblemComment: makeUseCase(EditProblemCommentUseCase),
      removeProblemComment: makeUseCase(RemoveProblemCommentUseCase),
    }),
});
