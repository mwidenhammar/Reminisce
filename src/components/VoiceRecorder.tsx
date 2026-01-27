import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mic, Square, Save, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MemoryEpisode } from "@/types/memory";

interface VoiceRecorderProps {
  selectedPhoto: string | null;
  onBack: () => void;
  onMemorySaved: (episode: MemoryEpisode) => void;
}

const VoiceRecorder = ({ selectedPhoto, onBack, onMemorySaved }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [typedMemory, setTypedMemory] = useState("");
  const [title, setTitle] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({
        title: "Recording started",
        description: "Speak naturally about your memory",
      });
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record your memory",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Simulate transcription
      setTimeout(() => {
        setTranscript(
          "This is a simulated transcription of your voice recording. In the full implementation, this would be the actual transcribed text from your voice recording using speech-to-text AI."
        );
      }, 1000);
      toast({
        title: "Recording complete",
        description: "Your memory has been captured",
      });
    }
  };

  const handleSaveMemory = () => {
    const memoryText = inputMode === "voice" ? transcript : typedMemory;
    
    if (!memoryText.trim()) {
      toast({
        title: "No memory",
        description: inputMode === "voice" ? "Please record a memory first" : "Please type your memory",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: "Please add a title for your memory",
        variant: "destructive",
      });
      return;
    }

    const episode: MemoryEpisode = {
      id: Date.now().toString(),
      title: title.trim(),
      photoUrl: selectedPhoto || "",
      transcript: memoryText,
      timestamp: new Date(),
      collection: "Uncategorized",
      type: inputMode === "voice" ? "audio" : "text",
    };

    onMemorySaved(episode);
    toast({
      title: "Memory saved!",
      description: "Your memory has been added to your bookshelf",
    });
    
    // Reset states
    setTranscript("");
    setTypedMemory("");
    setTitle("");
    setAudioBlob(null);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center mb-8">
        <Button variant="ghost" onClick={onBack} size="lg" className="gap-2 hover:bg-accent text-base">
          <ArrowLeft className="w-5 h-5" />
          Back
        </Button>
      </div>

      <div className="space-y-8">
        {/* Selected Photo */}
        {selectedPhoto && (
          <div className="rounded-2xl overflow-hidden border-2 border-border shadow-soft">
            <img
              src={selectedPhoto}
              alt="Selected memory"
              className="w-full max-h-96 object-contain bg-muted"
            />
          </div>
        )}

        {/* Recording Section */}
        <div className="bg-card rounded-2xl p-8 border border-border shadow-soft">
          <h2 className="text-2xl font-bold mb-6 text-card-foreground">Share Your Memory</h2>

          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "voice" | "text")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="voice" className="gap-2">
                <Mic className="w-4 h-4" />
                Record Voice
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-2">
                <Keyboard className="w-4 h-4" />
                Type Memory
              </TabsTrigger>
            </TabsList>

            <TabsContent value="voice" className="space-y-6">
              <div className="flex flex-col items-center gap-6">
                {!isRecording ? (
                  <Button
                    size="lg"
                    onClick={startRecording}
                    className="w-32 h-32 rounded-full gap-3 text-lg shadow-warm hover:scale-105 transition-transform"
                  >
                    <Mic className="w-8 h-8" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={stopRecording}
                    variant="destructive"
                    className="w-32 h-32 rounded-full gap-3 text-lg animate-pulse shadow-warm"
                  >
                    <Square className="w-8 h-8" />
                  </Button>
                )}
                <p className="text-lg text-muted-foreground text-center max-w-md">
                  {!isRecording
                    ? "Press the microphone to start recording your memory"
                    : "Recording... Press the stop button when you're finished"}
                </p>
              </div>

              {transcript && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-6 bg-card rounded-xl border-2 border-border">
                    <label htmlFor="voice-title" className="block text-lg font-semibold mb-3 text-foreground">
                      Memory Title:
                    </label>
                    <Input
                      id="voice-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your memory a title..."
                      className="text-lg py-6"
                    />
                  </div>
                  
                  <div className="p-6 bg-accent/50 rounded-xl border border-border">
                    <h3 className="font-semibold mb-3 text-accent-foreground text-lg">Your Memory:</h3>
                    <p className="text-muted-foreground leading-relaxed text-base">{transcript}</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="text" className="space-y-4">
              <div className="p-6 bg-card rounded-xl border-2 border-border">
                <label htmlFor="text-title" className="block text-lg font-semibold mb-3 text-foreground">
                  Memory Title:
                </label>
                <Input
                  id="text-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your memory a title..."
                  className="text-lg py-6"
                />
              </div>

              <div className="p-6 bg-card rounded-xl border-2 border-border">
                <label htmlFor="memory-text" className="block text-lg font-semibold mb-3 text-foreground">
                  Your Memory:
                </label>
                <Textarea
                  id="memory-text"
                  value={typedMemory}
                  onChange={(e) => setTypedMemory(e.target.value)}
                  placeholder="Type your memory here... Share the feelings and details you want to remember."
                  className="min-h-[200px] text-base leading-relaxed resize-none"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Save Button */}
        {((inputMode === "voice" && transcript) || (inputMode === "text" && typedMemory.trim())) && (
          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleSaveMemory}
              className="gap-3 text-xl px-10 py-7 h-auto shadow-warm hover:scale-105 transition-transform"
            >
              <Save className="w-6 h-6" />
              Save to Bookshelf
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
