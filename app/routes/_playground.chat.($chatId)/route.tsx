import * as React from "react";
import {
  type ClientActionFunctionArgs,
  type ClientLoaderFunctionArgs,
  redirect,
  useLoaderData,
  useParams,
  useNavigation,
} from "@remix-run/react";
import { useForm, getFormProps, getTextareaProps } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { z } from "zod";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRouteFormAction } from "@/lib/forms";

import {
  createChatCompletion,
  getChat,
  getChatMetadata,
  newId,
  StreamingMessage,
} from "./server";
import { flushSync } from "react-dom";

export const meta = ({
  data,
}: {
  data?: Awaited<ReturnType<typeof clientLoader>>;
}) => {
  return [
    { title: `Remix LLM | ${data?.metadata?.label || "New Chat"}` },
    { name: "description", content: "Create a new chat." },
  ];
};
export async function clientLoader({
  params: { chatId },
}: ClientLoaderFunctionArgs) {
  if (!chatId) {
    throw redirect(`/chat/${newId()}`);
  }

  const [chat, metadata] = await Promise.all([
    getChat(chatId),
    getChatMetadata(chatId),
  ]);

  return { chat, metadata };
}

const sendMessageSchema = z.object({
  prompt: z.string({ required_error: "Please enter a message." }).trim().min(1),
});

export async function clientAction({
  request,
  params: { chatId },
}: ClientActionFunctionArgs) {
  if (!chatId) throw new Error("chatId is required");

  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: sendMessageSchema });

  if (submission.status !== "success") {
    return { lastResult: submission.reply() };
  }

  const completion = await createChatCompletion(
    chatId,
    submission.value.prompt,
    request.signal
  );

  return {
    userMessage: submission.value.prompt,
    aiResponse: (
      <StreamingMessage
        reader={completion.getReader()}
      />
    ),
    lastResult: submission.reply({}),
  };
}

export default function Index() {
  const { chat: loaderChat } = useLoaderData<typeof clientLoader>();
  const { chatId } = useParams();
  const navigation = useNavigation();
  const pendingResponse = navigation.state === "submitting";

  const [chat, chatReducer] = React.useReducer(
    (
      state: ["human" | "assistant", string | JSX.Element][],
      action: {
        action: "sendMessage";
        newMessage: ["human" | "assistant", string | JSX.Element];
      }
    ) => {
      return [...state, action.newMessage];
    },
    loaderChat
  );

  const [formActionProps, formActionResult] = useRouteFormAction<
    typeof clientAction
  >(
    (formData) => {
      flushSync(() => {
        chatReducer({
          action: "sendMessage",
          newMessage: ["human", String(formData.get("prompt"))],
        });
        document.getElementById("messages")?.scrollTo(0, 9999999);
      });

      const textArea = document.getElementById(
        sendMessageFields.prompt.id
      ) as HTMLTextAreaElement;
      if (textArea) {
        textArea.value = "";
        textArea.focus();
      }
    },
    (result) => {
      if (result.aiResponse) {
        flushSync(() => {
          chatReducer({
            action: "sendMessage",
            newMessage: ["assistant", result.aiResponse],
          });
        });
        document.getElementById("messages")?.scrollTo(0, 9999999);
      }
    }
  );

  const sendMessageFormRef = React.useRef<HTMLFormElement>(null);
  const [sendMessageForm, sendMessageFields] = useForm({
    lastResult: formActionResult?.lastResult,
    constraint: getZodConstraint(sendMessageSchema),
    shouldValidate: "onInput",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: sendMessageSchema });
    },
    id: chatId,
  });

  React.useEffect(() => {
    document.getElementById("messages")?.scrollTo(0, 9999999);
  }, [chat]);

  return (
    <div className="flex-1 flex flex-col overflow-y-hidden">
      <div
        id="messages"
        className="flex-1 flex flex-col min-h-0 overflow-y-auto container py-4"
      >
        {chat.map(([who, content], index) => (
          <div
            className="flex flex-col space-y-1"
            key={"" + index + ":" + who + content}
          >
            <div className="font-medium">{who}</div>
            <pre className="text-muted-foreground font-sans text-wrap m-0">
              <React.Suspense fallback="...">{content}</React.Suspense>
            </pre>
          </div>
        ))}
        {pendingResponse && (
          <div className="flex flex-col space-y-1">
            <div className="font-medium">assistant</div>
            <pre className="text-muted-foreground font-sans text-wrap m-0">
              ...
            </pre>
          </div>
        )}
      </div>

      <Label className="sr-only" htmlFor={sendMessageFields.prompt.id}>
        New Message
      </Label>
      <form
        {...getFormProps(sendMessageForm)}
        {...formActionProps}
        ref={sendMessageFormRef}
        className="space-y-4 container py-4 border-t border-border"
      >
        <Textarea
          {...getTextareaProps(sendMessageFields.prompt)}
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
          <Button disableOnFormSubmission>Send Message</Button>
        </div>
      </form>
    </div>
  );
}
