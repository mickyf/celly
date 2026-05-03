-- Make the wine-images bucket private and scope SELECT to the owning user.
-- Frontend now resolves stored paths to signed URLs via useWinePhotoUrl.

UPDATE storage.buckets SET public = false WHERE id = 'wine-images';

DROP POLICY IF EXISTS "Anyone can view wine images" ON storage.objects;

CREATE POLICY "Users can view their own wine images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'wine-images' AND auth.uid()::text = (storage.foldername(name))[1]);
