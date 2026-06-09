const fs = require('fs');
const path = require('path');
const tokens = require('./src/tokens.json');

/**
 * PREFIX_MAP — maps section/sub-section paths to CSS custom property prefixes.
 *
 * - Direct sections (e.g., "colors", "spacing") have a single prefix for all
 *   tokens flattened from that object.
 * - Sub-key entries (e.g., "typography.size" → "--text-") override the parent
 *   prefix for specific sub-objects, which handles the typography→size vs
 *   typography→weight exception.
 */
const PREFIX_MAP = {
  "colors": "--color-",
  "spacing": "--space-",
  "radius": "--radius-",
  "shadow": "--shadow-",
  "typography.size": "--text-",
  "typography.weight": "--font-"
};

/**
 * Flatten a nested token object into an array of { name, value } entries.
 *
 * Recursively walks the object, building the kebab-case key name at each level.
 * Handles:
 *   - DEFAULT suffix → removed (e.g., "primary-DEFAULT" → "primary")
 *   - camelCase → kebab-case (e.g., "variantLight" → "variant-light")
 *   - Trailing dashes cleaned up
 *
 * @param {object} obj - The token object to flatten
 * @param {string} prefix - Accumulated key prefix from parent recursion
 * @returns {Array<{name: string, value: string}>}
 */
function flattenKey(obj, prefix = '') {
  const entries = [];
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      entries.push(...flattenKey(obj[key], `${prefix}${key}-`));
    } else {
      // Build the full var name from accumulated prefix + current key
      const varName = prefix + key;

      // Handle DEFAULT suffix specially — strip it (e.g., "primary-DEFAULT" → "primary-")
      let processedVarName = varName.endsWith('DEFAULT')
        ? varName.replace('DEFAULT', '')
        : varName;

      // Convert camelCase to kebab-case
      const kebabName = processedVarName
        .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
        .toLowerCase();

      // Clean up any trailing dashes
      const finalName = kebabName.replace(/-$/, '');

      entries.push({ name: finalName, value: obj[key] });
    }
  }
  return entries;
}

// ── Generate CSS vars from all sections ────────────────────────────────────
const cssVars = [];

for (const section in tokens) {
  // Direct section prefix (e.g., "colors" → "--color-")
  const sectionPrefix = PREFIX_MAP[section];

  if (sectionPrefix) {
    // No prefix accumulation needed — PREFIX_MAP supplies the full CSS prefix
    const entries = flattenKey(tokens[section], '');
    for (const entry of entries) {
      cssVars.push(`  ${sectionPrefix}${entry.name}: ${entry.value};`);
    }
  } else if (typeof tokens[section] === 'object' && tokens[section] !== null) {
    // Sub-key prefix resolution (e.g., "typography.size" → "--text-")
    for (const subKey in tokens[section]) {
      const subPath = `${section}.${subKey}`;
      const subPrefix = PREFIX_MAP[subPath];
      if (subPrefix) {
        const entries = flattenKey(tokens[section][subKey], '');
        for (const entry of entries) {
          cssVars.push(`  ${subPrefix}${entry.name}: ${entry.value};`);
        }
      }
    }
  }
}

const cssContent = `:root {\n${cssVars.join('\n')}\n}`;

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

fs.writeFileSync(path.join(distDir, 'theme.css'), cssContent);
console.log('✅ Generado dist/theme.css con éxito.');
