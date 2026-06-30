// Guard against index.html / 404.html drift.
//
// On IIS there is no SPA rewrite: place routes (/bron, …) are served by
// 404.html, while the bare root serves index.html. Both must load the exact
// same set of app assets, in the same order, or a slice silently fails to load
// on real room URLs (this is how the in-spirit feature shipped dark — see
// fix/404-spirit-scripts). This check fails the build if the two bootstraps'
// local asset lists diverge.

const { readFileSync } = require('fs');
const { join } = require('path');

const repoRoot = join(__dirname, '..');
const FILES = ['index.html', '404.html'];

// Local app assets only — /slices, /lib, /vendor. External refs (Google Fonts,
// manifest, icons) are allowed to differ.
const ASSET_RE = /(?:src|href)="((?:\/(?:slices|lib|vendor))\/[^"?]+)/g;

function assetsOf(file) {
  const html = readFileSync(join(repoRoot, file), 'utf-8');
  const out = [];
  let m;
  while ((m = ASSET_RE.exec(html)) !== null) out.push(m[1]);
  return out;
}

const [a, b] = FILES.map(assetsOf);
const setA = new Set(a);
const setB = new Set(b);
const onlyInA = a.filter((x) => !setB.has(x));
const onlyInB = b.filter((x) => !setA.has(x));

// Order matters too (load order is manual and significant), so compare the
// sequences directly once membership matches.
const sameMembers = onlyInA.length === 0 && onlyInB.length === 0;
const sameOrder = sameMembers && a.join('\n') === b.join('\n');

if (sameMembers && sameOrder) {
  console.log(`✓ ${FILES[0]} and ${FILES[1]} load the same ${a.length} app assets, in the same order.`);
  process.exit(0);
}

console.error(`✗ ${FILES[0]} and ${FILES[1]} have diverged.\n`);
if (onlyInA.length) console.error(`  Only in ${FILES[0]}:\n` + onlyInA.map((x) => '    + ' + x).join('\n') + '\n');
if (onlyInB.length) console.error(`  Only in ${FILES[1]}:\n` + onlyInB.map((x) => '    + ' + x).join('\n') + '\n');
if (sameMembers && !sameOrder) {
  console.error('  Same assets, but listed in a different order. Load order is manual and significant — align them.\n');
}
console.error('  Add the missing <link>/<script> so both bootstraps match (same lines, same order).');
process.exit(1);
