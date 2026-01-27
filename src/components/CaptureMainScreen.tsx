import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, BookOpen } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface CaptureMainScreenProps {
  onBack: () => void;
  onLetsTalk: () => void;
  onTellStory: () => void;
}

const CaptureMainScreen = ({
  onBack,
  onLetsTalk,
  onTellStory
}: CaptureMainScreenProps) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-40 bg-background animate-fade-in">
      <div className="container mx-auto px-6 py-8 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={onBack} size="lg" className="gap-2 hover:bg-accent text-base">
            <ArrowLeft className="w-5 h-5" />
            {t('common', 'back')}
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          <h1 className="text-4xl font-bold text-foreground mb-4 text-center">
            {t('capture', 'title')}
          </h1>
          <p className="text-xl text-muted-foreground mb-12 text-center">
            {t('capture', 'subtitle')}
          </p>

          {/* Two Main Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* Let's Talk Together */}
            <button onClick={onLetsTalk} className="group relative p-10 rounded-3xl bg-card border-2 border-border hover:border-primary transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl text-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mx-auto mb-6 transition-colors border-2 border-primary/30">
                <MessageCircle className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {t('capture', 'letsTalk')}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t('capture', 'letsTalkDesc')}
              </p>
            </button>

            {/* Tell Your Story */}
            <button onClick={onTellStory} className="group relative p-10 rounded-3xl bg-card border-2 border-border hover:border-primary transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl text-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mx-auto mb-6 transition-colors border-2 border-primary/30">
                <BookOpen className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">
                {t('capture', 'tellMemory')}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {t('capture', 'tellMemoryDesc')}
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptureMainScreen;
