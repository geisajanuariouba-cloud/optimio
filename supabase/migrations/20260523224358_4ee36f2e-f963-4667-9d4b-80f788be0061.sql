
CREATE INDEX IF NOT EXISTS idx_supplier_catalogs_processing
  ON public.supplier_catalogs (processing_status, last_heartbeat_at)
  WHERE processing_status IN ('pending','processing','splitting','extracting','consolidating');

CREATE OR REPLACE FUNCTION public.recover_stuck_catalogs(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer := 0;
BEGIN
  WITH stuck AS (
    SELECT id,
           (COALESCE(products_created,0) + COALESCE(products_updated,0) + COALESCE(products_extracted,0)) > 0 AS has_partial
    FROM public.supplier_catalogs
    WHERE user_id = _user_id
      AND processing_status IN ('pending','processing','splitting','extracting','consolidating')
      AND COALESCE(last_heartbeat_at, created_at) < now() - interval '3 minutes'
  )
  UPDATE public.supplier_catalogs c
     SET processing_status = CASE WHEN s.has_partial THEN 'partial' ELSE 'failed' END,
         processing_stage  = CASE WHEN s.has_partial THEN 'concluido_parcialmente' ELSE 'erro' END,
         partial_reason    = CASE WHEN s.has_partial THEN 'Alguns produtos foram processados. Revise os itens restantes.' ELSE NULL END,
         error_message     = CASE WHEN s.has_partial THEN NULL ELSE 'O processamento passou do tempo limite sem progresso. O PDF original continua salvo.' END,
         completed_at      = now(),
         last_heartbeat_at = now()
    FROM stuck s
   WHERE c.id = s.id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
