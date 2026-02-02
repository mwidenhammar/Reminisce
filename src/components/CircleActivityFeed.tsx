import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookOpen, MessageCircle, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AudioPlayer from "./AudioPlayer";
import { useToast } from "@/hooks/use-toast";
import { getInitials, getCleanTitle } from "@/lib/utils";

interface ActivityContribution {
  id: string;
  memory_id: string;
  memory_title: string;
  contributor_id: string;
  contributor_name: string | null;
  contributor_avatar: string | null;
  transcript: string;
  audio_url: string | null;
  created_at: string;
  type: "contribution";
}

interface ActivityVoicePrompt {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  recipient_id: string;
  recipient_name: string | null;
  audio_url: string;
  transcript: string | null;
  created_at: string;
  is_read: boolean;
  type: "voice_prompt";
}

type ActivityItem = ActivityContribution | ActivityVoicePrompt;

interface CircleActivityFeedProps {
  circleId: string;
  onViewMemory: (memoryId: string) => void;
}

const CircleActivityFeed = ({ circleId, onViewMemory }: CircleActivityFeedProps) => {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchActivity();
  }, [circleId]);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Fetch contributions for this circle
      const { data: contributions } = await supabase
        .from("memory_contributions")
        .select(`
          id,
          memory_id,
          contributor_id,
          transcript,
          audio_url,
          created_at
        `)
        .eq("circle_id", circleId)
        .order("created_at", { ascending: false });

      // Fetch voice prompts where user is sender or recipient
      const { data: voicePrompts } = await supabase
        .from("voice_prompts")
        .select(`
          id,
          sender_id,
          recipient_id,
          audio_url,
          transcript,
          created_at,
          is_read
        `)
        .eq("circle_id", circleId)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      // Collect all user IDs we need profiles for
      const userIds = new Set<string>();
      contributions?.forEach(c => userIds.add(c.contributor_id));
      voicePrompts?.forEach(vp => {
        userIds.add(vp.sender_id);
        userIds.add(vp.recipient_id);
      });

      // Fetch memory IDs we need titles for
      const memoryIds = [...new Set(contributions?.map(c => c.memory_id) || [])];

      // Fetch profiles and memory titles in parallel
      const [profilesResult, memoriesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", Array.from(userIds)),
        memoryIds.length > 0
          ? supabase.from("memories").select("id, title").in("id", memoryIds)
          : Promise.resolve({ data: [] })
      ]);

      const profiles = profilesResult.data || [];
      const memories = memoriesResult.data || [];

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));
      const memoryMap = new Map(memories.map(m => [m.id, m.title]));

      // Transform contributions
      const contributionItems: ActivityContribution[] = (contributions || []).map(c => {
        const profile = profileMap.get(c.contributor_id);
        return {
          id: c.id,
          memory_id: c.memory_id,
          memory_title: memoryMap.get(c.memory_id) || "Unknown Memory",
          contributor_id: c.contributor_id,
          contributor_name: profile?.display_name || null,
          contributor_avatar: profile?.avatar_url || null,
          transcript: c.transcript,
          audio_url: c.audio_url,
          created_at: c.created_at,
          type: "contribution" as const
        };
      });

      // Transform voice prompts
      const voicePromptItems: ActivityVoicePrompt[] = (voicePrompts || []).map(vp => {
        const senderProfile = profileMap.get(vp.sender_id);
        const recipientProfile = profileMap.get(vp.recipient_id);
        return {
          id: vp.id,
          sender_id: vp.sender_id,
          sender_name: senderProfile?.display_name || null,
          sender_avatar: senderProfile?.avatar_url || null,
          recipient_id: vp.recipient_id,
          recipient_name: recipientProfile?.display_name || null,
          audio_url: vp.audio_url,
          transcript: vp.transcript,
          created_at: vp.created_at,
          is_read: vp.is_read,
          type: "voice_prompt" as const
        };
      });

      // Combine and sort by created_at
      const allActivities: ActivityItem[] = [...contributionItems, ...voicePromptItems];
      allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(allActivities);
    } catch (error) {
      console.error("Error fetching circle activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContribution = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("memory_contributions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setActivities(prev => prev.filter(a => a.id !== id));
      toast({ title: "Contribution deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteVoicePrompt = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("voice_prompts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setActivities(prev => prev.filter(a => a.id !== id));
      toast({ title: "Voice prompt deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  // Using getInitials and getCleanTitle from utils

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-parchment/50" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-full bg-wood-dark/30 flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="h-10 w-10 text-parchment/50" />
        </div>
        <h2 className="text-xl font-serif font-medium text-parchment mb-2">No Activity Yet</h2>
        <p className="text-parchment/60 font-sans max-w-sm mx-auto">
          When members add perspectives to memories or send voice prompts, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        if (activity.type === "contribution") {
          const isOwn = activity.contributor_id === userId;
          return (
            <div
              key={activity.id}
              className="bg-leather/80 rounded-xl p-4 border border-gold/20 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 border-2 border-gold/20 flex-shrink-0">
                  <AvatarImage src={activity.contributor_avatar || undefined} />
                  <AvatarFallback className="bg-wood-medium text-parchment text-xs font-serif">
                    {getInitials(activity.contributor_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-parchment font-sans">
                      {activity.contributor_name || "Member"}
                    </span>
                    {isOwn && (
                      <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-sans">
                        You
                      </span>
                    )}
                    <span className="text-parchment/50 text-sm font-sans">
                      added a perspective
                    </span>
                  </div>
                  <button
                    onClick={() => onViewMemory(activity.memory_id)}
                    className="text-gold hover:text-gold/80 text-sm font-sans flex items-center gap-1 mt-1"
                  >
                    <BookOpen className="w-3 h-3" />
                    {getCleanTitle(activity.memory_title)}
                  </button>
                  <p className="text-parchment/80 text-sm mt-2 line-clamp-3 font-sans">
                    {activity.transcript}
                  </p>
                  {activity.audio_url && (
                    <div className="mt-2">
                      <AudioPlayer audioUrl={activity.audio_url} />
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-parchment/50 font-sans">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                    {isOwn && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContribution(activity.id)}
                        disabled={deletingId === activity.id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
                      >
                        {deletingId === activity.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        } else {
          const isSender = activity.sender_id === userId;
          const isRecipient = activity.recipient_id === userId;
          return (
            <div
              key={activity.id}
              className="bg-leather/80 rounded-xl p-4 border border-gold/20 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 border-2 border-gold/20 flex-shrink-0">
                  <AvatarImage src={activity.sender_avatar || undefined} />
                  <AvatarFallback className="bg-wood-medium text-parchment text-xs font-serif">
                    {getInitials(activity.sender_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-parchment font-sans">
                      {activity.sender_name || "Member"}
                    </span>
                    {isSender && (
                      <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded-full font-sans">
                        You
                      </span>
                    )}
                    <span className="text-parchment/50 text-sm font-sans">
                      sent a voice prompt to
                    </span>
                    <span className="font-medium text-parchment font-sans">
                      {isRecipient ? "you" : activity.recipient_name || "Member"}
                    </span>
                  </div>
                  <div className="mt-2">
                    <AudioPlayer audioUrl={activity.audio_url} />
                  </div>
                  {activity.transcript && (
                    <p className="text-parchment/60 text-sm mt-2 italic font-sans">
                      "{activity.transcript}"
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-parchment/50 font-sans">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                    {isSender && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVoicePrompt(activity.id)}
                        disabled={deletingId === activity.id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
                      >
                        {deletingId === activity.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};

export default CircleActivityFeed;
