import * as React from "react";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import localforage from "localforage";

async function getChatCount() {
  const keys = await localforage.keys();
  return keys.filter((key) => key.startsWith("chat-metadata:")).length;
}

export async function getChat(chatId: string) {
  return (
    (await localforage.getItem<["human" | "assistant", string][]>(
      `chat:${chatId}`
    )) || []
  );
}

export async function createChatCompletion(
  chatId: string,
  message: string,
  signal: AbortSignal
): Promise<ReadableStream<string>> {
  const chat = await getChat(chatId);

  if (!chat.length) {
    await localforage.setItem(`chat-metadata:${chatId}`, {
      label: "Chat " + ((await getChatCount()) + 1),
    });
  }

  chat.push(["human", message]);
  await localforage.setItem(`chat:${chatId}`, chat);

  const messages = [new SystemMessage("You are a helpful AI assistant.")];
  for (const [who, message] of chat) {
    if (who === "human") {
      messages.push(new HumanMessage(message));
    } else {
      messages.push(new AIMessage(message));
    }
  }

  const chatModel = new ChatOpenAI({
    configuration: {
      baseURL: await window.electronAPI.ensureLLM(),
    },
    openAIApiKey: "sk-XxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx",
  });
  const responseStream = await chatModel.stream(messages, { signal });

  let aiMessage = "";
  return responseStream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        let text = typeof chunk.content === "string" ? chunk.content : "";
        aiMessage += text;
        controller.enqueue(text);
      },
      async flush() {
        chat.push(["assistant", aiMessage.trim()]);
        await localforage.setItem(`chat:${chatId}`, chat);
      },
    })
  );
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const cache = new WeakMap<
  ReadableStreamDefaultReader<string>,
  Map<number, Promise<ReadableStreamReadResult<string>>>
>();
function readReader(
  reader: ReadableStreamDefaultReader<string>,
  index: number
): Promise<ReadableStreamReadResult<string>> {
  const cached = cache.get(reader)?.get(index);
  if (cached) return cached;

  const promise = reader.read();
  const subCache = cache.get(reader) ?? new Map();
  subCache.set(index, promise);
  cache.set(reader, subCache);
  return promise;
}

export function StreamingMessage({
  reader,
  level = 0,
}: {
  reader: ReadableStreamDefaultReader<string>;
  level?: number;
}) {
  React.useEffect(() => {
    document.getElementById("messages")?.scrollTo(0, 9999999);
  }, []);

  const { done, value } = React.use(readReader(reader, level));

  if (done) return <>{value}</>;

  return (
    <>
      {value}
      <React.Suspense fallback="...">
        <StreamingMessage reader={reader} level={level + 1} />
      </React.Suspense>
    </>
  );
}
