export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { bucketAdmin, getAdminDb } from "@/lib/firebase/admin";

function sanitizeSessionId(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizeFilename(input: string) {
  return input
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "") || "foto";
}

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

  const encoder = new TextEncoder();

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

async function getSessionFileEntries(sessionId: string) {
  const db = getAdminDb();
  const sessionRef = db.collection("client_sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();

  const entries: { name: string; path: string; createdAt?: number }[] = [];
  const photosSnap = await sessionRef.collection("photos").orderBy("createdAt", "asc").get();
  photosSnap.forEach((doc) => {
    const data = doc.data() || {};
    if (data.masterPath) {
      entries.push({
        name: data.title || data.alt || doc.id,
        path: data.masterPath as string,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : undefined,
      });
    }
  });

  if (!entries.length) {
    const prefix = `masters/sessions/${sessionId}/`;
    const [objects] = await bucketAdmin.getFiles({ prefix });
    objects
      .filter((f) => f.name !== prefix && !f.name.endsWith("/"))
      .forEach((file) => {
        entries.push({
          name: file.name.slice(prefix.length),
          path: file.name,
          createdAt: file.metadata?.timeCreated ? Date.parse(file.metadata.timeCreated) : undefined,
        });
      });
  }

  if (!entries.length) {
    return [];
  }

  const usedNames = new Map<string, number>();
  const buffers: ZipEntry[] = [];
  for (const entry of entries) {
    const file = bucketAdmin.file(entry.path);
    const [data] = await file.download();
    const rawName = sanitizeFilename(entry.name || entry.path.split("/").pop() || "foto");
    const ext = entry.path.includes(".") ? entry.path.split(".").pop() || "jpg" : "jpg";
    let finalName = rawName.toLowerCase().endsWith(`.${ext}`) ? rawName : `${rawName}.${ext}`;
    if (usedNames.has(finalName)) {
      const count = usedNames.get(finalName)! + 1;
      usedNames.set(finalName, count);
      const base = finalName.replace(/\.[^.]+$/, "");
      finalName = `${base}-${count}.${ext}`;
    } else {
      usedNames.set(finalName, 0);
    }
    buffers.push({
      name: finalName,
      data,
      date: entry.createdAt ? new Date(entry.createdAt) : new Date(),
    });
  }
  return buffers;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSession = searchParams.get("sessionId") || "";
    const sessionId = sanitizeSessionId(rawSession);
    if (!sessionId) {
      return NextResponse.json({ error: "invalid sessionId" }, { status: 400 });
    }

    const entries = await getSessionFileEntries(sessionId);
    if (!entries.length) {
      return NextResponse.json({ error: "sem ficheiros para esta sessão" }, { status: 404 });
    }

    const zipBuffer = buildZip(entries);
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${sessionId || "sessao"}.zip"`,
        "Content-Length": String(zipBuffer.length),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "download all failed" }, { status: 500 });
  }
}

