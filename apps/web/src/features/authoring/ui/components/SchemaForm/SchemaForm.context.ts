import { createContext, useContext } from "react";

export interface SchemaFormIssue {
  path: ReadonlyArray<string | number>;
  message: string;
}

export interface SchemaFormReveal {
  path: ReadonlyArray<string | number>;
  at: number;
}

export interface SchemaFormContextValue {
  refs: Readonly<Record<string, readonly string[]>>;
  issues: readonly SchemaFormIssue[];
  reveal: SchemaFormReveal | null;
  touch: (path: ReadonlyArray<string | number>) => void;
}

export const SchemaFormContext = createContext<SchemaFormContextValue>({
  refs: {},
  issues: [],
  reveal: null,
  touch: () => undefined,
});

export const useSchemaForm = () => useContext(SchemaFormContext);
