import { unstable_vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import envOnly from "vite-env-only";

export default defineConfig({
  plugins: [
    remix({
      buildDirectory: "electron/build",
    }),
    tsconfigPaths(),
    envOnly(),
  ],
  ssr: {
    resolve: {
      externalConditions: ["node"],
    },
  },
  optimizeDeps: {
    exclude: [
      "electron",
      "electron/main",
      "fsevents",
      "drizzle-orm",
      "better-sqlite3",
    ],
  },
});
