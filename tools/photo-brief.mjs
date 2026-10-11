/**
 * Photo shot list and status: which slots in src/config/photo-slots.ts have a
 * file in src/assets/photos/ and which still show a placeholder.
 *
 *   npm run photos:status                 print the list
 *   npm run photos:status -- --write      also rewrite docs/photo-brief.md
 *
 * The config is TypeScript, so it is bundled in memory with esbuild (installed
 * with Astro) and imported from a data: URL. No extra dependency.
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const CONFIG = 'src/config/photo-slots.ts';
const PHOTOS = 'src/assets/photos';
const DOC = 'docs/photo-brief.md';
/** Same extensions as src/core/photos.ts (lower case only, like its glob). */
const EXTENSIONS = /\.(jpg|jpeg|png|webp|avif)$/;

async function loadSlots() {
  const out = await build({
    entryPoints: [root + CONFIG],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  const code = out.outputFiles[0].text;
  const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  return mod.photoSlots;
}

function photoFiles() {
  const dir = root + PHOTOS;
  return existsSync(dir) ? readdirSync(dir).filter((f) => !f.startsWith('.')).sort() : [];
}

const stem = (file) => file.replace(/\.[^.]+$/, '');

function status(slots, files) {
  const usable = files.filter((f) => EXTENSIONS.test(f));
  const rows = Object.entries(slots).map(([slot, s]) => ({ slot, ...s, files: usable.filter((f) => stem(f) === slot) }));
  const unmatched = files.filter((f) => !EXTENSIONS.test(f) || !(stem(f) in slots));
  return { rows, unmatched };
}

function printStatus({ rows, unmatched }) {
  const filled = rows.filter((r) => r.files.length).length;
  const lines = [`Photo slots: ${filled} of ${rows.length} filled (${PHOTOS}/)`, ''];
  for (const r of rows) {
    lines.push(`${r.files.length ? '✓' : '✗'} ${r.slot} (${r.orientation})${r.files.length ? `: ${r.files.join(', ')}` : ''}`);
    lines.push(`    Alt:    ${r.alt}`, `    Brief:  ${r.brief}`, `    Search: ${r.search}`, '');
  }
  if (unmatched.length) {
    lines.push('Files that match no slot (check the name and a lower-case .jpg/.jpeg/.png/.webp/.avif extension):');
    for (const f of unmatched) lines.push(`    ${f}`);
    lines.push('');
  }
  console.log(lines.join('\n'));
}

function markdown({ rows }) {
  const filled = rows.filter((r) => r.files.length).length;
  return [
    '# Photo brief',
    '',
    `Generated from \`${CONFIG}\` by \`npm run photos:status -- --write\`. Edit the config, not this file, then run the command again.`,
    '',
    `To fill a slot, save the photo as \`${PHOTOS}/<slot>.jpg\` (or \`.jpeg\`, \`.png\`, \`.webp\`, \`.avif\`, lower case). A slot without a file shows a labelled placeholder. The build makes AVIF and WebP copies at several widths, so supply the largest good original you have (at least 1600px on the long side).`,
    '',
    'Rules for every photo:',
    '',
    '- Show rooms and results: finished, tidy spaces in daylight. "Before" pictures show an ordinary lived-in week, never filth.',
    '- People, demo site: generated illustrations only (cleaners working or arriving, and one founder portrait in `founder`), in plain clothing with no logo. The page marks each one "Sample photo". Never a face on a review, never a child, never a real or recognisable person.',
    '- People, live client: replace every picture of a person with a real photograph of the client\'s own people, with their permission, before going live.',
    '- Demo photos must be licence-free or generated for this site. Record each one in [`photo-credits.md`](photo-credits.md).',
    '',
    `## Status: ${filled} of ${rows.length} filled`,
    '',
    '| Slot | Orientation | File |',
    '|---|---|---|',
    ...rows.map((r) => `| \`${r.slot}\` | ${r.orientation} | ${r.files.length ? r.files.map((f) => `\`${f}\``).join(', ') : 'missing'} |`),
    '',
    '## Shot list',
    '',
    ...rows.flatMap((r) => [
      `### \`${r.slot}\``,
      '',
      `- Orientation: ${r.orientation}`,
      `- Alt text: ${r.alt}`,
      `- Brief: ${r.brief}`,
      `- Search terms: ${r.search}`,
      '',
    ]),
  ].join('\n');
}

const result = status(await loadSlots(), photoFiles());
printStatus(result);
if (process.argv.includes('--write')) {
  writeFileSync(root + DOC, markdown(result));
  console.log(`Wrote ${DOC}`);
}
