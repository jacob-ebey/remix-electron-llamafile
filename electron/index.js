import * as fs from "node:fs";
import * as os from "node:os";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, session, protocol } from "electron";
import squirrelStartup from "electron-squirrel-startup";
import { createRequestHandler } from "@remix-run/node";
import * as mime from "mime-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

protocol.registerSchemesAsPrivileged([
  {
    scheme: "http",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

fs.mkdirSync(path.resolve(os.homedir(), ".remix-llm"), { recursive: true });

if (squirrelStartup) {
  app.quit();
}

const viteDevServer = !process.env.DEV
  ? undefined
  : await import("vite").then((vite) =>
      vite.createServer({
        server: {
          // middlewareMode: true,
          strictPort: true,
          hmr: {
            host: "localhost",
            port: 8888,
            clientPort: 8888,
            protocol: "ws",
          },
        },
      })
    );
const build =
  /** @type {() => Promise<import("@remix-run/node").ServerBuild>} */ (
    viteDevServer
      ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
      : await import("./build/server/index.js")
  );

let port = "";
if (viteDevServer) {
  await viteDevServer.listen(5173);
  const address = viteDevServer.httpServer?.address();
  if (address && typeof address !== "string") {
    port = ":" + address.port;
  } else if (address) {
    const url = new URL(address);
    port = ":" + url.port;
  } else {
    throw new Error("Failed to get dev server port");
  }
}

app.whenReady().then(async () => {
  const remixHandler = createRequestHandler(build);
  const partition = "persist:partition";
  const ses = session.fromPartition(partition);
  let win;

  async function createWindow() {
    win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        partition,
        preload: path.resolve(__dirname, "preload.cjs"),
      },
    });

    if (!!process.env.DEV) {
      win.webContents.openDevTools();
    }

    win.loadURL(`https://remix-llm${port}/`);
  }

  ses.protocol.handle("https", async (request) => {
    const url = new URL(request.url);

    if (
      url.pathname !== "/" &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      if (viteDevServer) {
        if (request.method === "HEAD") {
          return new Response(null, {
            headers: {
              "access-control-allow-origin": "*",
              "access-control-allow-methods": "GET, HEAD",
            },
          });
        }
        try {
          const VALID_ID_PREFIX = `/@id/`;
          const NULL_BYTE_PLACEHOLDER = `__x00__`;
          let id = url.pathname + url.search;
          id = id.startsWith(VALID_ID_PREFIX)
            ? id
                .slice(VALID_ID_PREFIX.length)
                .replace(NULL_BYTE_PLACEHOLDER, "\0")
            : id;

          const transformed = await viteDevServer.transformRequest(id, {
            html: false,
            ssr: false,
          });
          if (transformed) {
            return new Response(transformed.code, {
              headers: {
                "content-type": "application/javascript",
              },
            });
          }
        } catch (error) {
          // console.error(error);
        }
      } else {
        const file = path.resolve(
          __dirname,
          "build",
          "client",
          url.pathname.slice(1)
        );
        try {
          const isFile = await fsp.stat(file).then((s) => s.isFile());
          if (isFile) {
            return new Response(await fsp.readFile(file, "utf-8"), {
              headers: {
                "content-type": `${
                  mime.lookup(path.basename(file)) || "text/plain"
                }; charset=utf-8`,
              },
            });
          }
        } catch {}
      }
    }

    try {
      return await remixHandler(request, {
        ipcEvent: (...args) => {
          const windows = BrowserWindow.getAllWindows();
          for (const win of windows) {
            win.webContents.send(...args);
          }
        },
      });
    } catch (error) {
      console.error(error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });

  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
