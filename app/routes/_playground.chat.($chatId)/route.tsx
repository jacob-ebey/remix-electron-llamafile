import * as React from "react";
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Form,
  useActionData,
  useLoaderData,
  useParams,
  useNavigation,
  useNavigate,
} from "@remix-run/react";
import { useForm, getFormProps, getTextareaProps } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import Markdown from "react-markdown";
import { z } from "zod";
import { serverOnly$ } from "vite-env-only";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  createChat,
  createChatMessage,
  createStreamingChatMessage,
  deleteChat,
  getChat,
  getMessages,
} from "@/data.server/chat";
import { useLatestMessage } from "@/stores/latest-messages";

import { streamChatCompletion } from "./server";

export const meta = ({
  data,
}: {
  data?: Awaited<ReturnType<NonNullable<typeof loader>>>;
}) => {
  return [
    { title: `Remix LLM | ${data?.chat?.title || "New Chat"}` },
    {
      name: "description",
      content: data?.chat?.title
        ? `Chat: ${data.chat.title}`
        : "Create a new chat.",
    },
  ];
};
export const loader = serverOnly$(
  async ({ params: { chatId } }: LoaderFunctionArgs) => {
    if (!chatId) {
      return { chat: null, messages: null };
    }

    const [chat, messages] = await Promise.all([
      getChat(chatId),
      getMessages(chatId),
    ]);

    return { chat, messages };
  }
);

const sendMessageSchema = z.object({
  prompt: z.string({ required_error: "Please enter a message." }).trim().min(1),
});

export const action = serverOnly$(
  async ({ context, request, params: { chatId } }: ActionFunctionArgs) => {
    const formData = await request.formData();
    const submission = parseWithZod(formData, { schema: sendMessageSchema });

    switch (formData.get("intent")) {
      case "send-message":
        const send = context?.ipcEvent as (
          event: string,
          ...args: unknown[]
        ) => void;

        const chat = chatId ? await getChat(chatId) : null;
        if (chat) {
          chatId = chat.id;
        } else {
          chatId = await createChat();
        }

        if (!chatId)
          throw new Error("Chat ID not found or could not be created.");

        if (submission.status !== "success") {
          return {
            chatId: null,
            aiMessageId: null,
            lastResult: submission.reply(),
          };
        }

        const chatController = new AbortController();
        const abortChatController = () => chatController.abort();
        request.signal.addEventListener("abort", abortChatController, {
          once: true,
        });
        const completion = await streamChatCompletion(
          chatId,
          submission.value.prompt,
          chatController.signal
        );
        await createChatMessage(chatId, "human", submission.value.prompt);

        let finalMessage = "";
        const output = completion.pipeThrough(
          new TransformStream({
            transform(chunk, controller) {
              controller.enqueue(chunk);
              finalMessage += chunk;
              if (typeof send === "function") {
                send(`message-update`, {
                  id: aiMessageId,
                  done: false,
                  value: finalMessage.trim(),
                });
              }
            },
            flush() {
              if (typeof send === "function") {
                send(`message-update`, {
                  id: aiMessageId,
                  done: true,
                  value: finalMessage.trim(),
                });
              }
            },
          })
        );
        const aiMessageId = await createStreamingChatMessage(
          chatId,
          "assistant",
          output
        );

        request.signal.removeEventListener("abort", abortChatController);

        return {
          chatId,
          aiMessageId,
          lastResult: submission.reply({}),
        };
      default:
        const deleteChatId = formData.get("delete-chat");
        if (typeof deleteChatId === "string" && deleteChatId) {
          await deleteChat(deleteChatId);
          return { success: false };
        }

        throw new Error("Invalid form submission.");
    }
  }
);

function Message({
  id: messageId,
  who,
  message: initialMessage,
}: {
  id?: string;
  who: string;
  message?: string;
}) {
  const latestMessage = useLatestMessage(messageId);
  const message =
    initialMessage &&
    latestMessage &&
    latestMessage.length > initialMessage.length
      ? latestMessage
      : initialMessage
      ? initialMessage
      : null;

  React.useEffect(() => {
    document.getElementById("messages")?.scrollTo(0, 9999999);
  }, [message]);

  return (
    <div className="flex flex-col space-y-1">
      <div className="font-medium">{who}</div>
      <div className="text-muted-foreground">
        <Markdown>{message + (!initialMessage ? "..." : "")}</Markdown>
      </div>
    </div>
  );
}

export default function Index() {
  const _actionData = useActionData<typeof action>();
  const actionData =
    _actionData && "lastResult" in _actionData ? _actionData : undefined;
  const { messages: loaderMessages } = useLoaderData<typeof loader>();
  const { chatId } = useParams();
  const navigate = useNavigate();
  const navigation = useNavigation();

  const isDownloadingStuff = useIsDownloadingStuff();

  const sendMessageFormRef = React.useRef<HTMLFormElement>(null);
  const [sendMessageForm, sendMessageFields] = useForm({
    lastResult: actionData?.lastResult,
    constraint: getZodConstraint(sendMessageSchema),
    shouldValidate: "onInput",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: sendMessageSchema });
    },
    onSubmit() {
      setTimeout(() => {
        sendMessageFormRef.current?.reset();
      }, 1);
    },
    id: chatId,
  });

  const chat = React.useMemo(() => {
    const messages = [...(loaderMessages || [])];

    if (navigation.formData) {
      const prompt = String(navigation.formData.get("prompt") || "");
      if (prompt) {
        messages.push({
          id: "pending-human",
          author: "human",
          content: prompt,
        });
        messages.push({
          id: "pending-assistant",
          author: "assistant",
          content: "...",
        });
      }
    }

    return messages;
  }, [loaderMessages, navigation, actionData]);

  React.useEffect(() => {
    if (actionData?.chatId && chatId !== actionData.chatId) {
      navigate(`/chat/${actionData.chatId}`);
    }
  }, [actionData, chatId]);

  React.useEffect(() => {
    document.getElementById("messages")?.scrollTo(0, 9999999);
  }, [chat]);

  return (
    <div className="flex-1 flex flex-col overflow-y-hidden">
      <div
        id="messages"
        className="flex-1 flex flex-col min-h-0 overflow-y-auto container py-4"
      >
        {chat.map((message) => (
          <Message
            key={message.id}
            id={message.id}
            who={message.author}
            message={message.content}
          />
        ))}
      </div>

      <Label className="sr-only" htmlFor={sendMessageFields.prompt.id}>
        New Message
      </Label>
      <Form
        {...getFormProps(sendMessageForm)}
        ref={sendMessageFormRef}
        method="POST"
        className="space-y-4 container py-4 border-t border-border"
      >
        <input type="hidden" name="intent" value="send-message" />
        <Textarea
          {...getTextareaProps(sendMessageFields.prompt)}
          key={chatId || sendMessageFields.prompt.key}
          autoFocus
          disabled={isDownloadingStuff}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessageFormRef.current?.requestSubmit();
            }
          }}
        />
        <div className="flex items-center justify-end gap-4">
          <div className="flex-1 text-sm text-destructive">
            <div id={sendMessageFields.prompt.errorId}>
              {sendMessageFields.prompt.errors}
            </div>
            <div>{sendMessageForm.errors}</div>
          </div>
          <Button disabled={isDownloadingStuff}>Send Message</Button>
        </div>
      </Form>
    </div>
  );
}

function useIsDownloadingStuff() {
  const [downloadLlamafileProgress, setDownloadLlamafileProgress] =
    React.useState(0);
  React.useEffect(
    () =>
      window.electronAPI.onDownloadBaseLlamafileProgress((progress) => {
        setDownloadLlamafileProgress(progress);
      }),
    []
  );
  const [downloadPhi2Progress, setDownloadPhi2Progress] = React.useState(0);
  React.useEffect(
    () =>
      window.electronAPI.onDownloadPhi2Progress((progress) => {
        setDownloadPhi2Progress(progress);
      }),
    []
  );

  return (
    (downloadLlamafileProgress > 0 && downloadLlamafileProgress < 100) ||
    (downloadPhi2Progress > 0 && downloadPhi2Progress < 100)
  );
}
