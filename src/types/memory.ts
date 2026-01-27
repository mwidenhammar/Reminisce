export interface MemoryEpisode {
  id: string;
  title: string;
  photoUrl: string;
  transcript: string;
  aiEnhancement?: string;
  generatedImageUrl?: string;
  timestamp: Date;
  collection: string;
  type: "audio" | "text";
}
