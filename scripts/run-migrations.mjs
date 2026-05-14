/**
 * ================================================================
 * Kostruye+ — Migration Runner (Conexión directa PostgreSQL)
 * Sin navegador. Corre todo en segundo plano.
 * Uso: node scripts/run-migrations.mjs [archivo.sql] [--force]
 * ================================================================
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Conexión directa a Supabase PostgreSQL ────────────────────
const DB_CONFIG = {
  host    : 'aws-1-us-east-2.pooler.supabase.com',
  port    : 5432,
  user    : 'postgres.wyaugtdgmcesoryhyois',
  password: '***REMOVED***',
  database: 'postgres',
  ssl     : { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
};

// ── Orden exacto de ejecución ─────────────────────────────────
const MIGRATIONS = [
  '001_core_schema.sql',
  '002_almacen.sql',
  '003_compras.sql',
  '003_lean.sql',
  '004_contabilidad.sql',
  '004_nominas.sql',
  '005_valorizaciones.sql',
  '006_app_clients.sql',
  '007_clients.sql',
  '008_servicios.sql',
  '009_ro_real.sql',
  '010_seed_dummy_ro.sql',
  '011_seed_kreo_vivienda_full.sql',
];

const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

// ── Colores consola ───────────────────────────────────────────
const C = {
  green : (s) => `\x1b[32m${s}\x1b[0m`,
  red   : (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue  : (s) => `\x1b[34m${s}\x1b[0m`,
  cyan  : (s) => `\x1b[36m${s}\x1b[0m`,
  bold  : (s) => `\x1b[1m${s}\x1b[0m`,
};

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  const args   = process.argv.slice(2);
  const force  = args.includes('--force');
  const single = args.find(a => a.endsWith('.sql'));

  const toRun = single
    ? MIGRATIONS.filter(m => m === single || m.startsWith(single))
    : MIGRATIONS;

  console.log(C.bold(C.blue('\n🚀 Kostruye+ Migration Runner')));
  console.log(C.blue('━'.repeat(55)));
  console.log(`📡 Host  : ${C.cyan(DB_CONFIG.host)}`);
  console.log(`🗄️  DB    : ${C.cyan(DB_CONFIG.database)}`);
  console.log(`📋 Archivos: ${C.yellow(toRun.length.toString())}${force ? C.yellow(' [--force activo]') : ''}\n`);

  // Conectar
  const client = new Client(DB_CONFIG);
  try {
    process.stdout.write('🔌 Conectando a Supabase PostgreSQL...');
    await client.connect();
    console.log(` ${C.green('✅ Conectado')}\n`);
  } catch (e) {
    console.log(` ${C.red('✗ FALLÓ')}`);
    console.error(C.red(`Error de conexión: ${e.message}`));
    process.exit(1);
  }

  let ok = 0;
  let fail = 0;
  const errors = [];

  for (const file of toRun) {
    const filePath = join(MIGRATIONS_DIR, file);
    let sql;

    try {
      sql = readFileSync(filePath, 'utf-8');
    } catch (e) {
      console.log(`${C.red('✗')} ${file} — ${C.red('Archivo no encontrado')}`);
      fail++;
      errors.push({ file, error: 'Archivo no encontrado' });
      continue;
    }

    process.stdout.write(`⏳ ${C.yellow(file.padEnd(40))}`);

    try {
      await client.query(sql);
      console.log(`${C.green('✅ OK')}`);
      ok++;
    } catch (e) {
      const msg = e.message || '';

      // Errores "ignorables" (ya existe)
      const ignorable =
        msg.includes('already exists') ||
        msg.includes('duplicate_object') ||
        msg.includes('already exists') ||
        msg.includes('duplicate column');

      if (ignorable) {
        console.log(`${C.yellow('⚠️  SKIP')} (ya existe)`);
        ok++;
      } else {
        console.log(`${C.red('✗ ERROR')}`);
        console.log(C.red(`   ↳ ${msg.substring(0, 200)}`));
        fail++;
        errors.push({ file, error: msg.substring(0, 300) });

        if (!force) {
          console.log(C.yellow('\n⚠️  Detenido. Agrega --force para ignorar errores y continuar.\n'));
          break;
        }
      }
    }
  }

  await client.end();

  // ── Resumen final ──────────────────────────────────────────
  console.log(C.blue('\n━'.repeat(55)));
  console.log(C.bold(`📊 Resultado: ${C.green(ok + ' OK')} | ${fail > 0 ? C.red(fail + ' FAILED') : C.green('0 FAILED')}`));

  if (errors.length > 0) {
    console.log(C.yellow('\n📋 Errores detallados:'));
    errors.forEach(({ file, error }) => {
      console.log(C.red(`  • ${file}: ${error}`));
    });
  }

  if (fail === 0) {
    console.log(C.green('\n🎉 ¡Todas las migraciones ejecutadas con éxito!\n'));
  } else {
    console.log(C.yellow('\n💡 Usa --force para saltar errores:'));
    console.log(C.yellow('   node scripts/run-migrations.mjs --force\n'));
  }
}

main().catch(e => {
  console.error(C.red(`\nError fatal: ${e.message}`));
  process.exit(1);
});
