-- Create a security definer function to join a circle by invite code
-- This bypasses RLS to allow looking up circles by invite code before membership
CREATE OR REPLACE FUNCTION public.join_circle_by_invite_code(_invite_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _circle_id UUID;
  _circle_name TEXT;
  _user_id UUID := auth.uid();
BEGIN
  -- Find the circle by invite code (bypasses RLS)
  SELECT id, name INTO _circle_id, _circle_name
  FROM public.family_circles
  WHERE invite_code = lower(trim(_invite_code));
  
  -- If no circle found, return error
  IF _circle_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (SELECT 1 FROM public.family_members WHERE circle_id = _circle_id AND user_id = _user_id) THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this circle');
  END IF;
  
  -- Add user as member
  INSERT INTO public.family_members (circle_id, user_id, role)
  VALUES (_circle_id, _user_id, 'member');
  
  -- Return success with circle info
  RETURN json_build_object(
    'success', true,
    'circle_id', _circle_id,
    'circle_name', _circle_name
  );
END;
$$;