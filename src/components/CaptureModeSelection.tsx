import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic, PenLine, BookOpen } from "lucide-react";

interface CaptureModeSelectionProps {
  selectedPhoto: string | null;
  onBack: () => void;
  onRecordVoice: () => void;
  onWriteStory: () => void;
}

const CaptureModeSelection = ({
  selectedPhoto,
  onBack,
  onRecordVoice,
  onWriteStory,
}: CaptureModeSelectionProps) => {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onBack} size="lg" className="gap-2 hover:bg-accent text-base">
          <ArrowLeft className="w-5 h-5" />
          Back
        </Button>
      </div>

      {/* Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[70vh]">
        {/* Left: Photo Display */}
        <div className="relative rounded-2xl overflow-hidden border-4 border-leather bg-leather shadow-lg">
          {selectedPhoto ? (
            <img
              src={selectedPhoto}
              alt="Selected memory"
              className="w-full h-full object-cover min-h-[300px] lg:min-h-full"
            />
          ) : (
            <div className="w-full h-full min-h-[300px] flex items-center justify-center bg-muted">
              <div className="text-center text-muted-foreground">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No photo selected</p>
              </div>
            </div>
          )}
          {/* Decorative frame corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-gold rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-gold rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-gold rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-gold rounded-br-lg" />
        </div>

        {/* Right: Choice Cards */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Capture Your Memory
            </h2>
            <p className="text-muted-foreground text-lg">
              How would you like to share this memory?
            </p>
          </div>

          {/* Voice Recording Card */}
          <button
            onClick={onRecordVoice}
            className="group relative p-8 rounded-2xl bg-gradient-to-br from-leather to-leather-light border-2 border-gold/30 hover:border-gold transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl text-left"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gold/20 group-hover:bg-gold/30 flex items-center justify-center transition-colors border-2 border-gold/50">
                <Mic className="w-10 h-10 text-gold" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-1">
                  Record Voice
                </h3>
                <p className="text-muted-foreground">
                  Speak naturally and let your words flow
                </p>
              </div>
            </div>
            {/* Decorative line */}
            <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          </button>

          {/* Text Writing Card */}
          <button
            onClick={onWriteStory}
            className="group relative p-8 rounded-2xl bg-gradient-to-br from-leather to-leather-light border-2 border-gold/30 hover:border-gold transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-xl text-left"
          >
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gold/20 group-hover:bg-gold/30 flex items-center justify-center transition-colors border-2 border-gold/50">
                <PenLine className="w-10 h-10 text-gold" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-1">
                  Write Story
                </h3>
                <p className="text-muted-foreground">
                  Type your memory like a journal entry
                </p>
              </div>
            </div>
            {/* Decorative line */}
            <div className="absolute bottom-0 left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaptureModeSelection;