import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

declare global {
  interface MockRequest {
    body?: ArrayBuffer;
    headers: Record<string, string[]>;
    method: string;
    url: string;
  }

  type MockResponse = { rethrow?: boolean } & (
    | {
        response: {
          body: ArrayBuffer;
          headers: Record<string, string[]>;
          status: number;
          statusText?: string;
        };
      }
    | { data: unknown }
  );

  interface Window {
    electronAPI: EventsBridge;
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
