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

// Códigos de proyectos a eliminar (para que funcione dinámicamente sin importar el ID)
const PROJECT_CODES = [
  'KREO-VIV-01',
  'PRJ-RO-01',
  'OB-003',
  'OB-001'
];

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log(`🧹 Iniciando limpieza masiva de proyectos...`);

  try {
    await client.query('BEGIN');
    
    // Obtener los IDs actuales de los proyectos
    const res = await client.query('SELECT id, code FROM projects WHERE code = ANY($1)', [PROJECT_CODES]);
    const projectIds = res.rows.map(r => r.id);
    
    if (projectIds.length === 0) {
      console.log('✅ No hay proyectos para limpiar.');
      await client.query('ROLLBACK');
      await client.end();
      return;
    }

    for (const pid of projectIds) {
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
