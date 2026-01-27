import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, X, Sparkles, Loader2, Trash2 } from "lucide-react";
import { useAI } from "@/hooks/useAI";
import { useTranslation } from "@/hooks/useTranslation";
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

interface FinalSaveScreenProps {
  photoUrl: string | null;
  transcript: string;
  suggestedTitle: string;
  suggestedCollection: string;
  existingCollections?: string[];
  onSave: (title: string, collection: string) => void;
  onDelete?: () => void;
  textSize: "small" | "medium" | "large";
}

const FinalSaveScreen = ({
  photoUrl,
  transcript,
  suggestedTitle,
  suggestedCollection,
  existingCollections = [],
  onSave,
  onDelete,
  textSize,
}: FinalSaveScreenProps) => {
  const [title, setTitle] = useState(suggestedTitle);
  const [collection, setCollection] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [localCollections, setLocalCollections] = useState<string[]>([]);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  const { generateTitle } = useAI();
  const { t } = useTranslation();

  const textSizeClass = textSize === "small" ? "text-base" : textSize === "large" ? "text-xl" : "text-lg";

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
    onSave(title || t('finalSave', 'untitledMemory'), collection);
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
  const uncategorizedLabel = t('finalSave', 'uncategorized');
  const allCollections = [
    uncategorizedLabel, 
    ...existingCollections.filter(c => c !== "Uncategorized" && c !== uncategorizedLabel),
    ...localCollections.filter(c => !existingCollections.includes(c) && c !== "Uncategorized" && c !== uncategorizedLabel)
  ];

  return (
    <div className="fixed inset-0 z-40 bg-background pt-16">
      <div className="h-full flex">
        {/* Left Side - Form */}
        <div className={`${photoUrl ? 'w-1/2' : 'w-full'} p-8 flex flex-col ${photoUrl ? 'border-r border-border' : ''}`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className={`font-bold text-foreground ${textSizeClass}`}>
              {t('finalSave', 'saveYourMemory')}
            </h2>
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('finalSave', 'deleteMemory')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('finalSave', 'areYouSure')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('finalSave', 'deleteWarning')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common', 'cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {t('finalSave', 'yesDelete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Title Field */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground/70">
                {t('finalSave', 'title')}
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
                {t('finalSave', 'generateTitle')}
              </Button>
            </div>
            {editingTitle ? (
              <div className="flex gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`flex-1 ${textSizeClass} border-2 border-primary`}
                  autoFocus
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
                />
                <Button
                  onClick={() => setEditingTitle(false)}
                  size="icon"
                  variant="outline"
                >
                  <Check className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => setEditingTitle(true)}
                className={`p-3 rounded-lg ${textSizeClass} cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-muted/50 transition-all group`}
              >
                <div className="flex items-center justify-between">
                  <span>{isGeneratingTitle ? t('finalSave', 'generating') : (title || t('finalSave', 'untitledMemory'))}</span>
                  <span className="text-sm text-muted-foreground group-hover:text-primary">{t('finalSave', 'clickToEdit')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Collection Field */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-foreground/70 mb-2">
              {t('finalSave', 'collection')} <span className="text-destructive">*</span>
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
                    placeholder={t('finalSave', 'newCollectionPlaceholder')}
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
                  {t('finalSave', 'newCollection')}
                </button>
              )}
            </div>
          </div>

          {/* Preview of transcript */}
          <div className="flex-1 overflow-hidden">
            <label className="block text-sm font-medium text-foreground/70 mb-2">
              {t('finalSave', 'preview')}
            </label>
            <div className="h-full max-h-48 overflow-y-auto p-4 bg-muted/50 rounded-lg text-foreground/80 text-sm">
              {transcript}
            </div>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            size="lg"
            className="mt-6 text-lg"
            disabled={!collection}
          >
            {!collection ? t('finalSave', 'selectCollection') : t('finalSave', 'saveMemory')}
          </Button>
        </div>

        {/* Right Side - Photo (only show if photo exists) */}
        {photoUrl && (
          <div className="w-1/2 p-8 flex items-center justify-center bg-muted/20">
            <img
              src={photoUrl}
              alt="Memory photo"
              className="max-w-full max-h-full object-contain rounded-xl shadow-xl"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalSaveScreen;
