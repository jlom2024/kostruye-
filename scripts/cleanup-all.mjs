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

// IDs de proyectos a eliminar (duplicados o basura)
const PROJECT_IDS = [
  '14ae7935-dfbd-4aeb-b33d-ba11994b0ee2', // KREO-VIV-01 (Org equivocada)
  'ffa39e7d-5ace-4e03-89de-337260b32218', // PRJ-RO-01 (Org equivocada)
  'e88a845b-38a4-481f-81f9-971b946e9863', // OB-003 (Duplicado)
  '347ac655-22a9-4d0b-abe9-531e507720c9'  // OB-001 (Basura antigua)
];

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log(`🧹 Iniciando limpieza masiva de proyectos duplicados...`);

  try {
    await client.query('BEGIN');

    for (const pid of PROJECT_IDS) {
      console.log(`   - Limpiando proyecto: ${pid}`);
      
      // 1. Lean
      await client.query('DELETE FROM lean_constraints WHERE project_id = $1', [pid]);
      await client.query('DELETE FROM lean_tasks WHERE project_id = $1', [pid]);
      await client.query('DELETE FROM lean_weeks WHERE project_id = $1', [pid]);

      // 2. Valorizaciones
      await client.query('DELETE FROM valorizaciones WHERE project_id = $1', [pid]);

      // 3. Nóminas
      await client.query('DELETE FROM payroll_periods WHERE project_id = $1', [pid]);

      // 4. Servicios / Subcontratos
      await client.query(`
        DELETE FROM service_order_advances 
        WHERE service_order_id IN (SELECT id FROM service_orders WHERE project_id = $1)
      `, [pid]);
      await client.query('DELETE FROM service_orders WHERE project_id = $1', [pid]);

      // 5. Almacén y Compras
      await client.query('DELETE FROM stock_withdrawals WHERE project_id = $1', [pid]);
      await client.query('DELETE FROM stock_entries WHERE project_id = $1', [pid]);
      await client.query('DELETE FROM stock_items WHERE project_id = $1', [pid]);
      await client.query('DELETE FROM purchase_orders WHERE project_id = $1', [pid]);

      // 6. Presupuesto
      await client.query(`
        DELETE FROM budget_items 
        WHERE budget_id IN (SELECT id FROM budgets WHERE project_id = $1)
      `, [pid]);
      await client.query(`
        DELETE FROM budget_chapters 
        WHERE budget_id IN (SELECT id FROM budgets WHERE project_id = $1)
      `, [pid]);
      await client.query('DELETE FROM budgets WHERE project_id = $1', [pid]);

      // 7. Proyecto y Miembros
      await client.query('DELETE FROM project_members WHERE project_id = $1', [pid]);
      await client.query('DELETE FROM projects WHERE id = $1', [pid]);
    }

    await client.query('COMMIT');
    console.log('✅ Limpieza masiva completada.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la limpieza:', e);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
