import {
  Archive,
  Cog,
  Database,
  DatabaseZap,
  Globe,
  type LucideIcon,
  MonitorSmartphone,
  Rows3,
  ScrollText,
  Server,
  Split,
  Zap,
} from "lucide-react";

export const NODE_KIND_ICONS: Readonly<Record<string, LucideIcon>> = {
  client: MonitorSmartphone,
  cdn: Globe,
  "load-balancer": Split,
  service: Server,
  cache: Zap,
  "sql-database": Database,
  "nosql-database": DatabaseZap,
  queue: Rows3,
  stream: ScrollText,
  worker: Cog,
  "object-storage": Archive,
};

export const FALLBACK_NODE_ICON: LucideIcon = Server;
