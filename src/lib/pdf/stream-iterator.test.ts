import { afterEach, describe, expect, it } from "vitest";
import { polyfillReadableStreamIterator } from "./render";

type Iterable = { [Symbol.asyncIterator]?: unknown };
const proto = ReadableStream.prototype as unknown as Iterable;
const native = Object.getOwnPropertyDescriptor(proto, Symbol.asyncIterator);

afterEach(() => {
  if (native) Object.defineProperty(proto, Symbol.asyncIterator, native);
});

describe("polyfillReadableStreamIterator", () => {
  it("lets `for await` read a ReadableStream where the browser can't (Safari)", async () => {
    delete proto[Symbol.asyncIterator];
    expect(Symbol.asyncIterator in proto).toBe(false);
    polyfillReadableStreamIterator();
    const stream = new ReadableStream<number>({
      start(controller) {
        [1, 2, 3].forEach((n) => controller.enqueue(n));
        controller.close();
      },
    });
    const seen: number[] = [];
    for await (const n of stream as unknown as AsyncIterable<number>) seen.push(n);
    expect(seen).toEqual([1, 2, 3]);
    // The reader lock is released at the end.
    expect(stream.locked).toBe(false);
  });

  it("keeps the browser's own iterator", () => {
    const before = proto[Symbol.asyncIterator];
    polyfillReadableStreamIterator();
    expect(proto[Symbol.asyncIterator]).toBe(before);
  });
});
