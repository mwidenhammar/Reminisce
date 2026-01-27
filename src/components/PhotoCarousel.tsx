import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PhotoCarouselProps {
  photos: { url: string; id: string; storage_path: string }[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onPhotoSelect?: (photoUrl: string) => void;
  onPhotoDelete?: (photoId: string) => void;
}

export const PhotoCarousel = ({
  photos,
  initialIndex,
  isOpen,
  onClose,
  onPhotoSelect,
  onPhotoDelete,
}: PhotoCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
    if (e.key === "Escape") onClose();
  };

  const handleDelete = async () => {
    const currentPhoto = photos[currentIndex];
    if (!currentPhoto) return;

    setDeleting(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("memory-photos")
        .remove([currentPhoto.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("photos")
        .delete()
        .eq("id", currentPhoto.id);

      if (dbError) throw dbError;

      toast({
        title: "Photo deleted",
        description: "The photo has been removed from your gallery",
      });

      // Notify parent and close if no photos left
      if (onPhotoDelete) {
        onPhotoDelete(currentPhoto.id);
      }
      
      if (photos.length === 1) {
        onClose();
      } else {
        // Move to next photo or previous if at end
        if (currentIndex >= photos.length - 1) {
          setCurrentIndex(Math.max(0, currentIndex - 1));
        }
      }
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[95vw] max-h-[95vh] p-0 bg-background/95 backdrop-blur"
        onKeyDown={handleKeyDown}
      >
        <div className="relative w-full h-[90vh] flex items-center justify-center">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/80 hover:bg-background"
              onClick={onClose}
            >
              <X className="w-6 h-6" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
            onClick={goToPrevious}
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>

          <div className="flex flex-col items-center justify-center h-full w-full p-8">
            <img
              src={photos[currentIndex]?.url}
              alt={`Photo ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <div className="mt-4 text-muted-foreground">
              {currentIndex + 1} / {photos.length}
            </div>
            {onPhotoSelect && (
              <Button
                className="mt-4"
                onClick={() => {
                  onPhotoSelect(photos[currentIndex].url);
                  onClose();
                }}
              >
                Select This Photo
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background"
            onClick={goToNext}
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
