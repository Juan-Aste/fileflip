// Typings for the ESM wasm bundle of libheif-js (the package only types the CJS build).
declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
  interface DisplayTarget {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }
  export interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(target: DisplayTarget, callback: (result: DisplayTarget | null) => void): void;
    free(): void;
  }
  export interface LibHeif {
    HeifDecoder: new () => { decode(buffer: ArrayBuffer | Uint8Array): HeifImage[] };
  }
  export default function factory(options?: object): LibHeif;
}
