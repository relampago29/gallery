// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { watermarkedJpeg, PUBLIC_MAX_WIDTH } from "./index";

const root = resolve(__dirname, "../../..");

describe("marca de água única", () => {
  it("a cópia das Cloud Functions é igual à original (corre `npm run sync-shared` em functions/)", () => {
    for (const file of ["index.ts", "tile.ts"]) {
      const original = readFileSync(resolve(root, "src/lib/watermark", file), "utf8");
      const copy = readFileSync(resolve(root, "functions/src/shared/watermark", file), "utf8");
      expect(copy.replace(/^\/\/ ⚠️ CÓPIA GERADA[^\n]*\n/, "")).toBe(original);
    }
  });

  it("redimensiona e altera os pixels (marca aplicada)", async () => {
    const input = await sharp({
      create: { width: 2400, height: 1600, channels: 3, background: { r: 40, g: 40, b: 40 } },
    })
      .jpeg()
      .toBuffer();
    const out = await watermarkedJpeg(sharp, input);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width).toBe(PUBLIC_MAX_WIDTH);
    const { channels } = await sharp(out).stats();
    // Imagem uniforme ganhou texto claro → o máximo sobe bem acima de 40.
    expect(channels[0].max).toBeGreaterThan(80);
  });
});
