import { PlusIcon, ReloadIcon, TrashIcon } from "@radix-ui/react-icons";
import {
  useFetcher,
  useLoaderData,
  type MetaFunction,
  Form,
  useRevalidator,
} from "@remix-run/react";
import { type ActionFunctionArgs } from "@remix-run/node";
import { serverOnly$ } from "vite-env-only";

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
import {
  addPrompt,
  deletePrompt,
  getLLMs,
  getLlamafileDirectory,
  getPrompts,
  getSettings,
  writeSettings,
} from "@/data.server/settings";
import { cn, debounce } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export const meta: MetaFunction = () => {
  return [
    { title: "Remix LLM | Settings" },
    { name: "description", content: "Settings for Remix LLM." },
  ];
};

export const loader = serverOnly$(async () => {
  const [
    llamafileDirectory,
    llms,
    prompts,
    { activeLLM, gpu, promptId, nGpuLayers },
  ] = await Promise.all([
    getLlamafileDirectory(),
    getLLMs(),
    getPrompts(),
    getSettings(),
  ]);

  return {
    activeLLM,
    gpu,
    llamafileDirectory,
    llms,
    nGpuLayers,
    promptId,
    prompts,
  };
});

export const action = serverOnly$(async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  switch (intent) {
    case "select-model": {
      const model = String(formData.get("model") || "");
      const settings = await getSettings();
      settings.activeLLM = model;
      await writeSettings(settings);
      return { success: true };
    }
    case "add-prompt": {
      const content = String(formData.get("content") || "");
      await addPrompt(content);
      return { success: true };
    }
    case "set-gpu": {
      const gpu = String(formData.get("gpu") || "");
      if (
        !gpu ||
        !["AUTO", "APPLE", "AMD", "NVIDIA", "DISABLE"].includes(gpu)
      ) {
        return { success: false };
      }
      const settings = await getSettings();
      settings.gpu = gpu;
      await writeSettings(settings);
      return { success: true };
    }
    case "set-n-gpu-layers": {
      let toSet = undefined;
      const raw = formData.get("n-gpu-layers");
      if (raw) {
        const nGpuLayers = Number(raw);
        if (Number.isSafeInteger(nGpuLayers)) {
          toSet = nGpuLayers;
        }
      }
      const settings = await getSettings();
      settings.nGpuLayers = toSet;
      await writeSettings(settings);
      return { success: true };
    }
    default: {
      const selectPromptId = formData.get("select-prompt");
      if (typeof selectPromptId === "string" && selectPromptId) {
        const settings = await getSettings();
        settings.promptId = selectPromptId;
        await writeSettings(settings);
        return { success: true };
      }

      const deletePromptId = formData.get("delete-prompt");
      if (typeof deletePromptId === "string" && deletePromptId) {
        await deletePrompt(deletePromptId);
        return { success: true };
      }
      throw new Error("Invalid intent");
    }
  }
});

export default function Index() {
  const {
    activeLLM,
    gpu,
    llamafileDirectory,
    llms,
    nGpuLayers,
    promptId,
    prompts,
  } = useLoaderData<typeof loader>();
  const selectModelFetcher = useFetcher<typeof action>();
  const selectGPUFetcher = useFetcher<typeof action>();
  const setNGPULayersFetcher = useFetcher<typeof action>();
  const revalidator = useRevalidator();

  return (
    <div className="container py-4 space-y-4 flex-1 min-h-0 overflow-auto">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Prompt Library</CardTitle>
          <CardDescription>
            Your prompt library. Add, remove, and edit prompts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="POST">
            <input type="hidden" name="intent" value="add-prompt" />
            <div className="flex items-center gap-2">
              <Input name="content" placeholder="Add a prompt" />
              <Button type="submit" size="icon" variant="outline">
                <span className="sr-only">add a prompt</span>
                <PlusIcon />
              </Button>
            </div>
          </Form>
          {prompts.length > 0 && (
            <Form method="POST" className="mt-4">
              <ul className="space-y-1">
                {prompts.map((prompt) => (
                  <li key={prompt.id} className="flex items-center gap-2">
                    <Button
                      type="submit"
                      name="select-prompt"
                      value={prompt.id}
                      aria-selected={promptId === prompt.id}
                      aria-label={`Select prompt: ${prompt.content}`}
                      variant="outline"
                      disabled={promptId === prompt.id}
                      className="text-left block text-wrap h-auto flex-1"
                    >
                      {prompt.content}
                    </Button>
                    <Button
                      type="submit"
                      name="delete-prompt"
                      value={prompt.id}
                      variant="destructive"
                      size="icon"
                    >
                      <span className="sr-only">delete prompt</span>
                      <TrashIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            </Form>
          )}
        </CardContent>
        {!prompts.length && (
          <CardFooter className="text-sm text-muted-foreground">
            No prompts yet.
          </CardFooter>
        )}
      </Card>

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
            <Button
              size="icon"
              variant="outline"
              onClick={() => revalidator.revalidate()}
            >
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

      <Card>
        <CardHeader>
          <CardTitle>GPU Settings</CardTitle>
          <CardDescription>Dragons ahead.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            value={gpu}
            onValueChange={(value) => {
              const formData = new FormData();
              formData.append("intent", "set-gpu");
              formData.append("gpu", value);
              selectGPUFetcher.submit(formData, { method: "POST" });
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a GPU" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="AUTO">AUTO</SelectItem>
                <SelectItem value="APPLE">APPLE</SelectItem>
                <SelectItem value="AMD">AMD</SelectItem>
                <SelectItem value="NVIDIA">NVIDIA</SelectItem>
                <SelectItem value="DISABLE">DISABLE</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <div>
            <Label htmlFor="n-gpu-layers" className="mb-2 block">
              n-gpu-layers
            </Label>
            <Input
              id="n-gpu-layers"
              defaultValue={nGpuLayers}
              type="text"
              inputMode="numeric"
              onChange={debounce((event) => {
                const value = event.target.value;
                const formData = new FormData();
                formData.append("intent", "set-n-gpu-layers");
                formData.append("n-gpu-layers", String(value));
                setNGPULayersFetcher.submit(formData, { method: "POST" });
              }, 200)}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              Number of layers to store in VRAM. Must be 35 in order to use GPUs
              made by NVIDIA and AMD.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
