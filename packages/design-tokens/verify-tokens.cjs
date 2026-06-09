/**
 * verify-tokens.cjs — Assertion script covering all 12 spec scenarios.
 *
 * Runs build.js first, then reads dist/theme.css and validates:
 * - Multi-category output
 * - Spacing scale (1–20, no zero)
 * - Radius values
 * - Shadow values
 * - Typography size/weight
 * - Status tokens
 * - Dark variants (tertiary.dark, text.*Dark)
 * - Backward compatibility (old tokens preserved)
 * - Superset check
 *
 * Usage: node verify-tokens.cjs
 * Exit code: 0 = all pass, 1 = one or more failures
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── Step 1: Run build.js ──────────────────────────────────────────────────
const pkgDir = __dirname;
console.log('🔨 Running build.js...');
execSync('node build.js', { cwd: pkgDir, stdio: 'inherit' });

// ── Step 2: Read dist/theme.css ────────────────────────────────────────────
const themeCss = fs.readFileSync(path.join(pkgDir, 'dist', 'theme.css'), 'utf-8');

// Parse all CSS custom properties into { key: value } map
// Keys are like "color-primary", "space-1", "text-xs" (without -- prefix)
const vars = {};
const varPattern = /  --([\w-]+):\s*([^;]+);/g;
let m;
while ((m = varPattern.exec(themeCss)) !== null) {
  vars[m[1]] = m[2].trim();
}

const allKeys = Object.keys(vars);
const errors = [];

function assert(condition, message) {
  if (!condition) {
    errors.push(`❌ ${message}`);
  } else {
    console.log(`  ✅ ${message}`);
  }
}

function assertHasKey(key, msg) {
  assert(key in vars, `${msg} — expected \`--${key}\` to exist`);
}

function assertKeyValue(key, expected, msg) {
  assert(vars[key] === expected, `${msg} — expected \`--${key}: ${expected}\`, got \`${vars[key]}\``);
}

function assertNoKey(key, msg) {
  assert(!(key in vars), `${msg} — \`--${key}\` should NOT exist but found \`${vars[key]}\``);
}

// Capture the old known token set (before this change)
// These are the 26 tokens that existed before adding new sections
const OLD_TOKENS = {
  'color-primary': '#0F6B68',
  'color-primary-light': '#B7ECE7',
  'color-primary-dark': '#083B39',
  'color-secondary': '#8E5A12',
  'color-secondary-light': '#FFDDB5',
  'color-secondary-dark': '#5C3A0C',
  'color-tertiary': '#4E7F52',
  'color-tertiary-light': '#CDEDCB',
  'color-background-light': '#F5EFE7',
  'color-background-dark': '#151C1A',
  'color-surface-light': '#FCF9F4',
  'color-surface-dark': '#1B2422',
  'color-surface-variant-light': '#DCD3C5',
  'color-surface-variant-dark': '#2C3533',
  'color-text-primary': '#1d1914',
  'color-text-secondary': '#44403c',
  'color-outline-light': '#7A8783',
  'color-outline-dark': '#8A9490',
  'color-error-light': '#B9414A',
  'color-error-dark': '#FFFF8A80',
  'color-on-background-light': '#1F2523',
  'color-on-background-dark': '#E7ECE8',
  'color-actions-confirm': '#43A047',
  'color-actions-confirm-dark': '#2E7D32',
  'color-actions-destructive': '#E53935',
  'color-actions-destructive-dark': '#C62828',
  'color-actions-warning': '#F59E0B',
  'color-actions-warning-dark': '#D97706',
};

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 1: Multi-category output
//  ─── Must contain --color-*, --space-*, --radius-*, --shadow-*, --text-*,
//       and --font-* tokens under :root
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 1: Multi-category output');
assert(allKeys.some(k => k.startsWith('color-')), '--color-* tokens present');
assert(allKeys.some(k => k.startsWith('space-')), '--space-* tokens present');
assert(allKeys.some(k => k.startsWith('radius-')), '--radius-* tokens present');
assert(allKeys.some(k => k.startsWith('shadow-')), '--shadow-* tokens present');
assert(allKeys.some(k => k.startsWith('text-')), '--text-* tokens present');
assert(allKeys.some(k => k.startsWith('font-')), '--font-* tokens present');

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 2: Scale consistency (spacing)
//  ─── --space-1 = 4px, --space-4 = 16px, --space-8 = 32px, --space-20 = 80px
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 2: Spacing scale consistency');
assertKeyValue('space-1', '4px', 'space-1 = 4px');
assertKeyValue('space-4', '16px', 'space-4 = 16px');
assertKeyValue('space-8', '32px', 'space-8 = 32px');
assertKeyValue('space-20', '80px', 'space-20 = 80px');

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 3: Zero excluded (spacing)
//  ─── --space-0 must NOT be defined
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 3: Zero excluded');
assertNoKey('space-0', '--space-0 must not be present');

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 4: All radius tokens generated
//  ─── --radius-sm, --radius-md, --radius-lg, --radius-xl with correct px
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 4: Radius tokens');
assertKeyValue('radius-sm', '4px', '--radius-sm = 4px');
assertKeyValue('radius-md', '8px', '--radius-md = 8px');
assertKeyValue('radius-lg', '12px', '--radius-lg = 12px');
assertKeyValue('radius-xl', '16px', '--radius-xl = 16px');

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 5: Semantic elevation levels (shadow)
//  ─── --shadow-sm through --shadow-xl with valid box-shadow values
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 5: Shadow elevation levels');
assertHasKey('shadow-sm', '--shadow-sm exists');
assertHasKey('shadow-md', '--shadow-md exists');
assertHasKey('shadow-lg', '--shadow-lg exists');
assertHasKey('shadow-xl', '--shadow-xl exists');

// Validate each shadow value looks like a valid box-shadow
for (const level of ['sm', 'md', 'lg', 'xl']) {
  const val = vars[`shadow-${level}`];
  assert(
    val && val.includes('rgb') && /\d+px/.test(val),
    `--shadow-${level} value "${val}" is a valid box-shadow`
  );
}

// Verify elevation ordering (sm < md < lg < xl by blur radius magnitude)
const shadowBlurs = ['sm', 'md', 'lg', 'xl'].map(l => {
  const val = vars[`shadow-${l}`] || '';
  const blurMatch = val.match(/\d+px/);
  return { level: l, blur: blurMatch ? parseInt(blurMatch[0]) : 0 };
});
const blursIncreasing = shadowBlurs.every((s, i) => i === 0 || s.blur >= shadowBlurs[i - 1].blur);
assert(blursIncreasing, 'Shadow blur increases from sm → md → lg → xl');

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 6: Font size range
//  ─── --text-xs through --text-5xl including --text-base
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 6: Font size range');
const expectedSizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
for (const size of expectedSizes) {
  assertHasKey(`text-${size}`, `--text-${size} exists`);
}

// Verify specific font size values from design
assertKeyValue('text-xs', '0.75rem', '--text-xs = 0.75rem');
assertKeyValue('text-base', '1rem', '--text-base = 1rem');
assertKeyValue('text-2xl', '1.5rem', '--text-2xl = 1.5rem');
assertKeyValue('text-5xl', '3rem', '--text-5xl = 3rem');

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 7: Font weight tokens
//  ─── --font-normal (400), --font-medium (500), --font-semibold (600),
//      --font-bold (700)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 7: Font weight tokens');
assertKeyValue('font-normal', '400', '--font-normal = 400');
assertKeyValue('font-medium', '500', '--font-medium = 500');
assertKeyValue('font-semibold', '600', '--font-semibold = 600');
assertKeyValue('font-bold', '700', '--font-bold = 700');

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 8: Status tokens generated
//  ─── --color-status-success, --color-status-error, --color-status-warning
//      with valid hex values
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 8: Status tokens');
assertHasKey('color-status-success', '--color-status-success exists');
assertHasKey('color-status-error', '--color-status-error exists');
assertHasKey('color-status-warning', '--color-status-warning exists');
assertHasKey('color-status-success-dark', '--color-status-success-dark exists');
assertHasKey('color-status-error-dark', '--color-status-error-dark exists');
assertHasKey('color-status-warning-dark', '--color-status-warning-dark exists');

// Verify specific status values
assertKeyValue('color-status-success', '#43A047', '--color-status-success = #43A047');
assertKeyValue('color-status-error', '#E53935', '--color-status-error = #E53935');
assertKeyValue('color-status-warning', '#F59E0B', '--color-status-warning = #F59E0B');

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 9: Tertiary dark value present
//  ─── --color-tertiary-dark must exist with valid hex
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 9: Tertiary dark value');
assertKeyValue('color-tertiary-dark', '#2A4530', '--color-tertiary-dark = #2A4530');

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 10: Text dark values
//  ─── --color-text-primary-dark, --color-text-secondary-dark must exist
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 10: Text dark values');
assertKeyValue('color-text-primary-dark', '#f5f1ec', '--color-text-primary-dark = #f5f1ec');
assertKeyValue('color-text-secondary-dark', '#a8a29e', '--color-text-secondary-dark = #a8a29e');

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 11: No breaking changes (backward compatibility)
//  ─── All existing --color-* tokens preserved with original values
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 11: No breaking changes');
let backwardOk = 0;
for (const [key, expectedValue] of Object.entries(OLD_TOKENS)) {
  assertKeyValue(key, expectedValue, `--${key} preserved = ${expectedValue}`);
  backwardOk++;
}
assert(backwardOk === Object.keys(OLD_TOKENS).length, `All ${Object.keys(OLD_TOKENS).length} old tokens preserved`);

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO 12: Superset only
//  ─── New output must be superset of old, zero removals
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n📐 Scenario 12: Superset only');
const oldKeys = Object.keys(OLD_TOKENS);
const missingOldKeys = oldKeys.filter(k => !(k in vars));
assert(
  missingOldKeys.length === 0,
  `All old keys preserved, zero removals (missing: ${missingOldKeys.join(', ') || 'none'})`
);
assert(
  allKeys.length > oldKeys.length,
  `New output has more tokens than old (${allKeys.length} > ${oldKeys.length}) — superset confirmed`
);

// ═══════════════════════════════════════════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(50));
if (errors.length === 0) {
  console.log(`🎉 All ${Object.keys(OLD_TOKENS).length + 12} assertions passed!`);
  process.exit(0);
} else {
  console.log(`❌ ${errors.length} assertion(s) failed:`);
  for (const err of errors) {
    console.log(`  ${err}`);
  }
  process.exit(1);
}
