import * as React from "react";
import {
  type ClientLoaderFunctionArgs,
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useParams,
  useNavigation,
  useLocation,
} from "@remix-run/react";
import {
  GearIcon,
  HamburgerMenuIcon,
  PlusIcon,
  ExitIcon,
} from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { listChats } from "./_playground.chat.($chatId)/server";
import { cn } from "@/lib/utils";

export async function clientLoader({}: ClientLoaderFunctionArgs) {
  const chats = await listChats();

  return { chats };
}

export default function Playground() {
  const { chats } = useLoaderData<typeof clientLoader>();
  const location = useLocation();
  const navigation = useNavigation();
  const { chatId } = useParams();
  const revalidating = navigation.state === "loading";

  const [explicitelyShowList, setExplicitelyShowList] = React.useState(false);
  const showList = explicitelyShowList || location.pathname === "/";

  const closeList = () => setExplicitelyShowList(false);

  return (
    <div className="h-full flex flex-col">
      <header className="container flex justify-between py-4 items-center">
        <div className="flex items-center gap-4">
          {!showList ? (
            <Button asChild size="icon" variant="outline" className="md:hidden">
              <Link
                to="/"
                onClick={(event) => {
                  event.preventDefault();
                  setExplicitelyShowList(true);
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
                setExplicitelyShowList(false);
              }}
            >
              <span className="sr-only">return to chat</span>
              <ExitIcon aria-hidden="true" />
            </Button>
          ) : null}
          <h2 className="text-lg font-semibold">Remix LLM</h2>
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

      <div className="flex flex-1 overflow-y-hidden">
        <nav
          className={cn(
            "flex-col border-r border-border relative min-h-0 overflow-y-auto",
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
          {revalidating && (
            <div className="absolute top-0 left-0 right-0 z-10">
              <div className="h-1 w-full bg-accent overflow-hidden">
                <div className="animate-progress w-full h-full bg-primary origin-left-right"></div>
              </div>
            </div>
          )}
          {chats.map((chat) => (
            <NavLink
              unstable_viewTransition
              className={({ isActive }) =>
                cn("flex flex-col px-4 py-2 border-b border-border", {
                  "bg-muted text-muted-foreground": isActive,
                })
              }
              key={chat.id}
              to={`/chat/${chat.id}`}
              onClick={closeList}
            >
              {chat.label}
            </NavLink>
          ))}
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
