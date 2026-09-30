// 앱 아이콘 생성: node scripts/make-icons.mjs
// 워드마크와 같은 모양(미색 원 안의 오렌지 점)을 어두운 바탕에 그린다.
import sharp from "sharp";

const svg = (size, { maskable = false } = {}) => {
  // 마스커블 아이콘은 안전 영역(가운데 80%) 안에 그림을 넣는다.
  const scale = maskable ? 0.62 : 0.78;
  const r = (size * scale) / 2;
  const c = size / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="100%" height="100%" fill="#0e0d0c"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#ece8e1" stroke-width="${size * 0.022}"/>
  <circle cx="${c}" cy="${c}" r="${r * 0.46}" fill="#ff5a1f"/>
</svg>`);
};

const out = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/maskable-512.png", 512, { maskable: true }],
  ["public/icons/apple-touch-icon.png", 180],
  ["src/app/icon.png", 64],
];
for (const [file, size, opts] of out) {
  await sharp(svg(size, opts)).png().toFile(file);
  console.log("✓", file);
}
