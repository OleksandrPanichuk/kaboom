import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname, join, relative, resolve } from "node:path";

import { $ } from "bun";

const ROOT = resolve(import.meta.dir, "..");
const FEATURES = join(ROOT, "src", "features");
const MODULE_EXTENSIONS = [".ts", ".tsx"];
const TEST_FILE = /\.(test|spec)\.tsx?$/;

const isModule = (name: string): boolean =>
  MODULE_EXTENSIONS.includes(extname(name)) &&
  !TEST_FILE.test(name) &&
  !name.endsWith(".d.ts") &&
  basename(name, extname(name)) !== "index";

const writeBarrel = async (
  dir: string,
  written: string[],
): Promise<boolean> => {
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const lines: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (await writeBarrel(join(dir, entry.name), written)) {
        lines.push(`export * from "./${entry.name}";`);
      }
    } else if (isModule(entry.name)) {
      lines.push(
        `export * from "./${basename(entry.name, extname(entry.name))}";`,
      );
    }
  }

  if (lines.length === 0) return false;

  const file = join(dir, "index.ts");
  const content = `${lines.join("\n")}\n`;
  const current = await readFile(file, "utf8").catch(() => null);

  if (current !== content) {
    await writeFile(file, content);
    written.push(file);
  }

  return true;
};

const written: string[] = [];

for (const feature of await readdir(FEATURES, { withFileTypes: true })) {
  if (feature.isDirectory()) {
    await writeBarrel(join(FEATURES, feature.name), written);
  }
}

if (written.length > 0) {
  await $`bunx eslint --fix ${written}`.cwd(ROOT).nothrow().quiet();
}

for (const file of written) console.warn(`barrel  ${relative(ROOT, file)}`);
