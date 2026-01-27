-- Drop existing restrictive SELECT policy on photos
DROP POLICY IF EXISTS "Users can view their own photos" ON public.photos;

-- Create new policy that allows viewing own photos AND photos from shared memories
CREATE POLICY "Users can view their own photos or shared memory photos"
ON public.photos
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.memories m
    JOIN public.memory_shares ms ON ms.memory_id = m.id
    JOIN public.family_members fm ON fm.circle_id = ms.circle_id
    WHERE m.photo_id = photos.id 
    AND fm.user_id = auth.uid()
  )
);