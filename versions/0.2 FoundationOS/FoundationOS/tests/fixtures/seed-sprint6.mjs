// Sprint-6 fixture: nested Weather folders in different parents plus a root namesake.
// Usage: FOUNDATIONOS_SESSION=<member token> node seed-sprint6.mjs --server http://127.0.0.1:<port> [--member alice|blair]
// Create the base homes first with seed.mjs, then run this against one member at a time.
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    server: { type: 'string' },
    member: { type: 'string', default: 'alice' },
  },
});
const server = values.server || process.env.FOUNDATIONOS_SERVER;
const token = process.env.FOUNDATIONOS_SESSION;
if (!server || !token) {
  console.error('Set --server (or FOUNDATIONOS_SERVER) and FOUNDATIONOS_SESSION.');
  process.exit(2);
}
const base = server.replace(/\/+$/, '');

async function call(method, path, body, type) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(type ? { 'content-type': type } : {}),
    },
    body: body === undefined ? undefined : type === 'application/json' ? JSON.stringify(body) : body,
  });
  if (response.status === 409) return { status: 409 };
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${method} ${path} -> ${response.status} ${text}`);
  }
  return response.json().catch(() => ({}));
}

const folders = [
  'Projects',
  'Projects/Weather',
  'Archive',
  'Archive/Weather',
  'Notes',
  ...(values.member === 'blair' ? ['Journal/Weather'] : []),
];
for (const path of folders) await call('POST', '/folder', { path }, 'application/json');

const files = [
  [
    'Projects/Weather/app.json',
    JSON.stringify({ name: 'Weather Lab', brief: 'The project Weather build with experiments and notes.' }),
  ],
  ['Projects/Weather/README.md', 'Weather Lab\n\nThis is the nested weather project. It must be recognised separately from the root Weather app.\nWeather Lab 0.2'],
  ['Projects/Weather/experiment.txt', 'A nested file used to prove the explorer and reader work two levels down.'],
  [
    'Archive/Weather/app.json',
    JSON.stringify({ name: 'Weather Archive', brief: 'Old forecasts kept for reference.' }),
  ],
  ['Archive/Weather/README.md', 'Weather Archive\n\nArchived forecasts, kept out of the active project.\nWeather Archive 0.2'],
  ['Notes/readme.txt', 'Notes used as a second pinned project candidate for the Bento Projects tile.'],
];
if (values.member === 'blair') {
  files.push(['Journal/Weather/app.json', JSON.stringify({ name: 'Desk weather', brief: 'Blair desk weather for the journal.' })]);
  files.push(['Journal/Weather/README.md', "Blair's desk weather notes.\nDesk weather 0.2"]);
}
for (const [path, text] of files) await call('PUT', `/files/${path}`, text, 'text/plain');

console.log(`Seeded Sprint-6 fixtures for ${values.member}: ${folders.length} folders, ${files.length} files.`);
