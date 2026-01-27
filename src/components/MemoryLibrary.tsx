import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  BookOpen,
  Edit2,
  Mic,
  PenLine,
  Library,
  Trash2,
  FileText,
  Heart,
  Star,
  Sun,
  Moon,
  Cloud,
  Coffee,
  Music,
  Camera,
  Palette,
  Flower2,
  Home,
  Users,
  Dog,
  Cat,
  Car,
  Plane,
  Ship,
  Mountain,
  TreeDeciduous,
  X,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import QuickTip from "./QuickTip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CaptureModeOverlay from "./CaptureModeOverlay";
import CollectionSummary from "./CollectionSummary";
import GenerateIllustrationButton from "./GenerateIllustrationButton";
import AudioPlayer from "./AudioPlayer";
import TextToSpeechButton from "./TextToSpeechButton";
import ShareMemoryButton from "./ShareMemoryButton";

export interface MemoryCapture {
  id: string;
  memory_id: string;
  audio_url: string;
  transcript: string | null;
  created_at: string;
}

export interface CloudMemory {
  id: string;
  title: string;
  transcript: string;
  audio_url: string | null;
  ai_enhancement: string | null;
  generated_image_url: string | null;
  photo_id: string | null;
  photo_url?: string;
  created_at: string;
  collection: string;
  captures?: MemoryCapture[];
}

interface MemoryLibraryProps {
  onBack: () => void;
  onAddNewCapture?: (memoryId: string, mode: "record" | "write", photoUrl?: string | null) => void;
  focusedMemoryId?: string | null;
  onOpenSharedMemories?: () => void;
}

type LibraryView = "collections" | "collection-books" | "memory-view";

// Collection icons available for customization
const collectionIcons = [
  { icon: Library, name: "library" },
  { icon: Heart, name: "heart" },
  { icon: Star, name: "star" },
  { icon: Sun, name: "sun" },
  { icon: Moon, name: "moon" },
  { icon: Cloud, name: "cloud" },
  { icon: Coffee, name: "coffee" },
  { icon: Music, name: "music" },
  { icon: Camera, name: "camera" },
  { icon: Palette, name: "palette" },
  { icon: Flower2, name: "flower" },
  { icon: Home, name: "home" },
  { icon: Users, name: "users" },
  { icon: Dog, name: "dog" },
  { icon: Cat, name: "cat" },
  { icon: Car, name: "car" },
  { icon: Plane, name: "plane" },
  { icon: Ship, name: "ship" },
  { icon: Mountain, name: "mountain" },
  { icon: TreeDeciduous, name: "tree" },
];

// Soft, warm collection colors matching the cozy theme
const collectionColors = [
  {
    wood: "from-collection-amber/80 to-collection-amber",
    book: "bg-collection-amber",
    label: "amber",
    hex: "hsl(35, 60%, 52%)",
  },
  {
    wood: "from-collection-blue/80 to-collection-blue",
    book: "bg-collection-blue",
    label: "blue",
    hex: "hsl(210, 50%, 55%)",
  },
  {
    wood: "from-collection-green/80 to-collection-green",
    book: "bg-collection-green",
    label: "green",
    hex: "hsl(140, 40%, 45%)",
  },
  {
    wood: "from-collection-rose/80 to-collection-rose",
    book: "bg-collection-rose",
    label: "rose",
    hex: "hsl(350, 50%, 55%)",
  },
  {
    wood: "from-collection-purple/80 to-collection-purple",
    book: "bg-collection-purple",
    label: "purple",
    hex: "hsl(270, 40%, 55%)",
  },
  {
    wood: "from-collection-teal/80 to-collection-teal",
    book: "bg-collection-teal",
    label: "teal",
    hex: "hsl(180, 40%, 45%)",
  },
];

// Local storage key for collection settings
const COLLECTION_SETTINGS_KEY = "reminisce-collection-settings";

interface CollectionSettings {
  [collectionName: string]: {
    iconName: string;
    colorLabel: string;
  };
}

// Customize Collection Dialog Component
interface CustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionName: string | null;
  currentSettings?: { iconName: string; colorLabel: string };
  onSave: (iconName: string, colorLabel: string) => void;
}

const CustomizeCollectionDialog = ({
  open,
  onOpenChange,
  collectionName,
  currentSettings,
  onSave,
}: CustomizeDialogProps) => {
  const [selectedIcon, setSelectedIcon] = useState(currentSettings?.iconName || "library");
  const [selectedColor, setSelectedColor] = useState(currentSettings?.colorLabel || "amber");

  useEffect(() => {
    if (currentSettings) {
      setSelectedIcon(currentSettings.iconName || "library");
      setSelectedColor(currentSettings.colorLabel || "amber");
    } else {
      setSelectedIcon("library");
      setSelectedColor("amber");
    }
  }, [currentSettings, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-leather border-gold/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-parchment text-xl">Customize "{collectionName}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Icon Selection */}
          <div>
            <label className="block text-sm font-sans text-parchment/80 mb-3">Choose an icon</label>
            <div className="grid grid-cols-5 gap-2">
              {collectionIcons.map(({ icon: Icon, name }) => (
                <button
                  key={name}
                  onClick={() => setSelectedIcon(name)}
                  className={`p-3 rounded-lg transition-all ${
                    selectedIcon === name
                      ? "bg-gold text-leather shadow-lg scale-110"
                      : "bg-wood-dark/50 text-parchment/70 hover:bg-wood-medium/50 hover:text-parchment"
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto" />
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-sans text-parchment/80 mb-3">Choose a color</label>
            <div className="flex gap-3 flex-wrap">
              {collectionColors.map((color) => (
                <button
                  key={color.label}
                  onClick={() => setSelectedColor(color.label)}
                  className={`w-10 h-10 rounded-full transition-all ${color.book} ${
                    selectedColor === color.label
                      ? "ring-4 ring-gold ring-offset-2 ring-offset-leather scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-wood-dark/50 border-gold/30 text-parchment hover:bg-wood-medium/50"
          >
            Cancel
          </Button>
          <Button onClick={() => onSave(selectedIcon, selectedColor)} className="bg-gold text-leather hover:bg-gold/90">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MemoryLibrary = ({ onBack, onAddNewCapture, focusedMemoryId, onOpenSharedMemories }: MemoryLibraryProps) => {
  const [libraryView, setLibraryView] = useState<LibraryView>("collections");
  const [memories, setMemories] = useState<CloudMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<CloudMemory | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<CloudMemory | null>(null);
  const [showCaptureOverlay, setShowCaptureOverlay] = useState(false);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary">("transcript");
  const [collectionSettings, setCollectionSettings] = useState<CollectionSettings>({});
  const [customizeDialogOpen, setCustomizeDialogOpen] = useState(false);
  const [collectionToCustomize, setCollectionToCustomize] = useState<string | null>(null);
  const [openedBookId, setOpenedBookId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Load collection settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(COLLECTION_SETTINGS_KEY);
    if (saved) {
      setCollectionSettings(JSON.parse(saved));
    }
  }, []);

  const saveCollectionSettings = (settings: CollectionSettings) => {
    setCollectionSettings(settings);
    localStorage.setItem(COLLECTION_SETTINGS_KEY, JSON.stringify(settings));
  };

  const getCollectionIcon = (collection: string) => {
    const settings = collectionSettings[collection];
    if (settings?.iconName) {
      const found = collectionIcons.find((i) => i.name === settings.iconName);
      return found?.icon || Library;
    }
    return Library;
  };

  const getCollectionColor = (collection: string) => {
    const settings = collectionSettings[collection];
    if (settings?.colorLabel) {
      const found = collectionColors.find((c) => c.label === settings.colorLabel);
      if (found) return found;
    }
    // Default to index-based color
    const index = collections.indexOf(collection);
    return collectionColors[index % collectionColors.length];
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  // Navigate to focused memory's bookshelf when provided
  useEffect(() => {
    if (focusedMemoryId && memories.length > 0) {
      const memory = memories.find((m) => m.id === focusedMemoryId);
      if (memory) {
        setSelectedCollection(memory.collection);
        setOpenedBookId(focusedMemoryId); // Highlight the book
        setLibraryView("collection-books");
      }
    }
  }, [focusedMemoryId, memories]);

  const fetchMemories = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch memories with photo URLs via join
    const { data, error } = await supabase
      .from("memories")
      .select(
        `
        *,
        photos:photo_id (
          url
        )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching memories:", error);
      toast({ title: "Error loading memories", variant: "destructive" });
    } else if (data) {
      // Fetch all captures for these memories
      const memoryIds = data.map((m: any) => m.id);
      const { data: capturesData } = await supabase
        .from("memory_captures")
        .select("*")
        .in("memory_id", memoryIds)
        .order("created_at", { ascending: true });

      const capturesByMemory: Record<string, MemoryCapture[]> = {};
      if (capturesData) {
        capturesData.forEach((c: any) => {
          if (!capturesByMemory[c.memory_id]) {
            capturesByMemory[c.memory_id] = [];
          }
          capturesByMemory[c.memory_id].push(c);
        });
      }

      const memoriesWithCollection = data.map((m: any) => ({
        ...m,
        photo_url: m.photos?.url || null,
        collection: extractCollection(m.title) || "Memories",
        captures: capturesByMemory[m.id] || [],
      }));
      setMemories(memoriesWithCollection);
    }
    setLoading(false);
  };

  const extractCollection = (title: string): string => {
    const match = title.match(/\[([^\]]+)\]$/);
    return match ? match[1] : "Memories";
  };

  const getCleanTitle = (title: string): string => {
    return title.replace(/\s*\[[^\]]+\]$/, "");
  };

  // Filter memories based on search query
  const filteredMemories = useMemo(() => {
    if (!searchQuery.trim()) return memories;
    const query = searchQuery.toLowerCase();
    return memories.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.transcript.toLowerCase().includes(query) ||
        (m.ai_enhancement && m.ai_enhancement.toLowerCase().includes(query)),
    );
  }, [memories, searchQuery]);

  const collections = [...new Set(filteredMemories.map((m) => m.collection))];

  const collectionMemories = selectedCollection
    ? filteredMemories.filter((m) => m.collection === selectedCollection)
    : [];

  const getColorForCollection = (collection: string) => {
    return getCollectionColor(collection);
  };

  const handleCustomizeCollection = (collection: string) => {
    setCollectionToCustomize(collection);
    setCustomizeDialogOpen(true);
  };

  const handleSaveCustomization = (iconName: string, colorLabel: string) => {
    if (!collectionToCustomize) return;

    const newSettings = {
      ...collectionSettings,
      [collectionToCustomize]: { iconName, colorLabel },
    };
    saveCollectionSettings(newSettings);
    setCustomizeDialogOpen(false);
    setCollectionToCustomize(null);
  };

  const handleDeleteMemory = async (memory: CloudMemory) => {
    const { error } = await supabase.from("memories").delete().eq("id", memory.id);

    if (error) {
      toast({ title: "Failed to delete memory", variant: "destructive" });
    } else {
      setMemories((prev) => prev.filter((m) => m.id !== memory.id));
      toast({ title: "Memory deleted" });
      if (selectedMemory?.id === memory.id) {
        goBackToBooks();
      }
    }
    setDeleteDialogOpen(false);
    setMemoryToDelete(null);
  };

  const handleUpdateTitle = async (memoryId: string) => {
    if (!editedTitle.trim()) return;

    const memory = memories.find((m) => m.id === memoryId);
    if (!memory) return;

    const newTitle = `${editedTitle.trim()} [${memory.collection}]`;

    const { error } = await supabase.from("memories").update({ title: newTitle }).eq("id", memoryId);

    if (error) {
      toast({ title: "Failed to update title", variant: "destructive" });
    } else {
      setMemories((prev) => prev.map((m) => (m.id === memoryId ? { ...m, title: newTitle } : m)));
      if (selectedMemory?.id === memoryId) {
        setSelectedMemory({ ...selectedMemory, title: newTitle });
      }
    }
    setEditingTitle(null);
  };

  const openCollection = (collection: string) => {
    setSelectedCollection(collection);
    setLibraryView("collection-books");
  };

  const openMemoryView = (memory: CloudMemory) => {
    setSelectedMemory(memory);
    setActiveTab("transcript");
    setLibraryView("memory-view");
  };

  const goBackToCollections = () => {
    setSelectedCollection(null);
    setLibraryView("collections");
  };

  const goBackToBooks = () => {
    setSelectedMemory(null);
    setLibraryView("collection-books");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-muted-foreground font-serif">Loading your library...</div>
      </div>
    );
  }

  const { t } = useTranslation();

  // Your Library View - Cozy Bookshelves
  if (libraryView === "collections") {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in py-8 px-4">
        {/* Title with warm serif font */}
        <div className="flex items-center justify-between mb-6">
          <QuickTip tipId="library" content={t('tips', 'libraryTip')}>
            <h1 className="text-4xl font-display font-semibold text-parchment tracking-wide">
              {t('library', 'yourLibrary')}
            </h1>
          </QuickTip>
          {onOpenSharedMemories && (
            <Button
              variant="outline"
              size="sm"
              className="bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50"
              onClick={onOpenSharedMemories}
            >
              <Users className="w-4 h-4 mr-2" />
              {t('library', 'sharedLibraries')}
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-parchment/50" />
            <Input
              type="text"
              placeholder="Search memories by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-wood-dark/50 border-gold/30 text-parchment placeholder:text-parchment/50 focus:border-gold/60"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-parchment/50 hover:text-parchment"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-parchment/60 mt-2 text-center">
              Found {filteredMemories.length} {filteredMemories.length === 1 ? "memory" : "memories"}
            </p>
          )}
        </div>

        {collections.length === 0 ? (
          <div className="text-center py-20 bg-wood-dark/30 rounded-3xl border-2 border-dashed border-gold/30 backdrop-blur-sm">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-wood-medium/50 flex items-center justify-center shadow-lg">
              <Library className="w-12 h-12 text-parchment/70" />
            </div>
            <h3 className="text-2xl font-serif font-medium mb-2 text-parchment">Your library is empty</h3>
            <p className="text-parchment/60 font-sans">Start capturing memories to see them here.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Bookshelf grid - 3 per row */}
            <div className="grid grid-cols-3 gap-8">
              {collections.map((collection) => {
                const colors = getColorForCollection(collection);
                const count = memories.filter((m) => m.collection === collection).length;
                const IconComponent = getCollectionIcon(collection);

                return (
                  <div key={collection} className="group flex flex-col items-center">
                    <button
                      onClick={() => openCollection(collection)}
                      className="flex flex-col items-center transition-transform hover:scale-105"
                    >
                      {/* Wooden bookshelf icon with books and custom icon */}
                      <div className="relative w-28 h-32">
                        {/* Shelf back */}
                        <div
                          className="absolute inset-0 bg-gradient-to-b from-wood-light to-wood-dark rounded-lg shadow-lg"
                          style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,0.3)" }}
                        />
                        {/* Custom icon - centered with collection color */}
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <IconComponent className="w-10 h-10 drop-shadow-lg" style={{ color: colors.hex }} />
                        </div>
                      </div>
                    </button>
                    {/* Collection label */}
                    <span className="mt-4 text-base font-serif font-medium text-parchment text-center">
                      {collection}
                    </span>
                    <span className="text-sm text-parchment/60 font-sans">
                      {count} {count === 1 ? "memory" : "memories"}
                    </span>
                    {/* Customize button */}
                    <Button
                      data-customize-button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCustomizeCollection(collection)}
                      className="mt-1 text-xs text-parchment/50 hover:text-parchment hover:bg-wood-dark/30 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Customize
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-leather border-gold/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif text-parchment">Delete this memory?</AlertDialogTitle>
              <AlertDialogDescription className="text-parchment/70">
                This action cannot be undone. This will permanently delete "
                {memoryToDelete ? getCleanTitle(memoryToDelete.title) : ""}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-wood-dark/50 border-gold/30 text-parchment hover:bg-wood-medium/50">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => memoryToDelete && handleDeleteMemory(memoryToDelete)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Customize Collection Dialog */}
        <CustomizeCollectionDialog
          open={customizeDialogOpen}
          onOpenChange={setCustomizeDialogOpen}
          collectionName={collectionToCustomize}
          currentSettings={collectionToCustomize ? collectionSettings[collectionToCustomize] : undefined}
          onSave={handleSaveCustomization}
        />
      </div>
    );
  }

  // Collection View - Books on wooden shelf
  if (libraryView === "collection-books" && selectedCollection) {
    const colors = getColorForCollection(selectedCollection);

    return (
      <div className="max-w-4xl mx-auto animate-fade-in py-8 px-4">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={goBackToCollections}
            className="gap-2 text-parchment hover:bg-wood-dark/50 hover:text-parchment"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-display font-semibold text-parchment ml-2">{selectedCollection}</h1>
        </div>

        {/* Collection Summary */}
        <CollectionSummary collectionName={selectedCollection} memories={collectionMemories} />

        {/* Wooden Bookshelf Container */}
        <div
          className="bg-gradient-to-b from-wood-light/90 to-wood-dark rounded-2xl p-8 shadow-xl relative"
          style={{ boxShadow: "inset 0 4px 12px rgba(0,0,0,0.3), 0 10px 40px rgba(0,0,0,0.4)" }}
          onClick={() => setOpenedBookId(null)}
        >
          {/* Shelf rows */}
          {collectionMemories.length > 0 ? (
            Array.from({ length: Math.ceil(collectionMemories.length / 6) }).map((_, rowIndex) => (
              <div key={rowIndex} className="mb-6 last:mb-0">
                <div className="flex gap-6 justify-evenly px-4">
                  {collectionMemories.slice(rowIndex * 6, rowIndex * 6 + 6).map((memory, bookIndex) => {
                    const isOpened = openedBookId === memory.id;

                    return (
                      <div
                        key={memory.id}
                        className={`relative transform transition-all duration-300 ${bookIndex === 0 ? "-rotate-1" : bookIndex === 5 ? "rotate-1" : ""} ${isOpened ? "z-20" : "z-10"}`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isOpened) {
                              openMemoryView(memory);
                            } else {
                              setOpenedBookId(memory.id);
                            }
                          }}
                          className={`relative transition-all duration-300 ${isOpened ? "w-48 h-36" : "w-20 h-32"}`}
                        >
                          {/* Photo page - visible when opened */}
                          <div
                            className={`absolute inset-0 rounded-lg overflow-hidden bg-parchment shadow-2xl transition-opacity duration-300 ${isOpened ? "opacity-100" : "opacity-0"}`}
                          >
                            {memory.photo_url || memory.generated_image_url ? (
                              <img
                                src={memory.photo_url || memory.generated_image_url || ""}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-wood-light/50 text-parchment/60 text-sm font-serif">
                                No photo
                              </div>
                            )}
                            {/* Title and tap hint */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                              <p className="text-white font-serif font-medium text-sm line-clamp-2 mb-1">
                                {getCleanTitle(memory.title)}
                              </p>
                              <p className="text-white/70 text-xs">Tap to read memory</p>
                            </div>
                          </div>

                          {/* Book cover - hidden when opened */}
                          <div
                            className={`absolute inset-0 ${colors.book} rounded-sm shadow-lg 
                              flex items-center justify-center transition-all duration-300
                              ${isOpened ? "opacity-0 scale-75" : "opacity-100 scale-100"}`}
                            style={{
                              boxShadow: "2px 4px 12px rgba(0,0,0,0.3), inset -2px 0 4px rgba(255,255,255,0.1)",
                            }}
                          >
                            {/* Book spine decoration */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/20 rounded-l-sm" />

                            {/* Book spine text */}
                            <span className="text-white text-[9px] font-serif font-medium text-center px-1 leading-tight line-clamp-6">
                              {getCleanTitle(memory.title)}
                            </span>
                          </div>
                        </button>

                        {/* Close button when opened */}
                        {isOpened && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMemoryToDelete(memory);
                              setDeleteDialogOpen(true);
                            }}
                            className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground 
                              rounded-full flex items-center justify-center shadow-lg z-30"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Shelf board */}
                <div
                  className="h-3 bg-gradient-to-b from-wood-medium to-wood-dark rounded-full mt-3 shadow-lg mx-2"
                  style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.3)" }}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-parchment/60 font-serif">No memories in this collection yet.</div>
          )}
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-leather border-gold/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif text-parchment">Delete this memory?</AlertDialogTitle>
              <AlertDialogDescription className="text-parchment/70">
                This action cannot be undone. This will permanently delete "
                {memoryToDelete ? getCleanTitle(memoryToDelete.title) : ""}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-wood-dark/50 border-gold/30 text-parchment hover:bg-wood-medium/50">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => memoryToDelete && handleDeleteMemory(memoryToDelete)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Memory View - Album-style with photo and text
  if (libraryView === "memory-view" && selectedMemory) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in py-8 px-4">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={goBackToBooks}
            className="gap-2 text-parchment hover:bg-wood-dark/50 hover:text-parchment"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Conditional layout: 2 columns if photo/illustration exists, 1 column if not */}
        <div
          className={`grid gap-8 ${selectedMemory.photo_url || selectedMemory.generated_image_url ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}
        >
          {/* Left: Photo/Illustration - Album style with frame */}
          {selectedMemory.photo_url || selectedMemory.generated_image_url ? (
            <div className="relative">
              <div
                className="bg-parchment/10 rounded-2xl overflow-hidden aspect-square flex items-center justify-center shadow-xl"
                style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.1)" }}
              >
                <img
                  src={selectedMemory.photo_url || selectedMemory.generated_image_url || ""}
                  alt={getCleanTitle(selectedMemory.title)}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Show regenerate button for AI-generated images */}
              {!selectedMemory.photo_url && selectedMemory.generated_image_url && (
                <div className="absolute bottom-4 left-4 right-4">
                  <GenerateIllustrationButton
                    memoryId={selectedMemory.id}
                    title={getCleanTitle(selectedMemory.title)}
                    transcript={selectedMemory.transcript}
                    aiEnhancement={selectedMemory.ai_enhancement}
                    hasPhoto={false}
                    hasGeneratedImage={true}
                    onImageGenerated={(url) => {
                      setSelectedMemory({ ...selectedMemory, generated_image_url: url });
                      setMemories((prev) =>
                        prev.map((m) => (m.id === selectedMemory.id ? { ...m, generated_image_url: url } : m)),
                      );
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            /* Show generate button when no photo exists */
            <div className="flex flex-col items-center justify-center p-8 bg-wood-dark/30 rounded-2xl border-2 border-dashed border-gold/30">
              <Palette className="w-16 h-16 text-parchment/40 mb-4" />
              <p className="text-parchment/60 text-center mb-4 font-serif">No photo for this memory</p>
              <GenerateIllustrationButton
                memoryId={selectedMemory.id}
                title={getCleanTitle(selectedMemory.title)}
                transcript={selectedMemory.transcript}
                aiEnhancement={selectedMemory.ai_enhancement}
                hasPhoto={false}
                hasGeneratedImage={false}
                onImageGenerated={(url) => {
                  setSelectedMemory({ ...selectedMemory, generated_image_url: url });
                  setMemories((prev) =>
                    prev.map((m) => (m.id === selectedMemory.id ? { ...m, generated_image_url: url } : m)),
                  );
                }}
              />
            </div>
          )}

          {/* Right: Title and content */}
          <div className="flex flex-col">
            {/* Title */}
            {editingTitle === selectedMemory.id ? (
              <div className="flex items-center gap-2 mb-6">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-2xl font-serif bg-wood-dark/50 border-gold/30 text-parchment"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdateTitle(selectedMemory.id);
                    if (e.key === "Escape") setEditingTitle(null);
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => handleUpdateTitle(selectedMemory.id)}
                  className="bg-gold text-leather hover:bg-gold/90"
                >
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-3 mb-6">
                <h1 className="text-3xl font-display font-semibold text-parchment">
                  {getCleanTitle(selectedMemory.title)}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingTitle(selectedMemory.id);
                    setEditedTitle(getCleanTitle(selectedMemory.title));
                  }}
                  className="text-parchment/60 hover:text-parchment hover:bg-wood-dark/50"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Tab buttons for Summary / View Old Capture */}
            <div className="flex gap-3 mb-4">
              <Button
                variant={activeTab === "transcript" ? "default" : "outline"}
                className={
                  activeTab === "transcript"
                    ? "bg-gold text-leather hover:bg-gold/90 font-serif"
                    : "bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50 font-serif"
                }
                onClick={() => setActiveTab("transcript")}
              >
                <FileText className="w-4 h-4 mr-2" />
                Previous Capture
              </Button>
              <Button
                variant={activeTab === "summary" ? "default" : "outline"}
                className={
                  activeTab === "summary"
                    ? "bg-gold text-leather hover:bg-gold/90 font-serif"
                    : "bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50 font-serif"
                }
                onClick={() => setActiveTab("summary")}
              >
                AI Summary
              </Button>
            </div>

            {/* Audio playback (if available) - Original capture */}
            {selectedMemory.audio_url && activeTab === "transcript" && (
              <div className="mb-4">
                <div className="text-sm text-parchment/70 mb-1 font-sans">Original recording</div>
                <AudioPlayer audioUrl={selectedMemory.audio_url} />
              </div>
            )}

            {/* Additional captures audio */}
            {selectedMemory.captures && selectedMemory.captures.length > 0 && activeTab === "transcript" && (
              <div className="space-y-3 mb-4">
                {selectedMemory.captures.map(
                  (capture, index) =>
                    capture.audio_url && (
                      <div key={capture.id}>
                        <div className="text-sm text-parchment/70 mb-1 font-sans">
                          Capture {index + 1} - {new Date(capture.created_at).toLocaleDateString()}
                        </div>
                        <AudioPlayer audioUrl={capture.audio_url} />
                      </div>
                    ),
                )}
              </div>
            )}

            {/* Content area - Parchment style (taller when no photo) */}
            <div
              className={`flex-1 overflow-y-auto p-6 rounded-xl ${selectedMemory.photo_url || selectedMemory.generated_image_url ? "max-h-[50vh]" : "max-h-[65vh]"}`}
              style={{
                background: "linear-gradient(180deg, hsl(35 32% 78%) 0%, hsl(35 32% 70%) 100%)",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              {activeTab === "transcript" ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-wood-dark/70">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-sans">Original capture</span>
                    </div>
                    <TextToSpeechButton
                      text={selectedMemory.transcript}
                      label="Read Aloud"
                      className="bg-wood-dark/20 border-wood-dark/30 text-wood-dark hover:bg-wood-dark/30"
                    />
                  </div>
                  <p className="text-wood-dark leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedMemory.transcript}
                  </p>

                  {/* Additional captures transcripts */}
                  {selectedMemory.captures &&
                    selectedMemory.captures.map(
                      (capture, index) =>
                        capture.transcript && (
                          <div key={capture.id} className="mt-6 pt-4 border-t border-wood-dark/20">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 text-wood-dark/70">
                                <FileText className="w-4 h-4" />
                                <span className="text-sm font-sans">
                                  Capture {index + 1} - {new Date(capture.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <TextToSpeechButton
                                text={capture.transcript}
                                label="Read Aloud"
                                className="bg-wood-dark/20 border-wood-dark/30 text-wood-dark hover:bg-wood-dark/30"
                              />
                            </div>
                            <p className="text-wood-dark leading-relaxed whitespace-pre-wrap font-sans">
                              {capture.transcript}
                            </p>
                          </div>
                        ),
                    )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-serif font-medium text-wood-dark/80">AI Summary of your memory</h2>
                    {selectedMemory.ai_enhancement && (
                      <TextToSpeechButton
                        text={selectedMemory.ai_enhancement}
                        label="Read Aloud"
                        className="bg-wood-dark/20 border-wood-dark/30 text-wood-dark hover:bg-wood-dark/30"
                      />
                    )}
                  </div>
                  {selectedMemory.ai_enhancement ? (
                    <p className="text-wood-dark leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedMemory.ai_enhancement}
                    </p>
                  ) : (
                    <p className="text-wood-dark/60 italic font-sans">
                      No AI summary available yet. Add more captures to generate a summary.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-6">
              <ShareMemoryButton memoryId={selectedMemory.id} className="flex-shrink-0" />
              <Button
                className="flex-1 bg-gold text-leather hover:bg-gold/90 font-serif shadow-lg"
                onClick={() => setShowCaptureOverlay(true)}
              >
                Add new capture
              </Button>
              <Button
                variant="outline"
                className="bg-destructive/20 border-destructive/50 text-destructive-foreground hover:bg-destructive/40"
                onClick={() => {
                  setMemoryToDelete(selectedMemory);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Capture overlay */}
        {showCaptureOverlay && (
          <CaptureModeOverlay
            onRecord={() => {
              setShowCaptureOverlay(false);
              if (onAddNewCapture) onAddNewCapture(selectedMemory.id, "record", selectedMemory.photo_url);
            }}
            onWrite={() => {
              setShowCaptureOverlay(false);
              if (onAddNewCapture) onAddNewCapture(selectedMemory.id, "write", selectedMemory.photo_url);
            }}
            onClose={() => setShowCaptureOverlay(false)}
          />
        )}

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-leather border-gold/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif text-parchment">Delete this memory?</AlertDialogTitle>
              <AlertDialogDescription className="text-parchment/70">
                This action cannot be undone. This will permanently delete "
                {memoryToDelete ? getCleanTitle(memoryToDelete.title) : ""}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-wood-dark/50 border-gold/30 text-parchment hover:bg-wood-medium/50">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => memoryToDelete && handleDeleteMemory(memoryToDelete)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Fallback - should not reach here
  return null;
};

export default MemoryLibrary;
