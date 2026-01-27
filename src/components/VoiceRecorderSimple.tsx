import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, Square, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAI } from "@/hooks/useAI";

interface VoiceRecorderSimpleProps {
  selectedPhoto: string | null;
  onBack: () => void;
  onNext: (transcript: string) => void;
}

const VoiceRecorderSimple = ({ selectedPhoto, onBack, onNext }: VoiceRecorderSimpleProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { transcribeAudio } = useAI();

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
      toast({
        title: "Recording started",
        description: "Speak naturally about your memory",
      });
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record your memory",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);

      // Wait for final data
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(",")[1];
          const transcribedText = await transcribeAudio(base64Audio, "audio/webm");
          
          setIsTranscribing(false);
          
          if (transcribedText) {
            setTranscript(transcribedText);
            toast({
              title: "Recording complete",
              description: "Your memory has been transcribed",
            });
          } else {
            setTranscript("Your memory recording was captured but could not be transcribed automatically.");
            toast({
              title: "Transcription unavailable",
              description: "Recording saved with placeholder text",
            });
          }
        };
        
        reader.readAsDataURL(audioBlob);
      } catch (error) {
        setIsTranscribing(false);
        setTranscript("Your memory recording was captured.");
      }
    }
  };

  const handleNext = () => {
    if (!transcript.trim()) {
      toast({
        title: "No recording",
        description: "Please record a memory first",
        variant: "destructive",
      });
      return;
    }
    onNext(transcript);
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} size="lg" className="gap-2 hover:bg-accent text-base">
          <ArrowLeft className="w-5 h-5" />
          Back
        </Button>
      </div>

      {/* Open Book Layout */}
      <div className="relative">
        {/* Book binding shadow - only show when photo exists */}
        {selectedPhoto && (
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/20 via-black/40 to-black/20 z-10 hidden lg:block" />
        )}
        
        <div className={`grid min-h-[75vh] rounded-2xl overflow-hidden shadow-2xl border-4 border-leather ${selectedPhoto ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Left Page: Photo - only show when photo exists */}
          {selectedPhoto && (
            <div className="relative bg-parchment p-6 flex items-center justify-center">
              {/* Page texture overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-parchment via-parchment-dark/30 to-parchment opacity-50" />
              
              <div className="relative z-10 w-full max-w-md">
                <div className="rounded-lg overflow-hidden shadow-lg border-4 border-leather/50 transform rotate-1">
                  <img
                    src={selectedPhoto}
                    alt="Selected memory"
                    className="w-full h-auto object-contain"
                  />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-leather/70 italic text-sm">Your cherished moment</p>
                </div>
              </div>
              
              {/* Page fold effect */}
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-parchment-dark/40 to-transparent hidden lg:block" />
            </div>
          )}

          {/* Right Page: Recording Interface */}
          <div className="relative bg-parchment p-8 flex flex-col">
            {/* Page texture overlay */}
            <div className="absolute inset-0 bg-gradient-to-bl from-parchment via-parchment-dark/20 to-parchment opacity-50" />
            
            <div className="relative z-10 flex flex-col h-full">
              {/* Header */}
              <div className="mb-8 pb-4 border-b-2 border-leather/20 text-center">
                <h2 className="text-2xl font-serif font-bold text-leather">
                  Record Your Memory
                </h2>
                <p className="text-leather/60 mt-1">
                  Speak from your heart
                </p>
              </div>

              {/* Recording Section */}
              <div className="flex-1 flex flex-col items-center justify-center gap-8">
                {isTranscribing ? (
                  <div className="w-36 h-36 rounded-full bg-muted flex items-center justify-center border-4 border-gold/50">
                    <Loader2 className="w-16 h-16 text-leather animate-spin" />
                  </div>
                ) : !isRecording ? (
                  <button
                    onClick={startRecording}
                    className="group relative w-36 h-36 rounded-full bg-leather hover:bg-leather-light transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center border-4 border-gold/50"
                  >
                    <Mic className="w-16 h-16 text-gold group-hover:scale-110 transition-transform" />
                    {/* Decorative ring */}
                    <div className="absolute inset-0 rounded-full border-2 border-gold/30 animate-pulse" />
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="relative w-36 h-36 rounded-full bg-destructive hover:bg-destructive/90 transition-all duration-300 shadow-xl flex items-center justify-center border-4 border-white/30"
                  >
                    <Square className="w-14 h-14 text-white" />
                    {/* Recording pulse animation */}
                    <div className="absolute inset-0 rounded-full border-4 border-white/50 animate-ping" />
                  </button>
                )}
                
                <p className="text-lg text-leather/80 text-center max-w-sm font-serif">
                  {isTranscribing
                    ? "Transcribing your recording..."
                    : !isRecording
                    ? "Press the microphone to begin recording"
                    : "Recording... Press stop when finished"}
                </p>

                {/* Transcript Preview */}
                {transcript && (
                  <div className="w-full space-y-4 animate-fade-in">
                    <div 
                      className="p-6 bg-white/30 rounded-xl border-2 border-leather/20"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, hsl(var(--leather) / 0.1) 27px, hsl(var(--leather) / 0.1) 28px)',
                      }}
                    >
                      <h3 className="font-serif font-semibold mb-3 text-leather text-lg border-b border-leather/20 pb-2">
                        Your Words:
                      </h3>
                      <p className="text-leather/80 leading-relaxed font-serif">
                        {transcript}
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="lg"
                        onClick={handleNext}
                        className="gap-2 px-8 bg-leather hover:bg-leather-light text-parchment font-semibold"
                      >
                        Continue
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Page fold effect */}
            <div className="absolute top-0 left-0 w-12 h-12 bg-gradient-to-br from-parchment-dark/40 to-transparent hidden lg:block" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecorderSimple;
