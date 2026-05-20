import { quicktype, InputData, JSONSchemaInput, FetchingJSONSchemaStore } from 'quicktype-core';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as contracts from './src/index.js';

async function test() {
  for (const [key, value] of Object.entries(contracts)) {
    if (key.endsWith('Schema') && value && typeof (value as any).parse === 'function') {
      const name = key.replace(/Schema$/, '');
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
      
      const jsonSchema = zodToJsonSchema(value as any, capitalizedName);
      const schemaInput = new JSONSchemaInput(new FetchingJSONSchemaStore());
      await schemaInput.addSource({
        name: capitalizedName,
        schema: JSON.stringify(jsonSchema),
      });
      const inputData = new InputData();
      inputData.addInput(schemaInput);

      try {
        await quicktype({
          inputData,
          lang: 'kotlin',
          rendererOptions: { package: 'test' }
        });
      } catch (e) {
        console.log(`CRASH ON ${capitalizedName}`);
      }
    }
  }
}
test();
