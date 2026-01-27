-- Create albums table to store user-specific albums
CREATE TABLE public.albums (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Add album_id column to photos table to link photos to albums
ALTER TABLE public.photos ADD COLUMN album_id uuid REFERENCES public.albums(id) ON DELETE CASCADE;

-- Enable RLS on albums
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for albums
CREATE POLICY "Users can view their own albums"
ON public.albums
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own albums"
ON public.albums
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own albums"
ON public.albums
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own albums"
ON public.albums
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on albums
CREATE TRIGGER update_albums_updated_at
BEFORE UPDATE ON public.albums
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();