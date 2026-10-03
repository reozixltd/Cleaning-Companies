/**
 * Runs every tests/e2e/*.e2e.mjs file against a running preview.
 *   node tests/e2e/run.mjs [baseUrl] [fileFilter]
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const [, , base = 'http://localhost:4321', filter = ''] = process.argv;
const files = readdirSync(dir).filter((f) => f.endsWith('.e2e.mjs') && f.includes(filter)).sort();
let failed = 0;
const summary = [];
for (const file of files) {
  console.log(`\n── ${file}`);
  const r = spawnSync(process.execPath, [join(dir, file), base], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) failed++;
  summary.push(`${r.status === 0 ? '✓' : '✗'} ${file}`);
}
console.log(`\n${summary.join('\n')}\n${files.length - failed}/${files.length} files passed`);
process.exit(failed ? 1 : 0);
