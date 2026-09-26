import { describe, expect, test } from "bun:test";

import { isNodeKind } from "./catalogue";
import { findTechnology, technologies } from "./technologies";

describe("technologies", () => {
  test("keys every technology by its id and ties it to a known kind", () => {
    for (const [key, technology] of Object.entries(technologies)) {
      expect(technology.id).toBe(key);
      expect(isNodeKind(technology.kind)).toBe(true);
      expect(() => technology.props.parse({})).not.toThrow();
    }
  });

  test("finds nothing for an unknown id or an inherited key", () => {
    expect(findTechnology("aws-rds-postgres", "sql-database")).toBeUndefined();
    expect(findTechnology("toString", "sql-database")).toBeUndefined();
  });
});
