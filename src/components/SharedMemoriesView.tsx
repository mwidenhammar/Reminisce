import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Users, BookOpen, FileText, ChevronRight, 
  Copy, Check, LogOut, Crown, UserPlus, Loader2, Camera, Plus,
  Inbox, Activity
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AudioPlayer from "./AudioPlayer";
import ContributeToMemory from "./ContributeToMemory";
import SendVoicePrompt from "./SendVoicePrompt";
import MemoryContributions from "./MemoryContributions";
import TextToSpeechButton from "./TextToSpeechButton";
import CircleActivityFeed from "./CircleActivityFeed";
import InboxView from "./InboxView";
import { format, formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { compressImage } from "@/lib/imageCompression";
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

interface SharedMemory {
  id: string;
  title: string;
  transcript: string;
  audio_url: string | null;
  ai_enhancement: string | null;
  generated_image_url: string | null;
  photo_url?: string;
  created_at: string;
  shared_at: string;
  circle_id: string;
  shared_by: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface CircleWithMemories {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  memories: SharedMemory[];
  members: CircleMember[];
}

interface CircleMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface SharedMemoriesViewProps {
  onBack: () => void;
  initialMainTab?: "circles" | "inbox";
  focusedPromptId?: string | null;
}

type ViewMode = "circles" | "circle-detail" | "memory-detail";
type MainTab = "circles" | "inbox";
type CircleDetailTab = "memories" | "members" | "activity";

const SharedMemoriesView = ({ onBack, initialMainTab = "circles", focusedPromptId }: SharedMemoriesViewProps) => {
  const [loading, setLoading] = useState(true);
  const [circlesWithMemories, setCirclesWithMemories] = useState<CircleWithMemories[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<CircleWithMemories | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<SharedMemory | null>(null);
  const [activeTab, setActiveTab] = useState<"transcript" | "summary">("transcript");
  const [mainTab, setMainTab] = useState<MainTab>(initialMainTab);
  const [circleDetailTab, setCircleDetailTab] = useState<CircleDetailTab>("memories");
  
  // User state
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  
  // Profile editing state
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Create/Join circle state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  
  // Leave/Delete dialog
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaving, setLeaving] = useState(false);
  
  // Copy invite code state
  const [copied, setCopied] = useState(false);
  
  const { toast } = useToast();

  const fetchCircleMembers = async (circleId: string): Promise<CircleMember[]> => {
    const { data: membersData } = await supabase
      .from("family_members")
      .select("*")
      .eq("circle_id", circleId);

    if (!membersData) return [];

    const memberIds = membersData.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", memberIds);

    return membersData.map(member => ({
      ...member,
      profile: profiles?.find(p => p.user_id === member.user_id) || undefined,
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        setUserId(user.id);

        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", user.id)
          .single();
        
        setUserProfile(profile);
        if (profile?.display_name) {
          setDisplayName(profile.display_name);
        }

        // Get all circle memberships for the user
        const { data: memberships } = await supabase
          .from("family_members")
          .select("circle_id")
          .eq("user_id", user.id);

        if (!memberships || memberships.length === 0) {
          setCirclesWithMemories([]);
          setLoading(false);
          return;
        }

        const circleIds = memberships.map(m => m.circle_id);

        // Fetch circle details including invite_code and owner_id
        const { data: circles } = await supabase
          .from("family_circles")
          .select("id, name, invite_code, owner_id")
          .in("id", circleIds);

        if (!circles) {
          setLoading(false);
          return;
        }

        // Fetch all shared memories for these circles (excluding user's own)
        const { data: shares } = await supabase
          .from("memory_shares")
          .select("memory_id, shared_by, shared_at, circle_id")
          .in("circle_id", circleIds)
          .neq("shared_by", user.id);

        // Create memory lookup
        let memoryLookup: Record<string, any> = {};
        let photoMap: Record<string, string> = {};
        let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};

        if (shares && shares.length > 0) {
          // Fetch the memories
          const memoryIds = [...new Set(shares.map(s => s.memory_id))];
          const { data: memoriesData } = await supabase
            .from("memories")
            .select("*")
            .in("id", memoryIds);

          if (memoriesData) {
            // Get photo URLs for memories with photos
            const photoIds = memoriesData.filter(m => m.photo_id).map(m => m.photo_id);
            
            if (photoIds.length > 0) {
              const { data: photos } = await supabase
                .from("photos")
                .select("id, url")
                .in("id", photoIds as string[]);

              if (photos) {
                photoMap = Object.fromEntries(photos.map(p => [p.id, p.url]));
              }
            }

            memoriesData.forEach(m => {
              memoryLookup[m.id] = m;
            });
          }

          // Get sharer profiles with avatar_url
          const sharerIds = [...new Set(shares.map(s => s.shared_by))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", sharerIds);

          profiles?.forEach(p => {
            profileMap[p.user_id] = { 
              display_name: p.display_name, 
              avatar_url: p.avatar_url 
            };
          });
        }

        // Fetch members for all circles
        const membersPromises = circles.map(circle => fetchCircleMembers(circle.id));
        const allMembers = await Promise.all(membersPromises);
        const membersMap: Record<string, CircleMember[]> = {};
        circles.forEach((circle, index) => {
          membersMap[circle.id] = allMembers[index];
        });

        // Group memories by circle
        const circleMemoriesMap: Record<string, SharedMemory[]> = {};

        if (shares) {
          for (const share of shares) {
            const memory = memoryLookup[share.memory_id];
            if (!memory) continue;

            const circleId = share.circle_id;
            if (!circleMemoriesMap[circleId]) {
              circleMemoriesMap[circleId] = [];
            }

            const sharerProfile = profileMap[share.shared_by];

            circleMemoriesMap[circleId].push({
              id: memory.id,
              title: memory.title,
              transcript: memory.transcript,
              audio_url: memory.audio_url,
              ai_enhancement: memory.ai_enhancement,
              generated_image_url: memory.generated_image_url,
              photo_url: memory.photo_id ? photoMap[memory.photo_id] : undefined,
              created_at: memory.created_at || '',
              shared_at: share.shared_at,
              circle_id: circleId,
              shared_by: {
                user_id: share.shared_by,
                display_name: sharerProfile?.display_name || null,
                avatar_url: sharerProfile?.avatar_url || null,
              },
            });
          }
        }

        // Build circles with memories array
        const result: CircleWithMemories[] = circles.map(circle => ({
          id: circle.id,
          name: circle.name,
          invite_code: circle.invite_code,
          owner_id: circle.owner_id,
          memories: circleMemoriesMap[circle.id] || [],
          members: membersMap[circle.id] || [],
        }));

        // Sort memories within each circle by shared_at desc
        result.forEach(c => {
          c.memories.sort((a, b) => 
            new Date(b.shared_at).getTime() - new Date(a.shared_at).getTime()
          );
        });

        setCirclesWithMemories(result);
      } catch (error) {
        console.error("Error fetching shared memories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Profile handlers
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setUploadingAvatar(true);
    try {
      const compressedBlob = await compressImage(file, 400, 400, 0.8);
      
      const filePath = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(
          { user_id: userId, avatar_url: avatarUrl },
          { onConflict: 'user_id' }
        );

      if (updateError) throw updateError;

      setUserProfile(prev => ({ ...prev, display_name: prev?.display_name || null, avatar_url: avatarUrl }));
      toast({ title: "Avatar updated!" });
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast({ title: "Error uploading avatar", description: error.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveDisplayName = async () => {
    if (!userId || !displayName.trim()) return;
    setSavingName(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert(
          { user_id: userId, display_name: displayName.trim() },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      setUserProfile(prev => ({ ...prev, display_name: displayName.trim(), avatar_url: prev?.avatar_url || null }));
      setEditingName(false);
      toast({ title: "Name updated!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  // Circle handlers
  const handleCreateCircle = async () => {
    if (!circleName.trim() || !userId) return;
    setCreating(true);

    try {
      const { data, error } = await supabase
        .from("family_circles")
        .insert({ name: circleName.trim(), owner_id: userId })
        .select()
        .single();

      if (error) throw error;

      const members = await fetchCircleMembers(data.id);
      
      const newCircle: CircleWithMemories = {
        ...data,
        memories: [],
        members,
      };

      setCirclesWithMemories(prev => [...prev, newCircle]);
      setSelectedCircle(newCircle);
      setCircleDetailTab("members");
      setShowCreateForm(false);
      setCircleName("");
      toast({ title: "Circle created!", description: "Share your invite code with others to join." });
    } catch (error: any) {
      toast({ title: "Error creating circle", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleJoinCircle = async () => {
    if (!inviteCode.trim() || !userId) return;
    setJoining(true);

    try {
      const { data, error } = await supabase
        .rpc('join_circle_by_invite_code', { _invite_code: inviteCode.trim() });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; circle_id?: string; circle_name?: string };
      
      if (!result.success) {
        throw new Error(result.error || "Failed to join circle");
      }

      // Fetch the full circle data
      const { data: circleData } = await supabase
        .from("family_circles")
        .select("*")
        .eq("id", result.circle_id)
        .single();

      if (circleData) {
        const members = await fetchCircleMembers(circleData.id);
        
        const newCircle: CircleWithMemories = {
          ...circleData,
          memories: [],
          members,
        };

        setCirclesWithMemories(prev => [...prev, newCircle]);
        setSelectedCircle(newCircle);
        setCircleDetailTab("members");
      }

      setShowJoinForm(false);
      setInviteCode("");
      toast({ title: "Joined circle!", description: `Welcome to ${result.circle_name}` });
    } catch (error: any) {
      toast({ title: "Couldn't join circle", description: error.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveCircle = async () => {
    if (!selectedCircle || !userId) return;
    setLeaving(true);

    try {
      const isOwner = selectedCircle.owner_id === userId;

      if (isOwner) {
        const { error } = await supabase
          .from("family_circles")
          .delete()
          .eq("id", selectedCircle.id);

        if (error) throw error;
        toast({ title: "Circle deleted", description: "Your circle has been deleted." });
      } else {
        const { error } = await supabase
          .from("family_members")
          .delete()
          .eq("circle_id", selectedCircle.id)
          .eq("user_id", userId);

        if (error) throw error;
        toast({ title: "Left circle", description: "You've left the circle." });
      }

      setCirclesWithMemories(prev => prev.filter(c => c.id !== selectedCircle.id));
      setSelectedCircle(null);
      setShowLeaveDialog(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLeaving(false);
    }
  };

  const handleCopyCode = async () => {
    if (!selectedCircle) return;
    await navigator.clipboard.writeText(selectedCircle.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Invite code copied to clipboard." });
  };

  const getCleanTitle = (title: string): string => {
    return title.replace(/\s*\[[^\]]+\]$/, "");
  };

  const getSharerInitials = (name: string | null) => {
    if (!name) return "FM";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatSharedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, "MMMM d, yyyy");
  };

  const handleBack = () => {
    if (selectedMemory) {
      setSelectedMemory(null);
      setActiveTab("transcript");
    } else if (selectedCircle) {
      setSelectedCircle(null);
      setCircleDetailTab("memories");
    } else {
      onBack();
    }
  };

  // Count total shared memories across all circles
  const totalMemoriesCount = circlesWithMemories.reduce((sum, c) => sum + c.memories.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-parchment/80 font-serif">Loading...</div>
      </div>
    );
  }

  // Memory detail view
  if (selectedMemory) {
    const imageUrl = selectedMemory.generated_image_url || selectedMemory.photo_url;

    return (
      <div className="max-w-5xl mx-auto animate-fade-in py-8 px-4">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2 text-parchment hover:bg-wood-dark/50 hover:text-parchment"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* Conditional layout: 2 columns if photo exists, 1 column if not */}
        <div className={`grid gap-8 ${imageUrl ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
          {/* Left: Photo/Illustration */}
          {imageUrl && (
            <div className="relative">
              <div
                className="bg-parchment/10 rounded-2xl overflow-hidden aspect-square flex items-center justify-center shadow-xl"
                style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.1)" }}
              >
                <img
                  src={imageUrl}
                  alt={getCleanTitle(selectedMemory.title)}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Right: Title and content */}
          <div className="flex flex-col">
            <h1 className="text-3xl font-display font-semibold text-parchment mb-2">
              {getCleanTitle(selectedMemory.title)}
            </h1>

            {/* Shared by info with avatar */}
            <div className="flex items-center gap-3 mb-6">
              <Avatar className="w-8 h-8 border-2 border-gold/30">
                <AvatarImage src={selectedMemory.shared_by.avatar_url || undefined} />
                <AvatarFallback className="bg-wood-medium text-parchment text-xs font-serif">
                  {getSharerInitials(selectedMemory.shared_by.display_name)}
                </AvatarFallback>
              </Avatar>
              <div className="text-parchment/70 font-sans text-sm">
                Shared by <span className="text-parchment font-medium">{selectedMemory.shared_by.display_name || "Member"}</span>
                <span className="mx-1">•</span>
                {formatSharedDate(selectedMemory.shared_at)}
              </div>
            </div>

            {/* Tab buttons */}
            <div className="flex gap-3 mb-4">
              <Button
                variant={activeTab === "transcript" ? "default" : "outline"}
                className={
                  activeTab === "transcript"
                    ? "bg-gold text-leather hover:bg-gold/90 font-serif"
                    : "bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50 font-serif"
                }
                onClick={() => setActiveTab("transcript")}
              >
                <FileText className="w-4 h-4 mr-2" />
                Story
              </Button>
              <Button
                variant={activeTab === "summary" ? "default" : "outline"}
                className={
                  activeTab === "summary"
                    ? "bg-gold text-leather hover:bg-gold/90 font-serif"
                    : "bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50 font-serif"
                }
                onClick={() => setActiveTab("summary")}
              >
                AI Summary
              </Button>
            </div>

            {/* Audio playback */}
            {selectedMemory.audio_url && activeTab === "transcript" && (
              <div className="mb-4">
                <div className="text-sm text-parchment/70 mb-1 font-sans">Audio recording</div>
                <AudioPlayer audioUrl={selectedMemory.audio_url} />
              </div>
            )}

            {/* Content area */}
            <div
              className={`flex-1 overflow-y-auto p-6 rounded-xl ${imageUrl ? "max-h-[50vh]" : "max-h-[65vh]"}`}
              style={{
                background: "linear-gradient(180deg, hsl(35 32% 78%) 0%, hsl(35 32% 70%) 100%)",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              {activeTab === "transcript" ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-wood-dark/70">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm font-sans">Memory</span>
                    </div>
                    <TextToSpeechButton
                      text={selectedMemory.transcript}
                      label="Read Aloud"
                      className="bg-wood-dark/20 border-wood-dark/30 text-wood-dark hover:bg-wood-dark/30"
                    />
                  </div>
                  <p className="text-wood-dark leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedMemory.transcript}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-serif font-medium text-wood-dark/80">AI Summary</h2>
                    {selectedMemory.ai_enhancement && (
                      <TextToSpeechButton
                        text={selectedMemory.ai_enhancement}
                        label="Read Aloud"
                        className="bg-wood-dark/20 border-wood-dark/30 text-wood-dark hover:bg-wood-dark/30"
                      />
                    )}
                  </div>
                  {selectedMemory.ai_enhancement ? (
                    <p className="text-wood-dark leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedMemory.ai_enhancement}
                    </p>
                  ) : (
                    <p className="text-wood-dark/60 italic font-sans">
                      No AI summary available for this memory.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Collaborative features */}
            <div className="flex flex-wrap gap-2 mt-4">
              <ContributeToMemory
                memoryId={selectedMemory.id}
                circleId={selectedMemory.circle_id}
                memoryTitle={getCleanTitle(selectedMemory.title)}
              />
              {selectedCircle && (
                <SendVoicePrompt
                  circleId={selectedMemory.circle_id}
                  circleName={selectedCircle.name}
                  members={selectedCircle.members}
                />
              )}
            </div>

            {/* Other perspectives */}
            <MemoryContributions
              memoryId={selectedMemory.id}
              circleId={selectedMemory.circle_id}
            />
          </div>
        </div>
      </div>
    );
  }

  // Circle detail view (memories + members tabs)
  if (selectedCircle) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2 text-parchment hover:bg-wood-dark/50 hover:text-parchment"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-display font-semibold text-parchment tracking-wide">
              {selectedCircle.name}
            </h1>
            <p className="text-parchment/60 font-sans text-sm">
              {selectedCircle.members.length} {selectedCircle.members.length === 1 ? 'member' : 'members'}
              {selectedCircle.memories.length > 0 && ` • ${selectedCircle.memories.length} shared ${selectedCircle.memories.length === 1 ? 'memory' : 'memories'}`}
            </p>
          </div>
        </div>

        {/* Tab pills */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={circleDetailTab === "memories" ? "default" : "outline"}
            size="sm"
            className={
              circleDetailTab === "memories"
                ? "bg-gold text-leather hover:bg-gold/90 font-serif"
                : "bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50 font-serif"
            }
            onClick={() => setCircleDetailTab("memories")}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Memories
          </Button>
          <Button
            variant={circleDetailTab === "activity" ? "default" : "outline"}
            size="sm"
            className={
              circleDetailTab === "activity"
                ? "bg-gold text-leather hover:bg-gold/90 font-serif"
                : "bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50 font-serif"
            }
            onClick={() => setCircleDetailTab("activity")}
          >
            <Activity className="w-4 h-4 mr-2" />
            Activity
          </Button>
          <Button
            variant={circleDetailTab === "members" ? "default" : "outline"}
            size="sm"
            className={
              circleDetailTab === "members"
                ? "bg-gold text-leather hover:bg-gold/90 font-serif"
                : "bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50 font-serif"
            }
            onClick={() => setCircleDetailTab("members")}
          >
            <Users className="w-4 h-4 mr-2" />
            Members
          </Button>
        </div>

        {circleDetailTab === "memories" ? (
          // Memories list
          selectedCircle.memories.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-full bg-wood-dark/30 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-10 w-10 text-parchment/50" />
              </div>
              <h2 className="text-xl font-serif font-medium text-parchment mb-2">No Shared Memories Yet</h2>
              <p className="text-parchment/60 font-sans max-w-sm mx-auto">
                When members share memories to this circle, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {selectedCircle.memories.map((memory) => {
                const imageUrl = memory.generated_image_url || memory.photo_url;
                return (
                  <button
                    key={memory.id}
                    onClick={() => setSelectedMemory(memory)}
                    className="bg-leather/80 rounded-xl p-4 border border-gold/20 text-left 
                      hover:border-gold/50 hover:bg-leather transition-all duration-200
                      shadow-lg hover:shadow-xl"
                  >
                    <div className="flex gap-4">
                      {imageUrl && (
                        <div 
                          className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 shadow-md"
                          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}
                        >
                          <img
                            src={imageUrl}
                            alt={getCleanTitle(memory.title)}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-medium text-parchment text-lg truncate">
                          {getCleanTitle(memory.title)}
                        </h3>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Avatar className="w-5 h-5 border border-gold/20">
                            <AvatarImage src={memory.shared_by.avatar_url || undefined} />
                            <AvatarFallback className="bg-wood-medium text-parchment text-[10px] font-serif">
                              {getSharerInitials(memory.shared_by.display_name)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm text-parchment/70 font-sans">
                            {memory.shared_by.display_name || "Member"}
                            <span className="mx-1">•</span>
                            {formatSharedDate(memory.shared_at)}
                          </p>
                        </div>
                        
                        <p className="text-sm text-parchment/60 line-clamp-2 mt-2 font-sans leading-relaxed">
                          {memory.transcript}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )
        ) : circleDetailTab === "activity" ? (
          // Activity tab
          <CircleActivityFeed 
            circleId={selectedCircle.id}
            onViewMemory={(memoryId) => {
              const memory = selectedCircle.memories.find(m => m.id === memoryId);
              if (memory) {
                setSelectedMemory(memory);
              }
            }}
          />
        ) : (
          // Members tab
          <div className="space-y-6">
            {/* Invite Code */}
            <div className="bg-leather/60 rounded-xl p-4 border border-gold/20">
              <p className="text-sm text-parchment/70 mb-2 font-sans">Invite Code</p>
              <div className="flex items-center gap-2">
                <code className="text-2xl font-mono font-bold text-gold tracking-widest flex-1">
                  {selectedCircle.invite_code.toUpperCase()}
                </code>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyCode}
                  className="bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-parchment/50 mt-2 font-sans">
                Share this code so others can join your circle.
              </p>
            </div>

            {/* Members List */}
            <div className="bg-leather/60 rounded-xl p-4 border border-gold/20">
              <h3 className="font-serif font-medium text-parchment mb-4">Members</h3>
              <div className="space-y-3">
                {selectedCircle.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-wood-dark/30"
                  >
                    <Avatar className="h-10 w-10 border-2 border-gold/20">
                      {member.profile?.avatar_url ? (
                        <AvatarImage src={member.profile.avatar_url} alt={member.profile.display_name || "Member"} />
                      ) : null}
                      <AvatarFallback className="bg-wood-medium text-parchment font-serif">
                        {(member.profile?.display_name || "?")[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-parchment font-sans">
                      {member.profile?.display_name || "Unknown"}
                      {member.user_id === userId && " (You)"}
                    </span>
                    {member.role === "owner" && (
                      <Crown className="h-5 w-5 text-gold" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Leave/Delete Button */}
            <Button
              variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={() => setShowLeaveDialog(true)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {selectedCircle.owner_id === userId ? "Delete Circle" : "Leave Circle"}
            </Button>
          </div>
        )}

        {/* Leave/Delete Confirmation Dialog */}
        <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <AlertDialogContent className="bg-leather border-gold/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-parchment font-serif">
                {selectedCircle?.owner_id === userId ? "Delete Circle?" : "Leave Circle?"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-parchment/70 font-sans">
                {selectedCircle?.owner_id === userId
                  ? "This will permanently delete the circle and remove all members. Shared memories will no longer be visible to other members."
                  : "You will no longer see memories shared in this circle."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-wood-dark/50 border-gold/30 text-parchment hover:bg-wood-medium/50">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeaveCircle}
                className="bg-red-600 text-white hover:bg-red-700"
                disabled={leaving}
              >
                {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedCircle?.owner_id === userId ? "Delete" : "Leave"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Main view: Profile + Circles list / Inbox
  return (
    <div className="max-w-4xl mx-auto animate-fade-in py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 text-parchment hover:bg-wood-dark/50 hover:text-parchment"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-semibold text-parchment tracking-wide">
            Shared Libraries
          </h1>
          {totalMemoriesCount > 0 && mainTab === "circles" && (
            <p className="text-parchment/60 font-sans text-sm">
              {totalMemoriesCount} shared {totalMemoriesCount === 1 ? 'memory' : 'memories'}
            </p>
          )}
        </div>
      </div>

      {/* Main Tab Bar */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={mainTab === "circles" ? "default" : "outline"}
          size="sm"
          className={
            mainTab === "circles"
              ? "bg-gold text-leather hover:bg-gold/90 font-serif"
              : "bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50 font-serif"
          }
          onClick={() => setMainTab("circles")}
        >
          <Users className="w-4 h-4 mr-2" />
          Your Circles
        </Button>
        <Button
          variant={mainTab === "inbox" ? "default" : "outline"}
          size="sm"
          className={
            mainTab === "inbox"
              ? "bg-gold text-leather hover:bg-gold/90 font-serif"
              : "bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50 font-serif"
          }
          onClick={() => setMainTab("inbox")}
        >
          <Inbox className="w-4 h-4 mr-2" />
          Inbox
        </Button>
      </div>

      {mainTab === "inbox" ? (
        <InboxView 
          focusedPromptId={focusedPromptId}
          onNavigateToCircle={(circleId, tab) => {
            const circle = circlesWithMemories.find(c => c.id === circleId);
            if (circle) {
              setSelectedCircle(circle);
              setCircleDetailTab(tab);
              setMainTab("circles");
            }
          }}
        />
      ) : (
        <>
          {/* Profile Section */}
      <div className="bg-leather/60 rounded-xl p-5 border border-gold/20 mb-6">
        <h2 className="font-serif font-medium text-parchment mb-4">Your Profile</h2>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16 border-2 border-gold/30">
              {userProfile?.avatar_url ? (
                <AvatarImage src={userProfile.avatar_url} alt="Your avatar" />
              ) : null}
              <AvatarFallback className="text-lg bg-wood-medium text-parchment font-serif">
                {(userProfile?.display_name || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-gold text-leather flex items-center justify-center shadow-md hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="flex-1">
            {editingName ? (
              <div className="flex gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1 bg-wood-dark/50 border-gold/30 text-parchment"
                />
                <Button 
                  size="sm" 
                  onClick={handleSaveDisplayName} 
                  disabled={savingName}
                  className="bg-gold text-leather hover:bg-gold/90"
                >
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-parchment font-sans">
                  {userProfile?.display_name || "Not set"}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setEditingName(true)}
                  className="text-parchment/70 hover:text-parchment hover:bg-wood-dark/30"
                >
                  Edit
                </Button>
              </div>
            )}
            <p className="text-sm text-parchment/60 mt-1 font-sans">
              This name is shown to other circle members.
            </p>
          </div>
        </div>
      </div>

      {/* Circles Section */}
      <div className="space-y-4">
        <h2 className="font-serif font-medium text-parchment text-lg">Your Circles</h2>
        
        {circlesWithMemories.length > 0 && (
          <div className="grid gap-3">
            {circlesWithMemories.map((circle) => (
              <button
                key={circle.id}
                onClick={() => {
                  setSelectedCircle(circle);
                  setCircleDetailTab("memories");
                }}
                className="bg-leather/80 rounded-xl p-4 border border-gold/20 text-left 
                  hover:border-gold/50 hover:bg-leather transition-all duration-200
                  shadow-lg hover:shadow-xl flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-wood-dark/50 flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-gold/80" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif font-medium text-parchment text-lg">
                    {circle.name}
                  </h3>
                  <p className="text-sm text-parchment/60 font-sans">
                    {circle.members.length} {circle.members.length === 1 ? 'member' : 'members'}
                    {circle.memories.length > 0 && ` • ${circle.memories.length} shared`}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-parchment/40 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Create or Join */}
        <div className="bg-leather/60 rounded-xl p-5 border border-gold/20">
          {circlesWithMemories.length === 0 && (
            <div className="text-center mb-6">
              <div className="h-16 w-16 rounded-full bg-wood-dark/50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gold/70" />
              </div>
              <h3 className="text-lg font-serif font-semibold text-parchment mb-2">
                No Circles Yet
              </h3>
              <p className="text-parchment/60 font-sans text-sm">
                Create a circle to share memories with others, or join an existing one with an invite code.
              </p>
            </div>
          )}

          {showCreateForm ? (
            <div className="space-y-3">
              <Input
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                placeholder="Circle name (e.g., Close Friends)"
                className="text-center bg-wood-dark/50 border-gold/30 text-parchment placeholder:text-parchment/50"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gold text-leather hover:bg-gold/90"
                  onClick={handleCreateCircle}
                  disabled={!circleName.trim() || creating}
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
              </div>
            </div>
          ) : showJoinForm ? (
            <div className="space-y-3">
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter invite code"
                className="text-center font-mono tracking-widest uppercase bg-wood-dark/50 border-gold/30 text-parchment placeholder:text-parchment/50"
                maxLength={6}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50"
                  onClick={() => setShowJoinForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gold text-leather hover:bg-gold/90"
                  onClick={handleJoinCircle}
                  disabled={!inviteCode.trim() || joining}
                >
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Button 
                className="w-full bg-gold text-leather hover:bg-gold/90" 
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Circle
              </Button>
              <Button
                variant="outline"
                className="w-full bg-wood-dark/30 border-gold/30 text-parchment hover:bg-wood-medium/50"
                onClick={() => setShowJoinForm(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Join with Invite Code
              </Button>
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default SharedMemoriesView;
