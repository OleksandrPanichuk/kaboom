import type { LoadScenarioInput } from "@repo/design";
import { mutationOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

export interface SaveRunVariables {
  designId: string;
  revision: number;
  scenario: LoadScenarioInput;
}

export const saveRunMutation = mutationOptions({
  mutationKey: ["simulations", "save"],
  mutationFn: async ({ designId, revision, scenario }: SaveRunVariables) =>
    unwrap(
      await api.api.designs(designId).simulations.post({ scenario, revision }),
    ),
  onSuccess: (_run, { designId }, _mutateResult, { client }) =>
    client.invalidateQueries({ queryKey: ["simulations", designId] }),
});
