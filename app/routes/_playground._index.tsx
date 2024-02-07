import { type MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Remix LLM" },
    { name: "description", content: "Welcome to Remix LLM!" },
  ];
};

export default function Index() {
  return (
    <div className="flex-1 hidden md:flex justify-center items-center">
      <p className="text-muted-foreground max-w-xs text-center">
        Select a chat from the list on the left, or create a new one in the top
        right to get started.
      </p>
    </div>
  );
}
