import {
  ExitIcon,
  GearIcon,
  HamburgerMenuIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { type ActionFunctionArgs } from "@remix-run/node";
import {
  Form,
  Link,
  NavLink,
  Outlet,
  redirect,
  useLoaderData,
  useLocation,
  useNavigation,
  useParams,
} from "@remix-run/react";
import * as React from "react";
import { serverOnly$ } from "vite-env-only";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { listChats } from "@/data.server/chat";
import { getSettings } from "@/data.server/settings";
import { cn } from "@/lib/utils";

export const loader = serverOnly$(async () => {
  const [chats, settings] = await Promise.all([listChats(), getSettings()]);

  if (!settings.baseLlamafile || !settings.activeLLM) {
    throw redirect("/setup");
  }

  return { chats };
});

export default function Playground() {
  const { chats } = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigation = useNavigation();
  const { chatId } = useParams();
  const revalidating = navigation.state !== "idle";

  const [explicitelyShowList, setExplicitelyShowList] = React.useState(false);
  const showList = explicitelyShowList || location.pathname === "/";

  const closeList = () => setExplicitelyShowList(false);
  const openList = () => setExplicitelyShowList(true);

  return (
    <div className="h-full flex flex-col">
      <header className="container flex justify-between py-4 items-center gap-4">
        <div className="flex items-center gap-4">
          {!showList ? (
            <Button asChild size="icon" variant="outline" className="md:hidden">
              <Link
                to="/"
                onClick={(event) => {
                  event.preventDefault();
                  openList();
                }}
              >
                <span className="sr-only">show list of chats</span>
                <HamburgerMenuIcon aria-hidden="true" />
              </Link>
            </Button>
          ) : explicitelyShowList ? (
            <Button
              size="icon"
              variant="outline"
              className="md:hidden"
              onClick={() => {
                closeList();
              }}
            >
              <span className="sr-only">return to chat</span>
              <ExitIcon aria-hidden="true" />
            </Button>
          ) : null}
          <img src="/favicon.png" alt="Remix LLM" className="w-8 h-8" />
          {/* <h2 className="text-lg font-semibold">Remix LLM</h2> */}
        </div>
        <div className="flex flex-1 items-center gap-4 relative">
          <DownloadProgress />
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild size="icon" variant="outline">
                  <Link to="/chat" onClick={closeList}>
                    <span className="sr-only">New Chat</span>
                    <PlusIcon />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New Chat</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild size="icon" variant="outline">
                  <Link to="/settings" onClick={closeList}>
                    <span className="sr-only">Settings</span>
                    <GearIcon />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <Separator />

      <div className="flex flex-1 overflow-y-hidden relative">
        {revalidating && (
          <div className="absolute top-0 left-0 right-0 z-10">
            <div className="h-1 w-full bg-accent overflow-hidden">
              <div className="animate-progress w-full h-full bg-primary origin-left-right"></div>
            </div>
          </div>
        )}
        <nav
          className={cn(
            "flex-col border-r border-border min-h-0 overflow-y-auto relative",
            showList ? "w-full md:w-64 flex" : "hidden md:flex w-64"
          )}
        >
          <a
            className="flex flex-col focus:px-4 focus:py-2 border-b border-border focus:absolute z-10 bg-background sr-only focus:top-0 focus:left-0 focus:right-0 focus:clip-[unset] focus:not-sr-only"
            href="#main-content"
            onClick={closeList}
          >
            Skip Navigation
          </a>
          {!chats?.length ? (
            <p className="px-4 py-2 text-muted-foreground">No chats...</p>
          ) : (
            <Form navigate={false} action="/chat" method="POST">
              <ul>
                {chats.map((chat) => (
                  <li
                    key={chat.id}
                    className="flex items-center gap-2 border-b border-border pr-0.5"
                  >
                    <NavLink
                      className="flex-1 flex flex-col px-4 py-2"
                      to={`/chat/${chat.id}`}
                      onClick={closeList}
                    >
                      {chat.title}
                    </NavLink>
                    <Button
                      type="submit"
                      name="delete-chat"
                      value={chat.id}
                      variant="destructive"
                      size="icon"
                    >
                      <span className="sr-only">delete chat</span>
                      <TrashIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            </Form>
          )}
        </nav>
        <div
          className="flex flex-1 flex-col overflow-y-hidden"
          id="main-content"
        >
          <Outlet key={chatId} />
        </div>
      </div>
    </div>
  );
}

function DownloadProgress() {
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

  return downloadLlamafileProgress > 0 && downloadLlamafileProgress < 100 ? (
    <>
      <Progress value={downloadLlamafileProgress} className="flex-1 w-1/2" />
      <span className="text-sm text-muted-foreground w-1/2 overflow-hidden overflow-ellipsis whitespace-nowrap">
        downloading llamafile executable
      </span>
    </>
  ) : downloadPhi2Progress > 0 && downloadPhi2Progress < 100 ? (
    <>
      <Progress value={downloadPhi2Progress} className="flex-1 w-1/2" />
      <span className="text-sm text-muted-foreground w-1/2 overflow-hidden overflow-ellipsis whitespace-nowrap">
        downloading phi-2 model
      </span>
    </>
  ) : null;
}
