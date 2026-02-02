import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Loader2, Home } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { useTranslation } from "@/hooks/useTranslation";
import { TEXT_SIZE_CLASSES } from "@/lib/utils";

interface ConversationWritingInterfaceProps {
  onDone: (transcript: string) => void;
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

const ConversationWritingInterface = ({
  onDone,
  onHome,
  textSize = "medium",
}: ConversationWritingInterfaceProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(true);
  const [answers, setAnswers] = useState<Array<{ question: string; answer: string }>>([]);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);

  const { generateConversationQuestion } = useAI();
  const { t } = useTranslation();

  // Using TEXT_SIZE_CLASSES from utils for textarea

  const questionTextClasses = {
    small: "text-lg",
    medium: "text-xl",
    large: "text-2xl",
  };

  useEffect(() => {
    loadFirstQuestion();
  }, []);

  const loadFirstQuestion = async () => {
    setIsLoadingQuestion(true);
    const question = await generateConversationQuestion([]);
    setCurrentQuestion(question || FALLBACK_QUESTIONS[0]);
    setIsLoadingQuestion(false);
  };

  const handleNext = async () => {
    const answerText = currentAnswer.trim();
    
    // Only add to conversation history if there's an actual answer
    let newHistory = conversationHistory;
    if (answerText) {
      const newAnswers = [...answers];
      newAnswers[currentQuestionIndex] = { question: currentQuestion, answer: answerText };
      setAnswers(newAnswers);
      
      newHistory = [
        ...conversationHistory,
        { role: "assistant", content: currentQuestion },
        { role: "user", content: answerText },
      ];
      setConversationHistory(newHistory);
    }

    setIsLoadingQuestion(true);

    // Generate next question (pass skipped flag if no answer)
    const nextQuestion = await generateConversationQuestion(
      answerText ? newHistory : [...newHistory, { role: "system", content: "The user skipped the previous question. Please ask about a completely different topic or memory." }]
    );
    
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
    } else if (currentQuestionIndex < FALLBACK_QUESTIONS.length - 1) {
      setCurrentQuestion(FALLBACK_QUESTIONS[currentQuestionIndex + 1]);
    }

    setCurrentQuestionIndex((prev) => prev + 1);
    setCurrentAnswer("");
    setIsLoadingQuestion(false);
  };

  const handleDone = () => {
    // Save current answer
    const finalAnswers = [...answers];
    if (currentAnswer.trim()) {
      finalAnswers[currentQuestionIndex] = { question: currentQuestion, answer: currentAnswer.trim() };
    }

    // Build transcript
    const transcript = finalAnswers
      .filter(a => a && a.answer)
      .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
      .join("\n\n");

    onDone(transcript || t('conversation', 'noResponsesRecorded'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Home Button */}
      {onHome && (
        <div className="absolute top-6 left-6">
          <Button
            variant="ghost"
            size="lg"
            onClick={onHome}
            className="gap-2"
          >
            <Home className="w-6 h-6" />
            {t('conversation', 'home')}
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Illustration */}
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
          <div className="text-center">
            <div className="text-3xl mb-1">💬</div>
            <p className="text-xs text-muted-foreground">{t('conversation', 'conversationLabel')}</p>
          </div>
        </div>

        {/* Question Label */}
        <div className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
          {t('conversation', 'question')} {currentQuestionIndex + 1}
        </div>

        {/* Current Question */}
        <div className="max-w-2xl text-center mb-8 min-h-[60px] flex items-center justify-center">
          {isLoadingQuestion ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{t('conversation', 'thinkingQuestion')}</span>
            </div>
          ) : (
            <h4 className={`font-medium text-foreground leading-relaxed ${questionTextClasses[textSize]}`}>
              {currentQuestion}
            </h4>
          )}
        </div>

        {/* Answer Input with Side Button */}
        <div className="w-full max-w-3xl flex-1 flex gap-4">
          <div className="flex-1 flex flex-col">
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder={t('conversation', 'typeAnswerHere')}
              className={`w-full h-full min-h-[250px] resize-none ${TEXT_SIZE_CLASSES[textSize]} bg-card border-2 border-border focus:border-primary`}
              disabled={isLoadingQuestion}
            />

            {/* Show saved answer indicator */}
            {answers[currentQuestionIndex]?.answer && !currentAnswer && (
              <p className="text-sm text-muted-foreground mt-2">
                ✓ {t('conversation', 'answerSaved')}: "{answers[currentQuestionIndex].answer.substring(0, 50)}..."
              </p>
            )}

            {/* Next/Skip Button */}
            <Button
              onClick={handleNext}
              variant="outline"
              size="lg"
              className="gap-2 text-lg mt-4 self-center"
              disabled={isLoadingQuestion}
            >
              {isLoadingQuestion ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t('common', 'loading')}
                </>
              ) : (
                <>
                  {currentAnswer.trim() ? t('conversation', 'nextQuestion') : t('conversation', 'skipQuestion')}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </div>
          <div className="flex items-start pt-2">
            <Button
              onClick={handleDone}
              size="lg"
              className="px-10 py-6 text-2xl"
            >
              {t('conversation', 'imDone')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationWritingInterface;