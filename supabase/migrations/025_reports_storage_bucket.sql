-- ================================================================
-- Kostruye+ — Migración 025
-- Supabase Storage: Bucket público para exportaciones y reportes asíncronos
-- ================================================================

-- Crear el bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports', 
  'reports', 
  true, 
  52428800, -- 50 MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de RLS para storage.objects en el bucket 'reports'

-- 1. Los usuarios pueden descargar cualquier objeto del bucket público
CREATE POLICY "Public Access for Reports"
ON storage.objects FOR SELECT
USING ( bucket_id = 'reports' );

-- 2. Sólo usuarios autenticados (o el service_role) pueden subir archivos a este bucket
CREATE POLICY "Authenticated users can upload reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reports' 
  AND auth.role() = 'authenticated'
);

-- 3. Sólo el owner puede actualizar el objeto
CREATE POLICY "Users can update their own reports"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'reports' 
  AND auth.uid() = owner
);

-- 4. Sólo el owner puede borrar
CREATE POLICY "Users can delete their own reports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'reports' 
  AND auth.uid() = owner
);
