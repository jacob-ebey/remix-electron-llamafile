import * as cp from "node:child_process";
import * as fs from "node:fs/promises";
import * as net from "node:net";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

let llmPromise;
export function ensureLLM() {
  if (!llmPromise) {
    llmPromise = ensureLLMInternal();
  }
  return llmPromise;
}

async function ensureLLMInternal() {
  console.log("Starting LLM");
  let executable = "llamafile-0.6.2";
  let model = "phi-2.Q4_K_M.llamafile";

  executable = path.resolve(__dirname, "llamafile", executable);
  model = path.resolve(__dirname, "llamafile", model);

  // ensure it's executable
  await fs.chmod(executable, 0o755);

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
