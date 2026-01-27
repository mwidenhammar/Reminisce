import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Eye, EyeOff } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useToast } from "@/hooks/use-toast";
import { uploadAudioRecording } from "@/lib/audioStorage";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";

interface RecordingInterfaceProps {
  photoUrl: string | null;
  onDone: (transcript: string, audioUrl?: string | null) => void;
  textSize: "small" | "medium" | "large";
}

const RecordingInterface = ({ photoUrl, onDone, textSize }: RecordingInterfaceProps) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { t } = useTranslation();

  const {
    isListening,
    fullTranscript,
    isSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onError: (error) => {
      toast({
        title: t('toast', 'speechRecognitionError'),
        description: error,
        variant: "destructive",
      });
    },
  });

  const textSizeClass = textSize === "small" ? "text-base" : textSize === "large" ? "text-xl" : "text-lg";

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isListening) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isListening]);

  const startAudioRecording = async () => {
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

      mediaRecorder.start();
    } catch (error) {
      console.error("Error starting audio recording:", error);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleRecordToggle = async () => {
    if (isListening) {
      stopListening();
      stopAudioRecording();
    } else {
      setRecordingTime(0);
      audioChunksRef.current = [];
      startListening();
      await startAudioRecording();
    }
  };

  const handleDone = async () => {
    if (isListening) {
      stopListening();
      stopAudioRecording();
    }
    
    if (!fullTranscript.trim()) {
      toast({
        title: t('toast', 'noRecording'),
        description: t('toast', 'pleaseRecordFirst'),
        variant: "destructive",
      });
      return;
    }

    // Wait a bit for final audio chunks
    await new Promise(resolve => setTimeout(resolve, 500));

    setIsUploading(true);

    try {
      // Upload audio to storage if we have chunks
      let audioUrl: string | null = null;
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          audioUrl = await uploadAudioRecording(audioBlob, user.id);
          console.log("Audio uploaded:", audioUrl);
        }
      }

      setIsUploading(false);
      onDone(fullTranscript.trim(), audioUrl);
    } catch (error) {
      console.error("Error uploading audio:", error);
      setIsUploading(false);
      onDone(fullTranscript.trim(), null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isSupported) {
    return (
      <div className="fixed inset-0 z-40 bg-background pt-16 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-lg text-foreground mb-4">
            {t('speechNotSupported', 'title')}
          </p>
          <p className="text-muted-foreground">
            {t('speechNotSupported', 'description')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-background pt-16">
      <div className="h-full flex">
        {/* Left Side - Recording Controls */}
        <div className="w-1/2 p-8 flex flex-col items-center justify-center border-r border-border">
          <div className="text-center mb-6">
            <h2 className={`font-bold text-foreground mb-2 ${textSizeClass}`}>
              {t('recording', 'shareYourMemory')}
            </h2>
            <p className="text-foreground/60">
              {t('recording', 'pressToSpeak')}
            </p>
          </div>

          {/* Recording Button */}
          <button
            onClick={handleRecordToggle}
            disabled={isUploading}
            className={`w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isListening
                ? "bg-destructive animate-pulse"
                : "bg-primary hover:bg-primary/90 hover:scale-105"
            } ${isUploading ? "opacity-50" : ""}`}
          >
            {isListening ? (
              <Square className="w-10 h-10 text-primary-foreground" fill="currentColor" />
            ) : (
              <Mic className="w-12 h-12 text-primary-foreground" />
            )}
          </button>

          {/* Recording Timer */}
          {isListening && (
            <div className="mt-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-2xl font-mono text-foreground">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            {isUploading ? t('recording', 'savingRecording') : isListening ? t('recording', 'tapToStop') : t('recording', 'tapToStart')}
          </p>

          {/* Live Transcript */}
          <div className="w-full max-w-md mt-6">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTranscript(!showTranscript)}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                {showTranscript ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showTranscript ? t('recording', 'hideText') : t('recording', 'showText')}
              </Button>
            </div>
            <div 
              className="min-h-[120px] max-h-[200px] overflow-y-auto p-4 rounded-xl border-2 border-dashed border-border bg-muted/30"
            >
              {showTranscript ? (
                fullTranscript ? (
                  <p className={`text-foreground ${textSizeClass}`}>
                    {fullTranscript}
                    {isListening && <span className="animate-pulse text-primary">|</span>}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-center">
                    {isListening ? t('recording', 'startSpeaking') : t('recording', 'wordsWillAppear')}
                  </p>
                )
              ) : (
                <p className="text-muted-foreground text-center italic">
                  {isListening ? t('recording', 'recordingInProgress') : t('recording', 'recordingNotStarted')}
                </p>
              )}
            </div>
          </div>

          {/* Done Button */}
          <Button
            onClick={handleDone}
            size="lg"
            variant="outline"
            className="mt-8 px-12 text-lg"
            disabled={!fullTranscript.trim() || isUploading}
          >
            {isUploading ? t('common', 'saving') : t('common', 'done')}
          </Button>
        </div>

        {/* Right Side - Photo */}
        <div className="w-1/2 p-8 flex items-center justify-center bg-muted/20">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={t('recording', 'memoryPhoto')}
              className="max-w-full max-h-full object-contain rounded-xl shadow-xl"
            />
          ) : (
            <div className="text-center text-foreground/50">
              <p>{t('recording', 'noPhotoSelected')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordingInterface;
