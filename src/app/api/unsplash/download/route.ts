import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const download_location = searchParams.get("download_location");
  const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

  if (!ACCESS_KEY) {
    return NextResponse.json({ error: "Missing UNSPLASH_ACCESS_KEY" }, { status: 500 });
  }
  if (!download_location) {
    return NextResponse.json({ error: "Missing download_location" }, { status: 400 });
  }

  // Chamada obrigatória pelo Unsplash para registar o download
  const resp = await fetch(download_location, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
    // cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json({ error: "Unsplash download error", details: text }, { status: resp.status });
  }

  // A resposta não é usada pelo cliente — só precisamos de registar o evento
  return NextResponse.json({ ok: true });
}
