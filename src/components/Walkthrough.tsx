import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ChevronLeft, 
  ChevronRight, 
  Image, 
  BookOpen, 
  Mic, 
  Upload, 
  MessageCircle, 
  PenLine,
  Sparkles,
  Heart,
  Users,
  Bell,
  MessageSquare
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useOnboarding } from "@/hooks/useOnboarding";

interface WalkthroughProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFirstTime?: boolean;
}

// Animated illustration component
const AnimatedIllustration = ({ step, isActive }: { step: { icon: any; color: string }; isActive: boolean }) => {
  const Icon = step.icon;
  
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Outer ring animation */}
      <div 
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${step.color} transition-all duration-700 ${
          isActive ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
      />
      
      {/* Pulsing rings */}
      <div 
        className={`absolute inset-2 rounded-full border-2 border-primary/20 transition-all duration-1000 ${
          isActive ? "animate-ping opacity-50" : "opacity-0"
        }`}
        style={{ animationDuration: "2s" }}
      />
      
      {/* Inner circle */}
      <div 
        className={`absolute inset-4 rounded-full bg-card shadow-lg transition-all duration-500 ${
          isActive ? "scale-100" : "scale-90"
        }`}
      />
      
      {/* Icon */}
      <Icon 
        className={`relative z-10 w-12 h-12 text-primary transition-all duration-500 ${
          isActive ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
      />
      
      {/* Floating particles */}
      {isActive && (
        <>
          <div className="absolute top-2 right-4 w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0s", animationDuration: "1.5s" }} />
          <div className="absolute bottom-4 left-2 w-1.5 h-1.5 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: "0.3s", animationDuration: "1.8s" }} />
          <div className="absolute top-8 left-0 w-1 h-1 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0.6s", animationDuration: "2s" }} />
        </>
      )}
    </div>
  );
};

// Feature list item component
const FeatureItem = ({ feature, index, isActive }: { feature: { icon?: any; text: string } | string; index: number; isActive: boolean }) => {
  const isString = typeof feature === "string";
  const Icon = !isString && feature.icon;
  const text = isString ? feature : feature.text;
  
  return (
    <div 
      className={`flex items-center gap-3 transition-all duration-500 ${
        isActive ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 100 + 200}ms` }}
    >
      {Icon ? (
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      ) : (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
      )}
      <span className="text-foreground/80">{text}</span>
    </div>
  );
};

const Walkthrough = ({ open, onOpenChange, isFirstTime = false }: WalkthroughProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { t } = useTranslation();
  const { completeOnboarding } = useOnboarding();

  // Build walkthrough steps with translations
  const walkthroughSteps = [
    {
      title: t('walkthrough', 'welcomeTitle'),
      subtitle: t('walkthrough', 'welcomeSubtitle'),
      description: t('walkthrough', 'welcomeDesc'),
      icon: Heart,
      color: "from-rose-500/20 to-orange-500/20",
      features: [
        t('walkthrough', 'welcomeFeature1'),
        t('walkthrough', 'welcomeFeature2'),
        t('walkthrough', 'welcomeFeature3'),
      ],
    },
    {
      title: t('walkthrough', 'galleryTitle'),
      subtitle: t('walkthrough', 'gallerySubtitle'),
      description: t('walkthrough', 'galleryDesc'),
      icon: Image,
      color: "from-blue-500/20 to-cyan-500/20",
      features: [
        { icon: Upload, text: t('walkthrough', 'galleryFeature1') },
        { icon: Image, text: t('walkthrough', 'galleryFeature2') },
        { icon: Sparkles, text: t('walkthrough', 'galleryFeature3') },
      ],
    },
    {
      title: t('walkthrough', 'libraryTitle'),
      subtitle: t('walkthrough', 'librarySubtitle'),
      description: t('walkthrough', 'libraryDesc'),
      icon: BookOpen,
      color: "from-amber-500/20 to-yellow-500/20",
      features: [
        { icon: BookOpen, text: t('walkthrough', 'libraryFeature1') },
        { icon: PenLine, text: t('walkthrough', 'libraryFeature2') },
        { icon: Sparkles, text: t('walkthrough', 'libraryFeature3') },
      ],
    },
    {
      title: t('walkthrough', 'tellMemoryTitle'),
      subtitle: t('walkthrough', 'tellMemorySubtitle'),
      description: t('walkthrough', 'tellMemoryDesc'),
      icon: Mic,
      color: "from-green-500/20 to-emerald-500/20",
      features: [
        { icon: Mic, text: t('walkthrough', 'tellMemoryFeature1') },
        { icon: PenLine, text: t('walkthrough', 'tellMemoryFeature2') },
        { icon: Sparkles, text: t('walkthrough', 'tellMemoryFeature3') },
      ],
    },
    {
      title: t('walkthrough', 'letsTalkTitle'),
      subtitle: t('walkthrough', 'letsTalkSubtitle'),
      description: t('walkthrough', 'letsTalkDesc'),
      icon: MessageCircle,
      color: "from-purple-500/20 to-pink-500/20",
      features: [
        { icon: MessageCircle, text: t('walkthrough', 'letsTalkFeature1') },
        { icon: Sparkles, text: t('walkthrough', 'letsTalkFeature2') },
        { icon: Heart, text: t('walkthrough', 'letsTalkFeature3') },
      ],
    },
    {
      title: t('walkthrough', 'tellStoryTitle'),
      subtitle: t('walkthrough', 'tellStorySubtitle'),
      description: t('walkthrough', 'tellStoryDesc'),
      icon: PenLine,
      color: "from-teal-500/20 to-cyan-500/20",
      features: [
        { icon: Mic, text: t('walkthrough', 'tellStoryFeature1') },
        { icon: PenLine, text: t('walkthrough', 'tellStoryFeature2') },
        { icon: BookOpen, text: t('walkthrough', 'tellStoryFeature3') },
      ],
    },
    {
      title: t('walkthrough', 'sharedLibrariesTitle'),
      subtitle: t('walkthrough', 'sharedLibrariesSubtitle'),
      description: t('walkthrough', 'sharedLibrariesDesc'),
      icon: Users,
      color: "from-indigo-500/20 to-violet-500/20",
      features: [
        { icon: Users, text: t('walkthrough', 'sharedLibrariesFeature1') },
        { icon: MessageSquare, text: t('walkthrough', 'sharedLibrariesFeature2') },
        { icon: Bell, text: t('walkthrough', 'sharedLibrariesFeature3') },
      ],
    },
    {
      title: t('walkthrough', 'readyTitle'),
      subtitle: t('walkthrough', 'readySubtitle'),
      description: t('walkthrough', 'readyDesc'),
      icon: Sparkles,
      color: "from-primary/20 to-primary/10",
      features: [
        t('walkthrough', 'readyFeature1'),
        t('walkthrough', 'readyFeature2'),
        t('walkthrough', 'readyFeature3'),
      ],
    },
  ];

  // Reset animation state when step changes
  useEffect(() => {
    if (open) {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsAnimating(true), 50);
      return () => clearTimeout(timer);
    }
  }, [currentStep, open]);

  // Reset to first step when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setDontShowAgain(false);
    }
  }, [open]);

  const handleNext = () => {
    if (currentStep < walkthroughSteps.length - 1) {
      setIsAnimating(false);
      setTimeout(() => setCurrentStep(currentStep + 1), 100);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsAnimating(false);
      setTimeout(() => setCurrentStep(currentStep - 1), 100);
    }
  };

  const handleClose = () => {
    if (dontShowAgain || isFirstTime) {
      completeOnboarding(dontShowAgain);
    }
    onOpenChange(false);
  };

  const handleDotClick = (index: number) => {
    if (index !== currentStep) {
      setIsAnimating(false);
      setTimeout(() => setCurrentStep(index), 100);
    }
  };

  const step = walkthroughSteps[currentStep];
  const isLastStep = currentStep === walkthroughSteps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-card border-border p-0 overflow-hidden">

        {/* Step Counter */}
        <div className="absolute top-4 left-4 text-sm text-muted-foreground">
          {currentStep + 1} {t('walkthrough', 'stepOf')} {walkthroughSteps.length}
        </div>

        {/* Illustration Area */}
        <div className={`bg-gradient-to-br ${step.color} pt-16 pb-8 px-8 transition-colors duration-500`}>
          <div className="flex flex-col items-center">
            <AnimatedIllustration step={step} isActive={isAnimating} />
            
            <div 
              className={`mt-6 text-center transition-all duration-500 ${
                isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <p className="text-sm text-primary font-medium uppercase tracking-wider mb-1">
                {step.subtitle}
              </p>
              <h2 className="text-2xl font-bold text-foreground">
                {step.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-8 py-6">
          <p 
            className={`text-lg text-foreground/70 text-center leading-relaxed mb-6 transition-all duration-500 ${
              isAnimating ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            {step.description}
          </p>

          {/* Features List */}
          <div className="space-y-3">
            {step.features.map((feature, index) => (
              <FeatureItem 
                key={index} 
                feature={feature} 
                index={index} 
                isActive={isAnimating}
              />
            ))}
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 pb-4">
          {walkthroughSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => handleDotClick(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "bg-primary w-8"
                  : index < currentStep
                  ? "bg-primary/50 w-2"
                  : "bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Don't show again checkbox (only on last step for first-time users) */}
        {isLastStep && isFirstTime && (
          <div className="flex items-center justify-center gap-2 pb-4">
            <Checkbox 
              id="dontShowAgain" 
              checked={dontShowAgain} 
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label htmlFor="dontShowAgain" className="text-sm text-muted-foreground cursor-pointer">
              {t('walkthrough', 'dontShowAgain')}
            </label>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between px-8 pb-8">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common', 'back')}
          </Button>

          <Button onClick={handleNext} className="gap-2 px-8">
            {isLastStep ? (
              <>
                <Sparkles className="w-4 h-4" />
                {t('common', 'getStarted')}
              </>
            ) : (
              <>
                {t('common', 'next')}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Walkthrough;
