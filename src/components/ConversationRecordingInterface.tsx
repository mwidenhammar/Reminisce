import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2, Mic, Square, Home, Eye, EyeOff } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useToast } from "@/hooks/use-toast";
import { uploadAudioRecording } from "@/lib/audioStorage";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";

interface ConversationRecordingInterfaceProps {
  onDone: (transcript: string, audioUrl?: string | null) => void;
  onHome?: () => void;
  textSize?: "small" | "medium" | "large";
}

const FALLBACK_QUESTIONS = [
  "Can you tell me about a favorite family tradition?",
  "What's a memory that always makes you smile?",
  "Who was someone special in your life growing up?",
  "What's a place that holds special meaning to you?",
  "Can you describe a moment you felt truly proud?",
];

const ConversationRecordingInterface = ({
  onDone,
  onHome,
  textSize = "medium",
}: ConversationRecordingInterfaceProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [allTranscripts, setAllTranscripts] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  
  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const allAudioChunksRef = useRef<Blob[]>([]); // Store all audio chunks across questions
  
  const { generateConversationQuestion } = useAI();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const {
    isListening,
    fullTranscript,
    transcript: finalTranscript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    onError: (error) => {
      toast({
        title: t('toast', 'speechRecognitionError'),
        description: error,
        variant: "destructive",
      });
    },
  });

  const textSizeClasses = {
    small: "text-lg",
    medium: "text-xl",
    large: "text-2xl",
  };

  useEffect(() => {
    loadFirstQuestion();
  }, []);

  // Update current answer with live transcript
  useEffect(() => {
    if (fullTranscript) {
      setCurrentAnswer(fullTranscript);
    }
  }, [fullTranscript]);

  const loadFirstQuestion = async () => {
    setIsLoadingQuestion(true);
    const question = await generateConversationQuestion([]);
    setCurrentQuestion(question || FALLBACK_QUESTIONS[0]);
    setIsLoadingQuestion(false);
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          allAudioChunksRef.current.push(event.data); // Also save to all chunks
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRecordToggle = () => {
    if (isListening) {
      stopListening();
      stopAudioRecording();
    } else {
      resetTranscript();
      setCurrentAnswer("");
      startListening();
      startAudioRecording();
    }
  };

  const handleNext = async () => {
    // Stop listening first
    if (isListening) {
      stopListening();
      stopAudioRecording();
    }
    
    const answerText = currentAnswer.trim() || finalTranscript.trim();
    
    // Only save Q&A if there's an answer (allow skipping)
    let newHistory = conversationHistory;
    if (answerText) {
      // Save Q&A
      setAllTranscripts(prev => [...prev, `Q: ${currentQuestion}\nA: ${answerText}`]);
      
      // Add to conversation history with ACTUAL transcript
      newHistory = [
        ...conversationHistory,
        { role: "assistant", content: currentQuestion },
        { role: "user", content: answerText },
      ];
      setConversationHistory(newHistory);
    }

    // Reset for next question
    resetTranscript();
    setCurrentAnswer("");
    audioChunksRef.current = [];

    // Generate next question based on conversation history (add skip hint if no answer)
    setIsLoadingQuestion(true);
    const nextQuestion = await generateConversationQuestion(
      answerText ? newHistory : [...newHistory, { role: "system", content: "The user skipped the previous question. Please ask about a completely different topic or memory." }]
    );
    
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
    } else if (currentQuestionIndex < FALLBACK_QUESTIONS.length - 1) {
      setCurrentQuestion(FALLBACK_QUESTIONS[currentQuestionIndex + 1]);
    }
    
    setCurrentQuestionIndex((prev) => prev + 1);
    setIsLoadingQuestion(false);
  };

  const handleDone = async () => {
    // Stop listening first
    if (isListening) {
      stopListening();
      stopAudioRecording();
    }

    // Wait a bit for the final audio chunk to land
    await new Promise((resolve) => setTimeout(resolve, 400));

    let finalTranscripts = [...allTranscripts];
    
    // Include current answer if any
    const answerText = currentAnswer.trim() || finalTranscript.trim();
    if (answerText) {
      finalTranscripts.push(`Q: ${currentQuestion}\nA: ${answerText}`);
    }
    
    if (finalTranscripts.length === 0) {
      toast({
        title: t('conversation', 'noResponsesRecorded'),
        description: t('conversation', 'pleaseRecordOne'),
        variant: "destructive",
      });
      return;
    }

    // Upload audio if we have any
    let audioUrl: string | null = null;
    if (allAudioChunksRef.current.length > 0) {
      setIsUploading(true);
      try {
        const audioBlob = new Blob(allAudioChunksRef.current, { type: "audio/webm" });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          audioUrl = await uploadAudioRecording(audioBlob, user.id);
          console.log("Conversation audio uploaded:", audioUrl);
        }
      } catch (error) {
        console.error("Error uploading conversation audio:", error);
      }
      setIsUploading(false);
    }

    const fullTranscriptText = finalTranscripts.join("\n\n");
    onDone(fullTranscriptText, audioUrl);
  };

  if (!isSupported) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-lg text-foreground mb-4">
            {t('conversation', 'speechNotSupported')}
          </p>
          <p className="text-muted-foreground">
            {t('conversation', 'tryBrowser')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        {/* Home Button */}
        {onHome && (
          <Button
            variant="ghost"
            size="lg"
            onClick={onHome}
            className="gap-2"
          >
            <Home className="w-6 h-6" />
            {t('conversation', 'home')}
          </Button>
        )}
        
        {/* Recording Status Indicator */}
        <div className="flex items-center gap-2">
          {isListening && (
            <>
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-destructive font-medium">{t('conversation', 'listening')}</span>
            </>
          )}
          {isUploading && (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-primary font-medium">{t('conversation', 'saving')}</span>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Illustration */}
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
          <div className="text-center">
            <div className="text-3xl">💬</div>
          </div>
        </div>

        {/* Question Label */}
        <div className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
          {t('conversation', 'question')} {currentQuestionIndex + 1}
        </div>

        {/* Current Question */}
        <div className="max-w-2xl text-center mb-6 min-h-[60px] flex items-center justify-center">
          {isLoadingQuestion ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t('conversation', 'thinkingQuestion')}</span>
            </div>
          ) : (
            <h4 className={`font-medium text-foreground leading-relaxed ${textSizeClasses[textSize]}`}>
              {currentQuestion}
            </h4>
          )}
        </div>

        {/* Live Transcript Display */}
        <div className="w-full max-w-2xl mb-6">
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscript(!showTranscript)}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              {showTranscript ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showTranscript ? t('conversation', 'hideText') : t('conversation', 'showText')}
            </Button>
          </div>
          <div 
            className="min-h-[120px] max-h-[200px] overflow-y-auto p-4 rounded-xl border-2 border-dashed border-border bg-muted/30"
          >
            {showTranscript ? (
              currentAnswer ? (
                <p className={`text-foreground ${textSizeClasses[textSize]}`}>
                  {currentAnswer}
                  {isListening && <span className="animate-pulse text-primary">|</span>}
                </p>
              ) : (
                <p className="text-muted-foreground text-center">
                  {isListening ? t('conversation', 'startSpeaking') : t('conversation', 'tapMicrophone')}
                </p>
              )
            ) : (
              <p className="text-muted-foreground text-center italic">
                {isListening ? t('conversation', 'recordingInProgress') : t('conversation', 'recordingNotInProgress')}
              </p>
            )}
          </div>
        </div>

        {/* Record Button */}
        <button
          onClick={handleRecordToggle}
          disabled={isLoadingQuestion || isUploading}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all mb-3 ${
            isListening
              ? "bg-destructive animate-pulse"
              : "bg-primary hover:bg-primary/90"
          } ${(isLoadingQuestion || isUploading) ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isListening ? (
            <Square className="w-8 h-8 text-primary-foreground" fill="currentColor" />
          ) : (
            <Mic className="w-8 h-8 text-primary-foreground" />
          )}
        </button>
        <p className="text-sm text-muted-foreground mb-6">
          {isListening ? t('conversation', 'tapToStop') : t('conversation', 'tapToStart')}
        </p>

        {/* Next Button */}
        <Button
          onClick={handleNext}
          variant="outline"
          size="lg"
          className="gap-2 text-lg"
          disabled={isLoadingQuestion || isUploading}
        >
          {currentAnswer || isListening ? t('conversation', 'nextQuestion') : t('conversation', 'skipQuestion')}
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Done Button */}
      <div className="p-6 flex justify-center">
        <Button
          onClick={handleDone}
          size="lg"
          className="px-12 text-xl py-6"
          disabled={isLoadingQuestion || isUploading}
        >
          {isUploading ? t('conversation', 'saving') : t('conversation', 'imDone')}
        </Button>
      </div>
    </div>
  );
};

export default ConversationRecordingInterface;