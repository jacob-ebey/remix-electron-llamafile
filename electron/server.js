import * as path from "node:path";
import * as stream from "node:stream";
import { fileURLToPath } from "node:url";

import {
  createRequestHandler,
  writeReadableStreamToWritable,
} from "@remix-run/node";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createStream(text) {
  const passthrough = new stream.PassThrough();
  passthrough.push(text);
  passthrough.push(null);
  return passthrough;
}

/**
 *
 * @param {*} build
 * @param {import("vite").ViteDevServer} viteDevServer
 * @param {*} getLoadContext
 * @returns
 */
export async function createRemixRequestHandler(
  build,
  viteDevServer,
  getLoadContext
) {
  const remixHandler = createRequestHandler({
    build,
  });

  return async (req, callback) => {
    try {
      const mod = await viteDevServer?.moduleGraph.getModuleByUrl(
        req.url,
        false
      );
      if (mod) {
        callback({
          statusCode: 200,
          headers: {
            ETag: mod.transformResult.etag,
            "content-type": "application/javascript",
          },
          data: createStream(mod.transformResult.code),
        });
        return;
      }
    } catch {}

    try {
      let body = undefined;
      const request = new Request(req.url, {
        body,
        method: req.method,
        referrer: req.referer,
      });
      const response = remixHandler(request, await getLoadContext?.(req));
      const data = new stream.PassThrough();
      callback({
        statusCode: response.status,
        headers: Object.fromEntries(response.headers),
        data: response.body,
      });
      await writeReadableStreamToWritable(response.body, data);
    } catch (error) {
      console.error(error);
      try {
        callback({
          statusCode: 500,
          headers: {
            "content-type": "text/html",
          },
          data: createStream(`<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Remix Error</title>
    </head>
    <body>
      <h1>Remix Error</h1>
      <p>${error.message}</p>
      <pre>${error.stack}</pre>
    </body>
  </html>`),
        });
      } catch {}
    }
  };

  // const expressApp = express();

  // // handle asset requests
  // if (viteDevServer) {
  //   expressApp.use(viteDevServer.middlewares);
  // } else {
  //   // Vite fingerprints its assets so we can cache forever.
  //   expressApp.use(
  //     "/assets",
  //     express.static(path.resolve(__dirname, "build/client/assets"), {
  //       immutable: true,
  //       maxAge: "1y",
  //     })
  //   );
  // }

  // // Everything else (like favicon.ico) is cached for an hour. You may want to be
  // // more aggressive with this caching.
  // expressApp.use(
  //   express.static(path.resolve(__dirname, "build/client"), { maxAge: "1h" })
  // );

  // expressApp.use(morgan("tiny"));

  // // handle SSR requests
  // expressApp.all("*", remixHandler);

  // let resolve, reject;
  // const urlPromise = new Promise((r, e) => {
  //   resolve = r;
  //   reject = e;
  // });
  // // Start the express server and log the address.
  // try {
  //   const listener = expressApp.listen((error) => {
  //     if (error) {
  //       reject(error);
  //       return;
  //     }
  //     let address = listener.address();
  //     let url;
  //     if (typeof address === "string") {
  //       url = address;
  //     } else {
  //       let { port } = address;
  //       url = `http://127.0.0.1:${port}`;
  //     }
  //     resolve(url);
  //   });
  // } catch (error) {
  //   reject(error);
  // }

  // return urlPromise;
}
