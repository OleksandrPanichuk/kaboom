import type { Finding } from "../result";

type Candidate = Omit<Finding, "atStep"> & { worst: number };

export class FindingLog {
  private readonly found = new Map<string, Finding & { worst: number }>();

  public note(step: number, candidate: Candidate): void {
    const key = `${candidate.kind}:${candidate.target.type}:${candidate.target.id ?? ""}`;
    const existing = this.found.get(key);

    if (!existing) {
      this.found.set(key, { ...candidate, atStep: step });

      return;
    }

    if (candidate.worst > existing.worst) {
      this.found.set(key, {
        ...candidate,
        atStep: existing.atStep,
      });
    }
  }

  public list(): Finding[] {
    return [...this.found.values()]
      .sort((a, b) => a.atStep - b.atStep)
      .map(({ worst: _worst, ...finding }) => finding);
  }
}

export const round = (value: number, digits = 3): number => {
  if (!Number.isFinite(value)) return value;

  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
};

export const percent = (value: number): string => `${round(value * 100, 1)}%`;

export const perSecond = (value: number): string =>
  `${round(value, 1).toLocaleString("en")}/s`;
