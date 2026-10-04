export const HOURS_PER_MONTH = 730;
export const SECONDS_PER_MONTH = 2_628_000;

export const PRICES = {
  replica: 56,
  pod: 28,
  sqlInstance: 165,
  sqlInstanceReadRps: 5_000,
  sqlInstanceWriteRps: 1_000,
  sqlStoragePerGb: 0.115,
  nosqlPartition: 25,
  nosqlStoragePerGb: 0.25,
  cacheNode: 150,
  cacheNodeRps: 100_000,
  balancer: 16,
  balancerPer1000Rps: 6,
  gatewayPerMillion: 1,
  cdnPerMillion: 0.75,
  dns: 1,
  queuePerMillion: 0.4,
  streamPartition: 11,
  objectStorageBase: 25,
  objectReadsPerMillion: 0.4,
  objectWritesPerMillion: 5,
  searchCopy: 122,
  rateLimiter: 20,
  scheduler: 5,
  coordinationMember: 28,
  monitoring: 60,
  natGateway: 33,
  secret: 0.4,
} as const;

export const perMillion = (rps: number, price: number) =>
  ((rps * SECONDS_PER_MONTH) / 1_000_000) * price;
