import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_KEY = 'hasCompletedOnboarding';
const SHOWN_TIPS_KEY = 'shownTips';
const DONT_SHOW_WALKTHROUGH_KEY = 'dontShowWalkthrough';

export const useOnboarding = () => {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  });

  const [dontShowWalkthrough, setDontShowWalkthrough] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(DONT_SHOW_WALKTHROUGH_KEY) === 'true';
  });

  const [shownTips, setShownTips] = useState<string[]>(() => {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(SHOWN_TIPS_KEY) || '[]');
    } catch {
      return [];
    }
  });

  // Check if this is a first-time user (never completed onboarding)
  const isFirstTimeUser = !hasCompletedOnboarding;

  // Should show walkthrough on load (first time and not opted out)
  const shouldShowWalkthroughOnLoad = isFirstTimeUser && !dontShowWalkthrough;

  // Complete onboarding
  const completeOnboarding = useCallback((dontShowAgain: boolean = false) => {
    setHasCompletedOnboarding(true);
    localStorage.setItem(ONBOARDING_KEY, 'true');
    
    if (dontShowAgain) {
      setDontShowWalkthrough(true);
      localStorage.setItem(DONT_SHOW_WALKTHROUGH_KEY, 'true');
    }
  }, []);

  // Mark a tip as shown
  const markTipAsShown = useCallback((tipId: string) => {
    setShownTips((prev) => {
      if (prev.includes(tipId)) return prev;
      const newTips = [...prev, tipId];
      localStorage.setItem(SHOWN_TIPS_KEY, JSON.stringify(newTips));
      return newTips;
    });
  }, []);

  // Check if a tip should be shown
  const shouldShowTip = useCallback((tipId: string) => {
    return !shownTips.includes(tipId);
  }, [shownTips]);

  // Reset onboarding (for testing)
  const resetOnboarding = useCallback(() => {
    setHasCompletedOnboarding(false);
    setDontShowWalkthrough(false);
    setShownTips([]);
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(DONT_SHOW_WALKTHROUGH_KEY);
    localStorage.removeItem(SHOWN_TIPS_KEY);
  }, []);

  return {
    isFirstTimeUser,
    hasCompletedOnboarding,
    shouldShowWalkthroughOnLoad,
    dontShowWalkthrough,
    shownTips,
    completeOnboarding,
    markTipAsShown,
    shouldShowTip,
    resetOnboarding,
  };
};

export default useOnboarding;
