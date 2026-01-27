import { useState, useEffect } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface Memory {
  id: string;
  title: string;
  transcript: string;
  ai_enhancement: string | null;
  created_at: string;
}

interface CollectionSummaryProps {
  collectionName: string;
  memories: Memory[];
}

// Cache summaries in localStorage
const SUMMARY_CACHE_KEY = "reminisce-collection-summaries";
const CACHE_EXPIRY_HOURS = 24;

interface CachedSummary {
  summary: string;
  memoryIds: string[];
  timestamp: number;
}

interface SummaryCache {
  [collectionName: string]: CachedSummary;
}

const CollectionSummary = ({ collectionName, memories }: CollectionSummaryProps) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { language } = useLanguage();

  // Get current memory IDs for cache validation
  const currentMemoryIds = memories.map(m => m.id).sort().join(',');

  // Check cache on mount
  useEffect(() => {
    const cached = getCachedSummary(collectionName, currentMemoryIds);
    if (cached) {
      setSummary(cached);
      setHasGenerated(true);
    }
  }, [collectionName, currentMemoryIds]);

  const getCachedSummary = (collection: string, memoryIds: string): string | null => {
    try {
      const cacheStr = localStorage.getItem(SUMMARY_CACHE_KEY);
      if (!cacheStr) return null;
      
      const cache: SummaryCache = JSON.parse(cacheStr);
      const cached = cache[collection];
      
      if (!cached) return null;
      
      // Check if cache is expired (24 hours)
      const hoursOld = (Date.now() - cached.timestamp) / (1000 * 60 * 60);
      if (hoursOld > CACHE_EXPIRY_HOURS) return null;
      
      // Check if memories have changed
      if (cached.memoryIds.sort().join(',') !== memoryIds) return null;
      
      return cached.summary;
    } catch {
      return null;
    }
  };

  const setCachedSummary = (collection: string, summaryText: string, memoryIdList: string[]) => {
    try {
      const cacheStr = localStorage.getItem(SUMMARY_CACHE_KEY);
      const cache: SummaryCache = cacheStr ? JSON.parse(cacheStr) : {};
      
      cache[collection] = {
        summary: summaryText,
        memoryIds: memoryIdList,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Ignore cache errors
    }
  };

  const generateSummary = async () => {
    if (memories.length === 0) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-collection-summary', {
        body: {
          collectionName,
          memories: memories.map(m => ({
            title: m.title,
            transcript: m.transcript,
            ai_enhancement: m.ai_enhancement,
            created_at: m.created_at,
          })),
          language,
        },
      });

      if (error) throw error;
      
      if (data?.summary) {
        setSummary(data.summary);
        setCachedSummary(collectionName, data.summary, memories.map(m => m.id));
        setHasGenerated(true);
      }
    } catch (error: any) {
      console.error("Error generating summary:", error);
      
      // Handle specific error codes
      if (error.message?.includes('429') || error.status === 429) {
        toast({
          title: t('collectionSummary', 'rateLimitReached'),
          description: t('collectionSummary', 'rateLimitDesc'),
          variant: "destructive",
        });
      } else if (error.message?.includes('402') || error.status === 402) {
        toast({
          title: t('collectionSummary', 'aiCreditsNeeded'),
          description: t('collectionSummary', 'aiCreditsDesc'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('collectionSummary', 'couldntGenerate'),
          description: t('collectionSummary', 'tryAgainLater'),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't render if no memories
  if (memories.length === 0) return null;

  // Show generate button if no summary yet
  if (!summary && !loading) {
    return (
      <div className="mb-6 p-4 bg-wood-dark/40 rounded-xl border border-gold/20 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-parchment/80 font-serif text-sm">
              {t('collectionSummary', 'generateSummary')}
            </span>
          </div>
          <Button
            onClick={generateSummary}
            variant="outline"
            size="sm"
            className="bg-gold/20 border-gold/30 text-parchment hover:bg-gold/30 hover:text-parchment"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {t('collectionSummary', 'generate')}
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="mb-6 p-5 bg-wood-dark/40 rounded-xl border border-gold/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="animate-spin">
            <Sparkles className="w-5 h-5 text-gold" />
          </div>
          <span className="text-parchment/70 font-serif text-sm animate-pulse">
            {t('collectionSummary', 'weaving')}
          </span>
        </div>
      </div>
    );
  }

  // Show the summary
  return (
    <div className="mb-6 p-5 bg-wood-dark/40 rounded-xl border border-gold/20 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-parchment font-serif text-base leading-relaxed italic">
            "{summary}"
          </p>
        </div>
        <Button
          onClick={generateSummary}
          variant="ghost"
          size="icon"
          className="flex-shrink-0 text-parchment/50 hover:text-parchment hover:bg-wood-dark/50"
          title={t('collectionSummary', 'regenerate')}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CollectionSummary;