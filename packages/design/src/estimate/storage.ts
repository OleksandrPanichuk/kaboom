const KB_PER_GB = 1_000_000;
const SECONDS_PER_DAY = 86_400;

export interface StorageRunwayInput {
  storageGb: number;
  usedGb?: number;
  insertsPerSecond: number;
  recordSizeKb: number;
}

export interface StorageRunway {
  growthGbPerDay: number;
  freeGb: number;
  daysUntilFull: number | null;
}

export const storageRunway = ({
  storageGb,
  usedGb = 0,
  insertsPerSecond,
  recordSizeKb,
}: StorageRunwayInput): StorageRunway => {
  const growthGbPerDay =
    (Math.max(0, insertsPerSecond) * recordSizeKb * SECONDS_PER_DAY) /
    KB_PER_GB;
  const freeGb = Math.max(0, storageGb - usedGb);

  return {
    growthGbPerDay,
    freeGb,
    daysUntilFull: growthGbPerDay > 0 ? freeGb / growthGbPerDay : null,
  };
};
