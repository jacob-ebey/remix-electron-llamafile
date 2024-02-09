const { contextBridge, ipcRenderer } = require("electron");

/** @type {EventsBridge} */
const eventsBridge = {
  onMessage: (listener) => {
    /**
     *
     * @param {Electron.IpcRendererEvent} _
     * @param {{
     *  id: string;
     *  value: string;
     * }} data
     */
    const handler = (_, data) => listener(data);
    ipcRenderer.on("message-update", handler);
    return () => ipcRenderer.off("message-update", handler);
  },
  onDownloadBaseLlamafileProgress: (listener) => {
    /**
     *
     * @param {Electron.IpcRendererEvent} _
     * @param {number} data
     */
    const handler = (_, data) => listener(data);
    ipcRenderer.on("download-base-llamafile-progress", handler);
    return () => ipcRenderer.off("download-base-llamafile-progress", handler);
  },
  onDownloadPhi2Progress: (listener) => {
    /**
     *
     * @param {Electron.IpcRendererEvent} _
     * @param {number} data
     */
    const handler = (_, data) => listener(data);
    ipcRenderer.on("download-phi2-progress", handler);
    return () => ipcRenderer.off("download-phi2-progress", handler);
  },
};

contextBridge.exposeInMainWorld("electronAPI", eventsBridge);
