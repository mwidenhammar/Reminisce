import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/useTranslation";

interface WritingInterfaceProps {
  photoUrl: string | null;
  onDone: (text: string) => void;
  textSize: "small" | "medium" | "large";
}

const WritingInterface = ({ photoUrl, onDone, textSize }: WritingInterfaceProps) => {
  const [text, setText] = useState("");
  const { t } = useTranslation();

  const textSizeClass = textSize === "small" ? "text-base" : textSize === "large" ? "text-xl" : "text-lg";

  const handleDone = () => {
    if (text.trim()) {
      onDone(text.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background pt-16">
      <div className="h-full flex">
        {/* Left Side - Writing Area */}
        <div className="w-1/2 p-8 flex flex-col border-r border-border">
          <div className="mb-6">
            <h2 className={`font-bold text-foreground mb-2 ${textSizeClass}`}>
              {t('writing', 'writeYourMemory')}
            </h2>
            <p className="text-foreground/60">
              {t('writing', 'takeYourTime')}
            </p>
          </div>

          {/* Text Area */}
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('writing', 'placeholder')}
            className={`flex-1 resize-none ${textSizeClass} leading-relaxed`}
          />

          {/* Done Button */}
          <Button
            onClick={handleDone}
            size="lg"
            disabled={!text.trim()}
            className="mt-6 px-12 text-lg"
          >
            {t('common', 'done')}
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

export default WritingInterface;
