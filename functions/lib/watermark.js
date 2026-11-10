"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.watermarkedPipeline = watermarkedPipeline;
const sharp_1 = __importDefault(require("sharp"));
const watermarkTile_1 = require("./watermarkTile");
const WATERMARK_TILE = Buffer.from(watermarkTile_1.WATERMARK_TILE_PNG_BASE64, "base64");
/**
 * Redimensiona o master para `width` e aplica a marca de água em mosaico
 * (MOMENTOS.WORK na diagonal). O mosaico escala com a largura da imagem
 * para a marca ter sempre um tamanho relativo parecido.
 */
async function watermarkedPipeline(masterBuffer, width) {
    const resized = await (0, sharp_1.default)(masterBuffer)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .toBuffer({ resolveWithObject: true });
    const tileWidth = Math.round(Math.max(resized.info.width * 0.7, 420));
    const tile = await (0, sharp_1.default)(WATERMARK_TILE).resize({ width: tileWidth }).toBuffer();
    // Sem recomprimir: o resultado fica em pixels "raw" e só é codificado uma
    // vez (jpg/webp/avif) por quem chama.
    const composed = await (0, sharp_1.default)(resized.data)
        .composite([{ input: tile, tile: true }])
        .raw()
        .toBuffer({ resolveWithObject: true });
    return (0, sharp_1.default)(composed.data, {
        raw: {
            width: composed.info.width,
            height: composed.info.height,
            channels: composed.info.channels,
        },
    });
}
