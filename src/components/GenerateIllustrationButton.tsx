import { useState } from "react";
import { Palette, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GenerateIllustrationButtonProps {
  memoryId: string;
  title: string;
  transcript: string;
  aiEnhancement: string | null;
  hasPhoto: boolean;
  hasGeneratedImage: boolean;
  onImageGenerated: (imageUrl: string) => void;
}

const GenerateIllustrationButton = ({
  memoryId,
  title,
  transcript,
  aiEnhancement,
  hasPhoto,
  hasGeneratedImage,
  onImageGenerated,
}: GenerateIllustrationButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Only show for memories without photos
  if (hasPhoto) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-memory-illustration', {
        body: {
          memoryId,
          title,
          transcript,
          aiEnhancement,
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onImageGenerated(data.imageUrl);
        toast({
          title: "Illustration created",
          description: "A unique illustration has been generated for your memory.",
        });
      }
    } catch (error: any) {
      console.error("Error generating illustration:", error);
      
      if (error.message?.includes('429') || error.status === 429) {
        toast({
          title: "Rate limit reached",
          description: "Please wait a moment and try again.",
          variant: "destructive",
        });
      } else if (error.message?.includes('402') || error.status === 402) {
        toast({
          title: "AI credits needed",
          description: "Add credits to your workspace to continue using AI features.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Couldn't generate illustration",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={loading}
      variant="outline"
      className="gap-2 bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Creating illustration...
        </>
      ) : (
        <>
          <Palette className="w-4 h-4" />
          {hasGeneratedImage ? "Regenerate Illustration" : "Generate Illustration"}
        </>
      )}
    </Button>
  );
};

export default GenerateIllustrationButton;
