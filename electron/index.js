import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain } from "electron/main";

import {
  downloadBaseLlamafile,
  downloadPhi2,
  ensureLLM,
  getLlamafileDirectory,
  getSettings,
  listLLMs,
  writeSettings,
} from "./ipc.js";
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

  if (!!process.env.DEV) {
    win.webContents.openDevTools();
  }

  win.loadURL(await startServerPromise);
}

app.whenReady().then(async () => {
  ipcMain.handle("download-base-llamafile", (event) =>
    downloadBaseLlamafile((progress) => {
      event.sender.send("download-base-llamafile-progress", progress);
    })
  );
  ipcMain.handle("download-phi2", (event) =>
    downloadPhi2((progress) => {
      event.sender.send("download-phi2-progress", progress);
    })
  );
  ipcMain.handle("ensure-llm", ensureLLM);
  ipcMain.handle("get-llamafile-directory", getLlamafileDirectory);
  ipcMain.handle("get-settings", getSettings);
  ipcMain.handle("list-llms", listLLMs);
  ipcMain.handle("write-settings", (_, settings) => writeSettings(settings));

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
