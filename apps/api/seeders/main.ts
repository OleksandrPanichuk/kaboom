import "./prepare-environment";

import { MemoryCache } from "@/adapters/cache/memory.cache";
import { getEnv } from "@/configs";
import { bind } from "@/core/registry";
import { closeDatabase } from "@/db";
import { accountsModule } from "@/modules/accounts";
import { profilesModule } from "@/modules/profiles";
import { usersModule } from "@/modules/users";
import { Cache } from "@/platform/cache";

import { runSeeders } from "./index";
import { formatReports } from "./report";

usersModule.register();
accountsModule.register();
profilesModule.register();
bind(Cache, () => new MemoryCache(`${getEnv().APP_SLUG}:cache:`));

try {
  console.log(formatReports(await runSeeders()));
} finally {
  await closeDatabase();
}
