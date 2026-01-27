import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Mic, Volume2, Loader2, Square, Eye, EyeOff } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface FollowUpQuestionsProps {
  photoUrl: string | null;
  mode: "audio" | "text";
  onDone: (additionalContent: string) => void;
  textSize: "small" | "medium" | "large";
  initialTranscript?: string;
}

const FALLBACK_QUESTIONS = [
  "Who else was with you in this moment?",
  "What sounds do you remember from that day?",
  "What emotions were you feeling?",
  "What happened right before or after this photo was taken?",
  "Is there something special about this moment?",
];

const FollowUpQuestions = ({ photoUrl, mode, onDone, textSize, initialTranscript }: FollowUpQuestionsProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [qaPairs, setQaPairs] = useState<
    Array<{
      question: string;
      answer: string;
    }>
  >([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const { generateFollowUpQuestion } = useAI();
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

  const textSizeClass = textSize === "small" ? "text-base" : textSize === "large" ? "text-xl" : "text-lg";

  // Update current answer with live transcript (audio mode)
  useEffect(() => {
    if (mode === "audio" && fullTranscript) {
      setCurrentAnswer(fullTranscript);
    }
  }, [fullTranscript, mode]);

  useEffect(() => {
    const loadFirstQuestion = async () => {
      // Only run if we are waiting for a question AND have a transcript to work with
      if (isLoadingQuestion && !currentQuestion && initialTranscript?.trim()) {
        console.log("First Call Context:", initialTranscript); // Debugging

        const question = await generateFollowUpQuestion(
          initialTranscript, // Arg 1: The Context (Must not be empty)
          undefined, // Arg 2: Options
          [], // Arg 3: No previous answers yet
        );

        setCurrentQuestion(question || FALLBACK_QUESTIONS[0]);
        setIsLoadingQuestion(false);
      }
    };

    loadFirstQuestion();
  }, [initialTranscript, isLoadingQuestion, currentQuestion]);

  const loadQuestion = async () => {
    // 1. Safety check: Don't run if already loading
    if (!isLoadingQuestion) setIsLoadingQuestion(true);

    // 2. The "Context" must be the initial story from the user
    // If initialTranscript is empty, the AI has no context!
    const context = initialTranscript?.trim() || "";

    // 3. For the FIRST question, previousAnswers will always be empty.
    // We only care about the context.
    const previousAnswers: string[] = [];

    try {
      const question = await generateFollowUpQuestion(
        context, // The AI uses this to understand the "Story"
        undefined,
        previousAnswers, // Empty for the first call
      );

      setCurrentQuestion(question || FALLBACK_QUESTIONS[0]);
    } catch (error) {
      setCurrentQuestion(FALLBACK_QUESTIONS[0]);
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const handleRecordToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setCurrentAnswer("");
      startListening();
    }
  };

  const handleNext = async () => {
    // Stop listening if in audio mode
    if (mode === "audio" && isListening) {
      stopListening();
    }
    const answerText = currentAnswer.trim();
    if (answerText) {
      // Store question-answer pair
      const newQaPairs = [
        ...qaPairs,
        {
          question: currentQuestion,
          answer: answerText,
        },
      ];
      setQaPairs(newQaPairs);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentAnswer("");
      if (mode === "audio") {
        resetTranscript();
      }

      // Load next AI question with all previous answers
      setIsLoadingQuestion(true);
      const previousAnswers = newQaPairs.map((qa) => qa.answer);
      const nextQuestion = await generateFollowUpQuestion(initialTranscript, undefined, previousAnswers);
      setCurrentQuestion(
        nextQuestion ||
          FALLBACK_QUESTIONS[currentQuestionIndex + 1] ||
          "Is there anything else you'd like to add about this memory?",
      );
      setIsLoadingQuestion(false);
    } else {
      // Skip without answer
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setCurrentQuestion(
        FALLBACK_QUESTIONS[currentQuestionIndex + 1] || "Is there anything else you'd like to add about this memory?",
      );
    }
  };

  const handleDone = () => {
    // Stop listening if in audio mode
    if (mode === "audio" && isListening) {
      stopListening();
    }

    // Include current answer if not empty
    const finalQaPairs = currentAnswer.trim()
      ? [
          ...qaPairs,
          {
            question: currentQuestion,
            answer: currentAnswer.trim(),
          },
        ]
      : qaPairs;

    // Format as Q&A pairs so users can see both questions and answers
    const formattedContent = finalQaPairs
      .filter((qa) => qa.answer)
      .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
      .join("\n\n");
    onDone(formattedContent);
  };

  // Show unsupported message for audio mode
  if (mode === "audio" && !isSupported) {
    return (
      <div className="fixed inset-0 z-40 bg-background pt-16 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-lg text-foreground mb-4">{t('conversation', 'speechNotSupported')}</p>
          <p className="text-muted-foreground">{t('conversation', 'tryBrowser')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-background pt-16">
      <div className="h-full flex">
        {/* Left Side - Questions */}
        <div className={`p-8 flex flex-col ${photoUrl ? "w-1/2 border-r border-border" : "w-full max-w-4xl mx-auto"}`}>
          {/* Recording Indicator */}
          {mode === "audio" && isListening && (
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
              <span className="text-destructive font-semibold">{t('conversation', 'listening')}</span>
            </div>
          )}

          {/* Question Card */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="bg-card rounded-2xl p-8 shadow-lg border border-border mb-6">
              <div className="flex items-start justify-between mb-4">
                <span className="text-sm text-foreground/50">{t('followUp', 'followUpQuestion')} {currentQuestionIndex + 1}</span>
                <button className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Play question audio">
                  <Volume2 className="w-5 h-5 text-primary" />
                </button>
              </div>
              <div className="min-h-[60px] flex items-center">
                {isLoadingQuestion ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('followUp', 'thinkingFollowUp')}</span>
                  </div>
                ) : (
                  <p className={`font-medium text-foreground ${textSizeClass}`}>{currentQuestion}</p>
                )}
              </div>
            </div>

            {/* Input Area */}
            {mode === "text" ? (
              <div className="space-y-4">
                <Textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder={t('followUp', 'typeAnswer')}
                  className={`min-h-[120px] resize-none ${textSizeClass}`}
                  disabled={isLoadingQuestion}
                />
                <div className="flex gap-3">
                  <Button onClick={handleNext} className="flex-1 gap-2" size="lg" disabled={isLoadingQuestion}>
                    {currentAnswer ? t('conversation', 'nextQuestion') : t('conversation', 'skipQuestion')}
                    {isLoadingQuestion ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Transcript Toggle */}
                <div className="flex justify-end">
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

                {/* Live Transcript Display */}
                <div className="min-h-[100px] max-h-[150px] overflow-y-auto p-4 rounded-xl border-2 border-dashed border-border bg-muted/30">
                  {showTranscript ? (
                    currentAnswer ? (
                      <p className={`text-foreground ${textSizeClass}`}>
                        {currentAnswer}
                        {isListening && <span className="animate-pulse text-primary">|</span>}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-center">
                        {isListening ? t('conversation', 'startSpeaking') : t('followUp', 'tapMicToAnswer')}
                      </p>
                    )
                  ) : (
                    <p className="text-muted-foreground text-center italic">
                      {isListening ? t('conversation', 'recordingInProgress') : t('followUp', 'tapMicToAnswer')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={handleRecordToggle}
                    disabled={isLoadingQuestion}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isListening ? "bg-destructive animate-pulse" : "bg-primary hover:bg-primary/90"} ${isLoadingQuestion ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isListening ? (
                      <Square className="w-8 h-8 text-primary-foreground" fill="currentColor" />
                    ) : (
                      <Mic className="w-8 h-8 text-primary-foreground" />
                    )}
                  </button>
                  <p className="text-sm text-foreground/60">{isListening ? t('conversation', 'tapToStop') : t('followUp', 'tapToAnswer')}</p>
                  <div className="flex gap-3">
                    <Button onClick={handleNext} variant="outline" className="gap-2" disabled={isLoadingQuestion}>
                      {currentAnswer ? t('conversation', 'nextQuestion') : t('conversation', 'skipQuestion')} <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Done Button */}
          <Button onClick={handleDone} variant="outline" size="lg" className="w-full">
            {t('conversation', 'imDone')}
          </Button>
        </div>

        {/* Right Side - Photo (only shown when photo exists) */}
        {photoUrl && (
          <div className="w-1/2 p-8 flex items-center justify-center bg-muted/20">
            <img
              src={photoUrl}
              alt={t('followUp', 'memoryPhoto')}
              className="max-w-full max-h-full object-contain rounded-xl shadow-xl"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowUpQuestions;