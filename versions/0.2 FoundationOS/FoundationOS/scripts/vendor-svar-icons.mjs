// One-off: vendor SVAR vivid file icons under public/ for offline use.
// Usage: node scripts/vendor-svar-icons.mjs  (run from FoundationOS/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'public', 'icons', 'filemanager');
const NAMES = ['7z', 'rar', 'zip', 'css', 'html', 'js', 'php', 'md', 'xml', 'sql', 'aif', 'mid', 'mp3', 'waw', 'wma', 'doc', 'docx', 'txt', 'avi', 'mov', 'mp4', 'mpeg', 'mpg', 'pdf', 'xls', 'xlsx', 'gif', 'jpg', 'jpeg', 'png', 'psd', 'tiff', 'svg', 'folder', 'file', 'multiple', 'search', 'none'];
const SIZES = ['big', 'small'];

let ok = 0;
let fail = 0;
for (const size of SIZES) {
  for (const name of NAMES) {
    const url = `https://cdn.svar.dev/icons/filemanager/vivid/${size}/${name}.svg`;
    const dest = path.join(OUT, size, `${name}.svg`);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text.includes('<svg')) throw new Error('not an SVG');
      await fs.promises.mkdir(path.dirname(dest), { recursive: true });
      await fs.promises.writeFile(dest, text);
      ok += 1;
    } catch (error) {
      fail += 1;
      console.log(`FAIL ${size}/${name}: ${error.message}`);
    }
  }
}
console.log(`done: ${ok} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
