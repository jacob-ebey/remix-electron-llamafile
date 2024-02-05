import * as cp from "node:child_process";
import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as stream from "node:stream";

function isWhitespace(str) {
  return !str || /^[\n\r\s]+$/.test(str);
}

async function streamPromptResponse(writable, userPrompt, history = []) {
  let executable = "./llamafile-0.6.2";
  // let model = "./phi-2.Q4_K_M.llamafile";
  let model = "./dolphin-2_6-phi-2.Q4_K_M-server.llamafile";
  // let model = "./codeninja-1.0-openchat-7b.Q4_K_M-server.llamafile";
  // if is windows rename the executable
  if (process.platform === "win32") {
    const newExecutable = executable + ".exe";
    await fs.rename(executable, newExecutable);
    executable = newExecutable;
  }

  // ensure it's executable
  await fs.chmod(executable, 0o755);

  const prompt = userPrompt;
  console.log({ prompt });

  console.log(`${executable} -m ${model} --silent-prompt --temp 0.4 -p `);
  // start the process
  const llamafileProcess = cp.exec(
    `${executable} -m ${model} --silent-prompt --temp 0.4 -p ` +
      '"' +
      prompt.replace(/(["$`\\])/g, "\\$1") +
      '"'
  );
  llamafileProcess.stdout.pipe(process.stdout);
  let buffer = "";
  let end = "<|im_end|>";

  llamafileProcess.stdout.on("data", (data) => {
    buffer += data;
    let potentialEndStart = buffer.lastIndexOf(end[0]);
    if (potentialEndStart === -1) {
      if (isWhitespace(buffer)) return;
      writable.write(buffer);
      buffer = "";
      return;
    }

    let potentialEnd = buffer.slice(potentialEndStart);
    if (potentialEnd === end || potentialEnd.startsWith(end)) {
      buffer = buffer.slice(0, potentialEndStart);
      if (isWhitespace(buffer)) buffer = "";
      writable.end(buffer);
      llamafileProcess.kill();
      return;
    }

    if (potentialEnd.length >= end.length) {
      if (isWhitespace(buffer)) return;
      writable.write(buffer);
      buffer = "";
      return;
    }
    buffer = buffer.slice(0, potentialEndStart);
    if (isWhitespace(buffer)) {
      buffer += potentialEnd;
    } else {
      writable.write(buffer);
      buffer = potentialEnd;
    }
  });

  llamafileProcess.once("exit", () => {
    writable.end();
  });
  writable.on("close", () => {
    llamafileProcess.kill();
  });
}

const server = http.createServer(async (req, res) => {
  try {
    // handle CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    const method = req.method;
    const body = method === "POST" ? stream.Readable.toWeb(req) : null;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v);
        }
      } else if (typeof value === "string") {
        headers.append(key, value);
      }
    }
    const request = new Request("http://localhost:8080" + (req.url || ""), {
      body,
      method,
      headers,
      duplex: "half",
    });

    const formData = await request.formData();
    const prompt = formData.get("prompt");
    res.writeHead(200);
    await streamPromptResponse(res, prompt);
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end();
  }
});

server.listen(8080, () => {
  console.log("Server is listening on port 8080");
});
