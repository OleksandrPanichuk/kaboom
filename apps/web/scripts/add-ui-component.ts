import { existsSync } from "node:fs";
import { readdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

import { $ } from "bun";

const ROOT = resolve(import.meta.dir, "..");
const SRC = join(ROOT, "src");
const SHADCN = "shadcn@4.21.0";
const RENAMED_DIRS = ["components", "hooks"].map((dir) => join(SRC, dir));
const SOURCE_EXTENSIONS = [".ts", ".tsx"];
const IMPORT_PATTERN = /(from\s+|import\s*\(\s*|import\s+)(["'])([^"']+)\2/g;

const listFiles = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, {
    recursive: true,
    withFileTypes: true,
  }).catch(() => []);

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
};

const words = (name: string): string[] => name.split(/[-_.]/).filter(Boolean);

const capitalise = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

const conventionalName = (file: string): string | null => {
  const extension = extname(file);
  const stem = basename(file, extension);

  if (!SOURCE_EXTENSIONS.includes(extension) || stem === "index") return null;

  if (stem.startsWith("use-")) {
    const [first, ...rest] = words(stem);

    return `${first}${rest.map(capitalise).join("")}${extension}`;
  }

  if (extension !== ".tsx" || /^[A-Z]/.test(stem)) return null;

  return `${words(stem).map(capitalise).join("")}${extension}`;
};

const isTracked = async (file: string): Promise<boolean> =>
  (await $`git ls-files --error-unmatch ${file}`.cwd(ROOT).nothrow().quiet())
    .exitCode === 0;

const moveFile = async (from: string, to: string): Promise<void> => {
  if (await isTracked(from)) {
    await $`git mv -f ${from} ${to}`.cwd(ROOT).quiet();

    return;
  }

  const temporary = `${to}.renaming`;

  await rename(from, temporary);
  await rename(temporary, to);
};

const renameToConvention = async (): Promise<string[]> => {
  const renamed: string[] = [];

  for (const dir of RENAMED_DIRS) {
    for (const file of await listFiles(dir)) {
      const name = conventionalName(file);

      if (!name || name === basename(file)) continue;

      const target = join(dirname(file), name);

      await moveFile(file, target);

      renamed.push(`${relative(ROOT, file)} -> ${relative(ROOT, target)}`);
    }
  }

  return renamed;
};

const actualPath = async (candidate: string): Promise<string | null> => {
  const dir = dirname(candidate);
  const wanted = basename(candidate).toLowerCase();
  const entries = await readdir(dir).catch(() => [] as string[]);

  for (const entry of entries) {
    const extension = extname(entry);
    const stem = SOURCE_EXTENSIONS.includes(extension)
      ? basename(entry, extension)
      : entry;

    if (stem.toLowerCase() === wanted) return join(dir, stem);
  }

  return null;
};

const resolveSpecifier = (file: string, specifier: string): string | null => {
  if (specifier.startsWith("@/")) return join(SRC, specifier.slice(2));

  if (specifier.startsWith(".")) return resolve(dirname(file), specifier);

  return null;
};

const fixImportCasing = async (): Promise<string[]> => {
  const touched: string[] = [];

  for (const file of await listFiles(SRC)) {
    if (!SOURCE_EXTENSIONS.includes(extname(file))) continue;

    const source = await readFile(file, "utf8");
    const replacements: Array<[string, string]> = [];

    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const specifier = match[3]!;
      const resolved = resolveSpecifier(file, specifier);

      if (!resolved) continue;

      const actual = await actualPath(resolved);

      if (!actual || basename(actual) === basename(resolved)) continue;

      const fixed = `${specifier.slice(0, specifier.length - basename(resolved).length)}${basename(actual)}`;

      replacements.push([match[0], match[0].replace(specifier, fixed)]);
    }

    if (replacements.length === 0) continue;

    const updated = replacements.reduce(
      (text, [from, to]) => text.split(from).join(to),
      source,
    );

    await writeFile(file, updated);
    touched.push(file);
  }

  return touched;
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("usage: bun run ui:add <component...> [shadcn add flags]");
    process.exit(1);
  }

  await $`bunx --bun ${SHADCN} add ${args} --yes`.cwd(ROOT);

  const renamed = await renameToConvention();
  const touched = await fixImportCasing();
  const formatted = [
    ...RENAMED_DIRS.filter((dir) => existsSync(dir)),
    ...touched,
  ];

  await $`bunx eslint --fix --no-warn-ignored ${formatted}`
    .cwd(ROOT)
    .nothrow()
    .quiet();

  for (const line of renamed) console.warn(`renamed  ${line}`);

  for (const file of touched) {
    console.warn(`imports  ${relative(ROOT, file)}`);
  }
};

await main();
