const HOST = "https://www.inei.gob.pe/media/MenuRecursivo/indices_tematicos";
const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

async function checkUrl(monthNum, yearNum) {
  const mon = MONTHS_ES[monthNum - 1];
  const yy = String(yearNum).slice(-2);
  
  // Varias posibilidades de nombres de archivos
  const variations = [
    `n07_indices_unificados_de_precios_de_la_construccion_${mon}${yy}.xlsx`,
    `n07_indices_unificados_de_precios_de_la_construccion_${mon}_${yy}.xlsx`,
    `indices_unificados_de_precios_de_la_construccion_${mon}${yy}.xlsx`,
    `indices_unificados_${mon}${yy}.xlsx`,
    `n07_indices_unificados_${mon}${yy}.xlsx`,
    // Probar también con meses completos si aplica
    `n07_indices_unificados_de_precios_de_la_construccion_enero26.xlsx`,
    `n07_indices_unificados_de_precios_de_la_construccion_febrero26.xlsx`,
    `n07_indices_unificados_de_precios_de_la_construccion_marzo26.xlsx`,
    `n07_indices_unificados_de_precios_de_la_construccion_abril26.xlsx`,
    `n07_indices_unificados_de_precios_de_la_construccion_mayo26.xlsx`,
    `n07_indices_unificados_de_precios_de_la_construccion_junio26.xlsx`,
  ];

  for (const filename of variations) {
    const url = `${HOST}/${filename}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        console.log(`[ÉXITO] ${monthNum}/${yearNum} -> ${url}`);
        return true;
      } else {
        // console.log(`[404] ${url}`);
      }
    } catch (e) {
      console.log(`[ERROR] ${url}: ${e.message}`);
    }
  }
  return false;
}

async function main() {
  console.log("Probando meses del 2026...");
  for (let m = 1; m <= 6; m++) {
    const found = await checkUrl(m, 2026);
    if (!found) {
      console.log(`No se encontró archivo para el mes ${m}/2026`);
    }
  }
}

main().catch(console.error);
