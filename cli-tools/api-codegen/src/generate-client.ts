import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { createOpenApiApp } from "@repo/api";

import { type PathItem, renderRoutes } from "./render-routes";

const REPO_ROOT = resolve(import.meta.dir, "../../..");

export const fetchSpec = async (): Promise<{
  paths: Record<string, PathItem>;
}> => {
  const app = createOpenApiApp();

  const server = app.listen(0);
  const port = server.server?.port;

  try {
    const response = await fetch(`http://localhost:${port}/api/openapi/json`);

    if (!response.ok) {
      throw new Error(`openapi spec request failed: ${response.status}`);
    }

    return (await response.json()) as { paths: Record<string, PathItem> };
  } finally {
    await server.stop();
  }
};

const main = async (): Promise<void> => {
  const outDir = process.argv[2]
    ? resolve(process.cwd(), process.argv[2])
    : resolve(REPO_ROOT, "packages/api-client/src/generated");

  const { paths } = await fetchSpec();
  const rendered = renderRoutes(paths);

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "routes.ts"), rendered);

  console.warn(`generated routes from ${Object.keys(paths).length} paths`);
};

if (import.meta.main) {
  await main();
}
