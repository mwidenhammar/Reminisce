import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Loader2, MessageCircleQuestion, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAI } from "@/hooks/useAI";
import { uploadAudioRecording } from "@/lib/audioStorage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CircleMember {
  user_id: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface SendVoicePromptProps {
  circleId: string;
  circleName: string;
  members: CircleMember[];
  memoryId?: string;
}

const SendVoicePrompt = ({
  circleId,
  circleName,
  members,
  memoryId,
}: SendVoicePromptProps) => {
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CircleMember | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { transcribeAudio } = useAI();

  const resetState = () => {
    setSelectedMember(null);
    setTranscript("");
    setAudioBlob(null);
    setIsRecording(false);
    setIsTranscribing(false);
  };

  const handleOpen = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
    setOpen(true);
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
    if (!selectedMember || !audioBlob) {
      toast({
        title: "Missing data",
        description: "Please record a message",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const audioUrl = await uploadAudioRecording(audioBlob, user.id);
      if (!audioUrl) throw new Error("Failed to upload audio");

      const { error } = await supabase.from("voice_prompts").insert({
        sender_id: user.id,
        recipient_id: selectedMember.user_id,
        circle_id: circleId,
        memory_id: memoryId || null,
        transcript: transcript || null,
        audio_url: audioUrl,
      });

      if (error) throw error;

      toast({
        title: "Message sent!",
        description: `Your voice message has been sent to ${selectedMember.profile?.display_name || "the member"}`,
      });

      setOpen(false);
      resetState();
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

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  // Filter out current user from members
  const otherMembers = members.filter(m => m.user_id !== currentUserId);

  return (
    <>
      <Button
        variant="outline"
        onClick={handleOpen}
        className="gap-2 border-gold/30 text-parchment hover:bg-wood-medium/50"
      >
        <MessageCircleQuestion className="w-4 h-4" />
        Send Voice Prompt
      </Button>

      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetState();
      }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-foreground">
              Send a Voice Prompt
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Record a question or prompt for a circle member
            </p>
          </DialogHeader>

          {!selectedMember ? (
            <div className="space-y-2 py-4">
              <p className="text-sm font-medium text-foreground mb-3">Select a member to send to:</p>
              {otherMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No other members in this circle
                </p>
              ) : (
                otherMembers.map((member) => (
                  <button
                    key={member.user_id}
                    onClick={() => setSelectedMember(member)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(member.profile?.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">
                      {member.profile?.display_name || "Circle Member"}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedMember.profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(selectedMember.profile?.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {selectedMember.profile?.display_name || "Circle Member"}
                  </p>
                  <p className="text-xs text-muted-foreground">Recording for...</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedMember(null)}>
                  Change
                </Button>
              </div>

              <div className="flex flex-col items-center gap-4 py-4">
                {isTranscribing ? (
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                ) : !isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!!audioBlob}
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
                    : audioBlob
                    ? "Recording complete"
                    : "Tap to record your question or prompt"}
                </p>
              </div>

              {transcript && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Your message:</p>
                  <p className="text-sm text-foreground">{transcript}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={resetState}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || !audioBlob}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SendVoicePrompt;