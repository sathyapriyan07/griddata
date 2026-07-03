-- Storage bucket for images (driver photos, team logos, circuit images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read images
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Allow admins to upload images
CREATE POLICY "Admin upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (auth.role() = 'authenticated' OR auth.uid() IS NOT NULL)
);

-- Allow admins to update images
CREATE POLICY "Admin update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images');

-- Allow admins to delete images
CREATE POLICY "Admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');
