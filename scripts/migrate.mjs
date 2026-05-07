#!/usr/bin/env node
/**
 * Kostruye+ — Migration runner
 * Corre una migración contra Supabase vía Management API.
 *
 * Uso:
 *   SUPABASE_PAT=sbp_xxx node scripts/migrate.mjs 005
 *
 * PAT: https://supabase.com/dashboard/account/tokens
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = "wyaugtdgmcesoryhyois";
const PAT = process.env.SUPABASE_PAT;
const migration = process.argv[2]; // e.g. "005"

if (!PAT) {
  console.error("❌  Falta SUPABASE_PAT. Obtén uno en https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}
if (!migration) {
  console.error("❌  Pasa el número de migración como argumento: node scripts/migrate.mjs 005");
  process.exit(1);
}

// Buscar el archivo de migración
const migrationsDir = resolve(__dirname, "../supabase/migrations");
const { readdirSync } = await import("fs");
const files = readdirSync(migrationsDir).filter((f) => f.startsWith(migration) && f.endsWith(".sql"));

if (files.length === 0) {
  console.error(`❌  No se encontró ningún archivo de migración que empiece con "${migration}" en supabase/migrations/`);
  process.exit(1);
}

const file = files[0];
const sqlPath = resolve(migrationsDir, file);
const sql = readFileSync(sqlPath, "utf-8");

console.log(`🚀  Ejecutando migración: ${file}`);

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${PAT}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const body = await res.json();

if (!res.ok) {
  console.error(`❌  Error HTTP ${res.status}:`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

if (Array.isArray(body) && body.length === 0) {
  console.log(`✅  Migración ${file} ejecutada exitosamente.`);
} else {
  console.log("Respuesta:");
  console.log(JSON.stringify(body, null, 2));
}
