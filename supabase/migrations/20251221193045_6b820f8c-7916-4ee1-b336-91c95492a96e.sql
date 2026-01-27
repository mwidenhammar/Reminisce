-- Create storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory-audio', 'memory-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload audio files
CREATE POLICY "Users can upload their own audio"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'memory-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own audio files
CREATE POLICY "Users can view their own audio"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'memory-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access for audio playback
CREATE POLICY "Public can read audio files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'memory-audio');

-- Allow users to delete their own audio files
CREATE POLICY "Users can delete their own audio"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'memory-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);