-- Create profiles for existing users who don't have one
INSERT INTO public.profiles (user_id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email) 
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles);