import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import TopNavBar from "./TopNavBar";
import { useTranslation } from "@/hooks/useTranslation";

interface StoryWritingInterfaceProps {
  onDone: (text: string) => void;
  textSize?: "small" | "medium" | "large";
  onHomeClick?: () => void;
  onTextSizeChange?: (size: "small" | "medium" | "large") => void;
  photoUrl?: string | null;
}

const StoryWritingInterface = ({
  onDone,
  textSize = "medium",
  onHomeClick,
  onTextSizeChange,
  photoUrl,
}: StoryWritingInterfaceProps) => {
  const [text, setText] = useState("");
  const { t } = useTranslation();

  const textSizeClasses = {
    small: "text-base",
    medium: "text-lg",
    large: "text-xl",
  };

  const handleDone = () => {
    if (text.trim()) {
      onDone(text.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Top Navigation Bar */}
      <TopNavBar
        onHomeClick={onHomeClick || (() => {})}
        textSize={textSize}
        onTextSizeChange={onTextSizeChange || (() => {})}
      />

      <div className="flex-1 flex px-6 py-8 pt-20 gap-4">
        {/* Left side - Writing area */}
        <div className="flex-1 flex flex-col">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('storyWriting', 'placeholder')}
            className={`w-full flex-1 min-h-[300px] resize-none ${textSizeClasses[textSize]} bg-card border-2 border-border focus:border-primary`}
          />
          <div className="flex justify-center mt-4">
            <Button
              onClick={handleDone}
              size="lg"
              className="px-10 py-6 text-2xl"
              disabled={!text.trim()}
            >
              {t('storyWriting', 'imDone')}
            </Button>
          </div>
        </div>

        {/* Right side - Photo display (only if photoUrl provided) */}
        {photoUrl && (
          <div className="flex-1 flex items-center justify-center p-6 bg-muted/30 rounded-xl">
            <div 
              className="w-full max-w-md aspect-square rounded-2xl overflow-hidden shadow-xl"
              style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}
            >
              <img
                src={photoUrl}
                alt={t('storyWriting', 'memoryPhoto')}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryWritingInterface;
