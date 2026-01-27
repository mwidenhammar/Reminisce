import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Pause, Play, Loader2, Home, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadAudioRecording } from "@/lib/audioStorage";
import { supabase } from "@/integrations/supabase/client";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTranslation } from "@/hooks/useTranslation";

interface StoryRecordingInterfaceProps {
  onDone: (transcript: string, audioUrl?: string | null) => void;
  onHome?: () => void;
  textSize?: "small" | "medium" | "large";
  photoUrl?: string | null;
}

const StoryRecordingInterface = ({
  onDone,
  onHome,
  textSize = "medium",
  photoUrl,
}: StoryRecordingInterfaceProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
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
        title: t('storyRecording', 'speechRecognitionError'),
        description: error,
        variant: "destructive",
      });
    },
  });

  const textSizeClasses = {
    small: "text-base",
    medium: "text-lg",
    large: "text-xl",
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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

      // Use a timeslice so we reliably receive chunks while recording
      mediaRecorder.start(1000);
    } catch (error) {
      console.error("Error starting audio recording:", error);
    }
  };

  const stopAudioRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const startRecording = async () => {
    try {
      // Start speech recognition
      startListening();
      
      // Start audio recording
      await startAudioRecording();
      
      setIsRecording(true);
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: t('storyRecording', 'microphoneAccessDenied'),
        description: t('storyRecording', 'pleaseAllowMicrophone'),
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      stopListening(); // Pause speech recognition
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      startListening(); // Resume speech recognition
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  const handleDone = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Stop speech recognition
    stopListening();
    
    // Stop audio recording
    stopAudioRecording();

    // Wait a bit for the final audio chunk to land
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (recordingTime === 0 || audioChunksRef.current.length === 0) {
      // If we have transcript from speech recognition, use it
      if (fullTranscript) {
        onDone(fullTranscript, null);
      } else {
        onDone("");
      }
      return;
    }

    setIsUploading(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      
      // Upload audio to storage
      let audioUrl: string | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        audioUrl = await uploadAudioRecording(audioBlob, user.id);
        console.log("Audio uploaded:", audioUrl);
      }
      
      setIsUploading(false);
      
      // Use the speech recognition transcript
      const transcript = fullTranscript || "Recording captured.";
      onDone(transcript, audioUrl);
    } catch (error) {
      console.error("Error processing audio:", error);
      setIsUploading(false);
      onDone(fullTranscript || "Story recording captured.", null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    if (isUploading) return t('storyRecording', 'saving');
    if (isRecording && isPaused) return t('storyRecording', 'recordingPaused');
    if (isRecording) return t('storyRecording', 'recording');
    return t('storyRecording', 'readyToRecord');
  };

  const getInstructionText = () => {
    if (isUploading) return t('storyRecording', 'pleaseWait');
    if (isRecording && isPaused) return t('storyRecording', 'pressToResume');
    if (isRecording) return t('storyRecording', 'pressToPause');
    return t('storyRecording', 'pressToStart');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex animate-fade-in">
      {/* Home Button */}
      {onHome && (
        <div className="absolute top-6 left-6 z-10">
          <Button
            variant="ghost"
            size="lg"
            onClick={onHome}
            className="gap-2"
          >
            <Home className="w-6 h-6" />
            {t('storyRecording', 'home')}
          </Button>
        </div>
      )}

      {/* Left side - Recording controls */}
      <div className={`flex flex-col items-center justify-center px-6 ${photoUrl ? 'flex-1' : 'flex-1'}`}>
        {/* Illustration placeholder (only show if no photo) */}
        {!photoUrl && (
          <div className="w-48 h-48 rounded-full bg-muted flex items-center justify-center mb-8">
            <div className="text-center">
              <div className="text-6xl mb-2">📝</div>
              <p className="text-sm text-muted-foreground">{t('storyRecording', 'newMemory')}</p>
            </div>
          </div>
        )}

        <h2 className={`font-bold text-foreground mb-2 text-center ${textSizeClasses[textSize]}`}>
          {getStatusText()}
        </h2>
        <p className={`text-muted-foreground mb-4 text-center ${textSizeClasses[textSize]}`}>
          {getInstructionText()}
        </p>

        {/* Live Transcript Display */}
        {isRecording && (
          <div className="w-full max-w-md mb-4">
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTranscript(!showTranscript)}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                {showTranscript ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showTranscript ? t('storyRecording', 'hideText') : t('storyRecording', 'showText')}
              </Button>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
              {showTranscript ? (
                fullTranscript ? (
                  <p className="text-sm text-foreground">{fullTranscript}</p>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">{t('storyRecording', 'startSpeaking')}</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground text-center italic">
                  {isListening ? t('storyRecording', 'recordingInProgress') : t('storyRecording', 'recordingNotInProgress')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Timer */}
        <div className="text-4xl font-mono text-foreground mb-8">
          {formatTime(recordingTime)}
        </div>

        {/* Recording Button */}
        {isUploading ? (
          <div className="w-32 h-32 rounded-full flex items-center justify-center bg-muted">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
          </div>
        ) : (
          <button
            onClick={toggleRecording}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording && !isPaused
                ? "bg-destructive animate-pulse shadow-lg shadow-destructive/50"
                : isRecording && isPaused
                ? "bg-primary/50"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {!isRecording ? (
              <Mic className="w-16 h-16 text-primary-foreground" />
            ) : isPaused ? (
              <Play className="w-16 h-16 text-primary-foreground" />
            ) : (
              <Pause className="w-16 h-16 text-primary-foreground" />
            )}
          </button>
        )}

        {/* Recording status indicator */}
        {isRecording && !isPaused && !isUploading && (
          <div className="flex items-center gap-2 mt-6">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-destructive font-medium">{t('storyRecording', 'recordingIndicator')}</span>
          </div>
        )}

        {/* Done Button */}
        <div className="mt-8">
          <Button
            onClick={handleDone}
            size="lg"
            className="px-12 text-xl py-6"
            disabled={recordingTime === 0 || isUploading}
          >
            {isUploading ? t('storyRecording', 'saving') : t('storyRecording', 'imDone')}
          </Button>
        </div>
      </div>

      {/* Right side - Photo display (only if photoUrl provided) */}
      {photoUrl && (
        <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
          <div 
            className="w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-xl"
            style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}
          >
            <img
              src={photoUrl}
              alt={t('storyRecording', 'memoryPhoto')}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryRecordingInterface;
