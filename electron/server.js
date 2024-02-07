import * as path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import morgan from "morgan";
import { createRequestHandler } from "@remix-run/express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startServer() {
  const viteDevServer =
    process.env.NODE_ENV !== "development"
      ? undefined
      : await import("vite").then((vite) =>
          vite.createServer({
            server: { middlewareMode: true },
          })
        );

  const remixHandler = createRequestHandler({
    build: viteDevServer
      ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
      : await import("./build/server/index.js"),
  });

  const expressApp = express();

  // handle asset requests
  if (viteDevServer) {
    expressApp.use(viteDevServer.middlewares);
  } else {
    // Vite fingerprints its assets so we can cache forever.
    expressApp.use(
      "/assets",
      express.static(path.resolve(__dirname, "build/client/assets"), {
        immutable: true,
        maxAge: "1y",
      })
    );
  }

  // Everything else (like favicon.ico) is cached for an hour. You may want to be
  // more aggressive with this caching.
  expressApp.use(
    express.static(path.resolve(__dirname, "build/client"), { maxAge: "1h" })
  );

  expressApp.use(morgan("tiny"));

  // handle SSR requests
  expressApp.all("*", remixHandler);

  let resolve, reject;
  const urlPromise = new Promise((r, e) => {
    resolve = r;
    reject = e;
  });
  // Start the express server and log the address.
  try {
    const listener = expressApp.listen((error) => {
      if (error) {
        reject(error);
        return;
      }
      let address = listener.address();
      let url;
      if (typeof address === "string") {
        url = address;
      } else {
        let { port } = address;
        url = `http://127.0.0.1:${port}`;
      }
      resolve(url);
    });
  } catch (error) {
    reject(error);
  }

  return urlPromise;
}
