import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain } from "electron/main";

import { ensureLLM } from "./ipc.js";
import { startServer } from "./server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const startServerPromise = startServer();
async function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.resolve(__dirname, "preload.cjs"),
    },
  });

  win.loadURL(await startServerPromise);
}

app.whenReady().then(async () => {
  ipcMain.handle("ensure-llm", ensureLLM);

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
