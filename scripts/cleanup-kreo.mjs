import pg from 'pg';
const { Client } = pg;

const DB_CONFIG = {
  host    : 'aws-1-us-east-2.pooler.supabase.com',
  port    : 5432,
  user    : 'postgres.wyaugtdgmcesoryhyois',
  password: '***REMOVED***',
  database: 'postgres',
  ssl     : { rejectUnauthorized: false },
};

const PROJECT_ID = 'e21aeeee-d4e2-4bee-8b5d-be353702ecb3';

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log(`🧹 Iniciando limpieza del proyecto: ${PROJECT_ID}`);

  try {
    await client.query('BEGIN');

    // 1. Lean
    await client.query('DELETE FROM lean_constraints WHERE project_id = $1', [PROJECT_ID]);
    await client.query('DELETE FROM lean_tasks WHERE project_id = $1', [PROJECT_ID]);
    await client.query('DELETE FROM lean_weeks WHERE project_id = $1', [PROJECT_ID]);

    // 2. Valorizaciones
    await client.query('DELETE FROM valorizaciones WHERE project_id = $1', [PROJECT_ID]);

    // 3. Nóminas
    await client.query('DELETE FROM payroll_periods WHERE project_id = $1', [PROJECT_ID]);

    // 4. Servicios / Subcontratos
    await client.query(`
      DELETE FROM service_order_advances 
      WHERE service_order_id IN (SELECT id FROM service_orders WHERE project_id = $1)
    `, [PROJECT_ID]);
    await client.query('DELETE FROM service_orders WHERE project_id = $1', [PROJECT_ID]);

    // 5. Almacén y Compras
    await client.query('DELETE FROM stock_withdrawals WHERE project_id = $1', [PROJECT_ID]);
    await client.query('DELETE FROM stock_entries WHERE project_id = $1', [PROJECT_ID]);
    await client.query('DELETE FROM stock_items WHERE project_id = $1', [PROJECT_ID]);
    await client.query('DELETE FROM purchase_orders WHERE project_id = $1', [PROJECT_ID]);

    // 6. Presupuesto
    await client.query(`
      DELETE FROM budget_items 
      WHERE budget_id IN (SELECT id FROM budgets WHERE project_id = $1)
    `, [PROJECT_ID]);
    await client.query(`
      DELETE FROM budget_chapters 
      WHERE budget_id IN (SELECT id FROM budgets WHERE project_id = $1)
    `, [PROJECT_ID]);
    await client.query('DELETE FROM budgets WHERE project_id = $1', [PROJECT_ID]);

    // 7. Proyecto y Miembros
    await client.query('DELETE FROM project_members WHERE project_id = $1', [PROJECT_ID]);
    await client.query('DELETE FROM projects WHERE id = $1', [PROJECT_ID]);

    await client.query('COMMIT');
    console.log('✅ Limpieza completada con éxito.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la limpieza:', e);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
