/**
 * Marca de água ÚNICA do site (MOMENTOS.WORK em mosaico na diagonal).
 *
 * É a única implementação usada em todo o lado:
 *  - Next.js (server): previews das sessões privadas, destaques, trail,
 *    capas de eventos e de categorias  → importa daqui.
 *  - Cloud Functions: variantes do portfólio e das fotos de eventos → usa a
 *    cópia sincronizada em functions/src/shared/watermark/ (gerada por
 *    `npm run sync-shared` dentro de functions/; um teste garante que as
 *    cópias são iguais).
 *
 * Não importa o `sharp` diretamente (recebe-o como argumento) para o mesmo
 * ficheiro funcionar nos dois pacotes, cada um com o seu node_modules.
 */
import type { Sharp, SharpOptions } from "sharp";
import { WATERMARK_TILE_PNG_BASE64 } from "./tile";

export type SharpFactory = (input?: Buffer, options?: SharpOptions) => Sharp;

/** Largura máxima de qualquer imagem pública (nunca o master original). */
export const PUBLIC_MAX_WIDTH = 1600;
/** Qualidade JPEG das imagens públicas com marca de água. */
export const PUBLIC_JPEG_QUALITY = 82;

const WATERMARK_TILE = Buffer.from(WATERMARK_TILE_PNG_BASE64, "base64");

/**
 * Redimensiona `input` para no máximo `width` px de largura (respeitando a
 * orientação EXIF) e aplica a marca de água em mosaico. Devolve um pipeline
 * sharp em pixels "raw", pronto a codificar uma única vez
 * (`.jpeg()`, `.webp()`, `.avif()`...).
 */
export async function watermarkedPipeline(
  sharp: SharpFactory,
  input: Buffer,
  width: number = PUBLIC_MAX_WIDTH,
): Promise<Sharp> {
  const resized = await sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  // O mosaico escala com a imagem para a marca ter um tamanho relativo estável.
  const tileWidth = Math.round(Math.max(resized.info.width * 0.7, 420));
  const tile = await sharp(WATERMARK_TILE).resize({ width: tileWidth }).toBuffer();
  const composed = await sharp(resized.data, {
    raw: {
      width: resized.info.width,
      height: resized.info.height,
      channels: resized.info.channels,
    },
  })
    .composite([{ input: tile, tile: true }])
    .raw()
    .toBuffer({ resolveWithObject: true });
  return sharp(composed.data, {
    raw: {
      width: composed.info.width,
      height: composed.info.height,
      channels: composed.info.channels,
    },
  });
}

/** Atalho: JPEG com marca de água (usado em tudo o que não precisa de webp/avif). */
export async function watermarkedJpeg(
  sharp: SharpFactory,
  input: Buffer,
  width: number = PUBLIC_MAX_WIDTH,
  quality: number = PUBLIC_JPEG_QUALITY,
): Promise<Buffer> {
  const pipeline = await watermarkedPipeline(sharp, input, width);
  return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
}
