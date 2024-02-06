const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  ensureLLM: () => ipcRenderer.invoke("ensure-llm"),
});
