import { createContext, useContext } from "react";

export interface SchemaFormIssue {
  path: ReadonlyArray<string | number>;
  message: string;
}

export interface SchemaFormContextValue {
  refs: Readonly<Record<string, readonly string[]>>;
  issues: readonly SchemaFormIssue[];
}

export const SchemaFormContext = createContext<SchemaFormContextValue>({
  refs: {},
  issues: [],
});

export const useSchemaForm = () => useContext(SchemaFormContext);
