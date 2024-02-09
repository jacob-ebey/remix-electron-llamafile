import "@remix-run/server-runtime";

declare global {
  interface EventsBridge {
    onMessage(
      callback: (msg: { id: string; value: string }) => void
    ): () => void;
    onDownloadBaseLlamafileProgress(
      callback: (progress: number) => void
    ): () => void;
    onDownloadPhi2Progress(callback: (progress: number) => void): () => void;
  }
}

declare module "@remix-run/server-runtime" {
  export interface AppLoadContext {
    ipcEvent(event: string, ...args: unknown[]): void;
  }
}
