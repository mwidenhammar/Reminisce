-- Add circle_id column to photos table for direct circle sharing
ALTER TABLE public.photos
ADD COLUMN circle_id UUID REFERENCES public.family_circles(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_photos_circle_id ON public.photos(circle_id) WHERE circle_id IS NOT NULL;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own photos or shared memory photos" ON public.photos;

-- Create new comprehensive SELECT policy
CREATE POLICY "Users can view own photos or circle-shared photos"
ON public.photos
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM memories m
    JOIN memory_shares ms ON ms.memory_id = m.id
    JOIN family_members fm ON fm.circle_id = ms.circle_id
    WHERE m.photo_id = photos.id AND fm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM family_members fm
    WHERE fm.circle_id = photos.circle_id AND fm.user_id = auth.uid()
  )
);

-- Drop existing INSERT policy to recreate with circle support
DROP POLICY IF EXISTS "Users can insert their own photos" ON public.photos;

-- Create new INSERT policy allowing circle uploads
CREATE POLICY "Users can insert their own photos"
ON public.photos
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
    circle_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.circle_id = photos.circle_id AND fm.user_id = auth.uid()
    )
  )
);