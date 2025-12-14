import ZipStream from "zip-stream";
import { Readable as NodeReadable } from "node:stream";

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function toDosDateTime(date: Date) {
  const year = date.getFullYear();
  const dosYear = year < 1980 ? 0 : year - 1980;
  const dosMonth = date.getMonth() + 1;
  const dosDay = date.getDate();
  const dosHours = date.getHours();
  const dosMinutes = date.getMinutes();
  const dosSeconds = Math.floor(date.getSeconds() / 2);
  const dosDate = (dosYear << 9) | (dosMonth << 5) | dosDay;
  const dosTime = (dosHours << 11) | (dosMinutes << 5) | dosSeconds;
  return { dosDate, dosTime };
}

type ZipEntry = {
  name: string;
  data: Buffer;
  date: Date;
};

function buildZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const crc = crc32(data);
    const { dosDate, dosTime } = toDosDateTime(entry.date);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBytes, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt16LE(0, 38);
    centralHeader.writeUInt32LE(0, 40);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + data.length;
  }

  const centralBuffer = Buffer.concat(centralParts);
  const localBuffer = Buffer.concat(localParts);

  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralBuffer.length, 12);
  endRecord.writeUInt32LE(localBuffer.length, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([localBuffer, centralBuffer, endRecord]);
}

export type ZipSource = {
  filename: string;
  data: Buffer;
  createdAt?: number | Date | null;
};

export type ZipStreamSource = {
  filename: string;
  createReadStream: () => NodeReadable;
  createdAt?: number | Date | null;
};

export function sanitizeFilename(input: string) {
  return (
    input
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^A-Za-z0-9._-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "foto"
  );
}

export function buildZipFromSources(sources: ZipSource[]) {
  const prepared: ZipEntry[] = sources.map((src) => ({
    name: src.filename,
    data: src.data,
    date: src.createdAt instanceof Date ? src.createdAt : src.createdAt ? new Date(src.createdAt) : new Date(),
  }));
  return buildZip(prepared);
}

export function buildZipStreamFromSources(sources: ZipStreamSource[]) {
  const archive = new ZipStream({ zlib: { level: 9 } });

  (async () => {
    try {
      const total = sources.length;
      let processed = 0;
      console.log("[zip] start building stream", { totalEntries: total });
      for (const src of sources) {
        const mtime =
          src.createdAt instanceof Date ? src.createdAt : src.createdAt ? new Date(src.createdAt) : new Date();
        const stream = src.createReadStream();
        await new Promise<void>((resolve, reject) => {
          stream.on("error", reject);
          archive.entry(stream, { name: src.filename, date: mtime, store: true }, (err?: Error | null) => {
            if (err) return reject(err);
            resolve();
          });
        });
        processed += 1;
        console.log("[zip] appended entry", { name: src.filename, processed, total });
      }
      console.log("[zip] finalize archive", { totalEntries: total });
      archive.finalize();
    } catch (err) {
      console.error("[zip] fatal error while building zip", err);
      archive.destroy(err as Error);
    }
  })();

  const webStream =
    typeof NodeReadable.toWeb === "function"
      ? NodeReadable.toWeb(archive as unknown as NodeReadable)
      : new ReadableStream<Uint8Array>({
          start(controller) {
            const nodeStream = archive as unknown as NodeReadable;
            nodeStream.on("data", (chunk) => controller.enqueue(chunk as Uint8Array));
            nodeStream.once("end", () => controller.close());
            nodeStream.once("error", (err) => controller.error(err));
          },
          cancel() {
            (archive as unknown as NodeReadable).destroy();
          },
        });

  return { stream: webStream, archive };
}
