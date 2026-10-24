export interface DesignAllowance {
  limit: number | null;
  used: number;
}

export const designsFull = ({ limit, used }: DesignAllowance): boolean =>
  limit !== null && used >= limit;

export const describeDesignAllowance = ({
  limit,
  used,
}: DesignAllowance): string | null =>
  limit === null ? null : `${Math.min(used, limit)} of ${limit} designs`;
