// Images go into a deck byte for byte, and cameras, phones and editors store
// more than pixels: GPS position, device, author, capture time, the path of
// the file on the author's machine. cleanImage keeps what the picture needs to
// display (pixels, colour profile, JPEG orientation) and drops the rest.
// PNG, JPEG, WebP and SVG are cleaned; other formats pass through unchanged.
// A copy of tools/deck/src/clean-image.js; keep the two the same.

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_DROP = new Set(['tEXt', 'iTXt', 'zTXt', 'eXIf', 'tIME']);

function cleanPng(buf) {
  const out = [buf.subarray(0, 8)];
  for (let i = 8; i + 12 <= buf.length;) {
    const len = buf.readUInt32BE(i), type = buf.toString('latin1', i + 4, i + 8), end = i + 12 + len;
    if (end > buf.length) return buf;                         // damaged: leave it to the viewer
    if (!PNG_DROP.has(type)) out.push(buf.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return Buffer.concat(out);
}

// EXIF orientation (tag 0x0112) of a JPEG APP1 segment body, or 1.
function exifOrientation(seg) {
  if (seg.toString('latin1', 0, 6) !== 'Exif\0\0') return 1;
  const t = seg.subarray(6);
  if (t.length < 8) return 1;
  const le = t.toString('latin1', 0, 2) === 'II';
  const u16 = o => (le ? t.readUInt16LE(o) : t.readUInt16BE(o));
  const u32 = o => (le ? t.readUInt32LE(o) : t.readUInt32BE(o));
  const ifd = u32(4);
  if (ifd + 2 > t.length) return 1;
  for (let k = 0, n = u16(ifd); k < n; k++) {
    const e = ifd + 2 + k * 12;
    if (e + 12 > t.length) break;
    if (u16(e) === 0x0112) return u16(e + 8);
  }
  return 1;
}

// An APP1 segment that holds only the orientation.
function orientationApp1(o) {
  const body = Buffer.from([
    0x45, 0x78, 0x69, 0x66, 0, 0,                             // "Exif\0\0"
    0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8,                          // big-endian TIFF, IFD at 8
    0, 1,                                                     // one entry
    0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, o, 0, 0,                 // Orientation, SHORT, 1, o
    0, 0, 0, 0,                                               // no next IFD
  ]);
  const head = Buffer.from([0xff, 0xe1, 0, 0]);
  head.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([head, body]);
}

// APP0 (JFIF), APP2 (ICC profile) and APP14 (Adobe colour transform) change how
// the picture looks; APP1 (EXIF, XMP), APP13 (IPTC) and comments do not.
const JPEG_KEEP_APP = new Set([0xe0, 0xe2, 0xee]);

function cleanJpeg(buf) {
  const out = [buf.subarray(0, 2)];
  let orientation = 1, i = 2;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff) return buf;
    const marker = buf[i + 1];
    if (marker === 0xda) break;                               // start of scan: image data follows
    if (marker >= 0xd0 && marker <= 0xd7 || marker === 0x01) { out.push(buf.subarray(i, i + 2)); i += 2; continue; }
    const end = i + 2 + buf.readUInt16BE(i + 2);
    if (end > buf.length) return buf;
    const seg = buf.subarray(i, end);
    const isApp = marker >= 0xe0 && marker <= 0xef;
    if (marker === 0xe1) orientation = Math.max(orientation, exifOrientation(seg.subarray(4)));
    if (marker === 0xfe || (isApp && !JPEG_KEEP_APP.has(marker))) { i = end; continue; }
    out.push(seg);
    i = end;
  }
  if (orientation > 1 && orientation <= 8) out.splice(1, 0, orientationApp1(orientation));
  out.push(buf.subarray(i));
  return Buffer.concat(out);
}

function cleanWebp(buf) {
  if (buf.length < 12) return buf;
  const out = [];
  for (let i = 12; i + 8 <= buf.length;) {
    const type = buf.toString('latin1', i, i + 4), len = buf.readUInt32LE(i + 4);
    const end = i + 8 + len + (len & 1);
    if (end > buf.length) return buf;
    if (type !== 'EXIF' && type !== 'XMP ') out.push(Buffer.from(buf.subarray(i, end)));
    i = end;
  }
  const vp8x = out.find(c => c.toString('latin1', 0, 4) === 'VP8X');
  if (vp8x) vp8x[8] &= ~0x0c;                                 // clear the EXIF and XMP flags
  const body = Buffer.concat(out);
  const head = Buffer.from(buf.subarray(0, 12));
  head.writeUInt32LE(body.length + 4, 4);
  return Buffer.concat([head, body]);
}

function cleanSvg(buf) {
  const svg = buf.toString('utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<metadata\b[\s\S]*?<\/metadata>/gi, '')
    .replace(/<sodipodi:namedview\b[\s\S]*?(?:\/>|<\/sodipodi:namedview>)/gi, '')
    .replace(/\s(?:sodipodi|inkscape):[\w.-]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
  return Buffer.from(svg, 'utf8');
}

export function cleanImage(buf, mime) {
  if (mime === 'image/png' && buf.subarray(0, 8).equals(PNG_SIG)) return cleanPng(buf);
  if (mime === 'image/jpeg' && buf[0] === 0xff && buf[1] === 0xd8) return cleanJpeg(buf);
  if (mime === 'image/webp' && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return cleanWebp(buf);
  if (mime === 'image/svg+xml') return cleanSvg(buf);
  return buf;
}
