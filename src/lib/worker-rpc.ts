// Tiny request/response protocol over postMessage, with progress events.

type Message =
  | { id: number; type: "progress"; progress: number }
  | { id: number; type: "done"; result: unknown }
  | { id: number; type: "error"; message: string };

interface Request {
  id: number;
  method: string;
  args: unknown;
}

export type Handler = (
  args: never,
  onProgress: (progress: number) => void,
) => Promise<{ result: unknown; transfer?: Transferable[] }>;

/** Worker side: answers calls with the given handlers. */
export function exposeHandlers(handlers: Record<string, Handler>) {
  const post = (msg: Message, transfer: Transferable[] = []) => self.postMessage(msg, { transfer });
  self.onmessage = async (event: MessageEvent<Request>) => {
    const { id, method, args } = event.data;
    try {
      const handler = handlers[method];
      if (!handler) throw new Error(`Unknown method ${method}`);
      const { result, transfer } = await handler(args as never, (progress) =>
        post({ id, type: "progress", progress }),
      );
      post({ id, type: "done", result }, transfer);
    } catch (error) {
      post({ id, type: "error", message: error instanceof Error ? error.message : String(error) });
    }
  };
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

/** Main-thread side: a lazily started worker that can be called like an async function. */
export function createWorkerClient(start: () => Worker) {
  let worker: Worker | null = null;
  let nextId = 1;
  const pending = new Map<number, Pending>();

  function get() {
    if (worker) return worker;
    worker = start();
    worker.onmessage = (event: MessageEvent<Message>) => {
      const msg = event.data;
      const call = pending.get(msg.id);
      if (!call) return;
      if (msg.type === "progress") return call.onProgress?.(msg.progress);
      pending.delete(msg.id);
      if (msg.type === "done") call.resolve(msg.result);
      else call.reject(new Error(msg.message));
    };
    worker.onerror = (event) => {
      for (const call of pending.values()) call.reject(new Error(event.message || "Worker crashed"));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  }

  return function call<T>(
    method: string,
    args: unknown,
    { transfer = [], onProgress }: { transfer?: Transferable[]; onProgress?: (p: number) => void } = {},
  ): Promise<T> {
    const id = nextId++;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress });
      get().postMessage({ id, method, args } satisfies Request, transfer);
    });
  };
}
