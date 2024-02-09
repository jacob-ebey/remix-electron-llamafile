import * as path from "node:path";

import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import {
  SimpleChatModel,
  type BaseChatModelParams,
} from "@langchain/core/language_models/chat_models";
import { AIMessageChunk, BaseMessage } from "@langchain/core/messages";
import { ChatGenerationChunk } from "@langchain/core/outputs";
import { execa } from "execa";

export interface LlamafileModelParams extends BaseChatModelParams {
  executablePath: string;
  modelPath?: string;
  temperature?: number;
  stop?: string[];
  createPrompt: (messages: BaseMessage[]) => Promise<string>;
}

export class LlamafileModel extends SimpleChatModel {
  private _debugCounter = 0;

  constructor(private params: LlamafileModelParams) {
    super(params);
  }
  _llmType(): string {
    return "llamafile";
  }
  async *_streamResponseChunks(
    _messages: BaseMessage[],
    _options: this["ParsedCallOptions"],
    _runManager?: CallbackManagerForLLMRun | undefined
  ): AsyncGenerator<ChatGenerationChunk, any, unknown> {
    if (!_messages.length) {
      throw new Error("No messages provided.");
    }
    if (_messages.some((message) => typeof message.content !== "string")) {
      throw new Error("Message content must be a string.");
    }

    // flags we want: --silent-prompt -n -2
    const args: string[] = [];
    if (this.params.modelPath) args.push("-m", this.params.modelPath);
    if (typeof this.params.temperature === "number")
      args.push("--temp", this.params.temperature.toString());

    const controller = new AbortController();
    let manuallyAborted = false;
    const abort = () => {
      _options.signal?.addEventListener("abort", abort, { once: true });
    };
    _options.signal?.addEventListener("abort", abort, { once: true });

    let debugId = this._debugCounter++;
    console.log(`Starting llamafile process ${debugId}`);
    const llamafileProcess = execa(
      this.params.executablePath,
      [
        ...args,
        "-n",
        "-2",
        "--silent-prompt",
        "-f",
        "/dev/stdin",
        // "-p",
        // (await this.params.createPrompt(_messages)).replace(" ", "\\ "),
      ],
      {
        shell: true,
        // cwd: path.dirname(this.params.executablePath),
        // localDir: path.dirname(this.params.executablePath),
        // preferLocal: true,
        signal: controller.signal,
        stdout: "pipe",
        stderr: "pipe",
        stdin: "pipe",
        stripFinalNewline: true,
      }
    );
    llamafileProcess.once("exit", (code) => {
      console.log(`Llamafile process ${debugId} exited with code ${code}`);
      _options.signal?.removeEventListener("abort", abort);
    });

    if (!llamafileProcess.stdout)
      throw new Error("No stdout on llamafile process.");
    if (!llamafileProcess.stdin)
      throw new Error("No stdin on llamafile process.");
    if (llamafileProcess.stderr) llamafileProcess.stderr.pipe(process.stderr);
    llamafileProcess.stdout.pipe(process.stdout);

    llamafileProcess.stdin.write(await this.params.createPrompt(_messages));
    llamafileProcess.stdin.end();

    let stopBuffer = "";
    const maxStopLength = Math.max(
      ...(this.params.stop || []).map((s) => s.length)
    );
    try {
      const decoder = new TextDecoder();
      let breakOut = false;
      for await (const chunk of llamafileProcess.stdout) {
        if (controller.signal.aborted) return;
        let content = decoder.decode(chunk, { stream: true });
        if (!content) continue;

        let stopIndex;
        if (this.params.stop) {
          stopBuffer += content;
          for (const stop of this.params.stop) {
            stopIndex = stopBuffer.indexOf(stop);
            if (stopIndex !== -1) {
              content = stopBuffer.slice(0, stopIndex);
              manuallyAborted = true;
              breakOut = true;
              break;
            }
          }
          if (breakOut) break;
          if (stopBuffer.length > maxStopLength) {
            stopBuffer = stopBuffer.slice(-maxStopLength);
          }
        }
        if (breakOut) break;

        yield new ChatGenerationChunk({
          message: new AIMessageChunk({
            content,
          }),
          text: content,
        });
        await _runManager?.handleLLMNewToken(content);
      }
    } catch (error) {
      if (manuallyAborted) return;
      throw error;
    }
  }
  _call(
    messages: BaseMessage[],
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun | undefined
  ): Promise<string> {
    throw new Error("Method not implemented, use streaming instead.");
  }
  _combineLLMOutput?(
    ...llmOutputs: (Record<string, any> | undefined)[]
  ): Record<string, any> | undefined {
    return {};
  }
}
