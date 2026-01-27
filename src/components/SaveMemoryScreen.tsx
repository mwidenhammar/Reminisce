import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Sparkles, FolderOpen, BookMarked, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { MemoryEpisode } from "@/types/memory";

interface SaveMemoryScreenProps {
  selectedPhoto: string | null;
  transcript: string;
  memoryType: "audio" | "text";
  onBack: () => void;
  onSave: (episode: MemoryEpisode) => void;
  existingCollections: string[];
}

const SaveMemoryScreen = ({
  selectedPhoto,
  transcript,
  memoryType,
  onBack,
  onSave,
  existingCollections,
}: SaveMemoryScreenProps) => {
  const [title, setTitle] = useState("");
  const [collection, setCollection] = useState("");
  const [aiAssist, setAiAssist] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: t('saveMemory', 'missingTitle'),
        description: t('saveMemory', 'addTitleDesc'),
        variant: "destructive",
      });
      return;
    }

    const episode: MemoryEpisode = {
      id: Date.now().toString(),
      title: title.trim(),
      photoUrl: selectedPhoto || "",
      transcript,
      timestamp: new Date(),
      collection: collection.trim() || t('finalSave', 'uncategorized'),
      type: memoryType,
    };

    onSave(episode);
    toast({
      title: t('saveMemory', 'memorySavedTitle'),
      description: t('saveMemory', 'memorySavedDesc'),
    });
  };

  const uniqueCollections = [...new Set(existingCollections.filter(c => c !== "Uncategorized"))];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 animate-fade-in">
      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl">
        {/* Backdrop glow */}
        <div className="absolute inset-0 bg-gold/10 blur-3xl rounded-full" />
        
        {/* Dialog Window */}
        <div className="relative bg-gradient-to-b from-leather to-leather-light rounded-3xl border-4 border-gold/40 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-leather border-b border-gold/30 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center border-2 border-gold/50">
                  <BookMarked className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {t('saveMemory', 'saveToLibrary')}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {t('saveMemory', 'organizeMemory')}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Preview Row */}
            <div className="flex gap-6 p-4 bg-card/50 rounded-xl border border-border">
              {selectedPhoto && (
                <div className="w-24 h-24 rounded-lg overflow-hidden border-2 border-gold/30 shrink-0">
                  <img
                    src={selectedPhoto}
                    alt="Memory"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground mb-1">{t('saveMemory', 'yourMemory')}</p>
                <p className="text-foreground text-sm leading-relaxed line-clamp-3">
                  {transcript}
                </p>
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-3">
              <label htmlFor="memory-title" className="block text-base font-semibold text-foreground">
                {t('saveMemory', 'giveTitle')}
              </label>
              <Input
                id="memory-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('saveMemory', 'titlePlaceholder')}
                className="text-base py-6 bg-card border-2 border-border focus:border-gold"
              />
            </div>

            {/* Collection Input */}
            <div className="space-y-3">
              <label htmlFor="memory-collection" className="block text-base font-semibold text-foreground flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-gold" />
                {t('saveMemory', 'addToCollection')}
              </label>
              <Input
                id="memory-collection"
                type="text"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder={t('saveMemory', 'collectionPlaceholder')}
                className="text-base py-6 bg-card border-2 border-border focus:border-gold"
                list="collections-list"
              />
              <datalist id="collections-list">
                {uniqueCollections.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              
              {/* Quick Collection Pills */}
              {uniqueCollections.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {uniqueCollections.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCollection(c)}
                      className={`px-4 py-2 text-sm rounded-full border-2 transition-all ${
                        collection === c
                          ? "bg-gold text-leather border-gold font-semibold"
                          : "bg-card/50 text-muted-foreground border-border hover:border-gold/50 hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Assist Toggle */}
            <div className="flex items-center space-x-4 p-5 bg-gradient-to-r from-primary/10 to-gold/10 rounded-xl border-2 border-primary/30">
              <Checkbox
                id="ai-assist"
                checked={aiAssist}
                onCheckedChange={(checked) => setAiAssist(checked === true)}
                className="w-6 h-6 border-2"
              />
              <label
                htmlFor="ai-assist"
                className="flex-1 cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="text-base font-semibold text-foreground">
                    {t('saveMemory', 'aiAssistTitle')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('saveMemory', 'aiAssistDesc')}
                </p>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-leather/50 border-t border-gold/30 px-8 py-6">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('saveMemory', 'goBack')}
              </Button>
              
              <Button
                size="lg"
                onClick={handleSave}
                disabled={!title.trim()}
                className="gap-3 px-8 bg-gold hover:bg-gold/90 text-leather font-bold shadow-lg hover:scale-105 transition-transform"
              >
                <Save className="w-5 h-5" />
                {t('saveMemory', 'saveToLibrary')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveMemoryScreen;