import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ShareMemoryButtonProps {
  memoryId: string;
  className?: string;
}

const ShareMemoryButton = ({ memoryId, className }: ShareMemoryButtonProps) => {
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [circle, setCircle] = useState<{ id: string; name: string } | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchShareStatus = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if user has a family circle
        const { data: membership } = await supabase
          .from("family_members")
          .select("circle_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (membership) {
          const { data: circleData } = await supabase
            .from("family_circles")
            .select("id, name")
            .eq("id", membership.circle_id)
            .single();

          if (circleData) {
            setCircle(circleData);

            // Check if this memory is already shared
            const { data: share } = await supabase
              .from("memory_shares")
              .select("id")
              .eq("memory_id", memoryId)
              .eq("circle_id", circleData.id)
              .maybeSingle();

            setIsShared(!!share);
          }
        }
      } catch (error) {
        console.error("Error fetching share status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchShareStatus();
  }, [memoryId]);

  const handleToggleShare = async () => {
    if (!circle) return;
    setSharing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isShared) {
        // Unshare
        const { error } = await supabase
          .from("memory_shares")
          .delete()
          .eq("memory_id", memoryId)
          .eq("circle_id", circle.id);

        if (error) throw error;
        setIsShared(false);
        toast({ title: "Memory unshared", description: "Family members can no longer see this memory." });
      } else {
        // Share
        const { error } = await supabase
          .from("memory_shares")
          .insert({
            memory_id: memoryId,
            circle_id: circle.id,
            shared_by: user.id,
          });

        if (error) throw error;
        setIsShared(true);
        toast({ title: "Memory shared!", description: `Shared with ${circle.name}` });
      }
      setOpen(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!circle) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Create or join a Circle in Shared Libraries to share memories with others.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isShared ? "default" : "outline"}
          size="sm"
          className={className}
        >
          {isShared ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Shared
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium">{circle.name}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isShared
              ? "This memory is shared with your circle. Members can view the photo, transcript, and listen to the audio."
              : "Share this memory with your circle. Members will be able to view and listen to it."}
          </p>
          <Button
            className="w-full"
            variant={isShared ? "outline" : "default"}
            onClick={handleToggleShare}
            disabled={sharing}
          >
            {sharing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isShared ? (
              "Stop Sharing"
            ) : (
              "Share with Circle"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ShareMemoryButton;
