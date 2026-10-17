import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  editProblemCommentRoute,
  listProblemCommentsRoute,
  postProblemCommentRoute,
  removeProblemCommentRoute,
} from "./routes";
import type {
  EditProblemCommentUseCase,
  ListProblemCommentsUseCase,
  PostProblemCommentUseCase,
  RemoveProblemCommentUseCase,
} from "./use-cases";

export interface ProblemCommentsActions {
  listProblemComments: Executable<ListProblemCommentsUseCase>;
  postProblemComment: Executable<PostProblemCommentUseCase>;
  editProblemComment: Executable<EditProblemCommentUseCase>;
  removeProblemComment: Executable<RemoveProblemCommentUseCase>;
}

export const problemCommentsRoutes = (actions: ProblemCommentsActions) =>
  new Elysia({ name: "problem-comments", prefix: "/problems" })
    .get("/:slug/comments", ...listProblemCommentsRoute(actions))
    .post("/:slug/comments", ...postProblemCommentRoute(actions))
    .patch("/:slug/comments/:id", ...editProblemCommentRoute(actions))
    .delete("/:slug/comments/:id", ...removeProblemCommentRoute(actions));
