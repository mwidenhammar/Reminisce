import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

interface FollowUpPromptProps {
  onYes: () => void;
  onNo: () => void;
}

const FollowUpPrompt = ({ onYes, onNo }: FollowUpPromptProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-card rounded-2xl p-8 max-w-md mx-4 shadow-2xl border border-border text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <HelpCircle className="w-8 h-8 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Do you want me to help you remember more details?
        </h2>
        <p className="text-foreground/70 mb-8">
          I can ask you some questions to capture more of this memory.
        </p>

        <div className="flex gap-4 justify-center">
          <Button
            onClick={onNo}
            variant="outline"
            size="lg"
            className="px-8 text-lg"
          >
            No, I'm done
          </Button>
          <Button
            onClick={onYes}
            size="lg"
            className="px-8 text-lg"
          >
            Yes, help me
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpPrompt;
