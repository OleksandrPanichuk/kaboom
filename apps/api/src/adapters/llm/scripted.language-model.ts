import {
  LanguageModel,
  type LlmEvent,
  type LlmRequest,
} from "@/platform/llm/ports/language-model";

export type ScriptStep = LlmEvent | { type: "wait"; ms: number };

export type Script = ScriptStep[] | ((request: LlmRequest) => ScriptStep[]);

const wait = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) return resolve();

    const timer = setTimeout(done, ms);

    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }

    signal.addEventListener("abort", done, { once: true });
  });

export class ScriptedLanguageModel extends LanguageModel {
  public readonly requests: LlmRequest[] = [];

  private readonly scripts: Script[] = [];

  public enqueue(...scripts: Script[]): void {
    this.scripts.push(...scripts);
  }

  public pending(): number {
    return this.scripts.length;
  }

  public reset(): void {
    this.scripts.length = 0;
    this.requests.length = 0;
  }

  public async *stream(request: LlmRequest): AsyncIterable<LlmEvent> {
    this.requests.push({
      ...request,
      system: structuredClone(request.system),
      messages: structuredClone(request.messages),
      tools: structuredClone(request.tools),
    });

    const script = this.scripts.shift() ?? [];
    const steps = typeof script === "function" ? script(request) : script;
    let stopped = false;

    for (const step of steps) {
      if (request.signal.aborted) break;

      if (step.type === "wait") {
        await wait(step.ms, request.signal);
        continue;
      }

      stopped ||= step.type === "stop";
      yield step;

      if (stopped) return;
    }

    yield {
      type: "stop",
      reason: request.signal.aborted ? "aborted" : "end",
    };
  }
}
