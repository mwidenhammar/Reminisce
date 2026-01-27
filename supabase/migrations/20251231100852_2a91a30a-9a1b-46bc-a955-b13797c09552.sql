-- Create a table for memory captures (multiple audio recordings per memory)
CREATE TABLE public.memory_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  transcript TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.memory_captures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own memory captures"
ON public.memory_captures
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory captures"
ON public.memory_captures
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory captures"
ON public.memory_captures
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_memory_captures_memory_id ON public.memory_captures(memory_id);