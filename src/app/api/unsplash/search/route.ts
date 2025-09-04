import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "wedding";
  const per_page = Number(searchParams.get("per_page") ?? "12");
  const orientation = searchParams.get("orientation") ?? "landscape";

  const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
  if (!ACCESS_KEY) {
    return NextResponse.json({ error: "Missing UNSPLASH_ACCESS_KEY" }, { status: 500 });
  }

  const url =
    `https://api.unsplash.com/search/photos` +
    `?query=${encodeURIComponent(q)}` +
    `&per_page=${per_page}` +
    `&orientation=${encodeURIComponent(orientation)}`;

  const resp = await fetch(url, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
    // podes ajustar caching conforme precisares:
    // cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json({ error: "Unsplash error", details: text }, { status: resp.status });
  }

  const data = await resp.json();

  // Resumo “safe” para o cliente
  const results = (data.results ?? []).map((p: any) => ({
    id: p.id,
    alt: p.alt_description || p.description || q,
    urls: {
      thumb: p.urls.thumb,
      small: p.urls.small,
      regular: p.urls.regular,
      full: p.urls.full,
    },
    user: {
      name: p.user?.name,
      username: p.user?.username,
    },
    links: {
      html: p.links?.html, // página da foto no Unsplash (para atribuição)
      download_location: p.links?.download_location, // para registar download
    },
  }));

  return NextResponse.json({ results });
}
