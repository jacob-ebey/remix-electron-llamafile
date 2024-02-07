import {
  type MetaFunction,
  type ClientActionFunctionArgs,
  type ClientLoaderFunctionArgs,
  useLoaderData,
  useFetcher,
} from "@remix-run/react";
import { ReloadIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const meta: MetaFunction = () => {
  return [
    { title: "Remix LLM | Settings" },
    { name: "description", content: "Settings for Remix LLM." },
  ];
};

export async function clientLoader({}: ClientLoaderFunctionArgs) {
  const [llamafileDirectory, llms, { activeLLM }] = await Promise.all([
    window.electronAPI.getLlamafileDirectory(),
    window.electronAPI.listLLMs(),
    window.electronAPI.getSettings(),
  ]);

  return {
    activeLLM,
    llamafileDirectory,
    llms,
  };
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  switch (intent) {
    case "select-model":
      const model = String(formData.get("model"));
      const settings = await window.electronAPI.getSettings();
      settings.activeLLM = model;
      await window.electronAPI.writeSettings(settings);
      return { success: true };
    default:
      throw new Error("Invalid intent");
  }
}

export default function Index() {
  const { activeLLM, llamafileDirectory, llms } =
    useLoaderData<typeof clientLoader>();
  const selectModelFetcher = useFetcher();

  return (
    <div className="container py-4 space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Active Model</CardTitle>
          <CardDescription>The LLM that is currently active.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Select
              value={activeLLM}
              disabled={!llms.length}
              onValueChange={(value) => {
                const formData = new FormData();
                formData.append("intent", "select-model");
                formData.append("model", value);
                selectModelFetcher.submit(formData, { method: "POST" });
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a LLM" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {llms.map((llm) => (
                    <SelectItem key={llm} value={llm}>
                      {llm}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button size="icon" variant="outline">
              <span className="sr-only">refresh LLMs</span>
              <ReloadIcon />
            </Button>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Add llamafiles to the directory below to see them here.
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Llamafile Directory</CardTitle>
          <CardDescription>
            The directory where the llamafiles are stored.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input disabled value={llamafileDirectory} />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Configurable via $LLAMAFILE_PATH
        </CardFooter>
      </Card>
    </div>
  );
}
