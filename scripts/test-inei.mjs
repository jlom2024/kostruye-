const HOST = "https://www.inei.gob.pe/media/MenuRecursivo/indices_tematicos";

async function testVariations(monthNum, yearNum, nameOptions) {
  console.log(`\n=== Probando variaciones para el mes ${monthNum}/${yearNum} ===`);
  const yy = String(yearNum).slice(-2);
  
  for (const opt of nameOptions) {
    const filename = `n07_indices_unificados_de_precios_de_la_construccion_${opt}.xlsx`;
    const url = `${HOST}/${filename}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      console.log(`F: ${filename.padEnd(70)} | Status: ${res.status} ${res.statusText}`);
      if (res.ok) {
        console.log(`   --> ¡ÉXITO ENCONTRADO! URL: ${url}`);
      }
    } catch (e) {
      console.log(`F: ${filename.padEnd(70)} | Error: ${e.message}`);
    }
  }
}

async function main() {
  // Mayo 2026
  await testVariations(5, 2026, [
    "may26", "mayo26", "may_26", "mayo_26", "may2026", "mayo2026",
    "May26", "Mayo26", "MAY26", "MAYO26", "mayo_2026", "may_2026"
  ]);

  // Junio 2026
  await testVariations(6, 2026, [
    "jun26", "junio26", "jun_26", "junio_26", "jun2026", "junio2026",
    "Jun26", "Junio26", "JUN26", "JUNIO26", "junio_2026", "jun_2026"
  ]);
}

main().catch(console.error);
