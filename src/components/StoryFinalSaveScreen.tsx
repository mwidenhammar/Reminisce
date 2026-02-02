import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, X, Sparkles, Loader2, Trash2 } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { useTranslation } from "@/hooks/useTranslation";
import { TEXT_SIZE_CLASSES } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface StoryFinalSaveScreenProps {
  transcript: string;
  suggestedTitle: string;
  suggestedCollection: string;
  existingCollections?: string[];
  onSave: (title: string, collection: string) => void;
  onDelete?: () => void;
  textSize?: "small" | "medium" | "large";
}

const StoryFinalSaveScreen = ({
  transcript,
  suggestedTitle,
  suggestedCollection,
  existingCollections = [],
  onSave,
  onDelete,
  textSize = "medium",
}: StoryFinalSaveScreenProps) => {
  const [title, setTitle] = useState(suggestedTitle);
  const [collection, setCollection] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [localCollections, setLocalCollections] = useState<string[]>([]);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  const { generateTitle } = useAI();
  const { t } = useTranslation();

  // Using TEXT_SIZE_CLASSES from utils

  // Auto-generate title on mount if transcript exists
  useEffect(() => {
    if (transcript && transcript.length > 20 && !suggestedTitle) {
      handleGenerateTitle();
    }
  }, []);

  const handleGenerateTitle = async () => {
    if (!transcript || transcript.length < 10) return;
    
    setIsGeneratingTitle(true);
    const generatedTitle = await generateTitle(transcript);
    if (generatedTitle) {
      setTitle(generatedTitle);
    }
    setIsGeneratingTitle(false);
  };

  const handleSave = () => {
    if (!collection) return;
    onSave(title, collection);
  };

  const handleAddCollection = () => {
    if (newCollectionName.trim()) {
      const newName = newCollectionName.trim();
      setLocalCollections(prev => [...prev, newName]);
      setCollection(newName);
      setNewCollectionName("");
      setIsAddingCollection(false);
    }
  };

  // Combine existing collections with local ones and "Uncategorized" as default
  const uncategorizedLabel = t('storyFinalSave', 'uncategorized');
  const allCollections = [
    uncategorizedLabel, 
    ...existingCollections.filter(c => c !== "Uncategorized" && c !== uncategorizedLabel),
    ...localCollections.filter(c => !existingCollections.includes(c) && c !== "Uncategorized" && c !== uncategorizedLabel)
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background flex animate-fade-in">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col p-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">{t('storyFinalSave', 'saveYourMemory')}</h1>
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('storyFinalSave', 'deleteMemory')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('storyFinalSave', 'areYouSure')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('storyFinalSave', 'deleteWarning')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common', 'cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {t('storyFinalSave', 'yesDelete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Title Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm uppercase tracking-wider text-muted-foreground">
              {t('storyFinalSave', 'title')}
            </label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateTitle}
              disabled={isGeneratingTitle || !transcript}
              className="gap-1 text-xs h-7"
            >
              {isGeneratingTitle ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {t('storyFinalSave', 'generateTitle')}
            </Button>
          </div>
          {isEditingTitle ? (
            <div className="flex items-center gap-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`flex-1 ${TEXT_SIZE_CLASSES[textSize]} border-2 border-primary`}
                autoFocus
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsEditingTitle(false)}
              >
                <Check className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className={`${TEXT_SIZE_CLASSES[textSize]} font-medium text-foreground cursor-pointer p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-muted/50 transition-all group`}
            >
              <div className="flex items-center justify-between">
                <span>{isGeneratingTitle ? t('storyFinalSave', 'generating') : (title || t('storyFinalSave', 'untitledMemory'))}</span>
                <span className="text-sm text-muted-foreground group-hover:text-primary">{t('storyFinalSave', 'clickToEdit')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Collection Section */}
        <div className="mb-8">
          <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
            {t('storyFinalSave', 'collection')} <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {allCollections.map((col) => (
              <button
                key={col}
                onClick={() => setCollection(col)}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  collection === col
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                }`}
              >
                {col}
              </button>
            ))}
            {isAddingCollection ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder={t('storyFinalSave', 'newCollectionPlaceholder')}
                  className="w-40 h-9"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleAddCollection()}
                />
                <Button size="icon" variant="ghost" onClick={handleAddCollection}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setIsAddingCollection(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingCollection(true)}
                className="px-4 py-2 rounded-full text-sm bg-muted hover:bg-muted/80 text-foreground flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                {t('storyFinalSave', 'new')}
              </button>
            )}
          </div>
        </div>

        {/* Transcript Preview */}
        <div className="flex-1 mb-8">
          <label className="text-sm uppercase tracking-wider text-muted-foreground mb-2 block">
            {t('storyFinalSave', 'memoryPreview')}
          </label>
          <div className="bg-card rounded-xl p-4 border border-border max-h-[300px] overflow-y-auto">
            <p className={`${TEXT_SIZE_CLASSES[textSize]} text-foreground/80 whitespace-pre-wrap`}>
              {transcript || t('storyFinalSave', 'noContentRecorded')}
            </p>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          size="lg"
          className="w-full text-xl py-6"
          disabled={!collection}
        >
          {!collection ? t('storyFinalSave', 'selectCollectionToSave') : t('storyFinalSave', 'saveMemory')}
        </Button>
      </div>
    </div>
  );
};

export default StoryFinalSaveScreen;
