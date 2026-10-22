// Tiny request/response protocol over postMessage, with progress events.
// The main-thread side is the job pool in `@/lib/jobs`.

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
