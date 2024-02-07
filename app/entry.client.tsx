import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

declare global {
  interface Window {
    electronAPI: {
      downloadBaseLlamafile(): Promise<void>;
      onDownloadBaseLlamafileProgress(
        callback: (progress: number) => void
      ): () => void;
      downloadPhi2(): Promise<void>;
      onDownloadPhi2Progress(callback: (progress: number) => void): () => void;
      ensureLLM(): Promise<string>;
      getLlamafileDirectory(): Promise<string>;
      getSettings(): Promise<{ baseLlamafile?: string; activeLLM?: string }>;
      listLLMs(): Promise<string[]>;
      writeSettings(settings: {
        baseLlamafile?: string;
        activeLLM?: string;
      }): Promise<void>;
    };
  }
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
