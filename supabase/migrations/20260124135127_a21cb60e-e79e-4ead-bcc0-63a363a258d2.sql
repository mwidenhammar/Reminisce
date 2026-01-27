-- Fix the overly permissive insert policy on notifications
-- Drop the old policy
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- Create a more restrictive policy - only allow trigger functions (via security definer) to insert
-- Since our triggers are SECURITY DEFINER, they bypass RLS, so we can make this policy restrictive
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Allow inserts only when user_id matches the authenticated user (for manual notifications)
  -- or via security definer functions (triggers bypass RLS anyway)
  auth.uid() = user_id
);