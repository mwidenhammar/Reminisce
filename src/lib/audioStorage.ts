import { supabase } from "@/integrations/supabase/client";

export const uploadAudioRecording = async (
  audioBlob: Blob,
  userId: string
): Promise<string | null> => {
  try {
    const fileName = `${userId}/${Date.now()}.webm`;
    
    const { data, error } = await supabase.storage
      .from("memory-audio")
      .upload(fileName, audioBlob, {
        contentType: "audio/webm",
        upsert: false,
      });

    if (error) {
      console.error("Error uploading audio:", error);
      return null;
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from("memory-audio")
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error in uploadAudioRecording:", error);
    return null;
  }
};
