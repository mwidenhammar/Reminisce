import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Mic, BookOpen, ArrowLeft } from "lucide-react";

interface PictureViewerProps {
  photos: { id: string; url: string }[];
  currentIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onCaptureMemory: () => void;
  onReadInLibrary: () => void;
  onBack?: () => void;
  usedPhotoUrls?: string[];
}

const PictureViewer = ({
  photos,
  currentIndex,
  onPrevious,
  onNext,
  onCaptureMemory,
  onReadInLibrary,
  onBack,
  usedPhotoUrls = [],
}: PictureViewerProps) => {
  const currentPhoto = photos[currentIndex];
  const isCurrentPhotoUsed = currentPhoto && usedPhotoUrls.includes(currentPhoto.url);

  if (!currentPhoto) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-foreground/60">No photos available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] animate-fade-in">
      {/* Back Button */}
      {onBack && (
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={onBack}
            size="lg"
            className="gap-2 hover:bg-accent text-lg font-medium"
          >
            <ArrowLeft className="w-6 h-6" />
            Back
          </Button>
        </div>
      )}
      
      {/* Photo Display with Navigation */}
      <div className="flex-1 relative flex items-center justify-center px-16">
        {/* Previous Button */}
        <button
          onClick={onPrevious}
          disabled={photos.length <= 1}
          className="absolute left-4 p-3 rounded-full bg-card/80 hover:bg-card shadow-lg transition-all hover:scale-110 disabled:opacity-30 disabled:hover:scale-100"
          aria-label="Previous photo"
        >
          <ChevronLeft className="w-8 h-8 text-foreground" />
        </button>

        {/* Photo */}
        <div className="max-w-4xl max-h-full animate-scale-in">
          <img
            src={currentPhoto.url}
            alt={`Photo ${currentIndex + 1}`}
            className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-2xl transition-all duration-300"
          />
        </div>

        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={photos.length <= 1}
          className="absolute right-4 p-3 rounded-full bg-card/80 hover:bg-card shadow-lg transition-all hover:scale-110 disabled:opacity-30 disabled:hover:scale-100"
          aria-label="Next photo"
        >
          <ChevronRight className="w-8 h-8 text-foreground" />
        </button>
      </div>

      {/* Photo Counter */}
      <div className="text-center py-2 text-foreground/60">
        {currentIndex + 1} of {photos.length}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 py-6">
        <Button
          onClick={onCaptureMemory}
          size="lg"
          className="gap-3 px-8 text-lg h-14"
        >
          <Mic className="w-6 h-6" />
          {isCurrentPhotoUsed ? "Add to existing memory" : "Capture memory to this picture"}
        </Button>
        {isCurrentPhotoUsed && (
          <Button
            onClick={onReadInLibrary}
            variant="outline"
            size="lg"
            className="gap-3 px-8 text-lg h-14"
          >
            <BookOpen className="w-6 h-6" />
            Read in Library
          </Button>
        )}
      </div>
    </div>
  );
};

export default PictureViewer;
