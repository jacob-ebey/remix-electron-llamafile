import * as React from "react";

let latestMessages = {} as Record<string, string>;

let handlers = new Set<() => void>();
if (typeof window !== "undefined" && window.electronAPI?.onMessage) {
  window.electronAPI.onMessage(({ id, value }) => {
    latestMessages = { ...latestMessages, [id]: value };
    for (const handler of handlers) {
      handler();
    }
  });
}

function subscribeToLatestMessages(onChange: () => void) {
  handlers.add(onChange);
  return () => {
    handlers.delete(onChange);
  };
}
function getLatestMessages() {
  return latestMessages;
}

export function useLatestMessage(id?: string) {
  const latestMessages = React.useSyncExternalStore(
    subscribeToLatestMessages,
    getLatestMessages,
    getLatestMessages
  );
  return id ? latestMessages[id] : undefined;
}
