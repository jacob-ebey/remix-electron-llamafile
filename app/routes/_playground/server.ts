import localforage from "localforage";

export interface ChatMetadata {
  id: string;
  label: string;
}

export async function listChats() {
  const keys = (await localforage.keys()).filter((key) =>
    key.startsWith("chat-metadata:")
  );
  return Promise.all(
    keys.map((key) => getChatMetadata(key.slice("chat-metadata:".length)))
  ).then((chats) =>
    chats
      .filter((chat): chat is ChatMetadata => !!chat)
      .sort((chatA, chatB) => -chatA.id.localeCompare(chatB.id))
  );
}

export async function getChatMetadata(chatId: string) {
  return await localforage
    .getItem<ChatMetadata>(`chat-metadata:${chatId}`)
    .then((meta): ChatMetadata | null =>
      meta ? Object.assign(meta, { id: chatId }) : meta
    );
}
