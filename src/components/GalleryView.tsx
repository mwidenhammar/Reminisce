import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, ChevronLeft, ChevronRight, Image as ImageIcon, Trash2, Plus, Pencil, Check, X, Eye, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import QuickTip from "./QuickTip";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GalleryViewProps {
  onPhotoSelect: (photoUrl: string, source?: "home" | "photo-browser", sourcePhotos?: { id: string; url: string }[]) => void;
  onBack: () => void;
  onPhotosChange?: () => void;
  onViewAllPhotos?: (photos: { id: string; url: string }[]) => void;
  onViewAllUsedPhotos?: (photos: { id: string; url: string }[]) => void;
}

interface PhotoWithStorage {
  id: string;
  url: string;
  storage_path?: string;
  album_id?: string | null;
  uploaderName?: string;
}

interface Album {
  id: string;
  name: string;
  user_id: string;
  photos: PhotoWithStorage[];
}

interface SharedAlbum {
  circleId: string;
  circleName: string;
  photos: PhotoWithStorage[];
  canUpload: boolean;
}

type PhotoFilter = "all" | "unused" | "used";

const PhotoRow = ({ 
  title, 
  photos, 
  onPhotoSelect,
  onDeletePhoto,
  canDelete = false,
  onViewAll,
  isEditable = false,
  onTitleChange,
  onDeleteAlbum,
  isCustomAlbum = false,
  onUpload,
  usedPhotoIds,
  showFilters = false,
  showUploaderName = false,
}: { 
  title: string; 
  photos: PhotoWithStorage[];
  onPhotoSelect: (url: string, photos: PhotoWithStorage[]) => void;
  onDeletePhoto?: (photo: PhotoWithStorage) => void;
  canDelete?: boolean;
  onViewAll?: () => void;
  isEditable?: boolean;
  onTitleChange?: (newTitle: string) => void;
  onDeleteAlbum?: () => void;
  isCustomAlbum?: boolean;
  onUpload?: () => void;
  usedPhotoIds?: Set<string>;
  showFilters?: boolean;
  showUploaderName?: boolean;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [activeFilter, setActiveFilter] = useState<PhotoFilter>("all");

  // Filter photos based on active filter
  const filteredPhotos = showFilters && usedPhotoIds ? photos.filter(photo => {
    if (activeFilter === "all") return true;
    if (activeFilter === "used") return usedPhotoIds.has(photo.id);
    if (activeFilter === "unused") return !usedPhotoIds.has(photo.id);
    return true;
  }) : photos;

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({ 
        left: direction === "left" ? -scrollAmount : scrollAmount, 
        behavior: "smooth" 
      });
    }
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim() && onTitleChange) {
      onTitleChange(editedTitle.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(title);
    setIsEditing(false);
  };

  if (photos.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-xl font-semibold h-9 w-48"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                />
                <Button variant="ghost" size="icon" onClick={handleSaveTitle} className="h-8 w-8">
                  <Check className="w-4 h-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8">
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                {isEditable && (
                  <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
                {isCustomAlbum && onDeleteAlbum && (
                  <Button variant="ghost" size="icon" onClick={onDeleteAlbum} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        {onUpload ? (
          <button
            onClick={onUpload}
            className="w-full py-8 rounded-xl border-2 border-dashed border-border hover:border-primary bg-card/50 hover:bg-card transition-all duration-300 flex flex-col items-center justify-center gap-2 group"
          >
            <Plus className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-muted-foreground group-hover:text-primary transition-colors font-medium">Add Photo</span>
          </button>
        ) : (
          <div className="bg-card/50 rounded-xl p-8 text-center border border-border">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No photos yet</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-xl font-semibold h-9 w-48"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") handleCancelEdit();
                }}
              />
              <Button variant="ghost" size="icon" onClick={handleSaveTitle} className="h-8 w-8">
                <Check className="w-4 h-4 text-primary" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8">
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              {isEditable && (
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-8 w-8">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
              {isCustomAlbum && onDeleteAlbum && (
                <Button variant="ghost" size="icon" onClick={onDeleteAlbum} className="h-8 w-8 text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Filter buttons for custom albums */}
          {showFilters && usedPhotoIds && (
            <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  activeFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter("used")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  activeFilter === "used"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Used
              </button>
              <button
                onClick={() => setActiveFilter("unused")}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                  activeFilter === "unused"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Unused
              </button>
            </div>
          )}
          {onViewAll && photos.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewAll}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              View all
            </Button>
          )}
        </div>
      </div>
      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-card/90 hover:bg-card p-3 rounded-full shadow-lg border border-border transition-all hover:scale-110"
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeft className="w-6 h-6 text-foreground" />
        </button>

        {/* Photo Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-12 py-2 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {/* Add Photo Button */}
          {onUpload && (
            <button
              onClick={onUpload}
              className="flex-shrink-0 w-44 h-32 md:w-56 md:h-40 rounded-xl border-2 border-dashed border-border hover:border-primary bg-card/50 hover:bg-card transition-all duration-300 hover:scale-105 flex flex-col items-center justify-center gap-2 group"
            >
              <Plus className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors font-medium">Add Photo</span>
            </button>
          )}
          {filteredPhotos.length === 0 && photos.length > 0 && activeFilter !== "all" && (
            <div className="flex-shrink-0 w-44 h-32 md:w-56 md:h-40 rounded-xl bg-card/50 border border-border flex items-center justify-center">
              <p className="text-muted-foreground text-sm text-center px-2">
                No {activeFilter} photos
              </p>
            </div>
          )}
          {filteredPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className="group/item relative flex-shrink-0 w-44 h-32 md:w-56 md:h-40 rounded-xl overflow-hidden border-2 border-border hover:border-primary transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              <button
                onClick={() => onPhotoSelect(photo.url, filteredPhotos)}
                className="w-full h-full focus:outline-none focus:ring-4 focus:ring-primary/50"
              >
                <img
                  src={photo.url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                  <span className="text-foreground font-medium text-sm bg-primary/80 px-3 py-1 rounded-full">
                    View
                  </span>
                </div>
              </button>
              
              {/* Uploader Name Badge */}
              {showUploaderName && photo.uploaderName && (
                <div className="absolute bottom-2 left-2 z-10 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full">
                  <span className="text-xs font-medium text-foreground">{photo.uploaderName}</span>
                </div>
              )}
              
              {/* Delete Button - Show on all albums that allow deletion */}
              {canDelete && onDeletePhoto && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePhoto(photo);
                  }}
                  className="absolute top-2 right-2 z-10 bg-destructive/90 hover:bg-destructive p-2 rounded-full shadow-lg opacity-0 group-hover/item:opacity-100 transition-all duration-300 hover:scale-110"
                  aria-label="Delete photo"
                >
                  <Trash2 className="w-4 h-4 text-destructive-foreground" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card/90 hover:bg-card p-3 rounded-full shadow-lg border border-border transition-all hover:scale-110"
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRight className="w-6 h-6 text-foreground" />
        </button>
      </div>
    </div>
  );
};

const GalleryView = ({ onPhotoSelect, onBack, onPhotosChange, onViewAllPhotos, onViewAllUsedPhotos }: GalleryViewProps) => {
  const [userPhotos, setUserPhotos] = useState<PhotoWithStorage[]>([]);
  const [usedPhotos, setUsedPhotos] = useState<PhotoWithStorage[]>([]);
  const [unusedPhotos, setUnusedPhotos] = useState<PhotoWithStorage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<PhotoWithStorage | null>(null);
  const [photoDeleteSource, setPhotoDeleteSource] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [sharedAlbums, setSharedAlbums] = useState<SharedAlbum[]>([]);
  const [showNewGalleryDialog, setShowNewGalleryDialog] = useState(false);
  const [newGalleryName, setNewGalleryName] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedUploadGallery, setSelectedUploadGallery] = useState<string>("your-photos");
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);
  const [directUploadTarget, setDirectUploadTarget] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserPhotos();
    fetchUsedPhotos();
    fetchAlbums();
    fetchSharedPhotos();
  }, []);

  // Create a Set of used photo IDs for efficient lookup
  const usedPhotoIds = new Set(usedPhotos.map(p => p.id));

  // Calculate unused photos whenever userPhotos or usedPhotos change
  useEffect(() => {
    const unused = userPhotos.filter(p => !usedPhotoIds.has(p.id));
    setUnusedPhotos(unused);
  }, [userPhotos, usedPhotos]);

  const fetchUserPhotos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch photos that are NOT in any album and NOT shared to a circle (Your Photos)
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .eq("user_id", user.id)
        .is("album_id", null)
        .is("circle_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserPhotos(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading photos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchUsedPhotos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch memories that have a photo_id (linked to photos table)
      const { data: memoriesWithPhotoId, error: memoriesError } = await supabase
        .from("memories")
        .select("photo_id")
        .eq("user_id", user.id)
        .not("photo_id", "is", null);

      if (memoriesError) throw memoriesError;

      // Get unique photo IDs from memories
      const photoIds = [...new Set(memoriesWithPhotoId?.map(m => m.photo_id).filter(Boolean) || [])];

      if (photoIds.length > 0) {
        // Fetch the actual photo records
        const { data: photos, error: photosError } = await supabase
          .from("photos")
          .select("*")
          .in("id", photoIds);

        if (photosError) throw photosError;
        setUsedPhotos(photos || []);
      } else {
        setUsedPhotos([]);
      }
    } catch (error: any) {
      console.error("Error fetching used photos:", error);
    }
  };

  const fetchAlbums = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all albums for this user
      const { data: albumsData, error: albumsError } = await supabase
        .from("albums")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (albumsError) throw albumsError;

      // Fetch photos for each album
      const albumsWithPhotos: Album[] = await Promise.all(
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
        })
      );

      setAlbums(albumsWithPhotos);
    } catch (error: any) {
      console.error("Error fetching albums:", error);
    }
  };

  const fetchSharedPhotos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get circles user is a member of
      const { data: memberships } = await supabase
        .from("family_members")
        .select("circle_id, family_circles(name)")
        .eq("user_id", user.id);

      if (!memberships?.length) {
        setSharedAlbums([]);
        return;
      }

      const sharedAlbumsData: SharedAlbum[] = [];

      // Collect all user IDs we need profiles for
      const allUserIds = new Set<string>();

      for (const membership of memberships) {
        const circleData = membership.family_circles as unknown as { name: string } | null;
        
        // Get photos directly shared to this circle (including own uploads to see them in the circle)
        const { data: circlePhotos } = await supabase
          .from("photos")
          .select("id, url, storage_path, user_id")
          .eq("circle_id", membership.circle_id);

        // Collect user IDs from circle photos
        circlePhotos?.forEach(p => {
          if (p.user_id) allUserIds.add(p.user_id);
        });

        // Also get photos from shared memories (not shared by self)
        const { data: shares } = await supabase
          .from("memory_shares")
          .select("memory_id, shared_by")
          .eq("circle_id", membership.circle_id)
          .neq("shared_by", user.id);

        let memoryPhotos: (PhotoWithStorage & { userId?: string })[] = [];
        if (shares?.length) {
          const memoryIds = shares.map(s => s.memory_id);
          const { data: memories } = await supabase
            .from("memories")
            .select("photo_id, user_id, photos:photo_id(id, url, storage_path)")
            .in("id", memoryIds)
            .not("photo_id", "is", null);

          memoryPhotos = memories
            ?.filter(m => m.photos)
            .map(m => {
              const photo = m.photos as unknown as { id: string; url: string; storage_path: string };
              if (m.user_id) allUserIds.add(m.user_id);
              return {
                id: photo.id,
                url: photo.url,
                storage_path: photo.storage_path,
                userId: m.user_id
              };
            }) || [];
        }

        // Combine and deduplicate photos (keeping user_id for profile lookup)
        const directPhotos: (PhotoWithStorage & { userId?: string })[] = (circlePhotos || []).map(p => ({
          id: p.id,
          url: p.url,
          storage_path: p.storage_path,
          userId: p.user_id
        }));
        
        const allPhotos = [...directPhotos, ...memoryPhotos];
        const uniquePhotosMap = new Map<string, PhotoWithStorage & { userId?: string }>();
        allPhotos.forEach(p => {
          if (!uniquePhotosMap.has(p.id)) {
            uniquePhotosMap.set(p.id, p);
          }
        });

        sharedAlbumsData.push({
          circleId: membership.circle_id,
          circleName: circleData?.name || "Family Circle",
          photos: Array.from(uniquePhotosMap.values()),
          canUpload: true
        });
      }

      // Fetch all profiles at once
      const userIdsArray = Array.from(allUserIds);
      let profilesMap = new Map<string, string>();
      
      if (userIdsArray.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIdsArray);
        
        profiles?.forEach(p => {
          profilesMap.set(p.user_id, p.display_name || "Unknown");
        });
      }

      // Add uploader names to photos
      const albumsWithUploaderNames = sharedAlbumsData.map(album => ({
        ...album,
        photos: album.photos.map(photo => {
          const photoWithUserId = photo as PhotoWithStorage & { userId?: string };
          return {
            id: photo.id,
            url: photo.url,
            storage_path: photo.storage_path,
            uploaderName: photoWithUserId.userId ? profilesMap.get(photoWithUserId.userId) : undefined
          };
        })
      }));

      setSharedAlbums(albumsWithUploaderNames);
    } catch (error: any) {
      console.error("Error fetching shared photos:", error);
    }
  };

  const handleCircleUpload = async (files: File[], circleId: string, circleName: string) => {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let uploadedCount = 0;

      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;

        const compressedBlob = await compressImage(file);
        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("memory-photos")
          .upload(filePath, compressedBlob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("memory-photos")
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from("photos")
          .insert({
            storage_path: filePath,
            url: publicUrl,
            user_id: user.id,
            circle_id: circleId,
          });

        if (dbError) throw dbError;
        uploadedCount++;
      }

      await fetchSharedPhotos();
      onPhotosChange?.();

      toast({
        title: "Photos shared!",
        description: `${uploadedCount} photo${uploadedCount !== 1 ? "s" : ""} added to ${circleName}`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDirectUpload = async (files: File[], targetGallery: string) => {
    if (files.length === 0) return;
    
    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let uploadedCount = 0;
      
      const uploadPromises = files.map(async (file) => {
        if (!file.type.startsWith("image/")) return;

        // Compress the image before upload
        const compressedBlob = await compressImage(file);

        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("memory-photos")
          .upload(filePath, compressedBlob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("memory-photos")
          .getPublicUrl(filePath);

        // Determine album_id (null for "your-photos", otherwise the album id)
        const albumId = targetGallery === "your-photos" ? null : targetGallery;

        // Save to database with album_id
        const { error: dbError } = await supabase
          .from("photos")
          .insert({
            storage_path: filePath,
            url: publicUrl,
            user_id: user.id,
            album_id: albumId,
          });

        if (dbError) throw dbError;
        uploadedCount++;
      });

      await Promise.all(uploadPromises);
      
      // Refresh the data
      await fetchUserPhotos();
      await fetchAlbums();
      onPhotosChange?.();

      const galleryName = targetGallery === "your-photos" 
        ? "Your Photos" 
        : albums.find(a => a.id === targetGallery)?.name || "album";

      toast({
        title: "Photos uploaded",
        description: `${uploadedCount} photo${uploadedCount !== 1 ? "s" : ""} added to ${galleryName}`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setPendingFiles(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;
    
    // Copy files to array immediately before any async operations or input reset
    const filesArray = Array.from(fileList);
    
    // Reset file input immediately so we can capture the value
    event.target.value = "";
    
    // If we have a direct upload target (from clicking + on an album), upload directly
    if (directUploadTarget !== null) {
      const target = directUploadTarget;
      setDirectUploadTarget(null);
      handleDirectUpload(filesArray, target);
    } else {
      // Show dialog for top Upload button
      setPendingFiles(fileList);
      setShowUploadDialog(true);
    }
  };

  const getUploadableGalleries = () => {
    const galleries = [
      { id: "your-photos", name: "Your Photos" },
      ...albums.map(a => ({ id: a.id, name: a.name }))
    ];
    return galleries;
  };

  const handleFileUpload = async () => {
    if (!pendingFiles) return;

    setShowUploadDialog(false);
    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadPromises = Array.from(pendingFiles).map(async (file) => {
        if (!file.type.startsWith("image/")) return;

        // Compress the image before upload
        const compressedBlob = await compressImage(file);

        const fileExt = file.name.split(".").pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("memory-photos")
          .upload(filePath, compressedBlob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("memory-photos")
          .getPublicUrl(filePath);

        // Determine album_id (null for "your-photos", otherwise the album id)
        const albumId = selectedUploadGallery === "your-photos" ? null : selectedUploadGallery;

        // Save to database with album_id
        const { error: dbError } = await supabase
          .from("photos")
          .insert({
            storage_path: filePath,
            url: publicUrl,
            user_id: user.id,
            album_id: albumId,
          });

        if (dbError) throw dbError;
      });

      await Promise.all(uploadPromises);
      
      // Refresh the data
      await fetchUserPhotos();
      await fetchAlbums();
      onPhotosChange?.();

      const galleryName = selectedUploadGallery === "your-photos" 
        ? "Your Photos" 
        : albums.find(a => a.id === selectedUploadGallery)?.name || "album";

      toast({
        title: "Photos uploaded",
        description: `${pendingFiles.length} photo${pendingFiles.length > 1 ? "s" : ""} added to ${galleryName}`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setPendingFiles(null);
      setSelectedUploadGallery("your-photos");
    }
  };

  const handleCreateGallery = async () => {
    if (!newGalleryName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("albums")
        .insert({
          name: newGalleryName.trim(),
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add the new album to state
      setAlbums(prev => [...prev, { ...data, photos: [] }]);
      setNewGalleryName("");
      setShowNewGalleryDialog(false);

      toast({
        title: "Album created",
        description: `"${data.name}" has been added`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to create album",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAlbumNameChange = async (albumId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from("albums")
        .update({ name: newName })
        .eq("id", albumId);

      if (error) throw error;

      setAlbums(prev => prev.map(a => 
        a.id === albumId ? { ...a, name: newName } : a
      ));
    } catch (error: any) {
      toast({
        title: "Failed to rename album",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAlbum = async () => {
    if (!albumToDelete) return;
    
    try {
      // Delete photos from storage first
      for (const photo of albumToDelete.photos) {
        if (photo.storage_path) {
          await supabase.storage
            .from("memory-photos")
            .remove([photo.storage_path]);
        }
      }

      // Delete the album (photos will be cascade deleted)
      const { error } = await supabase
        .from("albums")
        .delete()
        .eq("id", albumToDelete.id);

      if (error) throw error;

      setAlbums(prev => prev.filter(a => a.id !== albumToDelete.id));
      setAlbumToDelete(null);
      
      toast({
        title: "Album deleted",
        description: `"${albumToDelete.name}" has been removed`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete album",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePhotoFromAlbum = (photo: PhotoWithStorage, albumId: string) => {
    setPhotoToDelete(photo);
    setPhotoDeleteSource(albumId);
  };

  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    setDeleting(true);
    try {
      // Delete from storage
      if (photoToDelete.storage_path) {
        const { error: storageError } = await supabase.storage
          .from("memory-photos")
          .remove([photoToDelete.storage_path]);

        if (storageError) {
          console.error("Storage deletion error:", storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from("photos")
        .delete()
        .eq("id", photoToDelete.id);

      if (dbError) throw dbError;

      // Update local state
      if (photoDeleteSource === "your-photos") {
        setUserPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
      } else {
        // Update the album's photos
        setAlbums(prev => prev.map(a => 
          a.id === photoDeleteSource 
            ? { ...a, photos: a.photos.filter(p => p.id !== photoToDelete.id) }
            : a
        ));
      }
      
      setUsedPhotos(prev => prev.filter(p => p.id !== photoToDelete.id));
      onPhotosChange?.();
      
      toast({
        title: "Photo deleted",
        description: "The photo has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setPhotoToDelete(null);
      setPhotoDeleteSource(null);
    }
  };

  const { t } = useTranslation();

  return (
    <>
      <div className="max-w-6xl mx-auto py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 px-4">
          <Button
            variant="ghost"
            onClick={onBack}
            size="lg"
            className="gap-2 hover:bg-accent text-lg font-medium"
          >
            <ArrowLeft className="w-6 h-6" />
            {t('common', 'back')}
          </Button>
          
          <QuickTip tipId="gallery" content={t('tips', 'galleryTip')}>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {t('gallery', 'yourPhotos')}
            </h1>
          </QuickTip>
          
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="lg" 
              className="gap-2 text-lg px-4"
              onClick={() => setShowNewGalleryDialog(true)}
            >
            <Plus className="w-5 h-5" />
              New Album
            </Button>
            
            <label htmlFor="gallery-upload">
              <Button 
                asChild 
                size="lg" 
                className="gap-2 cursor-pointer text-lg px-6" 
                disabled={uploading}
              >
                <span>
                  <Upload className="w-5 h-5" />
                  {uploading ? "Uploading..." : "Upload"}
                </span>
              </Button>
              <input
                id="gallery-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Photo Collections */}
        <div className="space-y-6">
          <PhotoRow
            title="Your Photos"
            photos={userPhotos}
            onPhotoSelect={(url, photos) => onPhotoSelect(url, "home", photos)}
            onDeletePhoto={(photo) => handleDeletePhotoFromAlbum(photo, "your-photos")}
            canDelete={true}
            onViewAll={onViewAllPhotos ? () => onViewAllPhotos(userPhotos) : undefined}
            onUpload={() => {
              setDirectUploadTarget("your-photos");
              document.getElementById("gallery-upload")?.click();
            }}
          />

          <PhotoRow
            title="Used Photos"
            photos={usedPhotos}
            onPhotoSelect={(url, photos) => onPhotoSelect(url, "home", photos)}
            onViewAll={onViewAllUsedPhotos ? () => onViewAllUsedPhotos(usedPhotos) : undefined}
          />

          <PhotoRow
            title="Unused Photos"
            photos={unusedPhotos}
            onPhotoSelect={(url, photos) => onPhotoSelect(url, "home", photos)}
            onViewAll={onViewAllPhotos && unusedPhotos.length > 0 ? () => onViewAllPhotos(unusedPhotos) : undefined}
          />

          {/* User Albums */}
          {albums.map(album => (
            <PhotoRow
              key={album.id}
              title={album.name}
              photos={album.photos}
              onPhotoSelect={(url, photos) => onPhotoSelect(url, "home", photos)}
              onDeletePhoto={(photo) => handleDeletePhotoFromAlbum(photo, album.id)}
              canDelete={true}
              isEditable={true}
              onTitleChange={(newName) => handleAlbumNameChange(album.id, newName)}
              onDeleteAlbum={() => setAlbumToDelete(album)}
              isCustomAlbum={true}
              onViewAll={album.photos.length > 0 ? () => onViewAllPhotos?.(album.photos) : undefined}
              onUpload={() => {
                setDirectUploadTarget(album.id);
                document.getElementById("gallery-upload")?.click();
              }}
              usedPhotoIds={usedPhotoIds}
              showFilters={true}
            />
          ))}

          {/* Shared Albums Section */}
          {sharedAlbums.length > 0 && (
            <>
              <div className="mt-8 mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground">Shared Photos</h2>
              </div>
              {sharedAlbums.map(album => (
                <PhotoRow
                  key={album.circleId}
                  title={album.circleName}
                  photos={album.photos}
                  onPhotoSelect={(url, photos) => onPhotoSelect(url, "home", photos)}
                  canDelete={false}
                  isCustomAlbum={false}
                  onViewAll={album.photos.length > 0 ? () => onViewAllPhotos?.(album.photos) : undefined}
                  showUploaderName={true}
                  onUpload={album.canUpload ? () => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) {
                        handleCircleUpload(Array.from(files), album.circleId, album.circleName);
                      }
                    };
                    input.click();
                  } : undefined}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Delete Photo Confirmation Dialog */}
      <AlertDialog open={!!photoToDelete} onOpenChange={() => { setPhotoToDelete(null); setPhotoDeleteSource(null); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Delete Photo?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete this photo? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {photoToDelete && (
            <div className="my-4 rounded-lg overflow-hidden border border-border">
              <img
                src={photoToDelete.url}
                alt="Photo to delete"
                className="w-full h-40 object-cover"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel className="text-base" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeletePhoto}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-base"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Album Confirmation Dialog */}
      <AlertDialog open={!!albumToDelete} onOpenChange={() => setAlbumToDelete(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Delete Album?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Are you sure you want to delete "{albumToDelete?.name}"? All photos in this album will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-base">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAlbum}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-base"
            >
              Delete Album
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Album Dialog */}
      <Dialog open={showNewGalleryDialog} onOpenChange={setShowNewGalleryDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Album</DialogTitle>
            <DialogDescription className="text-base">
              Enter a name for your new photo album.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newGalleryName}
            onChange={(e) => setNewGalleryName(e.target.value)}
            placeholder="Album name"
            className="text-base"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateGallery();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewGalleryDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGallery} disabled={!newGalleryName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Gallery Selection Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={(open) => {
        if (!open) {
          setPendingFiles(null);
        }
        setShowUploadDialog(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Choose Gallery</DialogTitle>
            <DialogDescription className="text-base">
              Select which gallery to add your photos to.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedUploadGallery} onValueChange={setSelectedUploadGallery}>
            <SelectTrigger className="text-base">
              <SelectValue placeholder="Select a gallery" />
            </SelectTrigger>
            <SelectContent>
              {getUploadableGalleries().map(gallery => (
                <SelectItem key={gallery.id} value={gallery.id} className="text-base">
                  {gallery.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowUploadDialog(false);
              setPendingFiles(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleFileUpload}>
              Upload {pendingFiles?.length || 0} photo{(pendingFiles?.length || 0) !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GalleryView;
