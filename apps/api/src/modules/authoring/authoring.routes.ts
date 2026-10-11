import { Elysia } from "elysia";

import type { Executable } from "@/core/use-case";

import {
  approveReviewRoute,
  checkDraftRoute,
  createDraftRoute,
  deleteDraftRoute,
  getDraftRoute,
  getReviewRoute,
  listMyDraftsRoute,
  listReviewsRoute,
  rejectReviewRoute,
  saveDraftRoute,
  submitDraftRoute,
  withdrawReviewRoute,
} from "./routes";
import type {
  ApproveReviewUseCase,
  CheckDraftUseCase,
  CreateDraftUseCase,
  DeleteDraftUseCase,
  GetDraftUseCase,
  GetReviewUseCase,
  ListMyDraftsUseCase,
  ListReviewsUseCase,
  RejectReviewUseCase,
  SaveDraftUseCase,
  SubmitDraftUseCase,
  WithdrawReviewUseCase,
} from "./use-cases";

export interface AuthoringActions {
  listMyDrafts: Executable<ListMyDraftsUseCase>;
  createDraft: Executable<CreateDraftUseCase>;
  getDraft: Executable<GetDraftUseCase>;
  saveDraft: Executable<SaveDraftUseCase>;
  deleteDraft: Executable<DeleteDraftUseCase>;
  checkDraft: Executable<CheckDraftUseCase>;
  submitDraft: Executable<SubmitDraftUseCase>;
  withdrawReview: Executable<WithdrawReviewUseCase>;
  listReviews: Executable<ListReviewsUseCase>;
  getReview: Executable<GetReviewUseCase>;
  approveReview: Executable<ApproveReviewUseCase>;
  rejectReview: Executable<RejectReviewUseCase>;
}

export const authoringRoutes = (actions: AuthoringActions) =>
  new Elysia({ name: "authoring" })
    .group("/problem-drafts", (drafts) =>
      drafts
        .get("/", ...listMyDraftsRoute(actions))
        .post("/", ...createDraftRoute(actions))
        .get("/:id", ...getDraftRoute(actions))
        .put("/:id", ...saveDraftRoute(actions))
        .delete("/:id", ...deleteDraftRoute(actions))
        .post("/:id/check", ...checkDraftRoute(actions))
        .post("/:id/submit", ...submitDraftRoute(actions))
        .post("/:id/withdraw", ...withdrawReviewRoute(actions)),
    )
    .group("/problem-reviews", (reviews) =>
      reviews
        .get("/", ...listReviewsRoute(actions))
        .get("/:id", ...getReviewRoute(actions))
        .post("/:id/approve", ...approveReviewRoute(actions))
        .post("/:id/reject", ...rejectReviewRoute(actions)),
    );
