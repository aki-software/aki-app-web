const fs = require('fs');
const path = require('path');
const tokens = require('./src/tokens.json');

const cssVars = [];

function flattenObject(obj, prefix = '') {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      flattenObject(obj[key], `${prefix}${key}-`);
    } else {
      const varName = prefix + key;
      // Handle DEFAULT suffix specially BEFORE camelCase conversion
      let processedVarName = varName.endsWith('DEFAULT') ? varName.replace('DEFAULT', '') : varName;
      // Convert camelCase to kebab-case
      const kebabName = processedVarName.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
      // Clean up any trailing dashes
      const finalName = kebabName.replace(/-$/, '');
      cssVars.push(`  --color-${finalName}: ${obj[key]};`);
    }
  }
}

flattenObject(tokens.colors);

const cssContent = `:root {
${cssVars.join('\n')}
}`;

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

fs.writeFileSync(path.join(distDir, 'theme.css'), cssContent);
console.log('✅ Generado dist/theme.css con éxito.');
