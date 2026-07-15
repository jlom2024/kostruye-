/**
 * ================================================================
 * Kostruye+ — Explain Queries Analyzer (EXPLAIN ANALYZE)
 * Analiza el plan de ejecución de queries críticos sobre Supabase.
 * Uso: node scripts/explain-queries.mjs
 * ================================================================
 */

import pg from 'pg';

const { Client } = pg;

// Usar la URI de conexión directa con Pooler en el puerto 6543
const CONNECTION_STRING = 'postgres://postgres.wyaugtdgmcesoryhyois:eNiq3TVVnxsXzdly@aws-1-us-east-2.pooler.supabase.com:6543/postgres';

async function main() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔌 Conectado a Supabase PostgreSQL.\n');
  } catch (e) {
    console.error(`❌ Falló la conexión: ${e.message}`);
    process.exit(1);
  }

  // UUID ficticio para pruebas de análisis
  const dummy_id = '00000000-0000-0000-0000-000000000000';

  const queries = [
    {
      name: '1. stock_entries (filtro proyecto + fecha)',
      sql: `EXPLAIN SELECT * FROM stock_entries WHERE project_id = '${dummy_id}' ORDER BY entry_date DESC;`
    },
    {
      name: '2. purchase_orders (filtro proyecto + status)',
      sql: `EXPLAIN SELECT * FROM purchase_orders WHERE project_id = '${dummy_id}' AND status = 'draft' ORDER BY created_at DESC;`
    },
    {
      name: '3. service_orders (filtro proyecto + status)',
      sql: `EXPLAIN SELECT * FROM service_orders WHERE project_id = '${dummy_id}' AND status = 'pending' ORDER BY created_at DESC;`
    },
    {
      name: '4. payroll_periods (filtro proyecto + start_date)',
      sql: `EXPLAIN SELECT * FROM payroll_periods WHERE project_id = '${dummy_id}' ORDER BY start_date DESC;`
    },
    {
      name: '5. valorizaciones (filtro proyecto + status + start_date)',
      sql: `EXPLAIN SELECT * FROM valorizaciones WHERE project_id = '${dummy_id}' AND status = 'draft' ORDER BY start_date DESC;`
    },
    {
      name: '6. budget_items (presupuesto + capítulos)',
      sql: `EXPLAIN SELECT * FROM budget_items WHERE budget_id = '${dummy_id}' AND chapter_id = '${dummy_id}';`
    }
  ];

  for (const q of queries) {
    console.log(`================================================================`);
    console.log(`🔍 Analizando: ${q.name}`);
    console.log(`================================================================`);
    try {
      const res = await client.query(q.sql);
      res.rows.forEach(row => {
        console.log(row['QUERY PLAN']);
      });
      console.log('\n');
    } catch (e) {
      console.log(`⚠️  No se pudo analizar: ${e.message}\n`);
    }
  }

  await client.end();
}

main().catch(console.error);
