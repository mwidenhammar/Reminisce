import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, BookOpen, X, Edit2, Palette } from "lucide-react";
import type { MemoryEpisode } from "@/types/memory";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MemoryEpisodesProps {
  episodes: MemoryEpisode[];
  onBack: () => void;
  onUpdateEpisode: (episodeId: string, updates: Partial<MemoryEpisode>) => void;
  onReorderEpisodes: (reorderedEpisodes: MemoryEpisode[]) => void;
}

const MemoryEpisodes = ({ episodes, onBack, onUpdateEpisode, onReorderEpisodes }: MemoryEpisodesProps) => {
  const [selectedMemory, setSelectedMemory] = useState<MemoryEpisode | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [bookColors, setBookColors] = useState<Record<string, string>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const expandedBookRef = useRef<HTMLDivElement>(null);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const formatFullDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleStartEdit = (episode: MemoryEpisode) => {
    setEditingTitle(episode.id);
    setEditedTitle(episode.title);
  };

  const handleSaveTitle = (episodeId: string) => {
    if (editedTitle.trim()) {
      onUpdateEpisode(episodeId, { title: editedTitle.trim() });
    }
    setEditingTitle(null);
  };

  const handleCancelEdit = () => {
    setEditingTitle(null);
    setEditedTitle("");
  };

  // Color variations for book spines
  const defaultBookColors = [
    "from-primary to-warmth",
    "from-secondary to-sage",
    "from-warmth to-primary",
    "from-sepia to-sepia-dark",
    "from-sage to-secondary",
  ];

  const availableColors = [
    { name: "Primary", value: "from-primary to-warmth" },
    { name: "Sage", value: "from-secondary to-sage" },
    { name: "Warm", value: "from-warmth to-primary" },
    { name: "Sepia", value: "from-sepia to-sepia-dark" },
    { name: "Green", value: "from-sage to-secondary" },
    { name: "Blue", value: "from-blue-400 to-blue-600" },
    { name: "Purple", value: "from-purple-400 to-purple-600" },
    { name: "Red", value: "from-red-400 to-red-600" },
    { name: "Orange", value: "from-orange-400 to-orange-600" },
    { name: "Pink", value: "from-pink-400 to-pink-600" },
  ];

  const getBookColor = (episodeId: string, index: number) => {
    return bookColors[episodeId] || defaultBookColors[index % defaultBookColors.length];
  };

  const handleColorChange = (episodeId: string, color: string) => {
    setBookColors((prev) => ({ ...prev, [episodeId]: color }));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newEpisodes = [...episodes];
    const draggedItem = newEpisodes[draggedIndex];
    newEpisodes.splice(draggedIndex, 1);
    newEpisodes.splice(index, 0, draggedItem);
    
    onReorderEpisodes(newEpisodes);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleBookClick = (e: React.MouseEvent, episodeId: string) => {
    e.stopPropagation();
    if (expandedBookId === episodeId) {
      setExpandedBookId(null);
    } else {
      setExpandedBookId(episodeId);
    }
  };

  const handleOpenMemory = (episode: MemoryEpisode) => {
    setSelectedMemory(episode);
    setExpandedBookId(null);
  };

  // Auto-close after 3 seconds
  useEffect(() => {
    if (expandedBookId) {
      const timer = setTimeout(() => {
        setExpandedBookId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [expandedBookId]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expandedBookRef.current && !expandedBookRef.current.contains(event.target as Node)) {
        setExpandedBookId(null);
      }
    };

    if (expandedBookId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [expandedBookId]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onBack} size="lg" className="gap-2 hover:bg-accent text-base">
          <ArrowLeft className="w-5 h-5" />
          Back
        </Button>
      </div>

      <h2 className="text-3xl font-bold mb-8 text-foreground flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-primary" />
        Your Memory Bookshelf
      </h2>

      {episodes.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-2 text-foreground">Your bookshelf is empty</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start adding memories to your bookshelf by selecting a photo and recording your memory. Each
            memory will be preserved here for you to revisit.
          </p>
        </div>
      ) : (
        <>
          {/* Bookshelf Display */}
          <div className="relative">
            {/* Books on shelf */}
            <div className="grid grid-cols-7 gap-2 p-8 bg-gradient-to-b from-sepia/20 to-sepia/40 rounded-t-2xl border-x-2 border-t-2 border-sepia-dark/30">
              {episodes.map((episode, index) => {
                const isExpanded = expandedBookId === episode.id;
                return (
                  <div 
                    key={episode.id}
                    ref={isExpanded ? expandedBookRef : null}
                    className={`relative group/book h-80 transition-all duration-500 ${
                      isExpanded ? 'col-span-2 z-20' : ''
                    }`}
                    draggable={!isExpanded}
                    onDragStart={() => !isExpanded && handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      perspective: '1000px',
                    }}
                  >
                    <button
                      onClick={(e) => handleBookClick(e, episode.id)}
                      className={`relative h-full w-full rounded-sm shadow-lg hover:shadow-2xl transition-all duration-500 ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                      style={{
                        transformStyle: 'preserve-3d',
                        cursor: isExpanded ? 'pointer' : 'grab',
                      }}
                    >
                      {/* Book Spine (default view) */}
                      <div 
                        className={`absolute inset-0 bg-gradient-to-br ${getBookColor(
                          episode.id,
                          index
                        )} border-l-4 border-r-2 border-b-2 border-black/20 rounded-sm transition-opacity duration-500 ${
                          isExpanded ? 'opacity-0' : 'opacity-100'
                        }`}
                        style={{
                          transform: `rotate(${Math.random() * 2 - 1}deg)`,
                          backfaceVisibility: 'hidden',
                        }}
                      >
                        {/* Book spine text */}
                        <div className="absolute inset-0 flex items-center justify-center p-2 overflow-hidden">
                          <span
                            className="text-[9px] font-bold text-primary-foreground text-center leading-tight line-clamp-6"
                          >
                            {episode.title}
                          </span>
                        </div>

                        {/* Book spine details */}
                        <div className="absolute top-2 left-0 right-0 h-1 bg-primary-foreground/20" />
                        <div className="absolute bottom-2 left-0 right-0 h-1 bg-black/20" />
                      </div>

                      {/* Book Front Cover (expanded view) */}
                      <div 
                        className={`absolute inset-0 w-full transition-opacity duration-500 bg-card rounded-sm border-2 border-border shadow-xl overflow-hidden ${
                          isExpanded ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                          backfaceVisibility: 'hidden',
                        }}
                      >
                        {/* Cover Image */}
                        {episode.photoUrl && (
                          <div className="h-2/3 w-full overflow-hidden">
                            <img
                              src={episode.photoUrl}
                              alt={episode.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Cover Title and Open Button */}
                        <div className={`h-1/3 p-3 flex flex-col justify-between bg-gradient-to-br ${getBookColor(
                          episode.id,
                          index
                        )}`}>
                          <div>
                            <h4 className="text-sm font-bold text-primary-foreground line-clamp-2 text-center">
                              {episode.title}
                            </h4>
                            <p className="text-xs text-primary-foreground/70 text-center mt-1">
                              {formatDate(episode.timestamp)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMemory(episode);
                            }}
                            className="w-full mt-2"
                          >
                            <BookOpen className="w-3 h-3 mr-1" />
                            Read
                          </Button>
                        </div>
                      </div>
                  </button>

                  {/* Color picker button */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border opacity-0 group-hover/book:opacity-100 transition-opacity shadow-sm hover:bg-accent z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Palette className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3">
                      <h4 className="font-semibold text-sm mb-3">Choose Book Color</h4>
                      <div className="grid grid-cols-5 gap-2">
                        {availableColors.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => handleColorChange(episode.id, color.value)}
                            className={`h-10 rounded-md bg-gradient-to-br ${color.value} border-2 transition-all hover:scale-110 ${
                              getBookColor(episode.id, index) === color.value
                                ? "border-foreground ring-2 ring-foreground/20"
                                : "border-border"
                            }`}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              );
              })}
            </div>

            {/* Wooden shelf */}
            <div className="h-8 bg-gradient-to-b from-sepia-dark to-sepia rounded-b-2xl border-2 border-sepia-dark shadow-lg relative">
              <div className="absolute inset-x-0 top-0 h-1 bg-primary-foreground/20" />
              <div className="absolute inset-x-0 bottom-1 h-px bg-black/30" />
            </div>

            {/* Shelf shadow */}
            <div className="h-3 bg-gradient-to-b from-sepia-dark/30 to-transparent -mt-1 rounded-b-xl blur-sm" />
          </div>

          {/* Expanded Memory Modal */}
          {selectedMemory && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-card rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="sticky top-0 bg-card border-b border-border px-6 py-4 z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => setSelectedMemory(null)}
                      className="gap-2 hover:bg-accent"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                  
                  {/* Editable Title */}
                  {editingTitle === selectedMemory.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        className="text-xl font-bold"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveTitle(selectedMemory.id);
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveTitle(selectedMemory.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold text-card-foreground flex-1">
                        {selectedMemory.title}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartEdit(selectedMemory)}
                        className="gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Date */}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-5 h-5" />
                    <time className="text-lg">{formatFullDate(selectedMemory.timestamp)}</time>
                  </div>

                  {/* Photo */}
                  {selectedMemory.photoUrl && (
                    <div className="rounded-xl overflow-hidden border-2 border-border shadow-soft">
                      <img
                        src={selectedMemory.photoUrl}
                        alt="Memory"
                        className="w-full max-h-96 object-contain bg-muted"
                      />
                    </div>
                  )}

                  {/* Transcript */}
                  <div className="bg-accent/30 rounded-xl p-6 border border-accent">
                    <h4 className="font-semibold text-lg mb-3 text-accent-foreground flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Your Memory:
                    </h4>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      {selectedMemory.transcript}
                    </p>
                  </div>

                  {/* AI Enhancement */}
                  {selectedMemory.aiEnhancement && (
                    <div className="bg-primary/10 rounded-xl p-6 border border-primary/30">
                      <h4 className="font-semibold text-lg mb-3 text-foreground">
                        AI Enhancement:
                      </h4>
                      <p className="text-muted-foreground leading-relaxed">
                        {selectedMemory.aiEnhancement}
                      </p>
                    </div>
                  )}

                  {/* Generated Image */}
                  {selectedMemory.generatedImageUrl && (
                    <div className="rounded-xl overflow-hidden border-2 border-border shadow-soft">
                      <img
                        src={selectedMemory.generatedImageUrl}
                        alt="AI Generated"
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end">
                  <Button
                    size="lg"
                    onClick={() => setSelectedMemory(null)}
                    className="gap-2 text-base"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MemoryEpisodes;
