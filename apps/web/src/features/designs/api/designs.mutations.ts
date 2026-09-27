import type { DesignOp } from "@repo/design";
import { mutationOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

import { designQuery, designsListKey } from "./designs.queries";

export interface CreateDesignVariables {
  name: string;
}

export interface RenameDesignVariables {
  id: string;
  name: string;
}

export interface DeleteDesignVariables {
  id: string;
}

export const createDesignMutation = mutationOptions({
  mutationKey: ["designs", "create"],
  mutationFn: async (variables: CreateDesignVariables) =>
    unwrap(await api.api.designs.post(variables)),
  onSuccess: (design, _variables, _mutateResult, { client }) => {
    client.setQueryData(designQuery(design.id).queryKey, design);

    return client.invalidateQueries({ queryKey: designsListKey });
  },
});

export const renameDesignMutation = mutationOptions({
  mutationKey: ["designs", "rename"],
  mutationFn: async ({ id, name }: RenameDesignVariables) =>
    unwrap(await api.api.designs(id).patch({ name })),
  onSuccess: (design, _variables, _mutateResult, { client }) => {
    client.setQueryData(designQuery(design.id).queryKey, design);

    return client.invalidateQueries({ queryKey: designsListKey });
  },
});

export const deleteDesignMutation = mutationOptions({
  mutationKey: ["designs", "delete"],
  mutationFn: async ({ id }: DeleteDesignVariables) =>
    unwrap(await api.api.designs(id).delete()),
  onSuccess: (_result, { id }, _mutateResult, { client }) => {
    client.removeQueries({ queryKey: designQuery(id).queryKey });

    return client.invalidateQueries({ queryKey: designsListKey });
  },
});

export type DesignLayoutPositions = Record<string, { x: number; y: number }>;

export const sendDesignOps = async (
  id: string,
  baseRevision: number,
  ops: DesignOp[],
) => unwrap(await api.api.designs(id).ops.post({ baseRevision, ops }));

export const saveDesignLayout = async (
  id: string,
  layout: DesignLayoutPositions,
) => unwrap(await api.api.designs(id).layout.put({ layout }));
