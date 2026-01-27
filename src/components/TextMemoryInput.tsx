import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface TextMemoryInputProps {
  selectedPhoto: string | null;
  onBack: () => void;
  onNext: (text: string) => void;
}

const TextMemoryInput = ({ selectedPhoto, onBack, onNext }: TextMemoryInputProps) => {
  const [memoryText, setMemoryText] = useState("");
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleNext = () => {
    if (!memoryText.trim()) {
      toast({
        title: t('textMemoryInput', 'emptyMemory'),
        description: t('textMemoryInput', 'writeAboutMemory'),
        variant: "destructive",
      });
      return;
    }
    onNext(memoryText.trim());
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} size="lg" className="gap-2 hover:bg-accent text-base">
          <ArrowLeft className="w-5 h-5" />
          {t('common', 'back')}
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
                <div className="rounded-lg overflow-hidden shadow-lg border-4 border-leather/50">
                  <img
                    src={selectedPhoto}
                    alt="Selected memory"
                    className="w-full h-auto object-contain"
                  />
                </div>
                {/* Photo caption area */}
                <div className="mt-4 text-center">
                  <p className="text-leather/70 italic text-sm">{t('textMemoryInput', 'cherishedMoment')}</p>
                </div>
              </div>
              
              {/* Page fold effect */}
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-parchment-dark/40 to-transparent hidden lg:block" />
            </div>
          )}

          {/* Right Page: Journal Entry */}
          <div className="relative bg-parchment p-8 flex flex-col">
            {/* Page texture overlay */}
            <div className="absolute inset-0 bg-gradient-to-bl from-parchment via-parchment-dark/20 to-parchment opacity-50" />
            
            <div className="relative z-10 flex flex-col h-full">
              {/* Journal header */}
              <div className="mb-6 pb-4 border-b-2 border-leather/20">
                <h2 className="text-2xl font-serif font-bold text-leather">
                  {t('textMemoryInput', 'writeYourMemory')}
                </h2>
                <p className="text-leather/60 mt-1">
                  {t('textMemoryInput', 'whatMakesSpecial')}
                </p>
              </div>

              {/* Journal lines textarea */}
              <div className="flex-1 relative">
                <textarea
                  value={memoryText}
                  onChange={(e) => setMemoryText(e.target.value)}
                  placeholder={t('textMemoryInput', 'placeholder')}
                  className="w-full h-full min-h-[350px] p-4 bg-transparent text-leather text-lg leading-loose resize-none focus:outline-none placeholder:text-leather/40 font-serif"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, hsl(var(--leather) / 0.15) 31px, hsl(var(--leather) / 0.15) 32px)',
                    backgroundSize: '100% 32px',
                    lineHeight: '32px',
                  }}
                />
              </div>

              {/* Action button */}
              <div className="flex justify-end mt-6 pt-4 border-t-2 border-leather/20">
                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={!memoryText.trim()}
                  className="gap-2 px-8 bg-leather hover:bg-leather-light text-parchment"
                >
                  {t('textMemoryInput', 'continue')}
                  <ArrowRight className="w-5 h-5" />
                </Button>
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

export default TextMemoryInput;