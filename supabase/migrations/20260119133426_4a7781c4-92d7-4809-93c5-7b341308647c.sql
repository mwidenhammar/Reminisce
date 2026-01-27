
-- Create profiles table for display names and avatars
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create family_circles table
CREATE TABLE public.family_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on family_circles
ALTER TABLE public.family_circles ENABLE ROW LEVEL SECURITY;

-- Create family_members table
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.family_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

-- Enable RLS on family_members
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Create memory_shares table
CREATE TABLE public.memory_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES public.family_circles(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (memory_id, circle_id)
);

-- Enable RLS on memory_shares
ALTER TABLE public.memory_shares ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is in a family circle
CREATE OR REPLACE FUNCTION public.is_circle_member(_user_id UUID, _circle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = _user_id AND circle_id = _circle_id
  )
$$;

-- Security definer function to check if user can access a shared memory
CREATE OR REPLACE FUNCTION public.can_access_shared_memory(_user_id UUID, _memory_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memory_shares ms
    JOIN public.family_members fm ON fm.circle_id = ms.circle_id
    WHERE ms.memory_id = _memory_id AND fm.user_id = _user_id
  )
$$;

-- Family circles RLS policies
CREATE POLICY "Users can view circles they belong to"
  ON public.family_circles FOR SELECT
  TO authenticated
  USING (public.is_circle_member(auth.uid(), id) OR owner_id = auth.uid());

CREATE POLICY "Users can create circles"
  ON public.family_circles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Only owner can update circle"
  ON public.family_circles FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Only owner can delete circle"
  ON public.family_circles FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Family members RLS policies
CREATE POLICY "Members can view their circle members"
  ON public.family_members FOR SELECT
  TO authenticated
  USING (public.is_circle_member(auth.uid(), circle_id));

CREATE POLICY "Circle owner can add members"
  ON public.family_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_circles
      WHERE id = circle_id AND owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Circle owner or self can remove"
  ON public.family_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.family_circles
      WHERE id = circle_id AND owner_id = auth.uid()
    )
  );

-- Memory shares RLS policies
CREATE POLICY "Users can view shares for their memories or circles"
  ON public.memory_shares FOR SELECT
  TO authenticated
  USING (
    shared_by = auth.uid()
    OR public.is_circle_member(auth.uid(), circle_id)
  );

CREATE POLICY "Memory owner can share"
  ON public.memory_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memories
      WHERE id = memory_id AND user_id = auth.uid()
    )
    AND public.is_circle_member(auth.uid(), circle_id)
  );

CREATE POLICY "Memory owner can unshare"
  ON public.memory_shares FOR DELETE
  TO authenticated
  USING (shared_by = auth.uid());

-- Update memories table to allow viewing shared memories
CREATE POLICY "Users can view shared memories"
  ON public.memories FOR SELECT
  TO authenticated
  USING (public.can_access_shared_memory(auth.uid(), id));

-- Auto-add owner as member when circle is created
CREATE OR REPLACE FUNCTION public.add_circle_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.family_members (circle_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_circle_created
  AFTER INSERT ON public.family_circles
  FOR EACH ROW EXECUTE FUNCTION public.add_circle_owner_as_member();

-- Add trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
