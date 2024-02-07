import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import * as stream from "node:stream";

import * as hf from "@huggingface/hub";

export async function downloadBaseLlamafile(emitStatus) {
  const llamafileDir = getLlamafileDirectory();
  const response = await fetch(
    "https://github.com/Mozilla-Ocho/llamafile/releases/download/0.6.2/llamafile-0.6.2"
  );
  const contentLength = Number(response.headers.get("content-length"));

  let downloaded = 0;
  emitStatus(0);
  const writeStream = stream.Readable.fromWeb(response.body)
    .pipe(
      new stream.PassThrough({
        transform(chunk, encoding, callback) {
          downloaded += chunk.length;
          emitStatus((downloaded / contentLength) * 100);
          callback(null, chunk);
        },
      })
    )
    .pipe(fs.createWriteStream(path.resolve(llamafileDir, "llamafile-0.6.2")));
  await new Promise((resolve, reject) => {
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  const settings = await getSettings();
  settings.baseLlamafile = "llamafile-0.6.2";
  await writeSettings(settings);
}

export async function downloadPhi2(emitStatus) {
  const repo = "jartine/phi-2-llamafile";
  const file = "phi-2.Q4_K_M.llamafile";
  const llamafileDir = getLlamafileDirectory();

  const response = await hf.downloadFile({ repo, path: file });
  const contentLength = Number(response.headers.get("content-length"));

  let downloaded = 0;
  emitStatus(0);
  const writeStream = stream.Readable.fromWeb(response.body)
    .pipe(
      new stream.PassThrough({
        transform(chunk, encoding, callback) {
          downloaded += chunk.length;
          emitStatus((downloaded / contentLength) * 100);
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

function getSettingsPath() {
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
      !fs.existsSync(path.resolve(llamafileDir, settings.activeLLM))
    ) {
      settings.activeLLM = undefined;
    }
    if (
      settings.baseLlamafile &&
      !fs.existsSync(path.resolve(llamafileDir, settings.baseLlamafile))
    ) {
      settings.baseLlamafile = undefined;
    }

    return settings;
  } catch (error) {
    return {};
  }
}

export async function writeSettings(settings) {
  const settingsPath = getSettingsPath();
  await fsp.mkdir(path.dirname(settingsPath), { recursive: true });
  await fsp.writeFile(settingsPath, JSON.stringify(settings, null, 2));
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

export async function listLLMs() {
  const llamafileDir = getLlamafileDirectory();
  await fsp.mkdir(llamafileDir, { recursive: true });

  const files = await fsp.readdir(llamafileDir);
  return files.filter((file) => file.endsWith(".llamafile"));
}

let llmPromise;
export function ensureLLM() {
  if (!llmPromise) {
    llmPromise = ensureLLMInternal();
  }
  return llmPromise;
}

async function ensureLLMInternal() {
  console.log("Starting LLM");
  const llamafileDir = getLlamafileDirectory();
  const settings = await getSettings();

  const executable = path.resolve(llamafileDir, settings.baseLlamafile);
  const model = path.resolve(llamafileDir, settings.activeLLM);

  // ensure it's executable
  await fsp.chmod(executable, 0o755);

  const port = await getPort();

  const llamafileProcess = cp.exec(
    `${executable} --nobrowser --port ${port} -m ${model}`
  );
  llamafileProcess.once("exit", () => {
    console.log("LLM exited");
    llmPromise = undefined;
  });
  await new Promise((resolve, reject) => {
    let buffer = "";
    const waitForRegex = /llama server listening at /;
    const waitForServer = (data) => {
      buffer += data.toString();
      console.log(buffer);

      if (waitForRegex.test(buffer)) {
        resolve();
        llamafileProcess.stderr.off("data", waitForServer);
        llamafileProcess.off("exit", closeOut);
      }
    };
    const closeOut = () => {
      llamafileProcess.stderr.off("data", waitForServer);
      reject(new Error("Failed to start server"));
    };
    llamafileProcess.stderr.on("data", waitForServer);
    llamafileProcess.once("exit", closeOut);
  });

  return `http://127.0.0.1:${port}/v1`;
}

function getPort() {
  return new Promise((resolve, reject) => {
    try {
      const server = net.createServer((soc) => soc.end());
      server.listen(0, () => {
        const port = server.address().port;
        server.close(() => {
          resolve(port);
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}
