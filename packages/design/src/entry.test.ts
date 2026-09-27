import { expect, test } from "bun:test";

import * as design from "./index";

test("keeps official problems out of the main entry, which the web bundles", () => {
  expect(design).not.toHaveProperty("OFFICIAL_PROBLEMS");
});
