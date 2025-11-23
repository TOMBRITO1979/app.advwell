// Script para gerar ícones do PWA
// Este script cria um SVG e gera os PNGs necessários

const fs = require('fs');
const path = require('path');

// SVG do ícone (balança da justiça)
const iconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="128" fill="#16a34a"/>
  <g transform="translate(256, 256)" stroke="white" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <!-- Balança da justiça -->
    <line x1="0" y1="-140" x2="0" y2="100" />
    <line x1="-80" y1="-80" x2="80" y2="-80" />
    <line x1="-120" y1="100" x2="120" y2="100" />

    <!-- Prato esquerdo -->
    <circle cx="-80" cy="-80" r="50" stroke-width="12" />
    <line x1="-120" y1="-80" x2="-40" y2="-80" stroke-width="8" />

    <!-- Prato direito -->
    <circle cx="80" cy="-80" r="50" stroke-width="12" />
    <line x1="40" y1="-80" x2="120" y2="-80" stroke-width="8" />

    <!-- Base -->
    <rect x="-40" y="100" width="80" height="20" fill="white" stroke="none" />
  </g>
</svg>
`;

// Salvar o SVG
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'icon.svg'), iconSvg.trim());

console.log('✓ SVG icon created');
console.log('✓ Para gerar os PNGs, use um conversor online ou imagemagick:');
console.log('  convert -background none -resize 192x192 public/icon.svg public/icon-192.png');
console.log('  convert -background none -resize 512x512 public/icon.svg public/icon-512.png');
console.log('  convert -background none -resize 32x32 public/icon.svg public/favicon.ico');
