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
}

export const SchemaFormContext = createContext<SchemaFormContextValue>({
  refs: {},
  issues: [],
  reveal: null,
});

export const useSchemaForm = () => useContext(SchemaFormContext);
