# Manual de Usuario — fuente

El manual de usuario de Kostruye+ se mantiene como **fuente HTML versionada** y se
renderiza a PDF con Chrome/Edge headless. Antes este PDF se generaba fuera del repo
(sin fuente editable); ahora vive aquí para que cualquier agente pueda actualizarlo.

## Archivos
- `Manual-Kostruye-Plus.html` — fuente única del manual (edítala aquí).
- `build.ps1` — renderiza la fuente a `public/Manual-Kostruye-Plus.pdf`.

## Cómo actualizar
1. Edita `Manual-Kostruye-Plus.html` (sube la versión en la portada y el pie de página).
2. Regenera el PDF:
   ```powershell
   pwsh docs/manual/build.ps1
   ```
   O directamente con Chrome:
   ```bash
   chrome --headless=new --disable-gpu --no-pdf-header-footer \
     --print-to-pdf="public/Manual-Kostruye-Plus.pdf" \
     "file:///<ruta-absoluta>/docs/manual/Manual-Kostruye-Plus.html"
   ```
3. El botón "Descargar Manual" de la app sirve `public/Manual-Kostruye-Plus.pdf`.

## Historial
- **v2.5 (2026-07-14):** Lanzamiento de control gerencial PMI Standard (CPI, SPI, Curva S y Flujo de Caja), Fideicomisos CORFID (solicitudes de liberación), Caja Chica con saldos transaccionales en tiempo real, Facturación SUNAT 1-Clic desde valorización y App Móvil offline-first (Tareo + Caja Chica).
- **v1.2 (2026-06-19):** Importación de presupuestos S10 exacta al céntimo (verificación
  vs COSTO DIRECTO, carga por lotes para obras grandes, recomendación Excel S10);
  KIA con herramientas `get_inei_indices` y `get_reajuste_formulas`; término "Costo
  Directo" y "S10" en el glosario. Primera versión con fuente HTML en el repo.
- **v1.1 (2026):** INEI 2026 + 3 módulos nuevos (PDF generado externamente, sin fuente).
