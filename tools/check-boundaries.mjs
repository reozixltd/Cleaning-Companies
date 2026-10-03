// Fails `npm test` when an import or a raw value breaks the rules in docs/spec.md §4.2.
import { findViolations } from './boundaries.mjs';

const violations = findViolations('.');
for (const v of violations) console.log(`${v.file}: ${v.rule} (${v.detail})`);
if (violations.length) {
  console.log(`\n${violations.length} boundary violation(s).`);
  process.exit(1);
}
console.log('Boundaries: ok');
