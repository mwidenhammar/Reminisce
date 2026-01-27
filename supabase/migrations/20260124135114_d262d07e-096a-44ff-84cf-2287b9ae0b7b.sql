-- Table for memory contributions (other circle members adding their perspective)
CREATE TABLE public.memory_contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES public.family_circles(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL,
  transcript TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memory_contributions ENABLE ROW LEVEL SECURITY;

-- Circle members can view contributions for memories shared to their circle
CREATE POLICY "Circle members can view contributions"
ON public.memory_contributions
FOR SELECT
USING (is_circle_member(auth.uid(), circle_id));

-- Circle members can add contributions to shared memories
CREATE POLICY "Circle members can add contributions"
ON public.memory_contributions
FOR INSERT
WITH CHECK (
  auth.uid() = contributor_id 
  AND is_circle_member(auth.uid(), circle_id)
  AND EXISTS (
    SELECT 1 FROM memory_shares ms 
    WHERE ms.memory_id = memory_contributions.memory_id 
    AND ms.circle_id = memory_contributions.circle_id
  )
);

-- Contributors can delete their own contributions
CREATE POLICY "Contributors can delete own contributions"
ON public.memory_contributions
FOR DELETE
USING (auth.uid() = contributor_id);

-- Table for voice prompts (questions sent to memory creators)
CREATE TABLE public.voice_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  circle_id UUID NOT NULL REFERENCES public.family_circles(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES public.memories(id) ON DELETE SET NULL,
  transcript TEXT,
  audio_url TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_prompts ENABLE ROW LEVEL SECURITY;

-- Recipients can view prompts sent to them
CREATE POLICY "Recipients can view prompts"
ON public.voice_prompts
FOR SELECT
USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

-- Circle members can send prompts to other members
CREATE POLICY "Circle members can send prompts"
ON public.voice_prompts
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND is_circle_member(auth.uid(), circle_id)
);

-- Recipients can update prompts (mark as read)
CREATE POLICY "Recipients can update prompts"
ON public.voice_prompts
FOR UPDATE
USING (auth.uid() = recipient_id);

-- Senders can delete their prompts
CREATE POLICY "Senders can delete prompts"
ON public.voice_prompts
FOR DELETE
USING (auth.uid() = sender_id);

-- Table for notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('contribution', 'voice_prompt', 'memory_shared')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger functions)
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Function to create notification when contribution is added
CREATE OR REPLACE FUNCTION public.notify_on_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  memory_owner_id UUID;
  contributor_name TEXT;
  memory_title TEXT;
BEGIN
  -- Get memory owner
  SELECT user_id, title INTO memory_owner_id, memory_title
  FROM memories WHERE id = NEW.memory_id;
  
  -- Get contributor name
  SELECT COALESCE(display_name, 'A circle member') INTO contributor_name
  FROM profiles WHERE user_id = NEW.contributor_id;
  
  -- Don't notify if contributor is the memory owner
  IF memory_owner_id != NEW.contributor_id THEN
    INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
    VALUES (
      memory_owner_id,
      'contribution',
      'New perspective added',
      contributor_name || ' added their perspective to "' || COALESCE(memory_title, 'your memory') || '"',
      NEW.id,
      'memory_contribution'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for contribution notifications
CREATE TRIGGER on_contribution_created
AFTER INSERT ON public.memory_contributions
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_contribution();

-- Function to create notification when voice prompt is sent
CREATE OR REPLACE FUNCTION public.notify_on_voice_prompt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get sender name
  SELECT COALESCE(display_name, 'Someone') INTO sender_name
  FROM profiles WHERE user_id = NEW.sender_id;
  
  INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
  VALUES (
    NEW.recipient_id,
    'voice_prompt',
    'New voice message',
    sender_name || ' sent you a voice message',
    NEW.id,
    'voice_prompt'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for voice prompt notifications
CREATE TRIGGER on_voice_prompt_created
AFTER INSERT ON public.voice_prompts
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_voice_prompt();