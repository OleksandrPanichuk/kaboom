import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { ProblemCommentsRepository } from "./problem-comments.repository";
import { problemCommentsRoutes } from "./problem-comments.routes";
import { PostgresProblemCommentsRepository } from "./repositories";
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
  },

  routes: () =>
    problemCommentsRoutes({
      listProblemComments: makeUseCase(ListProblemCommentsUseCase),
      postProblemComment: makeUseCase(PostProblemCommentUseCase),
      editProblemComment: makeUseCase(EditProblemCommentUseCase),
      removeProblemComment: makeUseCase(RemoveProblemCommentUseCase),
    }),
});
