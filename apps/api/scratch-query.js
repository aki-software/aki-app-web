const { Client } = require('pg');

async function testQuery() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_2RVIYJBf0DXO@ep-blue-cherry-aqztk0bi-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();
    
    // Check users
    const resUsers = await client.query('SELECT COUNT(*) FROM users');
    console.log(`Users count: ${resUsers.rows[0].count}`);
    
    // Check institutions
    const resInst = await client.query('SELECT COUNT(*) FROM institutions');
    console.log(`Institutions count: ${resInst.rows[0].count}`);
    
    // Check tres_areas_combinations
    const resTAC = await client.query('SELECT COUNT(*) FROM tres_areas_combinations');
    console.log(`TresAreasCombinations count: ${resTAC.rows[0].count}`);

  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

testQuery();
