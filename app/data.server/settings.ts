import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as stream from "node:stream";

import * as hf from "@huggingface/hub";
import { desc, eq } from "drizzle-orm";

import { db, prompt } from "@/db.server";

export async function getPrompts() {
  return await db.query.prompt.findMany({
    orderBy: desc(prompt.createdAt),
    columns: {
      id: true,
      content: true,
    },
  });
}

export async function getPrompt(id: string) {
  return (
    await db.query.prompt.findFirst({
      where: eq(prompt.id, id),
      columns: {
        content: true,
      },
    })
  )?.content;
}

export async function addPrompt(content: string) {
  return await db
    .insert(prompt)
    .values({
      content,
    })
    .returning({ id: prompt.id });
}

export async function deletePrompt(id: string) {
  await db.delete(prompt).where(eq(prompt.id, id));
}

export function getLlamafileDirectory() {
  let llamafileDir = process.env.LLAMAFILE_PATH;
  if (llamafileDir) {
    llamafileDir = path.resolve(llamafileDir);
  } else {
    llamafileDir = path.resolve(os.homedir(), ".llamafile");
  }
  return llamafileDir;
}

export function getSettingsPath() {
  return path.resolve(os.homedir(), ".remix-llm", "remix-llm.json");
}

export async function getSettings() {
  const settingsPath = getSettingsPath();
  const llamafileDir = getLlamafileDirectory();

  try {
    const settings =
      JSON.parse(await fsp.readFile(settingsPath, "utf-8")) || {};
    if (
      settings.activeLLM &&
      !(await fsp
        .stat(path.resolve(llamafileDir, settings.activeLLM))
        .then((s) => s.isFile())
        .catch(() => false))
    ) {
      settings.activeLLM = undefined;
    }
    if (
      settings.baseLlamafile &&
      !(await fsp
        .stat(path.resolve(llamafileDir, settings.baseLlamafile))
        .then((s) => s.isFile())
        .catch(() => false))
    ) {
      settings.baseLlamafile = undefined;
    }

    return settings;
  } catch (error) {
    return {};
  }
}

export async function getLLMs() {
  const llamafileDir = getLlamafileDirectory();
  await fsp.mkdir(llamafileDir, { recursive: true });

  const files = await fsp.readdir(llamafileDir);
  return files.filter((file) => file.endsWith(".llamafile"));
}

export async function writeSettings(settings: any) {
  const settingsPath = getSettingsPath();
  await fsp.mkdir(path.dirname(settingsPath), { recursive: true });
  await fsp.writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

export async function downloadBaseLlamafile(
  emitStatus?: (status: number) => void
) {
  const llamafileDir = getLlamafileDirectory();
  const response = await fetch(
    "https://github.com/Mozilla-Ocho/llamafile/releases/download/0.6.2/llamafile-0.6.2"
  );
  const contentLength = Number(response.headers.get("content-length"));

  let downloaded = 0;
  emitStatus?.(0);
  const writeStream = stream.Readable.fromWeb(response.body as any)
    .pipe(
      new stream.PassThrough({
        transform(chunk, encoding, callback) {
          downloaded += chunk.length;
          emitStatus?.((downloaded / contentLength) * 100);
          callback(null, chunk);
        },
      })
    )
    .pipe(fs.createWriteStream(path.resolve(llamafileDir, "llamafile-0.6.2")), {
      end: true,
    });
  await new Promise<void>((resolve, reject) => {
    writeStream.on("finish", async () => {
      await fsp.chmod(path.resolve(llamafileDir, "llamafile-0.6.2"), 0o755);
      resolve();
    });
    writeStream.on("error", reject);
  });

  const settings = await getSettings();
  settings.baseLlamafile = "llamafile-0.6.2";
  await writeSettings(settings);
}

export async function downloadPhi2(emitStatus?: (status: number) => void) {
  const repo = "jartine/phi-2-llamafile";
  const file = "phi-2.Q4_K_M.llamafile";
  const llamafileDir = getLlamafileDirectory();

  const response = await hf.downloadFile({ repo, path: file });
  if (!response?.body || !response?.ok)
    throw new Error("Failed to download phi-2 llamafile");
  const contentLength = Number(response.headers.get("content-length"));

  let downloaded = 0;
  emitStatus?.(0);
  const writeStream = stream.Readable.fromWeb(response.body as any)
    .pipe(
      new stream.PassThrough({
        transform(chunk, encoding, callback) {
          downloaded += chunk.length;
          emitStatus?.((downloaded / contentLength) * 100);
          callback(null, chunk);
        },
      })
    )
    .pipe(
      fs.createWriteStream(
        path.resolve(llamafileDir, "phi-2.Q4_K_M.llamafile")
      ),
      { end: true }
    );
  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  const settings = await getSettings();
  settings.activeLLM = "phi-2.Q4_K_M.llamafile";
  await writeSettings(settings);
}
