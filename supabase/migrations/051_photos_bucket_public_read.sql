-- Quick fix: photos bucket stays public for read, auth-only for upload
UPDATE storage.buckets SET public = true WHERE id = 'photos' AND name = 'photos';

DROP POLICY IF EXISTS "photos_select_org" ON storage.objects;
DROP POLICY IF EXISTS "photos_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "photos_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "photos_delete_owner" ON storage.objects;

CREATE POLICY "Public Access for Photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own photos" ON storage.objects FOR UPDATE USING (bucket_id = 'photos' AND auth.uid() = owner);
CREATE POLICY "Users can delete their own photos" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.uid() = owner);
