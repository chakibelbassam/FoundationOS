import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(dir, '09-triage-guide.md');
const htmlPath = path.join(dir, 'triage-guide.print.html');
const pdfPath = path.join(dir, 'Triage-Guide-v0.3.pdf');
const md = fs.readFileSync(source, 'utf8').replace(/\r\n/g, '\n');

const esc = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function inline(text) {
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[\s(])\*([A-Za-z][^*\n]*?)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

const lines = md.split('\n');
const body = [];
let i = 0;
let firstHeading = true;

function isTableStart(index) {
  return lines[index]?.startsWith('|') &&
    /^\|[\s:|-]+\|$/.test((lines[index + 1] || '').trim());
}

function cells(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

while (i < lines.length) {
  const line = lines[i];

  if (!line.trim()) { i++; continue; }

  if (line.startsWith('```')) {
    const lang = line.slice(3).trim();
    i++;
    const code = [];
    while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
    i++;
    body.push(`<pre class="code ${esc(lang)}"><code>${esc(code.join('\n'))}</code></pre>`);
    continue;
  }

  if (isTableStart(i)) {
    const head = cells(lines[i]);
    i += 2;
    const rows = [];
    while (i < lines.length && lines[i].startsWith('|')) { rows.push(cells(lines[i])); i++; }
    body.push('<table><thead><tr>' + head.map((h) => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>' +
      rows.map((r) => '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
      '</tbody></table>');
    continue;
  }

  const heading = /^(#{1,4})\s+(.*)$/.exec(line);
  if (heading) {
    const level = heading[1].length;
    const text = heading[2];
    if (level === 1 && firstHeading) {
      firstHeading = false;
      body.push(`<header class="cover"><div class="kicker">FoundationOS · work organization</div><h1>${inline(text.replace(/\s*\(source for the PDF\)\s*/i, ''))}</h1><div class="meta">Generated from <code>09-triage-guide.md</code> · 25 November 2026 · <strong>DRAFT</strong></div></header>`);
    } else {
      body.push(`<h${level}>${inline(text)}</h${level}>`);
    }
    i++;
    continue;
  }

  if (/^---+\s*$/.test(line)) { body.push('<hr>'); i++; continue; }

  if (line.startsWith('> ')) {
    const quote = [];
    while (i < lines.length && lines[i].startsWith('> ')) { quote.push(lines[i].slice(2)); i++; }
    body.push(`<blockquote>${inline(quote.join(' '))}</blockquote>`);
    continue;
  }

  if (/^\s*[-*]\s+/.test(line)) {
    const items = [];
    while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
      let item = lines[i].replace(/^\s*[-*]\s+/, '');
      let cls = '';
      if (/^\[ \]\s+/.test(item)) { cls = ' class="check"'; item = '☐ ' + item.replace(/^\[ \]\s+/, ''); }
      else if (/^\[x\]\s+/i.test(item)) { cls = ' class="check"'; item = '☑ ' + item.replace(/^\[x\]\s+/i, ''); }
      items.push(`<li${cls}>${inline(item)}</li>`);
      i++;
    }
    body.push('<ul>' + items.join('') + '</ul>');
    continue;
  }

  if (/^\s*\d+\.\s+/.test(line)) {
    const items = [];
    while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
      items.push(`<li>${inline(lines[i].replace(/^\s*\d+\.\s+/, ''))}</li>`);
      i++;
    }
    body.push('<ol>' + items.join('') + '</ol>');
    continue;
  }

  const para = [];
  while (i < lines.length && lines[i].trim() &&
    !/^(#{1,4})\s+/.test(lines[i]) &&
    !lines[i].startsWith('|') &&
    !lines[i].startsWith('```') &&
    !/^---+\s*$/.test(lines[i]) &&
    !lines[i].startsWith('> ') &&
    !/^\s*[-*]\s+/.test(lines[i]) &&
    !/^\s*\d+\.\s+/.test(lines[i])) {
    para.push(lines[i].trim());
    i++;
  }
  body.push(`<p>${inline(para.join(' '))}</p>`);
}

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>FoundationOS Triage Guide v0.3</title>
<style>
  @page { size: A4; margin: 17mm 15mm 18mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; font-size: 10.2pt; line-height: 1.45; color: #1b1b1b; margin: 0; }
  .cover { padding-top: 34mm; padding-bottom: 10mm; border-bottom: 2px solid #1b1b1b; margin-bottom: 8mm; }
  .kicker { font-size: 9pt; letter-spacing: .14em; text-transform: uppercase; color: #666; margin-bottom: 6mm; }
  .cover h1 { font-size: 27pt; line-height: 1.1; margin: 0 0 6mm; page-break-before: avoid; }
  .meta { font-size: 9pt; color: #555; }
  h1 { font-size: 20pt; line-height: 1.15; margin: 10mm 0 3mm; page-break-after: avoid; }
  h2 { font-size: 15pt; margin: 9mm 0 3mm; padding-bottom: 1.5mm; border-bottom: 1px solid #d0d0d0; page-break-after: avoid; }
  h3 { font-size: 12pt; margin: 7mm 0 2mm; page-break-after: avoid; }
  h4 { font-size: 10.5pt; margin: 5mm 0 1.5mm; page-break-after: avoid; }
  p { margin: 0 0 2.4mm; }
  ul, ol { margin: 0 0 2.6mm; padding-left: 5.5mm; }
  li { margin: 0 0 1.1mm; }
  li.check { list-style: none; margin-left: -4mm; }
  strong { color: #000; }
  code { font-family: "Cascadia Mono", Consolas, monospace; font-size: 8.8pt; background: #f2f2f2; padding: .2mm 1mm; border-radius: 1.5mm; }
  pre.code { background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 2mm; padding: 3mm; font-size: 8.6pt; line-height: 1.35; white-space: pre-wrap; page-break-inside: avoid; }
  pre.code code { background: none; padding: 0; }
  blockquote { margin: 3mm 0; padding: 2mm 4mm; border-left: 3px solid #bdbdbd; color: #444; page-break-inside: avoid; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9.2pt; page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th { text-align: left; background: #efefef; border: 1px solid #cfcfcf; padding: 1.8mm 2mm; font-size: 8.8pt; }
  td { border: 1px solid #d8d8d8; padding: 1.8mm 2mm; vertical-align: top; }
  hr { border: 0; border-top: 1px solid #d8d8d8; margin: 6mm 0; }
  a { color: #0b57d0; text-decoration: none; }
  @media print { a { color: #1b1b1b; } }
</style></head><body>
${body.join('\n')}
</body></html>`;

fs.writeFileSync(htmlPath, html, 'utf8');

const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
];
const chrome = chromeCandidates.find((p) => p && fs.existsSync(p));
if (!chrome) { console.error('Chrome not found'); process.exit(1); }

const profile = path.join(process.env.TEMP || '.', 'fos-triage-chrome');
const url = 'file:///' + htmlPath.replace(/\\/g, '/').replace(/ /g, '%20');

function run(flag) {
  return spawnSync(chrome, [
    flag,
    '--disable-gpu',
    '--no-sandbox',
    '--no-pdf-header-footer',
    '--print-to-pdf-no-header',
    '--virtual-time-budget=1500',
    `--user-data-dir=${profile}`,
    `--print-to-pdf=${pdfPath}`,
    url,
  ], { stdio: 'pipe', encoding: 'utf8', timeout: 60000 });
}

let result = run('--headless=new');
if (!fs.existsSync(pdfPath)) result = run('--headless');
if (!fs.existsSync(pdfPath)) {
  console.error('PDF was not created.');
  console.error(result?.stderr || '');
  process.exit(1);
}
const size = fs.statSync(pdfPath).size;
console.log(`Wrote ${pdfPath} (${(size / 1024).toFixed(1)} KiB)`);
