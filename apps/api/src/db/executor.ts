import { AsyncLocalStorage } from "node:async_hooks";

import { type Database, getDatabase } from "./client";

type TxCallback = Parameters<Database["transaction"]>[0];

export type Transaction = Parameters<TxCallback>[0];
export type DBExecutor = Transaction | Omit<Database, "close">;

type Committed = () => Promise<void>;

interface ActiveTransaction {
  tx: Transaction;
  committed: Committed[];
}

const storage = new AsyncLocalStorage<ActiveTransaction>();

export const getExecutor = (): DBExecutor =>
  storage.getStore()?.tx ?? getDatabase();

export const transaction = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (storage.getStore()) return fn();

  const committed: Committed[] = [];
  const result = await getDatabase().transaction((tx) =>
    storage.run({ tx, committed }, fn),
  );

  for (const work of committed) await work();

  return result;
};

export const afterCommit = async (work: Committed): Promise<void> => {
  const active = storage.getStore();

  if (active) active.committed.push(work);
  else await work();
};
