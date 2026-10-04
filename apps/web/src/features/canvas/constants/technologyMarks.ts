import type { Provider } from "@repo/design";
import {
  siApachecassandra,
  siApachekafka,
  siGooglecloud,
  siGooglecloudstorage,
  siMongodb,
  type SimpleIcon,
  siNginx,
  siPostgresql,
  siRabbitmq,
  siRedis,
} from "simple-icons";

export const TECHNOLOGY_ICONS: Readonly<Record<string, SimpleIcon>> =
  Object.fromEntries(
    [
      siApachecassandra,
      siApachekafka,
      siGooglecloud,
      siGooglecloudstorage,
      siMongodb,
      siNginx,
      siPostgresql,
      siRabbitmq,
      siRedis,
    ].map((icon) => [icon.slug, icon]),
  );

export const PROVIDER_COLORS: Readonly<Record<Provider, string>> = {
  "self-hosted": "#3f3f46",
  aws: "#b45309",
  gcp: "#1a73e8",
  azure: "#0078d4",
};
