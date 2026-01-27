import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import { useTranslation } from "@/hooks/useTranslation";

interface PhotoGalleryProps {
  onPhotoSelect: (photoUrl: string) => void;
  onBack: () => void;
}

const PhotoGallery = ({ onPhotoSelect, onBack }: PhotoGalleryProps) => {
  const [photos, setPhotos] = useState<{ id: string; url: string; storage_path: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error: any) {
      toast({
        title: t('photoGallery', 'errorLoading'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadPromises = Array.from(files).map(async (file) => {
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

        const { error: dbError } = await supabase
          .from("photos")
          .insert({
            storage_path: filePath,
            url: publicUrl,
            user_id: user.id,
          });

        if (dbError) throw dbError;
      });

      await Promise.all(uploadPromises);
      await fetchPhotos();

      toast({
        title: t('photoGallery', 'photosUploaded'),
        description: `${files.length} ${t('photoGallery', 'photosAddedDesc')}`,
      });
    } catch (error: any) {
      toast({
        title: t('photoGallery', 'uploadFailed'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };


  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={onBack}
          size="lg"
          className="gap-2 hover:bg-accent text-base"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('common', 'back')}
        </Button>
        <label htmlFor="photo-upload">
          <Button asChild size="lg" className="gap-2 cursor-pointer text-base" disabled={uploading}>
            <span>
              <Upload className="w-5 h-5" />
              {uploading ? t('photoGallery', 'uploading') : t('photoGallery', 'uploadPhotos')}
            </span>
          </Button>
          <input
            id="photo-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-2xl font-semibold mb-2 text-foreground">{t('photoGallery', 'noPhotosYet')}</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {t('photoGallery', 'uploadFirstDesc')}
          </p>
          <label htmlFor="photo-upload-center">
            <Button size="lg" asChild className="cursor-pointer gap-3 text-lg px-8 py-6 h-auto" disabled={uploading}>
              <span>
                <Upload className="w-6 h-6" />
                {uploading ? t('photoGallery', 'uploading') : t('photoGallery', 'uploadFirstPhotos')}
              </span>
            </Button>
            <input
              id="photo-upload-center"
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="relative group">
          <h2 className="text-2xl font-bold mb-4 text-foreground">{t('photoGallery', 'yourPhotos')}</h2>
          
          {/* Netflix-style horizontal scroll */}
          <div className="relative">
            <button
              onClick={() => {
                const container = document.getElementById('photo-scroll');
                if (container) container.scrollBy({ left: -400, behavior: 'smooth' });
              }}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div
              id="photo-scroll"
              className="flex gap-3 overflow-x-auto scrollbar-hide pb-4 scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => onPhotoSelect(photo.url)}
                  className="group/item relative flex-shrink-0 w-48 h-32 md:w-64 md:h-40 rounded-lg overflow-hidden border border-border hover:border-primary transition-all duration-300 hover:scale-105 hover:z-10"
                >
                  <img
                    src={photo.url}
                    alt={`${t('photoGallery', 'memory')} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                    <span className="text-foreground font-medium text-sm">
                      {t('photoGallery', 'select')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            
            <button
              onClick={() => {
                const container = document.getElementById('photo-scroll');
                if (container) container.scrollBy({ left: 400, behavior: 'smooth' });
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;