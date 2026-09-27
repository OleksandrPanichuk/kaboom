import { mutationOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

import {
  attemptQuery,
  progressQuery,
  submissionsQuery,
} from "./problems.queries";

export interface ProblemVariables {
  slug: string;
}

export interface HintVariables extends ProblemVariables {
  index: number;
}

export interface SubmitVariables extends ProblemVariables {
  revision: number;
}

export const startProblemMutation = mutationOptions({
  mutationKey: ["problems", "start"],
  mutationFn: async ({ slug }: ProblemVariables) =>
    unwrap(await api.api.problems(slug).start.post()),
  onSuccess: (attempt, { slug }, _mutateResult, { client }) => {
    client.setQueryData(attemptQuery(slug).queryKey, attempt);

    return client.invalidateQueries({ queryKey: ["designs", "list"] });
  },
});

export const revealHintMutation = mutationOptions({
  mutationKey: ["problems", "hint"],
  mutationFn: async ({ slug, index }: HintVariables) =>
    unwrap(await api.api.problems(slug).hints(index).post()),
  onSuccess: (hint, { slug }, _mutateResult, { client }) => {
    client.setQueryData(attemptQuery(slug).queryKey, (attempt) =>
      attempt && !attempt.hints.some((item) => item.index === hint.index)
        ? {
            ...attempt,
            hints: [...attempt.hints, hint],
            hintPenalty: attempt.hintPenalty + hint.cost,
          }
        : attempt,
    );
  },
});

export const revealSolutionsMutation = mutationOptions({
  mutationKey: ["problems", "solutions"],
  mutationFn: async ({ slug }: ProblemVariables) =>
    unwrap(await api.api.problems(slug).solutions.reveal.post()),
  onSuccess: ({ lockedUntil }, { slug }, _mutateResult, { client }) => {
    client.setQueryData(attemptQuery(slug).queryKey, (attempt) =>
      attempt ? { ...attempt, lockedUntil } : attempt,
    );

    return client.invalidateQueries({ queryKey: progressQuery.queryKey });
  },
});

export const runProblemMutation = mutationOptions({
  mutationKey: ["problems", "run"],
  mutationFn: async ({ slug }: ProblemVariables) =>
    unwrap(await api.api.problems(slug).runs.post()),
});

export const submitSolutionMutation = mutationOptions({
  mutationKey: ["problems", "submit"],
  mutationFn: async ({ slug, revision }: SubmitVariables) =>
    unwrap(await api.api.problems(slug).submissions.post({ revision })),
  onSuccess: (_submission, { slug }, _mutateResult, { client }) =>
    Promise.all([
      client.invalidateQueries({ queryKey: submissionsQuery(slug).queryKey }),
      client.invalidateQueries({ queryKey: progressQuery.queryKey }),
      client.invalidateQueries({ queryKey: ["problems", "list"] }),
    ]),
});
