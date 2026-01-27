import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const languageNames: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  sv: "Swedish",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { collectionName, memories, language = "en" } = await req.json();

    if (!collectionName || !memories || memories.length === 0) {
      return new Response(JSON.stringify({ error: "Collection name and memories are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare memory summaries for the prompt
    const memoryDescriptions = memories
      .map((m: any, index: number) => {
        const title = m.title || "Untitled";
        const transcript = m.transcript || "";
        const aiEnhancement = m.ai_enhancement || "";
        const date = m.created_at ? new Date(m.created_at).toLocaleDateString() : "";

        return `Memory ${index + 1}: "${title}" (${date})
Content: ${transcript.substring(0, 500)}${transcript.length > 500 ? "..." : ""}
${aiEnhancement ? `Enhanced version: ${aiEnhancement.substring(0, 300)}${aiEnhancement.length > 300 ? "..." : ""}` : ""}`;
      })
      .join("\n\n");

    const langName = languageNames[language] || "English";
    const languageInstruction = language !== "en" 
      ? `\n\nIMPORTANT: You MUST respond in ${langName}. Write the collection summary entirely in ${langName}.`
      : "";

    const systemPrompt = `You are a Family Archivist organizing a collection of memories.
Your task is to create a warm, clear introduction that describes what this specific collection is about.

GUIDELINES:
- **Tone:** Personal,observant and warm, but not overly emotional. Use a "knowledgeable historian" voice.
- **Structure:** Do not list memories. Instead, weave the *themes* together (e.g., "This collection focuses on your childhood in..." rather than "First you said X, then Y").
- **Constraint:** Do not use "hype" words (e.g., "unforgettable," "magical journey"). Let the memories speak for themselves.
- **Length:** 2-3 sentences max.

Example Output: "This collection focuses on your early years living in Chicago. It brings together your memories of school days, your first family pet, and the holidays you spent with your grandparents."${languageInstruction}`;

    const userPrompt = `Create a summary for the "${collectionName}" collection containing ${memories.length} memories:

${memoryDescriptions}

Write a 2-3 sentence summary capturing the main themes of this collection:`;

    console.log(
      `Generating summary for collection: ${collectionName} with ${memories.length} memories, User: ${user.id}, Language: ${language}`,
    );

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Failed to generate summary" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() || "";

    console.log(`Successfully generated summary for ${collectionName}`);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating collection summary:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
