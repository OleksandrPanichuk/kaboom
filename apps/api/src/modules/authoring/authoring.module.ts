import { defineModule } from "@/core/module";
import { bind, makeUseCase } from "@/core/registry";

import { authoringRoutes } from "./authoring.routes";
import { ProblemDraftsRepository, ProblemReviewsRepository } from "./ports";
import {
  PostgresProblemDraftsRepository,
  PostgresProblemReviewsRepository,
} from "./repositories";
import {
  ApproveReviewUseCase,
  CheckDraftUseCase,
  CreateDraftUseCase,
  DeleteDraftUseCase,
  GetDraftUseCase,
  GetReviewUseCase,
  ListMyDraftsUseCase,
  ListReviewsUseCase,
  OpenDraftDesignUseCase,
  RejectReviewUseCase,
  SaveDraftUseCase,
  SubmitDraftUseCase,
  WithdrawReviewUseCase,
} from "./use-cases";

export const authoringModule = defineModule({
  name: "authoring",

  register: () => {
    bind(ProblemDraftsRepository, () => new PostgresProblemDraftsRepository());
    bind(
      ProblemReviewsRepository,
      () => new PostgresProblemReviewsRepository(),
    );

    return {};
  },

  routes: () =>
    authoringRoutes({
      listMyDrafts: makeUseCase(ListMyDraftsUseCase),
      createDraft: makeUseCase(CreateDraftUseCase),
      getDraft: makeUseCase(GetDraftUseCase),
      saveDraft: makeUseCase(SaveDraftUseCase),
      deleteDraft: makeUseCase(DeleteDraftUseCase),
      checkDraft: makeUseCase(CheckDraftUseCase),
      submitDraft: makeUseCase(SubmitDraftUseCase),
      withdrawReview: makeUseCase(WithdrawReviewUseCase),
      openDraftDesign: makeUseCase(OpenDraftDesignUseCase),
      listReviews: makeUseCase(ListReviewsUseCase),
      getReview: makeUseCase(GetReviewUseCase),
      approveReview: makeUseCase(ApproveReviewUseCase),
      rejectReview: makeUseCase(RejectReviewUseCase),
    }),
});
