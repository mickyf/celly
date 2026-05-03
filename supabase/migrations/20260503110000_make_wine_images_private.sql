-- Bucket private; SELECT scoped per-user. Frontend uses signed URLs.

UPDATE storage.buckets SET public = false WHERE id = 'wine-images';

DROP POLICY IF EXISTS "Anyone can view wine images" ON storage.objects;

CREATE POLICY "Users can view their own wine images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wine-images' AND auth.uid()::text = (storage.foldername(name))[1]);
