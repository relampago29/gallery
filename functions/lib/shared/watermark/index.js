"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_JPEG_QUALITY = exports.PUBLIC_MAX_WIDTH = void 0;
exports.watermarkedPipeline = watermarkedPipeline;
exports.watermarkedJpeg = watermarkedJpeg;
const tile_1 = require("./tile");
/** Largura máxima de qualquer imagem pública (nunca o master original). */
exports.PUBLIC_MAX_WIDTH = 1600;
/** Qualidade JPEG das imagens públicas com marca de água. */
exports.PUBLIC_JPEG_QUALITY = 82;
const WATERMARK_TILE = Buffer.from(tile_1.WATERMARK_TILE_PNG_BASE64, "base64");
/**
 * Redimensiona `input` para no máximo `width` px de largura (respeitando a
 * orientação EXIF) e aplica a marca de água em mosaico. Devolve um pipeline
 * sharp em pixels "raw", pronto a codificar uma única vez
 * (`.jpeg()`, `.webp()`, `.avif()`...).
 */
async function watermarkedPipeline(sharp, input, width = exports.PUBLIC_MAX_WIDTH) {
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
async function watermarkedJpeg(sharp, input, width = exports.PUBLIC_MAX_WIDTH, quality = exports.PUBLIC_JPEG_QUALITY) {
    const pipeline = await watermarkedPipeline(sharp, input, width);
    return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
}
