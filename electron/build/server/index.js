import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { RemixServer, Meta, Links, Outlet, ScrollRestoration, Scripts, useFormAction, useActionData, useNavigation, useSubmit, useLoaderData, useParams, redirect, useLocation, Link, NavLink } from "@remix-run/react";
import { renderToString } from "react-dom/server";
import * as React from "react";
import { useFormStatus, useFormState, flushSync } from "react-dom";
import { useForm, getFormProps, getTextareaProps } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { z } from "zod";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as LabelPrimitive from "@radix-ui/react-label";
import localforage from "localforage";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { HamburgerMenuIcon, ExitIcon, PlusIcon, GearIcon } from "@radix-ui/react-icons";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  let html = renderToString(
    /* @__PURE__ */ jsx(RemixServer, { context: remixContext, url: request.url })
  );
  if (html.startsWith("<html")) {
    html = "<!DOCTYPE html>\n" + html;
  }
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
    status: responseStatusCode
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
function App() {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {})
    ] }),
    /* @__PURE__ */ jsxs("body", { className: "h-lvh max-h-lvh", children: [
      /* @__PURE__ */ jsx(Outlet, {}),
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  HydrateFallback: App,
  default: App
}, Symbol.toStringTag, { value: "Module" }));
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const Textarea = React.forwardRef(
  ({ className, disabled: _disabled, disableOnFormSubmission, ...props }, ref) => {
    const formStatus = useFormStatus();
    const disabled = _disabled || disableOnFormSubmission && (formStatus == null ? void 0 : formStatus.pending);
    return /* @__PURE__ */ jsx(
      "textarea",
      {
        className: cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        ),
        ref,
        disabled,
        ...props
      }
    );
  }
);
Textarea.displayName = "Textarea";
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = React.forwardRef(
  ({
    className,
    variant,
    size,
    asChild = false,
    disabled: _disabled,
    disableOnFormSubmission,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    const formStatus = useFormStatus();
    const disabled = _disabled || disableOnFormSubmission && (formStatus == null ? void 0 : formStatus.pending);
    return /* @__PURE__ */ jsx(
      Comp,
      {
        className: cn(buttonVariants({ variant, size, className })),
        ref,
        disabled,
        ...props
      }
    );
  }
);
Button.displayName = "Button";
const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);
const Label = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  LabelPrimitive.Root,
  {
    ref,
    className: cn(labelVariants(), className),
    ...props
  }
));
Label.displayName = LabelPrimitive.Root.displayName;
let _hydrated = false;
function useRouteFormAction(preOptimism, postOptimism) {
  const formAction = useFormAction();
  const actionData = useActionData();
  const navigation = useNavigation();
  const submit = useSubmit();
  const [hydrated, setHydrated] = React.useState(_hydrated);
  const deferredsRef = React.useRef([]);
  React.useEffect(() => {
    if (hydrated)
      return;
    _hydrated = true;
    setHydrated(true);
  }, [hydrated]);
  React.useEffect(
    () => () => {
      for (const deferred of deferredsRef.current) {
        deferred.reject(new Error("Form was unmounted."));
      }
      deferredsRef.current = [];
    },
    []
  );
  if (navigation.state === "idle" && typeof actionData !== "undefined") {
    for (const deferred of deferredsRef.current) {
      deferred.resolve(actionData);
    }
    deferredsRef.current = [];
  }
  const [formState, actionFunction] = useFormState(async (_, formData) => {
    await (preOptimism == null ? void 0 : preOptimism(formData));
    const promise = new Promise((resolve, reject) => {
      deferredsRef.current.push({ resolve, reject });
      submit(formData, {
        method: "POST",
        action: formAction,
        encType: "multipart/form-data",
        replace: true,
        unstable_viewTransition: true,
        unstable_flushSync: true
      });
    });
    const result = await promise;
    await (postOptimism == null ? void 0 : postOptimism(result));
    return result;
  }, actionData);
  return [
    !hydrated ? { action: formAction, encType: "multipart/form-data", method: "POST" } : { action: actionFunction },
    formState
  ];
}
async function listChats() {
  const keys = (await localforage.keys()).filter(
    (key) => key.startsWith("chat-metadata:")
  );
  return Promise.all(
    keys.map((key) => getChatMetadata(key.slice("chat-metadata:".length)))
  ).then(
    (chats) => chats.filter((chat) => !!chat).sort((chatA, chatB) => -chatA.id.localeCompare(chatB.id))
  );
}
async function getChatMetadata(chatId) {
  return await localforage.getItem(`chat-metadata:${chatId}`).then(
    (meta2) => meta2 ? Object.assign(meta2, { id: chatId }) : meta2
  );
}
async function getChatCount() {
  const keys = await localforage.keys();
  return keys.filter((key) => key.startsWith("chat-metadata:")).length;
}
async function getChat(chatId) {
  return await localforage.getItem(
    `chat:${chatId}`
  ) || [];
}
async function createChatCompletion(chatId, message, signal) {
  const chat = await getChat(chatId);
  if (!chat.length) {
    await localforage.setItem(`chat-metadata:${chatId}`, {
      label: "Chat " + (await getChatCount() + 1)
    });
  }
  chat.push(["human", message]);
  await localforage.setItem(`chat:${chatId}`, chat);
  const messages = [new SystemMessage("You are a helpful AI assistant.")];
  for (const [who, message2] of chat) {
    if (who === "human") {
      messages.push(new HumanMessage(message2));
    } else {
      messages.push(new AIMessage(message2));
    }
  }
  const chatModel = new ChatOpenAI({
    configuration: {
      baseURL: await window.electronAPI.ensureLLM()
    },
    openAIApiKey: "sk-XxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx"
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
      }
    })
  );
}
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
const cache = /* @__PURE__ */ new WeakMap();
function readReader(reader, index) {
  var _a;
  const cached = (_a = cache.get(reader)) == null ? void 0 : _a.get(index);
  if (cached)
    return cached;
  const promise = reader.read();
  const subCache = cache.get(reader) ?? /* @__PURE__ */ new Map();
  subCache.set(index, promise);
  cache.set(reader, subCache);
  return promise;
}
function StreamingMessage({
  reader,
  level = 0
}) {
  React.useEffect(() => {
    var _a;
    (_a = document.getElementById("messages")) == null ? void 0 : _a.scrollTo(0, 9999999);
  }, []);
  const { done, value } = React.use(readReader(reader, level));
  if (done)
    return /* @__PURE__ */ jsx(Fragment, { children: value });
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    value,
    /* @__PURE__ */ jsx(React.Suspense, { fallback: "...", children: /* @__PURE__ */ jsx(StreamingMessage, { reader, level: level + 1 }) })
  ] });
}
const meta$1 = ({
  data
}) => {
  var _a;
  return [
    { title: `Remix LLM | ${((_a = data == null ? void 0 : data.metadata) == null ? void 0 : _a.label) || "New Chat"}` },
    { name: "description", content: "Create a new chat." }
  ];
};
async function clientLoader$1({
  params: { chatId }
}) {
  if (!chatId) {
    throw redirect(`/chat/${newId()}`);
  }
  const [chat, metadata] = await Promise.all([
    getChat(chatId),
    getChatMetadata(chatId)
  ]);
  return { chat, metadata };
}
const sendMessageSchema = z.object({
  prompt: z.string({ required_error: "Please enter a message." }).trim().min(1)
});
async function clientAction({
  request,
  params: { chatId }
}) {
  if (!chatId)
    throw new Error("chatId is required");
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
    aiResponse: /* @__PURE__ */ jsx(StreamingMessage, { reader: completion.getReader() }),
    lastResult: submission.reply({})
  };
}
function Index$1() {
  const { chat: loaderChat } = useLoaderData();
  const { chatId } = useParams();
  const navigation = useNavigation();
  const pendingResponse = navigation.state === "submitting";
  const [chat, chatReducer] = React.useReducer(
    (state, action) => {
      return [...state, action.newMessage];
    },
    loaderChat
  );
  const [formActionProps, formActionResult] = useRouteFormAction(
    (formData) => {
      flushSync(() => {
        var _a;
        chatReducer({
          action: "sendMessage",
          newMessage: ["human", String(formData.get("prompt"))]
        });
        (_a = document.getElementById("messages")) == null ? void 0 : _a.scrollTo(0, 9999999);
      });
      const textArea = document.getElementById(
        sendMessageFields.prompt.id
      );
      if (textArea) {
        textArea.value = "";
        textArea.focus();
      }
    },
    (result) => {
      var _a;
      if (result.aiResponse) {
        flushSync(() => {
          chatReducer({
            action: "sendMessage",
            newMessage: ["assistant", result.aiResponse]
          });
        });
        (_a = document.getElementById("messages")) == null ? void 0 : _a.scrollTo(0, 9999999);
      }
    }
  );
  const sendMessageFormRef = React.useRef(null);
  const [sendMessageForm, sendMessageFields] = useForm({
    lastResult: formActionResult == null ? void 0 : formActionResult.lastResult,
    constraint: getZodConstraint(sendMessageSchema),
    shouldValidate: "onInput",
    shouldRevalidate: "onInput",
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: sendMessageSchema });
    },
    id: chatId
  });
  React.useEffect(() => {
    var _a;
    (_a = document.getElementById("messages")) == null ? void 0 : _a.scrollTo(0, 9999999);
  }, [chat]);
  return /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col overflow-y-hidden", children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        id: "messages",
        className: "flex-1 flex flex-col min-h-0 overflow-y-auto container py-4",
        children: [
          chat.map(([who, content], index) => /* @__PURE__ */ jsxs(
            "div",
            {
              className: "flex flex-col space-y-1",
              children: [
                /* @__PURE__ */ jsx("div", { className: "font-medium", children: who }),
                /* @__PURE__ */ jsx("pre", { className: "text-muted-foreground font-sans text-wrap m-0", children: /* @__PURE__ */ jsx(React.Suspense, { fallback: "...", children: content }) })
              ]
            },
            "" + index + ":" + who + content
          )),
          pendingResponse && /* @__PURE__ */ jsxs("div", { className: "flex flex-col space-y-1", children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium", children: "assistant" }),
            /* @__PURE__ */ jsx("pre", { className: "text-muted-foreground font-sans text-wrap m-0", children: "..." })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx(Label, { className: "sr-only", htmlFor: sendMessageFields.prompt.id, children: "New Message" }),
    /* @__PURE__ */ jsxs(
      "form",
      {
        ...getFormProps(sendMessageForm),
        ...formActionProps,
        ref: sendMessageFormRef,
        className: "space-y-4 container py-4 border-t border-border",
        children: [
          /* @__PURE__ */ jsx(
            Textarea,
            {
              ...getTextareaProps(sendMessageFields.prompt),
              onKeyDown: (event) => {
                var _a;
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  (_a = sendMessageFormRef.current) == null ? void 0 : _a.requestSubmit();
                }
              }
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end gap-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex-1 text-sm text-destructive", children: [
              /* @__PURE__ */ jsx("div", { id: sendMessageFields.prompt.errorId, children: sendMessageFields.prompt.errors }),
              /* @__PURE__ */ jsx("div", { children: sendMessageForm.errors })
            ] }),
            /* @__PURE__ */ jsx(Button, { disableOnFormSubmission: true, children: "Send Message" })
          ] })
        ]
      }
    )
  ] });
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  clientAction,
  clientLoader: clientLoader$1,
  default: Index$1,
  meta: meta$1
}, Symbol.toStringTag, { value: "Module" }));
const meta = () => {
  return [
    { title: "Remix LLM" },
    { name: "description", content: "Welcome to Remix LLM!" }
  ];
};
function Index() {
  return /* @__PURE__ */ jsx("div", { className: "flex-1 hidden md:flex justify-center items-center", children: /* @__PURE__ */ jsx("p", { className: "text-muted-foreground max-w-xs text-center", children: "Select a chat from the list on the left, or create a new one in the top right to get started." }) });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Index,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(
  TooltipPrimitive.Content,
  {
    ref,
    sideOffset,
    className: cn(
      "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    ),
    ...props
  }
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
const Separator = React.forwardRef(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => /* @__PURE__ */ jsx(
    SeparatorPrimitive.Root,
    {
      ref,
      decorative,
      orientation,
      className: cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      ),
      ...props
    }
  )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;
async function clientLoader({}) {
  const chats = await listChats();
  return { chats };
}
function Playground() {
  const { chats } = useLoaderData();
  const location = useLocation();
  const navigation = useNavigation();
  const { chatId } = useParams();
  const revalidating = navigation.state === "loading";
  const [explicitelyShowList, setExplicitelyShowList] = React.useState(false);
  const showList = explicitelyShowList || location.pathname === "/";
  const closeList = () => setExplicitelyShowList(false);
  return /* @__PURE__ */ jsxs("div", { className: "h-full flex flex-col", children: [
    /* @__PURE__ */ jsxs("header", { className: "container flex justify-between py-4 items-center", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        !showList ? /* @__PURE__ */ jsx(Button, { asChild: true, size: "icon", variant: "outline", className: "md:hidden", children: /* @__PURE__ */ jsxs(
          Link,
          {
            to: "/",
            onClick: (event) => {
              event.preventDefault();
              setExplicitelyShowList(true);
            },
            children: [
              /* @__PURE__ */ jsx("span", { className: "sr-only", children: "show list of chats" }),
              /* @__PURE__ */ jsx(HamburgerMenuIcon, { "aria-hidden": "true" })
            ]
          }
        ) }) : explicitelyShowList ? /* @__PURE__ */ jsxs(
          Button,
          {
            size: "icon",
            variant: "outline",
            className: "md:hidden",
            onClick: () => {
              setExplicitelyShowList(false);
            },
            children: [
              /* @__PURE__ */ jsx("span", { className: "sr-only", children: "return to chat" }),
              /* @__PURE__ */ jsx(ExitIcon, { "aria-hidden": "true" })
            ]
          }
        ) : null,
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold", children: "Remix LLM" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: /* @__PURE__ */ jsxs(TooltipProvider, { children: [
        /* @__PURE__ */ jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { asChild: true, size: "icon", variant: "outline", children: /* @__PURE__ */ jsxs(Link, { to: "/chat", onClick: closeList, children: [
            /* @__PURE__ */ jsx("span", { className: "sr-only", children: "New Chat" }),
            /* @__PURE__ */ jsx(PlusIcon, {})
          ] }) }) }),
          /* @__PURE__ */ jsx(TooltipContent, { children: /* @__PURE__ */ jsx("p", { children: "New Chat" }) })
        ] }),
        /* @__PURE__ */ jsxs(Tooltip, { children: [
          /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { asChild: true, size: "icon", variant: "outline", children: /* @__PURE__ */ jsxs(Link, { to: "/settings", onClick: closeList, children: [
            /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Settings" }),
            /* @__PURE__ */ jsx(GearIcon, {})
          ] }) }) }),
          /* @__PURE__ */ jsx(TooltipContent, { children: /* @__PURE__ */ jsx("p", { children: "Settings" }) })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(Separator, {}),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-1 overflow-y-hidden", children: [
      /* @__PURE__ */ jsxs(
        "nav",
        {
          className: cn(
            "flex-col border-r border-border relative min-h-0 overflow-y-auto",
            showList ? "w-full md:w-64 flex" : "hidden md:flex w-64"
          ),
          children: [
            /* @__PURE__ */ jsx(
              "a",
              {
                className: "flex flex-col focus:px-4 focus:py-2 border-b border-border focus:absolute z-10 bg-background sr-only focus:top-0 focus:left-0 focus:right-0 focus:clip-[unset] focus:not-sr-only",
                href: "#main-content",
                onClick: closeList,
                children: "Skip Navigation"
              }
            ),
            revalidating && /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-0 right-0 z-10", children: /* @__PURE__ */ jsx("div", { className: "h-1 w-full bg-accent overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "animate-progress w-full h-full bg-primary origin-left-right" }) }) }),
            chats.map((chat) => /* @__PURE__ */ jsx(
              NavLink,
              {
                unstable_viewTransition: true,
                className: ({ isActive }) => cn("flex flex-col px-4 py-2 border-b border-border", {
                  "bg-muted text-muted-foreground": isActive
                }),
                to: `/chat/${chat.id}`,
                onClick: closeList,
                children: chat.label
              },
              chat.id
            ))
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        "div",
        {
          className: "flex flex-1 flex-col overflow-y-hidden",
          id: "main-content",
          children: /* @__PURE__ */ jsx(Outlet, {}, chatId)
        }
      )
    ] })
  ] });
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  clientLoader,
  default: Playground
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-jzQYf6t5.js?client-route", "imports": ["/assets/jsx-runtime-ddOyjiFJ.js", "/assets/components-EjjKQUqg.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-IVKmI4mb.js?client-route", "imports": ["/assets/jsx-runtime-ddOyjiFJ.js", "/assets/components-EjjKQUqg.js"], "css": ["/assets/root-hHu6BQmq.css"] }, "routes/_playground.chat.($chatId)": { "id": "routes/_playground.chat.($chatId)", "parentId": "routes/_playground", "path": "chat/:chatId?", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": true, "hasClientLoader": true, "hasErrorBoundary": false, "module": "/assets/route-FEnGNfLV.js?client-route", "imports": ["/assets/jsx-runtime-ddOyjiFJ.js", "/assets/components-EjjKQUqg.js", "/assets/server-F_ve6JoJ.js"], "css": [] }, "routes/_playground._index": { "id": "routes/_playground._index", "parentId": "routes/_playground", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_playground._index-ZZCiZ8LZ.js?client-route", "imports": ["/assets/jsx-runtime-ddOyjiFJ.js"], "css": [] }, "routes/_playground": { "id": "routes/_playground", "parentId": "root", "path": void 0, "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": true, "hasErrorBoundary": false, "module": "/assets/route-R_o9z4bL.js?client-route", "imports": ["/assets/jsx-runtime-ddOyjiFJ.js", "/assets/components-EjjKQUqg.js", "/assets/server-F_ve6JoJ.js"], "css": [] } }, "url": "/assets/manifest-39b4b160.js", "version": "39b4b160" };
const mode = "production";
const assetsBuildDirectory = "electron/build/client";
const future = { "v3_fetcherPersist": false, "v3_relativeSplatPath": false, "v3_throwAbortReason": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/_playground.chat.($chatId)": {
    id: "routes/_playground.chat.($chatId)",
    parentId: "routes/_playground",
    path: "chat/:chatId?",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/_playground._index": {
    id: "routes/_playground._index",
    parentId: "routes/_playground",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route2
  },
  "routes/_playground": {
    id: "routes/_playground",
    parentId: "root",
    path: void 0,
    index: void 0,
    caseSensitive: void 0,
    module: route3
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
