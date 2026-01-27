import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Users,
  Copy,
  Check,
  LogOut,
  Crown,
  UserPlus,
  Loader2,
  Camera,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { compressImage } from "@/lib/imageCompression";

interface FamilyMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface FamilyCircle {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
}

interface FamilyCircleProps {
  onBack: () => void;
}

const FamilyCircleComponent = ({ onBack }: FamilyCircleProps) => {
  const [loading, setLoading] = useState(true);
  
  // Multiple circles support
  const [circles, setCircles] = useState<FamilyCircle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<FamilyCircle | null>(null);
  const [membersMap, setMembersMap] = useState<Record<string, FamilyMember[]>>({});
  
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  // Create circle state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [creating, setCreating] = useState(false);

  // Join circle state
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Edit profile state
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Avatar upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Leave dialog
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Copy state
  const [copied, setCopied] = useState(false);

  const { toast } = useToast();

  const fetchCircleMembers = async (circleId: string): Promise<FamilyMember[]> => {
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
      profile: profiles?.find(p => p.user_id === member.user_id) || null,
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

        // Fetch ALL user's family circle memberships
        const { data: memberships } = await supabase
          .from("family_members")
          .select("circle_id")
          .eq("user_id", user.id);

        if (memberships && memberships.length > 0) {
          const circleIds = memberships.map(m => m.circle_id);
          
          // Fetch all circles
          const { data: circlesData } = await supabase
            .from("family_circles")
            .select("*")
            .in("id", circleIds);

          if (circlesData) {
            setCircles(circlesData);

            // Fetch members for all circles
            const membersMapData: Record<string, FamilyMember[]> = {};
            for (const circle of circlesData) {
              membersMapData[circle.id] = await fetchCircleMembers(circle.id);
            }
            setMembersMap(membersMapData);
          }
        }
      } catch (error) {
        console.error("Error fetching family circles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setUploadingAvatar(true);
    try {
      // Compress the image
      const compressedBlob = await compressImage(file, 400, 400, 0.8);
      
      // Upload to storage
      const filePath = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressedBlob, { 
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(
          { user_id: userId, avatar_url: avatarUrl },
          { onConflict: 'user_id' }
        );

      if (updateError) throw updateError;

      setUserProfile(prev => ({ ...prev, display_name: prev?.display_name || null, avatar_url: avatarUrl }));
      
      // Update in members map
      setMembersMap(prev => {
        const updated = { ...prev };
        for (const circleId in updated) {
          updated[circleId] = updated[circleId].map(m =>
            m.user_id === userId
              ? { ...m, profile: { ...m.profile, display_name: m.profile?.display_name || null, avatar_url: avatarUrl } }
              : m
          );
        }
        return updated;
      });

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
      
      setCircles(prev => [...prev, data]);
      setMembersMap(prev => ({ ...prev, [data.id]: members }));
      setSelectedCircle(data);
      setShowCreateForm(false);
      setCircleName("");
      toast({ title: "Family circle created!", description: "Share your invite code with family members." });
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
        
        setCircles(prev => [...prev, circleData]);
        setMembersMap(prev => ({ ...prev, [circleData.id]: members }));
        setSelectedCircle(circleData);
      }

      setShowJoinForm(false);
      setInviteCode("");
      toast({ title: "Joined family circle!", description: `Welcome to ${result.circle_name}` });
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
        toast({ title: "Circle deleted", description: "Your family circle has been deleted." });
      } else {
        const { error } = await supabase
          .from("family_members")
          .delete()
          .eq("circle_id", selectedCircle.id)
          .eq("user_id", userId);

        if (error) throw error;
        toast({ title: "Left circle", description: "You've left the family circle." });
      }

      setCircles(prev => prev.filter(c => c.id !== selectedCircle.id));
      setMembersMap(prev => {
        const updated = { ...prev };
        delete updated[selectedCircle.id];
        return updated;
      });
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

      // Update in members map
      setMembersMap(prev => {
        const updated = { ...prev };
        for (const circleId in updated) {
          updated[circleId] = updated[circleId].map(m =>
            m.user_id === userId
              ? { ...m, profile: { ...m.profile, display_name: displayName.trim(), avatar_url: m.profile?.avatar_url || null } }
              : m
          );
        }
        return updated;
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  const currentMembers = selectedCircle ? membersMap[selectedCircle.id] || [] : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={selectedCircle ? () => setSelectedCircle(null) : onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">
          {selectedCircle ? selectedCircle.name : "Family Circles"}
        </h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Profile Section - Always visible */}
        {!selectedCircle && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <h2 className="font-medium text-foreground mb-4">Your Profile</h2>
            
            {/* Avatar Section */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  {userProfile?.avatar_url ? (
                    <AvatarImage src={userProfile.avatar_url} alt="Your avatar" />
                  ) : null}
                  <AvatarFallback className="text-lg bg-primary/20 text-primary">
                    {(userProfile?.display_name || "?")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
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
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleSaveDisplayName} disabled={savingName}>
                      {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {userProfile?.display_name || "Not set"}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setEditingName(true)}>
                      Edit
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  This name is shown to family members.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Circle Detail View */}
        {selectedCircle ? (
          <>
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{selectedCircle.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {currentMembers.length} {currentMembers.length === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>

              {/* Invite Code */}
              <div className="bg-muted rounded-lg p-3 mb-4">
                <p className="text-sm text-muted-foreground mb-1">Invite Code</p>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-mono font-bold text-foreground tracking-widest flex-1">
                    {selectedCircle.invite_code.toUpperCase()}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyCode}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this code with family members so they can join.
                </p>
              </div>

              {/* Members List with Avatars */}
              <div>
                <h3 className="font-medium text-foreground mb-2">Members</h3>
                <div className="space-y-2">
                  {currentMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <Avatar className="h-8 w-8">
                        {member.profile?.avatar_url ? (
                          <AvatarImage src={member.profile.avatar_url} alt={member.profile.display_name || "Member"} />
                        ) : null}
                        <AvatarFallback className="text-sm bg-primary/20 text-primary">
                          {(member.profile?.display_name || "?")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-foreground">
                        {member.profile?.display_name || "Unknown"}
                        {member.user_id === userId && " (You)"}
                      </span>
                      {member.role === "owner" && (
                        <Crown className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Leave/Delete Button */}
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={() => setShowLeaveDialog(true)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {selectedCircle.owner_id === userId ? "Delete Circle" : "Leave Circle"}
            </Button>
          </>
        ) : (
          <>
            {/* Circles List */}
            {circles.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-medium text-foreground">Your Circles</h2>
                {circles.map((circle) => {
                  const memberCount = membersMap[circle.id]?.length || 0;
                  return (
                    <div
                      key={circle.id}
                      className="bg-card rounded-xl p-4 border border-border flex items-center gap-3"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{circle.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {memberCount} {memberCount === 1 ? "member" : "members"}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => setSelectedCircle(circle)}>
                        View
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Create or Join */}
            <div className="bg-card rounded-xl p-6 border border-border">
              {circles.length === 0 && (
                <div className="text-center mb-6">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    No Family Circles Yet
                  </h2>
                  <p className="text-muted-foreground">
                    Create a circle to share memories with family, or join an existing one with an invite code.
                  </p>
                </div>
              )}

              {showCreateForm ? (
                <div className="space-y-3">
                  <Input
                    value={circleName}
                    onChange={(e) => setCircleName(e.target.value)}
                    placeholder="Circle name (e.g., Smith Family)"
                    className="text-center"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
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
                    className="text-center font-mono tracking-widest uppercase"
                    maxLength={6}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowJoinForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleJoinCircle}
                      disabled={!inviteCode.trim() || joining}
                    >
                      {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button className="w-full" onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Circle
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowJoinForm(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join with Invite Code
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Leave/Delete Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedCircle?.owner_id === userId ? "Delete Family Circle?" : "Leave Family Circle?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCircle?.owner_id === userId
                ? "This will permanently delete the circle and remove all members. Shared memories will no longer be visible to family."
                : "You will no longer see memories shared by this family circle."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveCircle}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={leaving}
            >
              {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : selectedCircle?.owner_id === userId ? "Delete" : "Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FamilyCircleComponent;
