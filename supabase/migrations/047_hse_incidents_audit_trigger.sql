-- ================================================================
-- Kostruye+ — Migración 047
-- Auditoría automática para incidentes HSE
-- ================================================================

DROP TRIGGER IF EXISTS trg_audit_hse_incidents ON public.hse_incidents;

CREATE TRIGGER trg_audit_hse_incidents
  AFTER INSERT OR UPDATE OR DELETE ON public.hse_incidents
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit();
