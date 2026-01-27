import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface AIState {
  isLoading: boolean;
  error: string | null;
}

export const useAI = () => {
  const [state, setState] = useState<AIState>({ isLoading: false, error: null });
  const { language } = useLanguage();

  const generateFollowUpQuestion = useCallback(async (
    transcript?: string,
    context?: string,
    previousAnswers?: string[]
  ): Promise<string | null> => {
    setState({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { type: "follow-up", transcript, context, previousAnswers, language },
      });

      if (error) throw error;
      setState({ isLoading: false, error: null });
      return data?.result || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate question";
      setState({ isLoading: false, error: message });
      return null;
    }
  }, [language]);

  const generateConversationQuestion = useCallback(async (
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<string | null> => {
    setState({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { type: "conversation", conversationHistory, language },
      });

      if (error) throw error;
      setState({ isLoading: false, error: null });
      return data?.result || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate question";
      setState({ isLoading: false, error: message });
      return null;
    }
  }, [language]);

  const generateTitle = useCallback(async (transcript: string): Promise<string | null> => {
    setState({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { type: "title", transcript, language },
      });

      if (error) throw error;
      setState({ isLoading: false, error: null });
      return data?.result || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate title";
      setState({ isLoading: false, error: message });
      return null;
    }
  }, [language]);

  const generateSummary = useCallback(async (transcript: string): Promise<string | null> => {
    setState({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { type: "summarize", transcript, language },
      });

      if (error) throw error;
      setState({ isLoading: false, error: null });
      return data?.result || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate summary";
      setState({ isLoading: false, error: message });
      return null;
    }
  }, [language]);

  const transcribeAudio = useCallback(async (
    audioBase64: string,
    mimeType = "audio/webm"
  ): Promise<string | null> => {
    setState({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio: audioBase64, mimeType },
      });

      if (error) throw error;
      setState({ isLoading: false, error: null });
      return data?.text || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to transcribe audio";
      setState({ isLoading: false, error: message });
      return null;
    }
  }, []);

  return {
    ...state,
    generateFollowUpQuestion,
    generateConversationQuestion,
    generateTitle,
    generateSummary,
    transcribeAudio,
  };
};
