// Gera functions/src/watermarkTile.ts. Uso: cd functions && node ../scripts/generate-watermark-tile.js
const path = require('path');
const fs = require('fs');
const sharp = require(path.join(process.cwd(), 'node_modules/sharp'));
(async () => {
  const W = 960, H = 560, label = 'MOMENTOS.WORK';
  const txt = (x, y) => `<g transform="rotate(-28 ${x} ${y})">
    <text x="${x}" y="${y}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-weight="700" font-size="44" letter-spacing="6" fill="#000" fill-opacity="0.18" dx="2" dy="2">${label}</text>
    <text x="${x}" y="${y}" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-weight="700" font-size="44" letter-spacing="6" fill="#fff" fill-opacity="0.30">${label}</text></g>`;
  // 2 linhas desfasadas para o padrão ficar contínuo quando em mosaico
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${txt(W*0.25, H*0.3)}${txt(W*0.75, H*0.8)}</svg>`;
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  const out = path.join(process.cwd(), 'src/watermarkTile.ts');
  fs.writeFileSync(out, `// Gerado por scripts/generate-watermark-tile.js — NÃO editar à mão.
// PNG transparente (${W}x${H}) com "${label}" na diagonal, usado em
// mosaico por cima das variantes públicas. Vem pré-renderizado porque o
// runtime das Cloud Functions não garante fontes para renderizar SVG <text>.
export const WATERMARK_TILE_PNG_BASE64 =
  "${png.toString('base64')}";
`);
  console.log('escrito', out, png.length, 'bytes');
})();
