import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Send, Loader2, MessageSquarePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAI } from "@/hooks/useAI";
import { uploadAudioRecording } from "@/lib/audioStorage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ContributeToMemoryProps {
  memoryId: string;
  circleId: string;
  memoryTitle: string;
  onContributionAdded?: () => void;
}

const ContributeToMemory = ({
  memoryId,
  circleId,
  memoryTitle,
  onContributionAdded,
}: ContributeToMemoryProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"text" | "voice" | null>(null);
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { transcribeAudio } = useAI();

  const resetState = () => {
    setMode(null);
    setText("");
    setTranscript("");
    setAudioBlob(null);
    setIsRecording(false);
    setIsTranscribing(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);

      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(",")[1];
          const transcribedText = await transcribeAudio(base64Audio, "audio/webm");

          setIsTranscribing(false);
          setTranscript(transcribedText || "");
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        setIsTranscribing(false);
        toast({
          title: "Error",
          description: "Failed to process recording",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async () => {
    const content = mode === "text" ? text.trim() : transcript.trim();
    if (!content) {
      toast({
        title: "Empty contribution",
        description: "Please add some content first",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let audioUrl: string | null = null;
      if (mode === "voice" && audioBlob) {
        audioUrl = await uploadAudioRecording(audioBlob, user.id);
      }

      const { error } = await supabase.from("memory_contributions").insert({
        memory_id: memoryId,
        circle_id: circleId,
        contributor_id: user.id,
        transcript: content,
        audio_url: audioUrl,
      });

      if (error) throw error;

      toast({
        title: "Perspective added!",
        description: "Your contribution has been shared",
      });

      setOpen(false);
      resetState();
      onContributionAdded?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-2 border-gold/30 text-parchment hover:bg-wood-medium/50"
      >
        <MessageSquarePlus className="w-4 h-4" />
        Add Your Perspective
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetState();
      }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">
              Add Your Perspective
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Share your own memory or perspective about "{memoryTitle}"
            </p>
          </DialogHeader>

          {!mode ? (
            <div className="grid grid-cols-2 gap-4 py-6">
              <button
                onClick={() => setMode("voice")}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-primary" />
                </div>
                <span className="font-medium text-foreground">Record Voice</span>
              </button>
              <button
                onClick={() => setMode("text")}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquarePlus className="w-8 h-8 text-primary" />
                </div>
                <span className="font-medium text-foreground">Write Text</span>
              </button>
            </div>
          ) : mode === "text" ? (
            <div className="space-y-4 py-4">
              <Textarea
                placeholder="Share your perspective on this memory..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetState}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || !text.trim()}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Share
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4">
                {isTranscribing ? (
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                ) : !isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!!transcript}
                    className="w-24 h-24 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    <Mic className="w-10 h-10 text-primary-foreground" />
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-24 h-24 rounded-full bg-destructive hover:bg-destructive/90 flex items-center justify-center animate-pulse"
                  >
                    <Square className="w-8 h-8 text-destructive-foreground" />
                  </button>
                )}
                <p className="text-sm text-muted-foreground text-center">
                  {isTranscribing
                    ? "Transcribing..."
                    : isRecording
                    ? "Recording... tap to stop"
                    : transcript
                    ? "Recording complete"
                    : "Tap to start recording"}
                </p>
              </div>

              {transcript && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-foreground">{transcript}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetState}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || !transcript.trim()}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Share
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContributeToMemory;