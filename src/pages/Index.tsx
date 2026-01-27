import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import TopNavBar from "@/components/TopNavBar";
import TabNavigation from "@/components/TabNavigation";
import PictureViewer from "@/components/PictureViewer";
import CaptureOverlay from "@/components/CaptureOverlay";
import RecordingInterface from "@/components/RecordingInterface";
import WritingInterface from "@/components/WritingInterface";
import FollowUpPrompt from "@/components/FollowUpPrompt";
import FollowUpQuestions from "@/components/FollowUpQuestions";
import FinalSaveScreen from "@/components/FinalSaveScreen";
import MemorySavedPopup from "@/components/MemorySavedPopup";
import MemoryLibrary from "@/components/MemoryLibrary";
import GalleryView from "@/components/GalleryView";
import PhotoBrowserView from "@/components/PhotoBrowserView";
import CaptureMainScreen from "@/components/CaptureMainScreen";
import CaptureModeOverlay from "@/components/CaptureModeOverlay";
import StoryRecordingInterface from "@/components/StoryRecordingInterface";
import StoryWritingInterface from "@/components/StoryWritingInterface";
import ConversationRecordingInterface from "@/components/ConversationRecordingInterface";
import ConversationWritingInterface from "@/components/ConversationWritingInterface";
import StoryFinalSaveScreen from "@/components/StoryFinalSaveScreen";
import { Auth } from "@/components/Auth";
import SharedMemoriesView from "@/components/SharedMemoriesView";
import VoicePromptsView from "@/components/VoicePromptsView";

import QuickTip from "@/components/QuickTip";
import { supabase } from "@/integrations/supabase/client";
import { useAI } from "@/hooks/useAI";
import { useOnboarding } from "@/hooks/useOnboarding";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { MemoryEpisode } from "@/types/memory";

type ActiveView =
  | "home"
  | "gallery"
  | "picture-viewer"
  | "capture-overlay"
  | "recording"
  | "writing"
  | "follow-up-prompt"
  | "follow-up-questions"
  | "final-save"
  | "saved-popup"
  | "library"
  | "capture-main"
  | "capture-mode-overlay"
  | "story-recording"
  | "story-writing"
  | "conversation-recording"
  | "conversation-writing"
  | "story-follow-up-prompt"
  | "story-follow-up-questions"
  | "story-final-save"
  | "add-capture-recording"
  | "add-capture-writing"
  | "add-capture-follow-up-prompt"
  | "add-capture-follow-up-questions"
  | "photo-browser"
  | "shared-memories"
  | "voice-prompts";

type CaptureFlowType = "lets-talk" | "tell-story" | null;

type ActiveTab = "gallery" | "library" | "capture" | null;

const IndexContent = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>("home");
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showHomeControls, setShowHomeControls] = useState(false);
  
  // memoryEpisodes are now stored in Supabase and fetched in MemoryLibrary
  const [textSize, setTextSize] = useState<"small" | "medium" | "large">(() => {
    const saved = localStorage.getItem("textSize");
    return (saved as "small" | "medium" | "large") || "medium";
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    const saved = localStorage.getItem("highContrast");
    return saved === "true";
  });

  // Persist textSize to localStorage and apply to body
  useEffect(() => {
    localStorage.setItem("textSize", textSize);
    // Apply text size class to body for portaled elements (dialogs, etc.)
    document.body.classList.remove("text-size-small", "text-size-medium", "text-size-large");
    document.body.classList.add(`text-size-${textSize}`);
  }, [textSize]);
  const [existingCollections, setExistingCollections] = useState<string[]>([]);

  // Capture flow state
  const [pendingTranscript, setPendingTranscript] = useState("");
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);
  const [pendingMemoryType, setPendingMemoryType] = useState<"audio" | "text">("audio");
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [captureFlowType, setCaptureFlowType] = useState<CaptureFlowType>(null);
  const [memoryIdToAddCaptureTo, setMemoryIdToAddCaptureTo] = useState<string | null>(null);
  const [addCapturePhotoUrl, setAddCapturePhotoUrl] = useState<string | null>(null);
  const [pendingCaptureAudioUrl, setPendingCaptureAudioUrl] = useState<string | null>(null);
  const [browserPhotos, setBrowserPhotos] = useState<{ id: string; url: string }[]>([]);
  const [viewerPhotos, setViewerPhotos] = useState<{ id: string; url: string }[]>([]);
  const [pictureViewerSource, setPictureViewerSource] = useState<"home" | "photo-browser">("home");
  const [usedPhotoUrls, setUsedPhotoUrls] = useState<string[]>([]);
  const [focusedMemoryId, setFocusedMemoryId] = useState<string | null>(null);
  const [focusedPromptId, setFocusedPromptId] = useState<string | null>(null);
  const [savedMemoryId, setSavedMemoryId] = useState<string | null>(null);
  const [slideshowSource, setSlideshowSource] = useState<string>(
    () => localStorage.getItem("slideshowSource") || "all",
  );
  const [albums, setAlbums] = useState<{ id: string; name: string; photos: { id: string; url: string }[] }[]>([]);
  const [familyCircles, setFamilyCircles] = useState<{ id: string; name: string; photos: { id: string; url: string; circle_id?: string }[] }[]>([]);

  const { generateSummary } = useAI();
  const { t } = useTranslation();
  const { markTipAsShown, shouldShowTip } = useOnboarding();

  const fetchCollections = async () => {
    const { data } = await supabase.from("memories").select("title");
    if (data) {
      const collections = data
        .map((m) => {
          const match = m.title.match(/\[([^\]]+)\]$/);
          return match ? match[1] : null;
        })
        .filter((c): c is string => c !== null);
      setExistingCollections([...new Set(collections)]);
    }
  };

  const fetchAlbums = async () => {
    try {
      // Fetch all albums for this user
      const { data: albumsData, error: albumsError } = await supabase
        .from("albums")
        .select("*")
        .order("created_at", { ascending: true });

      if (albumsError) throw albumsError;

      // Fetch photos for each album
      const albumsWithPhotos = await Promise.all(
        (albumsData || []).map(async (album) => {
          const { data: photos } = await supabase
            .from("photos")
            .select("*")
            .eq("album_id", album.id)
            .order("created_at", { ascending: false });

          return {
            ...album,
            photos: photos || [],
          };
        }),
      );

      setAlbums(albumsWithPhotos);
    } catch (error) {
      console.error("Error fetching albums:", error);
    }
  };

  const fetchFamilyCircles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get circles user is a member of
      const { data: memberships } = await supabase
        .from("family_members")
        .select("circle_id, family_circles(id, name)")
        .eq("user_id", user.id);

      if (!memberships?.length) {
        setFamilyCircles([]);
        return;
      }

      const circlesWithPhotos = await Promise.all(
        memberships.map(async (membership) => {
          const circleData = membership.family_circles as unknown as { id: string; name: string } | null;
          if (!circleData) return null;

          // Get photos directly shared to this circle
          const { data: directPhotos } = await supabase
            .from("photos")
            .select("id, url, circle_id")
            .eq("circle_id", membership.circle_id);

          // Get photos from shared memories in this circle
          const { data: sharedMemoryPhotos } = await supabase
            .from("memory_shares")
            .select("memories!inner(photo_id, photos!inner(id, url))")
            .eq("circle_id", membership.circle_id);

          // Combine direct photos
          const directPhotoList = (directPhotos || []).map(p => ({
            id: p.id,
            url: p.url,
            circle_id: p.circle_id || undefined
          }));

          // Extract photos from shared memories
          const memoryPhotoList = (sharedMemoryPhotos || [])
            .map(ms => {
              const memory = ms.memories as any;
              const photo = memory?.photos;
              if (photo) {
                return { id: photo.id, url: photo.url, circle_id: membership.circle_id };
              }
              return null;
            })
            .filter((p): p is NonNullable<typeof p> => p !== null);

          // Deduplicate by photo id
          const allPhotos = [...directPhotoList];
          memoryPhotoList.forEach(mp => {
            if (!allPhotos.find(p => p.id === mp.id)) {
              allPhotos.push(mp);
            }
          });

          return {
            id: circleData.id,
            name: circleData.name,
            photos: allPhotos
          };
        })
      );

      setFamilyCircles(circlesWithPhotos.filter((c): c is NonNullable<typeof c> => c !== null));
    } catch (error) {
      console.error("Error fetching family circles:", error);
    }
  };

  // Persist slideshow source to localStorage
  useEffect(() => {
    localStorage.setItem("slideshowSource", slideshowSource);
  }, [slideshowSource]);

  // Refresh albums and circles when returning to home
  useEffect(() => {
    if (activeView === "home") {
      fetchAlbums();
      fetchFamilyCircles();
    }
  }, [activeView]);

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add("high-contrast");
    } else {
      document.body.classList.remove("high-contrast");
    }
  }, [highContrast]);

  // Compute all photos (Your Photos + all album photos combined, excluding circle photos)
  const allPhotos = useMemo(() => {
    const albumPhotos = albums.flatMap((album) => album.photos);
    // Combine and deduplicate by id
    const combined = [...photos, ...albumPhotos];
    const uniqueMap = new Map(combined.map((p) => [p.id, p]));
    return Array.from(uniqueMap.values());
  }, [photos, albums]);

  // Compute slideshow photos based on selected source
  const slideshowPhotos = useMemo(() => {
    switch (slideshowSource) {
      case "all":
        return allPhotos;
      case "unused":
        return allPhotos.filter((p) => !usedPhotoUrls.includes(p.url));
      case "your-photos":
        return photos;
      default:
        // Check for user albums first
        const album = albums.find((a) => a.id === slideshowSource);
        if (album) {
          return album.photos;
        }
        // Check for family circles
        const circle = familyCircles.find((c) => c.id === slideshowSource);
        if (circle) {
          return circle.photos;
        }
        return photos;
    }
  }, [slideshowSource, photos, allPhotos, usedPhotoUrls, albums, familyCircles]);

  // Get slideshow source display name
  const getSlideshowSourceName = () => {
    switch (slideshowSource) {
      case "all":
        return "All Photos";
      case "unused":
        return "Unused Photos";
      case "your-photos":
        return "Your Photos";
      default:
        const album = albums.find((a) => a.id === slideshowSource);
        if (album) return album.name;
        const circle = familyCircles.find((c) => c.id === slideshowSource);
        if (circle) return circle.name;
        return "All Photos";
    }
  };

  // Get the source/album name for a photo (used in "All Photos" mode)
  const getPhotoSourceName = (photo: { id: string; url: string; album_id?: string | null; circle_id?: string | null }) => {
    if (photo.circle_id) {
      const circle = familyCircles.find((c) => c.id === photo.circle_id);
      return circle?.name || "Family Circle";
    }
    if (!photo.album_id) {
      return "Your Photos";
    }
    const album = albums.find((a) => a.id === photo.album_id);
    return album?.name || "Album";
  };


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        fetchPhotos();
        fetchCollections();
        fetchUsedPhotoUrls();
        fetchAlbums();
        fetchFamilyCircles();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPhotos();
        fetchAlbums();
        fetchFamilyCircles();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchPhotos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Fetch photos that are owned by current user, NOT in any album AND NOT shared to any circle (Your Photos)
    const { data } = await supabase
      .from("photos")
      .select("*")
      .eq("user_id", user.id)
      .is("album_id", null)
      .is("circle_id", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setPhotos(data);
    }
  };

  const fetchUsedPhotoUrls = async () => {
    try {
      // Fetch photos that are linked to memories via photo_id
      const { data: memoriesWithPhotoId } = await supabase
        .from("memories")
        .select("photo_id")
        .not("photo_id", "is", null);

      if (memoriesWithPhotoId && memoriesWithPhotoId.length > 0) {
        const photoIds = [...new Set(memoriesWithPhotoId.map((m) => m.photo_id).filter(Boolean))];

        const { data: usedPhotos } = await supabase.from("photos").select("url").in("id", photoIds);

        if (usedPhotos) {
          setUsedPhotoUrls(usedPhotos.map((p) => p.url));
        }
      }
    } catch (error) {
      console.error("Error fetching used photo URLs:", error);
    }
  };

  // Auto-advance slideshow on home
  useEffect(() => {
    if (slideshowPhotos.length === 0 || activeView !== "home") return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideshowPhotos.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [slideshowPhotos.length, activeView]);

  const goToHome = () => {
    setActiveView("home");
    setActiveTab(null);
  };

  // State for shared memories navigation
  const [sharedMemoriesInitialTab, setSharedMemoriesInitialTab] = useState<"circles" | "inbox">("circles");

  const handleNotificationClick = (notification: {
    type: "contribution" | "voice_prompt" | "memory_shared";
    reference_id: string | null;
    reference_type: string | null;
  }) => {
    if (notification.type === "voice_prompt" && notification.reference_id) {
      // Navigate to shared memories inbox tab with the specific prompt focused
      setFocusedPromptId(notification.reference_id);
      setSharedMemoriesInitialTab("inbox");
      setActiveView("shared-memories");
    } else if (notification.type === "contribution" && notification.reference_id) {
      // Navigate to shared memories view - the contribution will be visible on the memory
      setSharedMemoriesInitialTab("circles");
      setActiveView("shared-memories");
    } else if (notification.type === "memory_shared") {
      // Navigate to shared memories view
      setSharedMemoriesInitialTab("circles");
      setActiveView("shared-memories");
    }
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setFocusedMemoryId(null); // Clear focused memory when changing tabs
    if (tab === "gallery") {
      setActiveView("gallery");
    } else if (tab === "library") {
      setActiveView("library");
    } else if (tab === "capture") {
      setActiveView("capture-main");
    }
  };

  // New Capture Flow handlers
  const handleLetsTalk = () => {
    setCaptureFlowType("lets-talk");
    setActiveView("capture-mode-overlay");
  };

  const handleTellStory = () => {
    setCaptureFlowType("tell-story");
    setActiveView("capture-mode-overlay");
  };

  const handleCaptureModeRecord = () => {
    setPendingMemoryType("audio");
    if (captureFlowType === "lets-talk") {
      setActiveView("conversation-recording");
    } else {
      setActiveView("story-recording");
    }
  };

  const handleCaptureModeWrite = () => {
    setPendingMemoryType("text");
    if (captureFlowType === "lets-talk") {
      setActiveView("conversation-writing");
    } else {
      setActiveView("story-writing");
    }
  };

  const handleStoryDone = (transcript: string, audioUrl?: string | null) => {
    setPendingTranscript(transcript);
    setPendingAudioUrl(audioUrl || null);
    // Skip follow-up prompt for "lets-talk" flow since it already has AI questions
    if (captureFlowType === "lets-talk") {
      setActiveView("story-final-save");
    } else {
      setActiveView("story-follow-up-prompt");
    }
  };

  const handleStoryFollowUpYes = () => {
    setActiveView("story-follow-up-questions");
  };

  const handleStoryFollowUpNo = () => {
    setActiveView("story-final-save");
  };

  const handleStoryFollowUpQuestionsDone = (additionalContent: string) => {
    if (additionalContent) {
      setPendingTranscript((prev) => prev + "\n\n---\n\n" + additionalContent);
    }
    setActiveView("story-final-save");
  };

  const handleStoryFinalSave = async (title: string, collection: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const fullTitle = `${title} [${collection}]`;

    // Generate AI summary
    const aiSummary = await generateSummary(pendingTranscript);

    const { data, error } = await supabase
      .from("memories")
      .insert({
        user_id: user.id,
        title: fullTitle,
        transcript: pendingTranscript,
        ai_enhancement: aiSummary,
        audio_url: pendingAudioUrl,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error saving memory:", error);
    } else if (data) {
      setSavedMemoryId(data.id);
    }

    // Reset audio URL
    setPendingAudioUrl(null);
    setActiveView("saved-popup");
  };

  const handleViewPicture = () => {
    if (slideshowPhotos.length > 0) {
      setSelectedPhotoUrl(slideshowPhotos[currentSlide]?.url || null);
      setViewerPhotos(slideshowPhotos);
      setPictureViewerSource("home");
      setActiveView("picture-viewer");
    }
  };

  const handlePhotoSelect = (
    photoUrl: string,
    source: "home" | "photo-browser" = "home",
    sourcePhotos?: { id: string; url: string }[],
  ) => {
    setSelectedPhotoUrl(photoUrl);

    // Use source photos if provided, otherwise use the main photos array
    const photosToUse = sourcePhotos || photos;
    setViewerPhotos(photosToUse);

    const index = photosToUse.findIndex((p) => p.url === photoUrl);
    if (index !== -1) setCurrentSlide(index);
    else setCurrentSlide(0);

    setPictureViewerSource(source);
    setActiveView("picture-viewer");
  };

  const handleCaptureMemory = async () => {
    const photosToCheck = viewerPhotos.length > 0 ? viewerPhotos : photos;
    const currentPhoto = photosToCheck[currentSlide];

    // Set the selected photo URL for the capture flow
    if (currentPhoto) {
      setSelectedPhotoUrl(currentPhoto.url);
    }

    if (currentPhoto && usedPhotoUrls.includes(currentPhoto.url)) {
      // Photo already has a memory - find it and route to add-capture flow
      const { data: photo } = await supabase.from("photos").select("id").eq("url", currentPhoto.url).single();

      if (photo) {
        const { data: memory } = await supabase.from("memories").select("id").eq("photo_id", photo.id).single();

        if (memory) {
          setMemoryIdToAddCaptureTo(memory.id);
          setAddCapturePhotoUrl(currentPhoto.url);
          setActiveView("capture-overlay"); // Reuse capture overlay, but handlers will check for add-capture mode
          return;
        }
      }
    }
    // No existing memory - regular capture flow
    setMemoryIdToAddCaptureTo(null);
    setActiveView("capture-overlay");
  };

  const handleCloseCaptureOverlay = () => {
    setMemoryIdToAddCaptureTo(null);
    setAddCapturePhotoUrl(null);
    setActiveView(selectedPhotoUrl ? "picture-viewer" : "home");
  };

  const handleRecord = () => {
    setPendingMemoryType("audio");
    if (memoryIdToAddCaptureTo) {
      // Adding to existing memory
      setActiveView("add-capture-recording");
    } else {
      setActiveView("recording");
    }
  };

  const handleWrite = () => {
    setPendingMemoryType("text");
    if (memoryIdToAddCaptureTo) {
      // Adding to existing memory
      setActiveView("add-capture-writing");
    } else {
      setActiveView("writing");
    }
  };

  const handleRecordingDone = (transcript: string, audioUrl?: string | null) => {
    setPendingTranscript(transcript);
    setPendingAudioUrl(audioUrl || null);
    setActiveView("follow-up-prompt");
  };

  const handleWritingDone = (text: string) => {
    setPendingTranscript(text);
    setActiveView("follow-up-prompt");
  };

  const handleFollowUpYes = () => {
    setActiveView("follow-up-questions");
  };

  const handleFollowUpNo = () => {
    setActiveView("final-save");
  };

  const handleFollowUpQuestionsDone = (additionalContent: string) => {
    if (additionalContent) {
      setPendingTranscript((prev) => prev + "\n\n---\n\n" + additionalContent);
    }
    setActiveView("final-save");
  };

  const handleFinalSave = async (title: string, collection: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const fullTitle = `${title} [${collection}]`;

    // Find photo_id from selectedPhotoUrl - check all photo sources
    let photoId: string | null = null;
    if (selectedPhotoUrl) {
      // Check viewerPhotos first (most likely source when viewing a specific photo)
      let matchingPhoto = viewerPhotos.find((p) => p.url === selectedPhotoUrl);
      // Fall back to browserPhotos
      if (!matchingPhoto) {
        matchingPhoto = browserPhotos.find((p) => p.url === selectedPhotoUrl);
      }
      // Fall back to main photos array
      if (!matchingPhoto) {
        matchingPhoto = photos.find((p) => p.url === selectedPhotoUrl);
      }
      // Check in albums
      if (!matchingPhoto) {
        for (const album of albums) {
          matchingPhoto = album.photos.find((p) => p.url === selectedPhotoUrl);
          if (matchingPhoto) break;
        }
      }
      if (matchingPhoto) {
        photoId = matchingPhoto.id;
      }
    }

    // Generate AI summary
    const aiSummary = await generateSummary(pendingTranscript);

    const { data, error } = await supabase
      .from("memories")
      .insert({
        user_id: user.id,
        title: fullTitle,
        transcript: pendingTranscript,
        photo_id: photoId,
        ai_enhancement: aiSummary,
        audio_url: pendingAudioUrl,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error saving memory:", error);
    } else if (data) {
      setSavedMemoryId(data.id);
    }

    // Refresh used photo URLs after saving
    fetchUsedPhotoUrls();

    // Reset audio URL
    setPendingAudioUrl(null);

    setActiveView("saved-popup");
  };

  const handleSavedPopupComplete = () => {
    // Navigate to library with the saved memory focused
    const memoryToFocus = savedMemoryId || memoryIdToAddCaptureTo;

    setPendingTranscript("");
    setPendingAudioUrl(null);
    setSelectedPhotoUrl(null);
    setMemoryIdToAddCaptureTo(null);
    setAddCapturePhotoUrl(null);
    setSavedMemoryId(null);

    if (memoryToFocus) {
      setFocusedMemoryId(memoryToFocus);
      setActiveTab("library");
      setActiveView("library");
    } else {
      goToHome();
    }
  };

  // Add capture to existing memory handlers
  const handleAddNewCapture = (memoryId: string, mode: "record" | "write", photoUrl?: string | null) => {
    setMemoryIdToAddCaptureTo(memoryId);
    setAddCapturePhotoUrl(photoUrl || null);
    setPendingMemoryType(mode === "record" ? "audio" : "text");
    if (mode === "record") {
      setActiveView("add-capture-recording");
    } else {
      setActiveView("add-capture-writing");
    }
  };

  const handleAddCaptureDone = (transcript: string, audioUrl?: string | null) => {
    setPendingTranscript(transcript);
    setPendingCaptureAudioUrl(audioUrl || null);
    setActiveView("add-capture-follow-up-prompt");
  };

  const handleAddCaptureFollowUpYes = () => {
    setActiveView("add-capture-follow-up-questions");
  };

  const handleAddCaptureFollowUpNo = async () => {
    await saveAddedCapture(pendingTranscript, pendingCaptureAudioUrl);
  };

  const handleAddCaptureFollowUpQuestionsDone = async (additionalContent: string) => {
    const fullTranscript = additionalContent
      ? pendingTranscript + "\n\n---\n\n" + additionalContent
      : pendingTranscript;
    await saveAddedCapture(fullTranscript, pendingCaptureAudioUrl);
  };

  const saveAddedCapture = async (transcriptToAdd: string, audioUrl: string | null) => {
    if (!memoryIdToAddCaptureTo || !user) return;

    // Insert the new capture into memory_captures table
    const { error: insertError } = await supabase.from("memory_captures").insert({
      memory_id: memoryIdToAddCaptureTo,
      user_id: user.id,
      audio_url: audioUrl || "",
      transcript: transcriptToAdd,
    });

    if (insertError) {
      console.error("Error inserting capture:", insertError);
      return;
    }

    // Get all captures for this memory to regenerate AI summary
    const { data: allCaptures } = await supabase
      .from("memory_captures")
      .select("transcript")
      .eq("memory_id", memoryIdToAddCaptureTo)
      .order("created_at", { ascending: true });

    // Get the original memory transcript
    const { data: existingMemory } = await supabase
      .from("memories")
      .select("transcript")
      .eq("id", memoryIdToAddCaptureTo)
      .single();

    // Combine all transcripts for AI summary
    let fullTranscript = existingMemory?.transcript || "";
    if (allCaptures && allCaptures.length > 0) {
      fullTranscript += allCaptures.map((c) => "\n\n--- New Capture ---\n\n" + c.transcript).join("");
    }

    // Regenerate AI summary with all content
    const aiSummary = await generateSummary(fullTranscript);

    await supabase.from("memories").update({ ai_enhancement: aiSummary }).eq("id", memoryIdToAddCaptureTo);

    setPendingCaptureAudioUrl(null);
    setActiveView("saved-popup");
  };

  // Episode management is now handled by MemoryLibrary with Supabase

  const prevSlide = () => {
    // Use viewerPhotos if in picture-viewer, otherwise use slideshowPhotos
    const photosLength = activeView === "picture-viewer" && viewerPhotos.length > 0 
      ? viewerPhotos.length 
      : slideshowPhotos.length;
    if (photosLength === 0) return;
    setCurrentSlide((prev) => (prev - 1 + photosLength) % photosLength);
  };

  const nextSlide = () => {
    // Use viewerPhotos if in picture-viewer, otherwise use slideshowPhotos
    const photosLength = activeView === "picture-viewer" && viewerPhotos.length > 0 
      ? viewerPhotos.length 
      : slideshowPhotos.length;
    if (photosLength === 0) return;
    setCurrentSlide((prev) => (prev + 1) % photosLength);
  };

  // Generate suggested title and collection
  const suggestedTitle = `Memory from ${new Date().toLocaleDateString()}`;
  const suggestedCollection = "Memories";

  if (loading) {
    return null;
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className={`min-h-screen bg-background text-size-${textSize} ${highContrast ? "high-contrast" : ""}`}>
      {/* Top Navigation Bar */}
      {activeView === "home" ? (
        <div
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${
            showHomeControls ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
          }`}
        >
          <TopNavBar
            onHomeClick={goToHome}
            textSize={textSize}
            onTextSizeChange={setTextSize}
            highContrast={highContrast}
            onHighContrastChange={(enabled) => {
              setHighContrast(enabled);
              localStorage.setItem("highContrast", String(enabled));
            }}
            onNotificationClick={handleNotificationClick}
          />
        </div>
      ) : (
        <TopNavBar
          onHomeClick={goToHome}
          textSize={textSize}
          onTextSizeChange={setTextSize}
          highContrast={highContrast}
          onHighContrastChange={(enabled) => {
            setHighContrast(enabled);
            localStorage.setItem("highContrast", String(enabled));
          }}
          onNotificationClick={handleNotificationClick}
        />
      )}

      {/* Tab Navigation */}
      {activeView === "home" ? (
        <div
          className={`fixed top-16 left-0 right-0 z-40 transition-all duration-300 ease-out ${
            showHomeControls ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
          }`}
        >
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      ) : (
        <div className="pt-16">
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      )}

      {/* Main Content */}
      <main className={activeView !== "home" ? "pt-0" : ""}>
        {/* Home View - Full-screen Slideshow */}
        {activeView === "home" && (
          <>
            {slideshowPhotos.length > 0 ? (
              <div 
                className="h-screen w-full relative" 
                onClick={() => setShowHomeControls((prev) => !prev)}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  (e.currentTarget as HTMLElement).dataset.touchStartX = String(touch.clientX);
                  (e.currentTarget as HTMLElement).dataset.touchStartY = String(touch.clientY);
                }}
                onTouchEnd={(e) => {
                  const startX = parseFloat((e.currentTarget as HTMLElement).dataset.touchStartX || "0");
                  const startY = parseFloat((e.currentTarget as HTMLElement).dataset.touchStartY || "0");
                  const endX = e.changedTouches[0].clientX;
                  const endY = e.changedTouches[0].clientY;
                  const diffX = endX - startX;
                  const diffY = endY - startY;
                  
                  // Only swipe if horizontal movement is greater than vertical (to avoid conflicts with scrolling)
                  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                    if (diffX > 0) {
                      prevSlide();
                    } else {
                      nextSlide();
                    }
                  }
                }}
              >
                {/* Netflix-style Hero Section */}
                <div className="relative h-full w-full">
                  {slideshowPhotos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className={`absolute inset-0 transition-opacity duration-1000 ${
                        index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                    >
                      <img src={photo.url} alt={`Memory ${index + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-transparent" />
                    </div>
                  ))}

                  {/* Photo Source Label - Show in All Photos mode */}
                  {slideshowSource === "all" && slideshowPhotos[currentSlide] && (
                    <div className="absolute top-20 left-6 z-10">
                      <span className="bg-background/70 backdrop-blur-sm text-foreground text-sm px-3 py-1.5 rounded-full">
                        From: {getPhotoSourceName(slideshowPhotos[currentSlide] as { id: string; url: string; album_id?: string | null })}
                      </span>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevSlide();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/50 hover:bg-background/80 p-3 rounded-full transition-all hover:scale-110 z-10"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextSlide();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/50 hover:bg-background/80 p-3 rounded-full transition-all hover:scale-110 z-10"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  {/* Dots Indicator - Summarized for many photos */}
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-10 px-2 py-1">
                    <div className="flex items-center gap-1.5">
                      {slideshowPhotos.length <= 10 ? (
                        // Show all dots if 10 or fewer photos
                        slideshowPhotos.map((_, index) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentSlide(index);
                            }}
                            className={`flex-shrink-0 h-2 rounded-full transition-all ${
                              index === currentSlide ? "bg-primary w-5" : "bg-foreground/30 hover:bg-foreground/50 w-2"
                            }`}
                            aria-label={`Go to photo ${index + 1}`}
                          />
                        ))
                      ) : (
                        // Sliding window dots - show 7 dots centered on current
                        (() => {
                          const totalDots = 7;
                          const halfWindow = Math.floor(totalDots / 2);
                          const total = slideshowPhotos.length;
                          
                          // Calculate visible range
                          let start = currentSlide - halfWindow;
                          let end = currentSlide + halfWindow;
                          
                          // Adjust for edges
                          if (start < 0) {
                            end -= start;
                            start = 0;
                          }
                          if (end >= total) {
                            start -= (end - total + 1);
                            end = total - 1;
                          }
                          start = Math.max(0, start);
                          
                          const visibleIndices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
                          
                          return visibleIndices.map((index) => {
                            const distance = Math.abs(index - currentSlide);
                            const opacityClass = distance === 0 ? "" : 
                              distance === 1 ? "opacity-70" : 
                              distance === 2 ? "opacity-40" : "opacity-25";
                            
                            return (
                              <button
                                key={index}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentSlide(index);
                                }}
                                className={`flex-shrink-0 h-2 rounded-full transition-all duration-200 ${
                                  index === currentSlide 
                                    ? "bg-primary w-5 scale-110" 
                                    : `bg-foreground/50 hover:bg-foreground/70 w-2 ${opacityClass}`
                                }`}
                                aria-label={`Go to photo ${index + 1}`}
                              />
                            );
                          });
                        })()
                      )}
                    </div>
                    <span className="text-xs text-foreground/60">
                      {currentSlide + 1} / {slideshowPhotos.length}
                    </span>
                  </div>

                  {/* Slideshow Source Selector - Bottom Left */}
                  <div
                    className={`absolute bottom-6 left-6 z-20 transition-all duration-300 ease-out ${
                      showHomeControls ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0 pointer-events-none"
                    }`}
                  >
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 bg-card/90 hover:bg-card text-card-foreground border-border backdrop-blur-sm shadow-md"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Images className="w-4 h-4" />
                          <span className="hidden sm:inline">{getSlideshowSourceName()}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-56 p-2 bg-popover"
                        align="start"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground px-2 py-1">Show photos from:</p>
                          <button
                            onClick={() => {
                              setSlideshowSource("all");
                              setCurrentSlide(0);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${slideshowSource === "all" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                          >
                            All Photos
                          </button>
                          <button
                            onClick={() => {
                              setSlideshowSource("unused");
                              setCurrentSlide(0);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${slideshowSource === "unused" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                          >
                            Unused Photos
                          </button>
                          <button
                            onClick={() => {
                              setSlideshowSource("your-photos");
                              setCurrentSlide(0);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${slideshowSource === "your-photos" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                          >
                            Your Photos
                          </button>
                          {albums.length > 0 && (
                            <>
                              <div className="border-t border-border my-1" />
                              {albums.map((album) => (
                                <button
                                  key={album.id}
                                  onClick={() => {
                                    setSlideshowSource(album.id);
                                    setCurrentSlide(0);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${slideshowSource === album.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                                >
                                  {album.name}
                                </button>
                              ))}
                            </>
                          )}
                          {familyCircles.length > 0 && (
                            <>
                              <div className="border-t border-border my-1" />
                              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Family Circles:</p>
                              {familyCircles.map((circle) => (
                                <button
                                  key={circle.id}
                                  onClick={() => {
                                    setSlideshowSource(circle.id);
                                    setCurrentSlide(0);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${slideshowSource === circle.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                                >
                                  {circle.name}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* View Picture Button - Slides up on hover */}
                  <div
                    className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-10 transition-all duration-300 ease-out ${
                      showHomeControls ? "translate-y-0 opacity-100" : "translate-y-16 opacity-0 pointer-events-none"
                    }`}
                  >
                    <Button onClick={handleViewPicture} size="lg" className="px-8 text-lg shadow-lg">
                      View picture in Gallery
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 px-4">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                  {slideshowSource === "unused" ? "No Unused Photos" : "Welcome to Reminisce"}
                </h2>
                <p className="text-foreground/60 mb-6">
                  {slideshowSource === "unused"
                    ? "All your photos have memories recorded to them!"
                    : "Upload some photos to get started with your memory library."}
                </p>
                <Button onClick={() => handleTabChange("gallery")} size="lg">
                  Go to Gallery
                </Button>
              </div>
            )}
          </>
        )}

        {/* Gallery View */}
        {activeView === "gallery" && (
          <div className="container mx-auto px-4">
            <GalleryView
              onPhotoSelect={handlePhotoSelect}
              onBack={goToHome}
              onPhotosChange={() => {
                fetchPhotos();
                fetchUsedPhotoUrls();
              }}
              onViewAllPhotos={(photos) => {
                setBrowserPhotos(photos);
                setActiveView("photo-browser");
              }}
              onViewAllUsedPhotos={(photos) => {
                setBrowserPhotos(photos);
                setActiveView("photo-browser");
              }}
            />
          </div>
        )}

        {/* Photo Browser View */}
        {activeView === "photo-browser" && (
          <PhotoBrowserView
            photos={browserPhotos}
            onBack={() => setActiveView("gallery")}
            onPhotoSelect={(photoUrl) => handlePhotoSelect(photoUrl, "photo-browser")}
          />
        )}

        {/* Picture Viewer */}
        {activeView === "picture-viewer" && (
          <div className="container mx-auto px-4">
            <PictureViewer
              photos={viewerPhotos.length > 0 ? viewerPhotos : photos}
              currentIndex={currentSlide}
              onPrevious={prevSlide}
              onNext={nextSlide}
              onCaptureMemory={handleCaptureMemory}
              onReadInLibrary={async () => {
                const photosToCheck = viewerPhotos.length > 0 ? viewerPhotos : photos;
                const currentPhoto = photosToCheck[currentSlide];
                if (currentPhoto) {
                  // Find the memory linked to this photo
                  const { data: photo } = await supabase
                    .from("photos")
                    .select("id")
                    .eq("url", currentPhoto.url)
                    .single();

                  if (photo) {
                    const { data: memory } = await supabase
                      .from("memories")
                      .select("id")
                      .eq("photo_id", photo.id)
                      .single();

                    if (memory) {
                      setFocusedMemoryId(memory.id);
                    }
                  }
                }
                setActiveTab("library");
                setActiveView("library");
              }}
              onBack={
                pictureViewerSource === "photo-browser"
                  ? () => setActiveView("photo-browser")
                  : () => setActiveView("gallery")
              }
              usedPhotoUrls={usedPhotoUrls}
            />
          </div>
        )}

        {/* Library View */}
        {activeView === "library" && (
          <div className="container mx-auto px-4">
            <MemoryLibrary
              onBack={() => {
                setFocusedMemoryId(null);
                goToHome();
              }}
              onAddNewCapture={handleAddNewCapture}
              focusedMemoryId={focusedMemoryId}
              onOpenSharedMemories={() => setActiveView("shared-memories")}
            />
          </div>
        )}
      </main>

      {/* Overlays and Modals */}

      {/* Capture Mode Selection Overlay */}
      {activeView === "capture-overlay" && (
        <CaptureOverlay onRecord={handleRecord} onWrite={handleWrite} onClose={handleCloseCaptureOverlay} />
      )}

      {/* Recording Interface */}
      {activeView === "recording" && (
        <RecordingInterface photoUrl={selectedPhotoUrl} onDone={handleRecordingDone} textSize={textSize} />
      )}

      {/* Writing Interface */}
      {activeView === "writing" && (
        <WritingInterface photoUrl={selectedPhotoUrl} onDone={handleWritingDone} textSize={textSize} />
      )}

      {/* Follow-up Prompt */}
      {activeView === "follow-up-prompt" && <FollowUpPrompt onYes={handleFollowUpYes} onNo={handleFollowUpNo} />}

      {/* Follow-up Questions */}
      {activeView === "follow-up-questions" && (
        <FollowUpQuestions
          photoUrl={selectedPhotoUrl}
          mode={pendingMemoryType}
          onDone={handleFollowUpQuestionsDone}
          textSize={textSize}
          initialTranscript={pendingTranscript}
        />
      )}

      {/* Final Save Screen */}
      {activeView === "final-save" && (
        <FinalSaveScreen
          photoUrl={selectedPhotoUrl}
          transcript={pendingTranscript}
          suggestedTitle={suggestedTitle}
          suggestedCollection={suggestedCollection}
          existingCollections={existingCollections}
          onSave={handleFinalSave}
          onDelete={() => {
            setPendingTranscript("");
            goToHome();
          }}
          textSize={textSize}
        />
      )}

      {/* Memory Saved Popup */}
      {activeView === "saved-popup" && <MemorySavedPopup onComplete={handleSavedPopupComplete} />}

      {/* Shared Memories / Family Sharing View */}
      {activeView === "shared-memories" && (
        <SharedMemoriesView 
          onBack={() => {
            setFocusedPromptId(null);
            setSharedMemoriesInitialTab("circles");
            setActiveView("library");
          }}
          initialMainTab={sharedMemoriesInitialTab}
          focusedPromptId={focusedPromptId}
        />
      )}

      {/* Voice Prompts View */}
      {activeView === "voice-prompts" && (
        <VoicePromptsView 
          onBack={() => {
            setFocusedPromptId(null);
            setActiveView("home");
          }} 
          initialPromptId={focusedPromptId || undefined}
        />
      )}

      {/* Capture Main Screen */}
      {activeView === "capture-main" && (
        <CaptureMainScreen onBack={goToHome} onLetsTalk={handleLetsTalk} onTellStory={handleTellStory} />
      )}

      {/* Capture Mode Overlay (Record/Write selection) */}
      {activeView === "capture-mode-overlay" && (
        <CaptureModeOverlay
          onRecord={handleCaptureModeRecord}
          onWrite={handleCaptureModeWrite}
          onClose={() => setActiveView("capture-main")}
        />
      )}

      {/* Story Recording Interface */}
      {activeView === "story-recording" && (
        <StoryRecordingInterface onDone={handleStoryDone} onHome={() => setActiveView("home")} textSize={textSize} />
      )}

      {/* Story Writing Interface */}
      {activeView === "story-writing" && (
        <StoryWritingInterface
          onDone={handleStoryDone}
          textSize={textSize}
          onHomeClick={goToHome}
          onTextSizeChange={setTextSize}
        />
      )}

      {/* Conversation Recording Interface */}
      {activeView === "conversation-recording" && (
        <ConversationRecordingInterface
          onDone={handleStoryDone}
          onHome={() => setActiveView("home")}
          textSize={textSize}
        />
      )}

      {/* Conversation Writing Interface */}
      {activeView === "conversation-writing" && (
        <ConversationWritingInterface
          onDone={handleStoryDone}
          onHome={() => setActiveView("home")}
          textSize={textSize}
        />
      )}

      {/* Story Follow-up Prompt */}
      {activeView === "story-follow-up-prompt" && (
        <FollowUpPrompt onYes={handleStoryFollowUpYes} onNo={handleStoryFollowUpNo} />
      )}

      {/* Story Follow-up Questions */}
      {activeView === "story-follow-up-questions" && (
        <FollowUpQuestions
          photoUrl={null}
          mode={pendingMemoryType}
          onDone={handleStoryFollowUpQuestionsDone}
          textSize={textSize}
        />
      )}

      {/* Story Final Save Screen */}
      {activeView === "story-final-save" && (
        <StoryFinalSaveScreen
          transcript={pendingTranscript}
          suggestedTitle={suggestedTitle}
          suggestedCollection={suggestedCollection}
          existingCollections={existingCollections}
          onSave={handleStoryFinalSave}
          onDelete={() => {
            setPendingTranscript("");
            goToHome();
          }}
          textSize={textSize}
        />
      )}

      {/* ADD CAPTURE TO EXISTING MEMORY VIEWS */}

      {/* Add Capture Recording Interface */}
      {activeView === "add-capture-recording" && (
        <StoryRecordingInterface onDone={handleAddCaptureDone} textSize={textSize} photoUrl={addCapturePhotoUrl} />
      )}

      {/* Add Capture Writing Interface */}
      {activeView === "add-capture-writing" && (
        <StoryWritingInterface
          onDone={handleAddCaptureDone}
          textSize={textSize}
          onHomeClick={goToHome}
          onTextSizeChange={setTextSize}
          photoUrl={addCapturePhotoUrl}
        />
      )}

      {/* Add Capture Follow-up Prompt */}
      {activeView === "add-capture-follow-up-prompt" && (
        <FollowUpPrompt onYes={handleAddCaptureFollowUpYes} onNo={handleAddCaptureFollowUpNo} />
      )}

      {/* Add Capture Follow-up Questions */}
      {activeView === "add-capture-follow-up-questions" && (
        <FollowUpQuestions
          photoUrl={null}
          mode={pendingMemoryType}
          onDone={handleAddCaptureFollowUpQuestionsDone}
          textSize={textSize}
        />
      )}

    </div>
  );
};

// Wrap with LanguageProvider
const Index = () => {
  return (
    <LanguageProvider>
      <IndexContent />
    </LanguageProvider>
  );
};

export default Index;
