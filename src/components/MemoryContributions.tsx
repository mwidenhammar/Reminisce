import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Loader2 } from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import TextToSpeechButton from "./TextToSpeechButton";

interface Contribution {
  id: string;
  transcript: string;
  audio_url: string | null;
  created_at: string;
  contributor: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface MemoryContributionsProps {
  memoryId: string;
  circleId: string;
}

const MemoryContributions = ({ memoryId, circleId }: MemoryContributionsProps) => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        const { data: contributionsData, error } = await supabase
          .from("memory_contributions")
          .select("*")
          .eq("memory_id", memoryId)
          .eq("circle_id", circleId)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (contributionsData && contributionsData.length > 0) {
          // Fetch contributor profiles
          const contributorIds = [...new Set(contributionsData.map(c => c.contributor_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", contributorIds);

          const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
          profiles?.forEach(p => {
            profileMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
          });

          setContributions(
            contributionsData.map(c => ({
              id: c.id,
              transcript: c.transcript,
              audio_url: c.audio_url,
              created_at: c.created_at,
              contributor: {
                user_id: c.contributor_id,
                display_name: profileMap[c.contributor_id]?.display_name || null,
                avatar_url: profileMap[c.contributor_id]?.avatar_url || null,
              },
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching contributions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContributions();
  }, [memoryId, circleId]);

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (contributions.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2 text-parchment/80">
        <MessageSquare className="w-4 h-4" />
        <h3 className="text-sm font-medium">Other Perspectives ({contributions.length})</h3>
      </div>

      <div className="space-y-4">
        {contributions.map((contribution) => (
          <div
            key={contribution.id}
            className="p-4 rounded-lg bg-wood-dark/30 border border-gold/10"
          >
            <div className="flex items-start gap-3">
              <Avatar className="w-8 h-8 border border-gold/20">
                <AvatarImage src={contribution.contributor.avatar_url || undefined} />
                <AvatarFallback className="bg-wood-medium text-parchment text-xs">
                  {getInitials(contribution.contributor.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-parchment">
                    {contribution.contributor.display_name || "Circle Member"}
                  </span>
                  <span className="text-xs text-parchment/50">
                    {formatDistanceToNow(new Date(contribution.created_at), { addSuffix: true })}
                  </span>
                </div>
                
                {contribution.audio_url && (
                  <div className="mb-2">
                    <AudioPlayer audioUrl={contribution.audio_url} />
                  </div>
                )}
                
                <p className="text-sm text-parchment/80 leading-relaxed">
                  {contribution.transcript}
                </p>

                <div className="mt-2">
                  <TextToSpeechButton
                    text={contribution.transcript}
                    label="Read Aloud"
                    className="bg-wood-dark/20 border-gold/20 text-parchment/70 hover:bg-wood-dark/40 text-xs py-1 px-2 h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemoryContributions;