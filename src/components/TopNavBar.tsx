import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Settings, Check, HelpCircle, Contrast, LogOut, Globe } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { languageNames, SupportedLanguage } from "@/lib/i18n/translations";
import Walkthrough from "./Walkthrough";
import NotificationBell from "./NotificationBell";

interface Notification {
  id: string;
  type: "contribution" | "voice_prompt" | "memory_shared";
  title: string;
  message: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

interface TopNavBarProps {
  onHomeClick: () => void;
  textSize: "small" | "medium" | "large";
  onTextSizeChange: (size: "small" | "medium" | "large") => void;
  highContrast?: boolean;
  onHighContrastChange?: (enabled: boolean) => void;
  onNotificationClick?: (notification: Notification) => void;
}

const TopNavBar = ({
  onHomeClick,
  textSize,
  onTextSizeChange,
  highContrast = false,
  onHighContrastChange,
  onNotificationClick,
}: TopNavBarProps) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { toast } = useToast();
  const { t, language, setLanguage } = useTranslation();
  const { shouldShowWalkthroughOnLoad, completeOnboarding } = useOnboarding();
  const [hasTriggeredFirstTimeWalkthrough, setHasTriggeredFirstTimeWalkthrough] = useState(false);

  // Auto-open walkthrough for first-time users (only once)
  useEffect(() => {
    if (shouldShowWalkthroughOnLoad && !hasTriggeredFirstTimeWalkthrough) {
      setHasTriggeredFirstTimeWalkthrough(true);
      setWalkthroughOpen(true);
    }
  }, [shouldShowWalkthroughOnLoad, hasTriggeredFirstTimeWalkthrough]);

  const handleWalkthroughClose = (open: boolean) => {
    setWalkthroughOpen(open);
    if (!open && shouldShowWalkthroughOnLoad) {
      // Mark onboarding as complete when first-time user closes walkthrough
      completeOnboarding();
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: t('toast', 'signedOut'),
        description: t('toast', 'signedOutDesc'),
      });
      setSettingsOpen(false);
    } catch (error: any) {
      toast({
        title: t('toast', 'errorSigningOut'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const textSizeOptions: {
    value: "small" | "medium" | "large";
    label: string;
    preview: string;
  }[] = [
    {
      value: "small",
      label: t('settings', 'small'),
      preview: "Aa",
    },
    {
      value: "medium",
      label: t('settings', 'medium'),
      preview: "Aa",
    },
    {
      value: "large",
      label: t('settings', 'large'),
      preview: "Aa",
    },
  ];

  return (
    <>
      <TooltipProvider delayDuration={0}>
        <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/50">
          <div className="relative flex items-center justify-between px-4 py-3">
            {/* Home Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={onHomeClick}
                  className="gap-2 hover:bg-accent text-foreground"
                  aria-label={t('common', 'home')}
                >
                  <Home className="w-12 h-12" strokeWidth={2.5} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-base">
                <p>{t('common', 'home')}</p>
              </TooltipContent>
            </Tooltip>

            {/* Title - absolutely centered */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onHomeClick}
                  className="absolute left-1/2 -translate-x-1/2 text-9xl font-bold text-foreground tracking-wide hover:text-primary transition-colors"
                  aria-label="Reminisce - Go to home"
                >
                  Reminisce
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-base">
                <p>{t('common', 'home')}</p>
              </TooltipContent>
            </Tooltip>

            {/* Right side buttons */}
            <div className="flex items-center gap-1">
              {/* Notifications */}
              <NotificationBell onNotificationClick={onNotificationClick} />

              {/* Help/Walkthrough Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setWalkthroughOpen(true)}
                    className="gap-2 hover:bg-accent text-foreground"
                    aria-label={t('common', 'help')}
                  >
                    <HelpCircle className="w-10 h-10" strokeWidth={2.5} aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-base">
                  <p>{t('common', 'help')}</p>
                </TooltipContent>
              </Tooltip>

              {/* Settings Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setSettingsOpen(true)}
                    className="gap-2 hover:bg-accent text-foreground"
                    aria-label={t('common', 'settings')}
                  >
                    <Settings className="w-10 h-10" strokeWidth={2.5} aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-base">
                  <p>{t('common', 'settings')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>
      </TooltipProvider>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-foreground">{t('common', 'settings')}</DialogTitle>
          </DialogHeader>

          <div className="py-6 space-y-8">
            {/* Text Size Section */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">{t('settings', 'textSize')}</h3>
              <div className="flex gap-4">
                {textSizeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onTextSizeChange(option.value)}
                    className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${textSize === option.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
                  >
                    <span
                      className={`font-serif ${option.value === "small" ? "text-lg" : option.value === "medium" ? "text-2xl" : "text-3xl"}`}
                    >
                      {option.preview}
                    </span>
                    <span className="text-sm font-medium text-foreground/80">{option.label}</span>
                    {textSize === option.value && <Check className="w-5 h-5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Section */}
            <div className="border-t border-border pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground mb-2">{t('settings', 'language')}</h3>
                  <Select value={language} onValueChange={(value) => setLanguage(value as SupportedLanguage)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('settings', 'language')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(languageNames) as [SupportedLanguage, string][]).map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* High Contrast Section */}
            <div className="border-t border-border pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Contrast className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">{t('settings', 'colorAccessibility')}</h3>
                    <Switch checked={highContrast} onCheckedChange={(checked) => onHighContrastChange?.(checked)} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('settings', 'colorAccessibilityDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* Logout Section */}
            <div className="border-t border-border pt-6">
              <Button
                variant="ghost"
                className="w-full gap-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut className="w-5 h-5" />
                {loggingOut ? t('common', 'signingOut') : t('common', 'signOut')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Walkthrough */}
      <Walkthrough 
        open={walkthroughOpen} 
        onOpenChange={handleWalkthroughClose} 
        isFirstTime={shouldShowWalkthroughOnLoad}
      />
    </>
  );
};

export default TopNavBar;
