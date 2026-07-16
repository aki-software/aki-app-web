const { parse } = require('pg-connection-string');
const url1 = 'postgresql://neondb_owner:npg_2RVIYJBf0DXO@ep-blue-cherry-aqztk0bi-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require';
const url2 = '"postgresql://neondb_owner:npg_2RVIYJBf0DXO@ep-blue-cherry-aqztk0bi-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"';

try {
  console.log("URL1:", parse(url1));
} catch (e) { console.log("URL1 ERROR:", e.message); }

try {
  console.log("URL2:", parse(url2));
} catch (e) { console.log("URL2 ERROR:", e.message); }
