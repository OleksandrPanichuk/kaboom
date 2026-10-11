import type { WorkspaceBackLink } from "@/features/shell";

const PROBLEM = /^\/problems\/([a-z0-9-]{1,64})$/;
const DESIGN =
  /^\/designs\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export const isBackPath = (path: unknown): path is string =>
  typeof path === "string" && (PROBLEM.test(path) || DESIGN.test(path));

export const backFrom = (path: string | null): WorkspaceBackLink | null => {
  const problem = path === null ? null : PROBLEM.exec(path);

  if (problem) {
    return {
      to: "/problems/$slug",
      params: { slug: problem[1]! },
      label: "Problem",
    };
  }

  const design = path === null ? null : DESIGN.exec(path);

  return design
    ? {
        to: "/designs/$designId",
        params: { designId: design[1]! },
        label: "System design",
      }
    : null;
};
