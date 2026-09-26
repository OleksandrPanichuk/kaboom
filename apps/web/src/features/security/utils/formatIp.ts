const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

export const formatIp = (ip: string | null): string | null =>
  ip ? (IPV4_MAPPED.exec(ip)?.[1] ?? ip) : null;
