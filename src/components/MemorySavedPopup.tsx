import { useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface MemorySavedPopupProps {
  onComplete: () => void;
}

const MemorySavedPopup = ({ onComplete }: MemorySavedPopupProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl p-10 max-w-md mx-4 shadow-2xl border border-border text-center animate-scale-in">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {t('memorySaved', 'savedToLibrary')}
        </h2>
        <p className="text-foreground/60">
          {t('memorySaved', 'returningHome')}
        </p>
      </div>
    </div>
  );
};

export default MemorySavedPopup;
