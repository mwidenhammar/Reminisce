import { Button } from "@/components/ui/button";
import { Mic, BookOpen } from "lucide-react";

interface PhotoDetailProps {
  photoUrl: string;
  onRecordMemory: () => void;
  onReadInLibrary: () => void;
}

const PhotoDetail = ({ photoUrl, onRecordMemory, onReadInLibrary }: PhotoDetailProps) => {
  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Photo Display */}
      <div className="flex-1 relative">
        <img
          src={photoUrl}
          alt="Selected memory"
          className="w-full h-full object-contain bg-background"
        />
      </div>

      {/* Action Buttons */}
      <div className="p-6 bg-card border-t border-border">
        <div className="flex gap-4 max-w-lg mx-auto">
          <Button
            onClick={onRecordMemory}
            size="lg"
            className="flex-1 gap-3 h-14 text-base"
          >
            <Mic className="w-5 h-5" />
            Record memory to picture
          </Button>
          <Button
            onClick={onReadInLibrary}
            variant="outline"
            size="lg"
            className="flex-1 gap-3 h-14 text-base"
          >
            <BookOpen className="w-5 h-5" />
            Read in library
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PhotoDetail;
