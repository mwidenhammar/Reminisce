import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TextToSpeechButtonProps {
  text: string;
  label?: string;
  className?: string;
}

const TextToSpeechButton = ({
  text,
  label = "Read Aloud",
  className,
}: TextToSpeechButtonProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      // Stop speech when unmounting / navigating away
      try {
        window.speechSynthesis?.cancel();
      } catch {
        // ignore
      }
    };
  }, []);

  const stop = () => {
    try {
      window.speechSynthesis?.cancel();
    } finally {
      utteranceRef.current = null;
      setIsSpeaking(false);
    }
  };

  const handleToggle = () => {
    // If already speaking, stop
    if (isSpeaking) {
      stop();
      return;
    }

    if (!text?.trim()) {
      toast({
        title: "No text to read",
        description: "There's no content to read aloud.",
        variant: "destructive",
      });
      return;
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast({
        title: "Text-to-speech not supported",
        description: "Your browser doesn't support reading text aloud.",
        variant: "destructive",
      });
      return;
    }

    // Cancel any prior speech to avoid overlapping queues
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Try to select a reasonable voice (best-effort)
    const voices = window.speechSynthesis.getVoices?.() ?? [];
    const preferredLang = (navigator.language || "en").toLowerCase();
    const voice =
      voices.find((v) => v.lang?.toLowerCase() === preferredLang) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith(preferredLang.split("-")[0])) ||
      voices[0];
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
      toast({
        title: "Could not read aloud",
        description: "Your browser couldn't play text-to-speech.",
        variant: "destructive",
      });
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      className={
        className ||
        "bg-wood-dark/20 border-wood-dark/30 text-wood-dark hover:bg-wood-dark/30"
      }
      aria-pressed={isSpeaking}
    >
      {isSpeaking ? (
        <>
          <VolumeX className="w-4 h-4 mr-2" />
          Stop
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  );
};

export default TextToSpeechButton;

