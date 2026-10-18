export const statusClass = (status: number): string =>
  `${Math.floor(status / 100)}xx`;
