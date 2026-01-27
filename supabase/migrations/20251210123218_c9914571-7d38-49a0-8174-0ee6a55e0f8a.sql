-- Create storage policies for memory-photos bucket
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'memory-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'memory-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'memory-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access since bucket is public
CREATE POLICY "Anyone can view photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'memory-photos');