-- ================================================================
-- Kostruye+ — Migración 049
-- HSE: agregar tipo de checklist 'inspeccion_herramientas'
-- ================================================================

ALTER TABLE public.hse_checklists
DROP CONSTRAINT IF EXISTS hse_checklists_checklist_type_check;

ALTER TABLE public.hse_checklists
ADD CONSTRAINT hse_checklists_checklist_type_check
  CHECK (checklist_type IN ('trabajo_altura', 'excavaciones', 'EPP_basico', 'equipos_electricos', 'inspeccion_herramientas'));
