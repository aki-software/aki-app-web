import { zodToJsonSchema } from 'zod-to-json-schema';
import * as contracts from './src/index.js';

for (const [key, value] of Object.entries(contracts)) {
  if (key.endsWith('Schema') && value && typeof (value as any).parse === 'function') {
    const name = key.replace(/Schema$/, '');
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    
    try {
      const jsonSchema = zodToJsonSchema(value as any, capitalizedName);
      console.log(`Successfully generated schema for ${capitalizedName}`);
    } catch (e) {
      console.log(`Failed for ${capitalizedName}: ${e}`);
    }
  }
}
