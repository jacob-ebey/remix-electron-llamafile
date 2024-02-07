import * as React from "react";
import {
  type ClientActionFunctionArgs,
  useFetcher,
  useLoaderData,
  redirect,
} from "@remix-run/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

export async function clientLoader() {
  const { activeLLM, baseLlamafile } = await window.electronAPI.getSettings();

  if (activeLLM && baseLlamafile) {
    throw redirect("/");
  }

  const [llms, llamafileDirectory] = await Promise.all([
    window.electronAPI.listLLMs(),
    window.electronAPI.getLlamafileDirectory(),
  ]);

  return {
    activeLLM,
    baseLlamafile,
    llamafileDirectory,
    llms,
  };
}

export async function clientAction({ request }: ClientActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  switch (intent) {
    case "download-base-llamafile":
      await window.electronAPI.downloadBaseLlamafile();
      return true;
    case "download-base-model":
      await window.electronAPI.downloadPhi2();
      return true;
    case "select-model":
      const model = String(formData.get("model"));
      const settings = await window.electronAPI.getSettings();
      settings.activeLLM = model;
      await window.electronAPI.writeSettings(settings);
      return true;
    default:
      throw new Error("Invalid intent");
  }
}

export default function Setup() {
  const { activeLLM, baseLlamafile, llamafileDirectory, llms } =
    useLoaderData<typeof clientLoader>();
  const downloadLlamafileFetcher = useFetcher();
  const selectModelFetcher = useFetcher();

  const showDownloadBase =
    !baseLlamafile || (baseLlamafile && !!downloadLlamafileFetcher.data);

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
    <div className="h-full flex flex-col items-center justify-center container py-4">
      <Card className="max-w-screen-md w-full">
        <CardHeader>
          <CardTitle>Setup</CardTitle>
          <CardDescription>Welcome to Remix LLM!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showDownloadBase && (
            <>
              <p>
                Remix LLM needs a copy of the base llamafile to execute models.
              </p>
              <downloadLlamafileFetcher.Form method="POST">
                <input
                  type="hidden"
                  name="intent"
                  value="download-base-llamafile"
                />
                <div className="flex gap-4 items-center">
                  <Button
                    disabled={!!downloadLlamafileFetcher.data}
                    variant={
                      !downloadLlamafileFetcher.data ? "default" : "secondary"
                    }
                  >
                    {downloadLlamafileFetcher.data === true
                      ? "Download successful"
                      : downloadLlamafileFetcher.state !== "idle"
                      ? "Downloading llamafile..."
                      : "Download llamafile-0.6.2"}
                  </Button>
                  {downloadLlamafileFetcher.state !== "idle" && (
                    <Progress
                      value={downloadLlamafileProgress}
                      className="flex-1"
                    />
                  )}
                </div>
              </downloadLlamafileFetcher.Form>
            </>
          )}
          {showDownloadBase && !activeLLM && <Separator />}
          {!activeLLM &&
            (!llms.length ? (
              <>
                <p>
                  Remix LLM needs a base llamafile model to execute. We
                  recommend using phi-2 as it's lightweight and runs quickly.
                </p>
                <selectModelFetcher.Form method="POST">
                  <input
                    type="hidden"
                    name="intent"
                    value="download-base-model"
                  />
                  <div className="flex gap-4 items-center">
                    <Button>
                      {selectModelFetcher.state !== "idle"
                        ? "Downloading phi-2.Q4_K_M...."
                        : "Download phi-2.Q4_K_M.llamafile"}
                    </Button>
                    {selectModelFetcher.state !== "idle" && (
                      <Progress
                        value={downloadPhi2Progress}
                        className="flex-1"
                      />
                    )}
                  </div>
                </selectModelFetcher.Form>
                <p className="text-muted-foreground text-sm">
                  If you have a different LLM you'd like to use, you can add it
                  to your llamafile directory:
                </p>
                <Input disabled value={llamafileDirectory} />
              </>
            ) : (
              <>
                <p>
                  Remix LLM needs a llamafile model to execute. Select a model
                  to use:
                </p>
                <Select
                  onValueChange={(value) => {
                    const formData = new FormData();
                    formData.append("intent", "select-model");
                    formData.append("model", value);
                    selectModelFetcher.submit(formData, { method: "POST" });
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={activeLLM || "Select a LLM"} />
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
                <p className="text-muted-foreground text-sm">
                  If you have a different LLM you'd like to use, you can add it
                  to your llamafile directory:
                </p>
                <Input disabled value={llamafileDirectory} />
              </>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
