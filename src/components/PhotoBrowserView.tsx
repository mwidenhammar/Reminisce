import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface PhotoBrowserViewProps {
  photos: { id: string; url: string }[];
  onBack: () => void;
  onPhotoSelect: (photoUrl: string) => void;
}

const PhotoBrowserView = ({ photos, onBack, onPhotoSelect }: PhotoBrowserViewProps) => {
  if (photos.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
        <p className="text-xl text-muted-foreground mb-6">No photos to display</p>
        <Button onClick={onBack} size="lg" className="gap-2">
          <ArrowLeft className="w-5 h-5" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur-sm">
        <Button
          variant="ghost"
          onClick={onBack}
          size="lg"
          className="gap-2 hover:bg-accent text-lg font-medium"
        >
          <ArrowLeft className="w-6 h-6" />
          Back
        </Button>
        
        <span className="text-lg font-medium text-foreground">
          Your Photos
        </span>
        
        <span className="text-base text-muted-foreground">
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </span>
      </div>

      {/* Photo Grid - iPhone style */}
      <div className="flex-1 p-2">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => onPhotoSelect(photo.url)}
              className="aspect-square overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-transform active:scale-95"
            >
              <img
                src={photo.url}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhotoBrowserView;
