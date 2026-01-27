import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MessageCircleQuestion, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AudioPlayer from "./AudioPlayer";
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

interface VoicePrompt {
  id: string;
  transcript: string | null;
  audio_url: string;
  created_at: string;
  is_read: boolean;
  sender: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  circle_name: string;
}

interface VoicePromptsViewProps {
  onBack: () => void;
  initialPromptId?: string;
}

const VoicePromptsView = ({ onBack, initialPromptId }: VoicePromptsViewProps) => {
  const [prompts, setPrompts] = useState<VoicePrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletePromptId, setDeletePromptId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: promptsData, error } = await supabase
          .from("voice_prompts")
          .select("*")
          .eq("recipient_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (promptsData && promptsData.length > 0) {
          // Fetch sender profiles
          const senderIds = [...new Set(promptsData.map(p => p.sender_id))];
          const circleIds = [...new Set(promptsData.map(p => p.circle_id))];

          const [profilesRes, circlesRes] = await Promise.all([
            supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", senderIds),
            supabase.from("family_circles").select("id, name").in("id", circleIds),
          ]);

          const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
          profilesRes.data?.forEach(p => {
            profileMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
          });

          const circleMap: Record<string, string> = {};
          circlesRes.data?.forEach(c => {
            circleMap[c.id] = c.name;
          });

          setPrompts(
            promptsData.map(p => ({
              id: p.id,
              transcript: p.transcript,
              audio_url: p.audio_url,
              created_at: p.created_at,
              is_read: p.is_read,
              sender: {
                user_id: p.sender_id,
                display_name: profileMap[p.sender_id]?.display_name || null,
                avatar_url: profileMap[p.sender_id]?.avatar_url || null,
              },
              circle_name: circleMap[p.circle_id] || "Unknown Circle",
            }))
          );

          // Mark prompts as read
          const unreadIds = promptsData.filter(p => !p.is_read).map(p => p.id);
          if (unreadIds.length > 0) {
            await supabase
              .from("voice_prompts")
              .update({ is_read: true })
              .in("id", unreadIds);
          }
        }
      } catch (error) {
        console.error("Error fetching voice prompts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrompts();
  }, []);

  // Scroll to focused prompt if initialPromptId is provided
  useEffect(() => {
    if (initialPromptId && prompts.length > 0) {
      const element = document.getElementById(`prompt-${initialPromptId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-primary", "ring-offset-2");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
        }, 2000);
      }
    }
  }, [initialPromptId, prompts]);

  const handleDelete = async () => {
    if (!deletePromptId) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from("voice_prompts")
        .delete()
        .eq("id", deletePromptId);

      if (error) throw error;

      setPrompts(prev => prev.filter(p => p.id !== deletePromptId));
      toast({ title: "Prompt deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeletePromptId(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 text-parchment hover:bg-wood-dark/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-semibold text-parchment">
            Voice Prompts
          </h1>
          <p className="text-parchment/60 text-sm">
            Questions and prompts from your circles
          </p>
        </div>
      </div>

      {prompts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-wood-dark/30 flex items-center justify-center mx-auto mb-4">
            <MessageCircleQuestion className="w-10 h-10 text-parchment/50" />
          </div>
          <h2 className="text-xl font-serif font-medium text-parchment mb-2">
            No Voice Prompts Yet
          </h2>
          <p className="text-parchment/60 max-w-sm mx-auto">
            When circle members send you voice questions or prompts, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              id={`prompt-${prompt.id}`}
              className={`p-4 rounded-xl border transition-all ${
                !prompt.is_read
                  ? "bg-gold/5 border-gold/30"
                  : "bg-leather/50 border-gold/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 border-2 border-gold/20">
                  <AvatarImage src={prompt.sender.avatar_url || undefined} />
                  <AvatarFallback className="bg-wood-medium text-parchment text-sm">
                    {getInitials(prompt.sender.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-parchment">
                      {prompt.sender.display_name || "Circle Member"}
                    </span>
                    <span className="text-xs text-parchment/50">
                      from {prompt.circle_name}
                    </span>
                  </div>
                  <p className="text-xs text-parchment/50 mb-3">
                    {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                  </p>

                  <div className="mb-3">
                    <AudioPlayer audioUrl={prompt.audio_url} />
                  </div>

                  {prompt.transcript && (
                    <p className="text-sm text-parchment/80 italic mb-3">
                      "{prompt.transcript}"
                    </p>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletePromptId(prompt.id)}
                    className="text-parchment/50 hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletePromptId} onOpenChange={() => setDeletePromptId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voice Prompt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this voice prompt. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VoicePromptsView;