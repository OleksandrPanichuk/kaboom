import { catalogue, NODE_KINDS, TRACKS } from "@repo/design";
import { describe, expect, test } from "bun:test";

import { TRACK_DEFINITIONS } from "./tracks";

describe("tracks", () => {
  test("offer every kind of their own in the palette, and only kinds that exist", () => {
    for (const track of TRACKS) {
      const offered = TRACK_DEFINITIONS[track].palette.flatMap(
        (section) => section.kinds,
      );
      const own = NODE_KINDS.filter((kind) => catalogue[kind].track === track);

      expect(own.filter((kind) => !offered.includes(kind))).toEqual([]);
      expect(offered.every((kind) => NODE_KINDS.includes(kind))).toBe(true);
    }
  });

  test("are each reviewed on design and two dimensions of their own", () => {
    for (const track of TRACKS) {
      const [first, ...rest] = TRACK_DEFINITIONS[track].reviewDimensions;

      expect(first).toBe("design");
      expect(rest).toHaveLength(2);
    }
  });
});
