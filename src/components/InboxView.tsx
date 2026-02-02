import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, MessageCircle, Send, Inbox, Loader2, Trash2,
  ChevronDown, ChevronUp, Users
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AudioPlayer from "./AudioPlayer";
import { useToast } from "@/hooks/use-toast";
import { getInitials, getCleanTitle } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ReceivedPrompt {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  circle_id: string;
  circle_name: string;
  audio_url: string;
  transcript: string | null;
  created_at: string;
  is_read: boolean;
}

interface SentPrompt {
  id: string;
  recipient_id: string;
  recipient_name: string | null;
  recipient_avatar: string | null;
  circle_id: string;
  circle_name: string;
  audio_url: string;
  transcript: string | null;
  created_at: string;
}

interface MyContribution {
  id: string;
  memory_id: string;
  memory_title: string;
  circle_id: string;
  circle_name: string;
  transcript: string;
  audio_url: string | null;
  created_at: string;
}

interface InboxViewProps {
  onNavigateToCircle?: (circleId: string, tab: "memories" | "activity") => void;
  focusedPromptId?: string | null;
}

const InboxView = ({ onNavigateToCircle, focusedPromptId }: InboxViewProps) => {
  const [loading, setLoading] = useState(true);
  const [receivedPrompts, setReceivedPrompts] = useState<ReceivedPrompt[]>([]);
  const [sentPrompts, setSentPrompts] = useState<SentPrompt[]>([]);
  const [myContributions, setMyContributions] = useState<MyContribution[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [receivedOpen, setReceivedOpen] = useState(true);
  const [contributionsOpen, setContributionsOpen] = useState(true);
  const [sentOpen, setSentOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchInboxData();
  }, []);

  const fetchInboxData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch received voice prompts
      const { data: received } = await supabase
        .from("voice_prompts")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch sent voice prompts
      const { data: sent } = await supabase
        .from("voice_prompts")
        .select("*")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch user's contributions
      const { data: contributions } = await supabase
        .from("memory_contributions")
        .select("*")
        .eq("contributor_id", user.id)
        .order("created_at", { ascending: false });

      // Collect all IDs we need to look up
      const userIds = new Set<string>();
      const circleIds = new Set<string>();
      const memoryIds = new Set<string>();

      received?.forEach(r => {
        userIds.add(r.sender_id);
        circleIds.add(r.circle_id);
      });
      sent?.forEach(s => {
        userIds.add(s.recipient_id);
        circleIds.add(s.circle_id);
      });
      contributions?.forEach(c => {
        circleIds.add(c.circle_id);
        memoryIds.add(c.memory_id);
      });

      // Fetch profiles, circles, and memories in parallel
      const [profilesResult, circlesResult, memoriesResult] = await Promise.all([
        userIds.size > 0
          ? supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", Array.from(userIds))
          : Promise.resolve({ data: [] }),
        circleIds.size > 0
          ? supabase.from("family_circles").select("id, name").in("id", Array.from(circleIds))
          : Promise.resolve({ data: [] }),
        memoryIds.size > 0
          ? supabase.from("memories").select("id, title").in("id", Array.from(memoryIds))
          : Promise.resolve({ data: [] })
      ]);

      const profileMap = new Map((profilesResult.data || []).map(p => [p.user_id, p]));
      const circleMap = new Map((circlesResult.data || []).map(c => [c.id, c.name]));
      const memoryMap = new Map((memoriesResult.data || []).map(m => [m.id, m.title]));

      // Transform received prompts
      const transformedReceived: ReceivedPrompt[] = (received || []).map(r => {
        const senderProfile = profileMap.get(r.sender_id);
        return {
          id: r.id,
          sender_id: r.sender_id,
          sender_name: senderProfile?.display_name || null,
          sender_avatar: senderProfile?.avatar_url || null,
          circle_id: r.circle_id,
          circle_name: circleMap.get(r.circle_id) || "Unknown Circle",
          audio_url: r.audio_url,
          transcript: r.transcript,
          created_at: r.created_at,
          is_read: r.is_read
        };
      });

      // Transform sent prompts
      const transformedSent: SentPrompt[] = (sent || []).map(s => {
        const recipientProfile = profileMap.get(s.recipient_id);
        return {
          id: s.id,
          recipient_id: s.recipient_id,
          recipient_name: recipientProfile?.display_name || null,
          recipient_avatar: recipientProfile?.avatar_url || null,
          circle_id: s.circle_id,
          circle_name: circleMap.get(s.circle_id) || "Unknown Circle",
          audio_url: s.audio_url,
          transcript: s.transcript,
          created_at: s.created_at
        };
      });

      // Transform contributions
      const transformedContributions: MyContribution[] = (contributions || []).map(c => ({
        id: c.id,
        memory_id: c.memory_id,
        memory_title: memoryMap.get(c.memory_id) || "Unknown Memory",
        circle_id: c.circle_id,
        circle_name: circleMap.get(c.circle_id) || "Unknown Circle",
        transcript: c.transcript,
        audio_url: c.audio_url,
        created_at: c.created_at
      }));

      setReceivedPrompts(transformedReceived);
      setSentPrompts(transformedSent);
      setMyContributions(transformedContributions);
    } catch (error) {
      console.error("Error fetching inbox data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSentPrompt = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("voice_prompts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSentPrompts(prev => prev.filter(p => p.id !== id));
      toast({ title: "Prompt deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
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

      setMyContributions(prev => prev.filter(c => c.id !== id));
      toast({ title: "Contribution deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const markAsRead = async (promptId: string) => {
    try {
      await supabase
        .from("voice_prompts")
        .update({ is_read: true })
        .eq("id", promptId);

      setReceivedPrompts(prev =>
        prev.map(p => p.id === promptId ? { ...p, is_read: true } : p)
      );
    } catch (error) {
      console.error("Error marking prompt as read:", error);
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

  const totalItems = receivedPrompts.length + sentPrompts.length + myContributions.length;
  const unreadCount = receivedPrompts.filter(p => !p.is_read).length;

  if (totalItems === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-full bg-wood-dark/30 flex items-center justify-center mx-auto mb-4">
          <Inbox className="h-10 w-10 text-parchment/50" />
        </div>
        <h2 className="text-xl font-serif font-medium text-parchment mb-2">Your Inbox is Empty</h2>
        <p className="text-parchment/60 font-sans max-w-sm mx-auto">
          When you receive voice prompts, add perspectives to memories, or send prompts to others, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Received Prompts Section */}
      <Collapsible open={receivedOpen} onOpenChange={setReceivedOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 bg-leather/60 rounded-xl border border-gold/20 hover:bg-leather/80"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-gold" />
              <span className="font-serif font-medium text-parchment">Received Prompts</span>
              {unreadCount > 0 && (
                <span className="bg-gold text-leather text-xs px-2 py-0.5 rounded-full font-sans">
                  {unreadCount} new
                </span>
              )}
              <span className="text-parchment/50 text-sm font-sans">
                ({receivedPrompts.length})
              </span>
            </div>
            {receivedOpen ? (
              <ChevronUp className="h-5 w-5 text-parchment/50" />
            ) : (
              <ChevronDown className="h-5 w-5 text-parchment/50" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 mt-3">
          {receivedPrompts.length === 0 ? (
            <p className="text-parchment/50 text-sm font-sans text-center py-4">
              No voice prompts received yet.
            </p>
          ) : (
            receivedPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className={`bg-leather/80 rounded-xl p-4 border shadow-lg ${
                  !prompt.is_read ? "border-gold/50" : "border-gold/20"
                } ${focusedPromptId === prompt.id ? "ring-2 ring-gold" : ""}`}
                onClick={() => !prompt.is_read && markAsRead(prompt.id)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 border-2 border-gold/20 flex-shrink-0">
                    <AvatarImage src={prompt.sender_avatar || undefined} />
                    <AvatarFallback className="bg-wood-medium text-parchment text-xs font-serif">
                      {getInitials(prompt.sender_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-parchment font-sans">
                        {prompt.sender_name || "Member"}
                      </span>
                      <span className="text-parchment/50 text-sm font-sans">
                        sent you a voice prompt
                      </span>
                      {!prompt.is_read && (
                        <span className="w-2 h-2 bg-gold rounded-full" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-parchment/60 text-xs mt-1 font-sans">
                      <Users className="w-3 h-3" />
                      {prompt.circle_name}
                    </div>
                    <div className="mt-2">
                      <AudioPlayer audioUrl={prompt.audio_url} />
                    </div>
                    {prompt.transcript && (
                      <p className="text-parchment/60 text-sm mt-2 italic font-sans">
                        "{prompt.transcript}"
                      </p>
                    )}
                    <span className="text-xs text-parchment/50 font-sans block mt-2">
                      {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* My Contributions Section */}
      <Collapsible open={contributionsOpen} onOpenChange={setContributionsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 bg-leather/60 rounded-xl border border-gold/20 hover:bg-leather/80"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-gold" />
              <span className="font-serif font-medium text-parchment">Your Contributions</span>
              <span className="text-parchment/50 text-sm font-sans">
                ({myContributions.length})
              </span>
            </div>
            {contributionsOpen ? (
              <ChevronUp className="h-5 w-5 text-parchment/50" />
            ) : (
              <ChevronDown className="h-5 w-5 text-parchment/50" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 mt-3">
          {myContributions.length === 0 ? (
            <p className="text-parchment/50 text-sm font-sans text-center py-4">
              You haven't added any perspectives yet.
            </p>
          ) : (
            myContributions.map((contribution) => (
              <div
                key={contribution.id}
                className="bg-leather/80 rounded-xl p-4 border border-gold/20 shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-wood-dark/50 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-5 w-5 text-gold/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => onNavigateToCircle?.(contribution.circle_id, "memories")}
                      className="text-gold hover:text-gold/80 font-medium font-sans text-left"
                    >
                      {getCleanTitle(contribution.memory_title)}
                    </button>
                    <div className="flex items-center gap-1 text-parchment/60 text-xs mt-1 font-sans">
                      <Users className="w-3 h-3" />
                      {contribution.circle_name}
                    </div>
                    <p className="text-parchment/80 text-sm mt-2 line-clamp-2 font-sans">
                      {contribution.transcript}
                    </p>
                    {contribution.audio_url && (
                      <div className="mt-2">
                        <AudioPlayer audioUrl={contribution.audio_url} />
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-parchment/50 font-sans">
                        {formatDistanceToNow(new Date(contribution.created_at), { addSuffix: true })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContribution(contribution.id)}
                        disabled={deletingId === contribution.id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
                      >
                        {deletingId === contribution.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Sent Prompts Section */}
      <Collapsible open={sentOpen} onOpenChange={setSentOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-between p-4 bg-leather/60 rounded-xl border border-gold/20 hover:bg-leather/80"
          >
            <div className="flex items-center gap-3">
              <Send className="h-5 w-5 text-gold" />
              <span className="font-serif font-medium text-parchment">Sent Prompts</span>
              <span className="text-parchment/50 text-sm font-sans">
                ({sentPrompts.length})
              </span>
            </div>
            {sentOpen ? (
              <ChevronUp className="h-5 w-5 text-parchment/50" />
            ) : (
              <ChevronDown className="h-5 w-5 text-parchment/50" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 mt-3">
          {sentPrompts.length === 0 ? (
            <p className="text-parchment/50 text-sm font-sans text-center py-4">
              You haven't sent any voice prompts yet.
            </p>
          ) : (
            sentPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="bg-leather/80 rounded-xl p-4 border border-gold/20 shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10 border-2 border-gold/20 flex-shrink-0">
                    <AvatarImage src={prompt.recipient_avatar || undefined} />
                    <AvatarFallback className="bg-wood-medium text-parchment text-xs font-serif">
                      {getInitials(prompt.recipient_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-parchment/50 text-sm font-sans">
                        Sent to
                      </span>
                      <span className="font-medium text-parchment font-sans">
                        {prompt.recipient_name || "Member"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-parchment/60 text-xs mt-1 font-sans">
                      <Users className="w-3 h-3" />
                      {prompt.circle_name}
                    </div>
                    <div className="mt-2">
                      <AudioPlayer audioUrl={prompt.audio_url} />
                    </div>
                    {prompt.transcript && (
                      <p className="text-parchment/60 text-sm mt-2 italic font-sans">
                        "{prompt.transcript}"
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-parchment/50 font-sans">
                        {formatDistanceToNow(new Date(prompt.created_at), { addSuffix: true })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSentPrompt(prompt.id)}
                        disabled={deletingId === prompt.id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2"
                      >
                        {deletingId === prompt.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default InboxView;
