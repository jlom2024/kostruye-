-- ================================================================
-- Kostruye+ — Migración 041
-- Supabase Storage: Bucket público para fotos de campo e incidentes de la app móvil
-- ================================================================

-- Crear el bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos', 
  'photos', 
  true, 
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de RLS para storage.objects en el bucket 'photos'

-- 1. Acceso público para ver las fotos
CREATE POLICY "Public Access for Photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'photos' );

-- 2. Sólo usuarios autenticados pueden subir fotos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' 
  AND auth.role() = 'authenticated'
);

-- 3. Los usuarios pueden actualizar sus propias fotos
CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'photos' 
  AND auth.uid() = owner
);

-- 4. Los usuarios pueden borrar sus propias fotos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos' 
  AND auth.uid() = owner
);
