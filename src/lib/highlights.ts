export type Highlight = {
  id: string;
  title: string;
  imageUrl: string;
  height: number;
  createdAt: number;
  order?: number | null;
  description?: string | null;
};

export async function fetchHighlights(): Promise<Highlight[]> {
  const res = await fetch("/api/highlights/list", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const data = await res.json();
  return Array.isArray(data.items) ? (data.items as Highlight[]) : [];
}
