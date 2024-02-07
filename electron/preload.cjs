const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  downloadBaseLlamafile: () => ipcRenderer.invoke("download-base-llamafile"),
  onDownloadBaseLlamafileProgress: (listener) => {
    ipcRenderer.on("download-base-llamafile-progress", (_, progress) =>
      listener(progress)
    );
    return () => ipcRenderer.off("download-phi2-progress", listener);
  },
  downloadPhi2: () => ipcRenderer.invoke("download-phi2"),
  onDownloadPhi2Progress: (listener) => {
    ipcRenderer.on("download-phi2-progress", (_, progress) =>
      listener(progress)
    );
    return () => ipcRenderer.off("download-phi2-progress", listener);
  },
  ensureLLM: () => ipcRenderer.invoke("ensure-llm"),
  getLlamafileDirectory: () => ipcRenderer.invoke("get-llamafile-directory"),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  listLLMs: () => ipcRenderer.invoke("list-llms"),
  writeSettings: (settings) => ipcRenderer.invoke("write-settings", settings),
});
