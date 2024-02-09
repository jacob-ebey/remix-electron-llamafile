import * as os from "node:os";
import * as path from "node:path";

import type { Config } from "drizzle-kit";

export default {
  schema: "./app/db.server.ts",
  out: "./drizzle",
  driver: "better-sqlite",
  dbCredentials: {
    url: path.resolve(os.homedir(), ".remix-llm", "remix-llm.db"),
  },
} satisfies Config;
