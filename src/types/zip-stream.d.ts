declare module "zip-stream" {
  import { Readable } from "node:stream";

  export interface ZipStreamOptions {
    store?: boolean;
    zlib?: { level?: number };
  }

  export interface ZipStreamEntryOptions {
    name: string;
    date?: Date;
    store?: boolean;
  }

  export default class ZipStream extends Readable {
    constructor(options?: ZipStreamOptions);
    entry(
      source: NodeJS.ReadableStream | Buffer | string,
      opts: ZipStreamEntryOptions,
      cb: (err?: Error | null) => void
    ): void;
    finalize(): void;
    destroy(error?: Error): void;
  }
}
