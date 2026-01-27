import { Mic, PenLine, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface CaptureModeOverlayProps {
  onRecord: () => void;
  onWrite: () => void;
  onClose: () => void;
}

const CaptureModeOverlay = ({ onRecord, onWrite, onClose }: CaptureModeOverlayProps) => {
  const { t } = useTranslation();
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background animate-fade-in">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors"
        aria-label={t('common', 'close')}
      >
        <X className="w-8 h-8 text-foreground/70" />
      </button>

      <div className="text-center max-w-lg mx-auto px-6">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          {t('captureOverlay', 'title')}
        </h2>
        <p className="text-lg text-muted-foreground mb-12">
          {t('captureOverlay', 'subtitle')}
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          {/* Record Button */}
          <button
            onClick={onRecord}
            className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border-2 border-border hover:border-primary hover:bg-card/80 transition-all hover:scale-105 w-full sm:w-56 min-h-[220px]"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Mic className="w-10 h-10 text-primary" />
            </div>
            <span className="text-xl font-semibold text-foreground">{t('captureOverlay', 'record')}</span>
            <span className="text-sm text-muted-foreground text-center">{t('captureOverlay', 'recordDesc')}</span>
          </button>

          {/* Write Button */}
          <button
            onClick={onWrite}
            className="group flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border-2 border-border hover:border-primary hover:bg-card/80 transition-all hover:scale-105 w-full sm:w-56 min-h-[220px]"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <PenLine className="w-10 h-10 text-primary" />
            </div>
            <span className="text-xl font-semibold text-foreground">{t('captureOverlay', 'write')}</span>
            <span className="text-sm text-muted-foreground text-center">{t('captureOverlay', 'writeDesc')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaptureModeOverlay;
