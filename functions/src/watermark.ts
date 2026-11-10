import sharp from "sharp";
import { WATERMARK_TILE_PNG_BASE64 } from "./watermarkTile";

const WATERMARK_TILE = Buffer.from(WATERMARK_TILE_PNG_BASE64, "base64");

/**
 * Redimensiona o master para `width` e aplica a marca de água em mosaico
 * (MOMENTOS.WORK na diagonal). O mosaico escala com a largura da imagem
 * para a marca ter sempre um tamanho relativo parecido.
 */
export async function watermarkedPipeline(masterBuffer: Buffer, width: number) {
  const resized = await sharp(masterBuffer)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .toBuffer({ resolveWithObject: true });
  const tileWidth = Math.round(Math.max(resized.info.width * 0.7, 420));
  const tile = await sharp(WATERMARK_TILE).resize({ width: tileWidth }).toBuffer();
  // Sem recomprimir: o resultado fica em pixels "raw" e só é codificado uma
  // vez (jpg/webp/avif) por quem chama.
  const composed = await sharp(resized.data)
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
