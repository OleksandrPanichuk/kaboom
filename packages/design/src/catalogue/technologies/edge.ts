import z from "zod";

import { defineTechnology } from "../define-technology";
import { choice, count } from "../kinds/shared";

export const amazonS3 = defineTechnology({
  id: "amazon-s3",
  kind: "object-storage",
  provider: "aws",
  label: "Amazon S3",
  monogram: "S3",
  summary:
    "Object storage that serves 5,500 reads and 3,500 writes a second per key prefix, so spreading keys over prefixes scales it.",
  props: z.strictObject({
    prefixes: count(1, {
      title: "Key prefixes",
      description: "Prefixes the object keys are spread over",
    }),
  }),
  derive: ({ prefixes }) => ({
    readCapacityRps: prefixes * 5_500,
    writeCapacityRps: prefixes * 3_500,
  }),
});

export const googleCloudStorage = defineTechnology({
  id: "google-cloud-storage",
  kind: "object-storage",
  provider: "gcp",
  label: "Cloud Storage",
  icon: "googlecloudstorage",
  monogram: "GCS",
  summary:
    "Object storage that ramps up per bucket as traffic grows; start near 5,000 reads and 1,000 writes a second.",
  props: z.strictObject({
    buckets: count(1, {
      title: "Buckets",
      description: "Buckets the objects are split over",
    }),
  }),
  derive: ({ buckets }) => ({
    readCapacityRps: buckets * 5_000,
    writeCapacityRps: buckets * 1_000,
  }),
});

export const amazonCloudfront = defineTechnology({
  id: "amazon-cloudfront",
  kind: "cdn",
  provider: "aws",
  label: "Amazon CloudFront",
  monogram: "CF",
  summary:
    "A CDN with edge locations worldwide; a request at an edge answers in milliseconds.",
  props: z.strictObject({
    priceClass: choice(["100", "200", "all"], "all", {
      title: "Price class",
      description: "Which edge locations serve requests",
    }),
  }),
  derive: ({ priceClass }) => ({
    capacityRps: 250_000,
    baseLatencyMs: priceClass === "all" ? 10 : priceClass === "200" ? 15 : 25,
  }),
});

export const awsAlb = defineTechnology({
  id: "aws-alb",
  kind: "load-balancer",
  provider: "aws",
  label: "Application Load Balancer",
  monogram: "ALB",
  summary:
    "AWS's HTTP balancer: routes by path and host, and checks its targets' health.",
  props: z.strictObject({}),
  derive: () => ({
    layer: "l7" as const,
    capacityRps: 100_000,
    healthCheck: true,
    baseLatencyMs: 2,
  }),
});

export const awsNlb = defineTechnology({
  id: "aws-nlb",
  kind: "load-balancer",
  provider: "aws",
  label: "Network Load Balancer",
  monogram: "NLB",
  summary:
    "AWS's TCP balancer: millions of connections, in under a millisecond, without reading HTTP.",
  props: z.strictObject({}),
  derive: () => ({
    layer: "l4" as const,
    capacityRps: 1_000_000,
    healthCheck: true,
    baseLatencyMs: 1,
  }),
});

export const nginx = defineTechnology({
  id: "nginx",
  kind: "load-balancer",
  provider: "self-hosted",
  label: "NGINX",
  icon: "nginx",
  monogram: "NGX",
  summary: "A reverse proxy you run yourself; its capacity is its servers'.",
  props: z.strictObject({
    servers: count(2, {
      title: "Servers",
      description: "NGINX instances behind one address",
    }),
  }),
  derive: ({ servers }) => ({
    layer: "l7" as const,
    capacityRps: servers * 20_000,
  }),
});
