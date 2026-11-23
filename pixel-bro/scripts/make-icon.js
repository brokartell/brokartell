// Erzeugt das App-Icon (Pixel-Art) als PNG ohne externe Abhängigkeiten.
'use strict';
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Icon von izec313, gezeichnet mit Pixel Bro (16 × 16 Pixel)
const art = [
  '................',
  '..############..',
  '.#aaaaaaaaaaaa#.',
  '.#aabbbbbbbbaa#.',
  '.#abbbbbbbbbba#.',
  '.#abbsssssbbba#.',
  '.#abssssssssba#.',
  '.#absskksskksa#.',
  '.#abkkkkkkkkka#.',
  '.#absskksskksa#.',
  '.#absssssssssa#.',
  '.#aabssmmmssaa#.',
  '.#aaabsssssaaa#.',
  '.#aaaassssaaaa#.',
  '..############..',
  '................',
];
const C = {
  '.': [0, 0, 0, 0], '#': [24, 20, 37, 255], a: [124, 92, 255, 255], b: [255, 122, 198, 255],
  s: [255, 205, 117, 255], k: [20, 20, 30, 255], m: [255, 255, 255, 255],
};
function px(x, y) {
  return C[art[y][x]];
}

function png(size, out) {
  const file = pngBuffer(size);
  if (out) fs.writeFileSync(out, file);
  return file;
}

function pngBuffer(size) {
  const scale = size / 16;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const c = px(Math.floor(x / scale), Math.floor(y / scale));
      raw.set(c, y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const file = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
  return file;
}

// ICO-Datei mit eingebetteten PNGs (Windows Vista+)
function ico(sizes, out) {
  const imgs = sizes.map((s) => pngBuffer(s));
  const header = Buffer.alloc(6 + 16 * imgs.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(imgs.length, 4);
  let offset = header.length;
  imgs.forEach((img, i) => {
    const e = 6 + i * 16, s = sizes[i];
    header[e] = s >= 256 ? 0 : s; header[e + 1] = s >= 256 ? 0 : s;
    header[e + 2] = 0; header[e + 3] = 0;
    header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(img.length, e + 8); header.writeUInt32LE(offset, e + 12);
    offset += img.length;
  });
  fs.writeFileSync(out, Buffer.concat([header, ...imgs]));
}

const root = path.join(__dirname, '..');
png(256, path.join(root, 'src', 'icon.png'));
png(512, path.join(root, 'build', 'icon.png'));
ico([16, 24, 32, 48, 64, 128, 256], path.join(root, 'build', 'icon.ico'));
console.log('Icons erzeugt.');
