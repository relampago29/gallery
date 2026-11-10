#!/usr/bin/env node
// Copia a marca de água única (src/lib/watermark) para as Cloud Functions
// (functions/src/shared/watermark). Corre automaticamente no build das
// functions (`npm run build` / `npm run deploy` dentro de functions/).
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const from = path.join(root, "src/lib/watermark");
const to = path.join(root, "functions/src/shared/watermark");
const HEADER =
  "// ⚠️ CÓPIA GERADA de src/lib/watermark — edita lá e corre `npm run sync-shared` em functions/.\n";

fs.mkdirSync(to, { recursive: true });
for (const file of ["index.ts", "tile.ts"]) {
  const src = fs.readFileSync(path.join(from, file), "utf8");
  fs.writeFileSync(path.join(to, file), HEADER + src);
}
console.log("watermark sincronizada →", path.relative(root, to));
