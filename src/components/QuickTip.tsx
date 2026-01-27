import { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuickTipProps {
  tipId: string;
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const QuickTip = ({ 
  tipId, 
  content, 
  children, 
  position = 'top',
  delay = 500 
}: QuickTipProps) => {
  const { shouldShowTip, markTipAsShown } = useOnboarding();
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    if (!shouldShowTip(tipId) || hasShown) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
      setHasShown(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [tipId, shouldShowTip, delay, hasShown]);

  const handleDismiss = () => {
    setIsOpen(false);
    markTipAsShown(tipId);
  };

  if (!shouldShowTip(tipId) && !isOpen) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side={position} 
          className="max-w-xs bg-primary text-primary-foreground p-3 rounded-lg shadow-lg"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm flex-1">{content}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 p-0 hover:bg-primary-foreground/20 text-primary-foreground"
              onClick={handleDismiss}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default QuickTip;
