const { Client } = require('pg');

const client = new Client({
  host: 'ep-cool-cherry-aqng3qzq-pooler.c-8.us-east-1.aws.neon.tech',
  port: 5432,
  user: 'neondb_owner',
  password: 'npg_2RVIYJBf0DXO',
  database: 'neondb',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  try {
    // 1. Obtener la última sesión completa
    const sessionRes = await client.query(`
      SELECT id, "session_date", "created_at", "patient_name", "holland_code", "voucher_id" 
      FROM sessions 
      ORDER BY "session_date" DESC 
      LIMIT 1
    `);

    if (sessionRes.rows.length === 0) {
      console.log('No se encontraron sesiones completadas.');
      return;
    }

    const session = sessionRes.rows[0];
    console.log('=== ÚLTIMA SESIÓN ===');
    console.log(session);

    // 2. Obtener resultados calculados (session_results)
    const resultsRes = await client.query(`
      SELECT "category_id" as categoryId, "score" as rawScore, "total_possible" as totalPossible, percentage, "weighted_score" as weightedScore, "avg_response_time_ms" as avgResponseTimeMs
      FROM session_results
      WHERE "session_id" = $1
      ORDER BY percentage DESC, "weighted_score" DESC, "category_id" ASC
    `, [session.id]);

    console.log('\n=== RESULTADOS GUARDADOS (session_results) ===');
    console.table(resultsRes.rows);

    // 3. Obtener los swipes crudos
    const swipesRes = await client.query(`
      SELECT "card_id" as cardId, "category_id" as categoryId, "is_liked" as liked, timestamp
      FROM session_swipes
      WHERE "session_id" = $1
      ORDER BY timestamp ASC
    `, [session.id]);

    console.log(`\n=== SWIPES CRUDOS (${swipesRes.rows.length} swipes) ===`);
    console.table(swipesRes.rows.map(r => ({
      cardId: r.cardId,
      categoryId: r.categoryId,
      liked: r.liked,
      timestamp: new Date(r.timestamp).toISOString()
    })));

  } catch (err) {
    console.error('Error ejecutando la consulta:', err);
  } finally {
    await client.end();
  }
}

main();
