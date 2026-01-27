import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  type: "follow-up" | "conversation" | "summarize" | "title";
  context?: string;
  transcript?: string;
  previousAnswers?: string[];
  conversationHistory?: Array<{ role: string; content: string }>;
  language?: string;
}

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { type, context, transcript, previousAnswers, conversationHistory, language = "en" } = (await req.json()) as ChatRequest;

    const debugInfo = {
      type,
      transcriptLength: transcript?.length ?? 0,
      hasTranscript: typeof transcript === "string" && transcript.trim().length > 0,
      previousAnswersCount: previousAnswers?.length ?? 0,
      language,
    };

    const langName = languageNames[language] || "English";
    const languageInstruction = language !== "en" 
      ? `\n\nIMPORTANT: You MUST respond in ${langName}. All your questions and responses should be written entirely in ${langName}.`
      : "";

    let systemPrompt = "";
    let userPrompt = "";

    switch (type) {
      case "follow-up":
        systemPrompt = `You are a compassionate Reminiscence Therapy Companion for an older adult.
Your goal is to scaffold the user's memory retrieval without causing stress.
STRICT GUIDELINES:
1. **No Quizzing:** Never ask "Do you remember?" or specific dates/names. Instead use "Tell me about..." or "Describe...".
2. **Validation First:** If the memory is negative or sad, acknowledge the emotion (e.g., "That sounds like a difficult time") before asking a follow-up. Do not try to "fix" the feeling.
3. **Linguistic Simplicity:** Use short, right-branching sentences (put the main point at the start). Avoid complex clauses.
4. **Sensory Focus:** Ask about smells, sounds, music, food, and tactile feelings to trigger deep memory.
5. **One Question Only:** Ask exactly ONE simple question at a time. Never use compound questions (e.g., "Who was there and what did you do?").${languageInstruction}`;

        userPrompt = `The person is sharing a memory${context ? ` about: ${context}` : ""}.
${transcript ? `Their story so far: "${transcript}"` : ""}
${previousAnswers?.length ? `They've already answered these follow-up questions:\n${previousAnswers.join("\n")}` : ""}

Generate a gentle follow-up question to help them describe the experience further. Just the question, nothing else.`;

        console.log("FOLLOW-UP DEBUG", {
          type,
          transcript,
          transcriptLength: transcript?.length ?? 0,
          hasTranscript: Boolean(transcript && transcript.trim().length > 0),
          context,
          previousAnswersCount: previousAnswers?.length ?? 0,
        });
        break;

      case "conversation":
        // If no conversation history, return the fixed opening question
        if (!conversationHistory || conversationHistory.length === 0) {
          const openingQuestions: Record<string, string> = {
            en: "What would you like to talk about?",
            es: "¿De qué te gustaría hablar?",
            fr: "De quoi aimeriez-vous parler?",
            de: "Worüber möchten Sie sprechen?",
            it: "Di cosa vorresti parlare?",
            pt: "Sobre o que você gostaria de falar?",
            zh: "您想聊些什么？",
            ja: "何についてお話しましょうか？",
            ko: "무엇에 대해 이야기하고 싶으세요?",
            sv: "Vad skulle du vilja prata om?",
          };
          const openingQuestion = openingQuestions[language] || openingQuestions.en;
          
          console.log(`AI Chat - Returning fixed opening question for conversation, Language: ${language}`);
          
          return new Response(
            JSON.stringify({
              result: openingQuestion,
              debug: debugInfo,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Only generate AI questions after user has responded
        systemPrompt = `You are a patient, warm companion helping an older adult revisit moments from their past. Your goal is to facilitate 'Reminiscence Therapy' that focuses on positive engagement, comfort, and the feeling of the memory rather than chronological history.
      CORE PROTOCOLS:
      1. **Accept Their Reality:** Never correct the user's facts. If they are confused or confabulating, join their reality and validate the underlying emotion.
      2. **Question Style:** Ask open-ended, descriptive questions. If the user struggles to answer, switch to a simple "Yes/No" or choice-based question (e.g., "Did you prefer the city or the country?").
      3. **Focus Areas:** 
        - Sensory details (smells, songs, sights)
        - Identity (roles, strengths, achievements)
        - Enduring values and lessons learned
      4. **Constraint:** Ask ONE question at a time. Keep sentences simple and direct.${languageInstruction}`;

        userPrompt = `Here's the conversation so far:\n${conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nGenerate the next warm, supportive question to continue their Life Review. Just the question, nothing else.`;
        break;

      //       case "conversation":
      //         systemPrompt = `You are a warm 'Therapeutic Witness' helping an older adult review their life story.
      // Your goal is to facilitate a 'Life Review' that fosters a sense of identity, pride, and peace.

      // CORE PROTOCOLS:
      // 1. **Accept Their Reality:** NEVER correct the user. If they are confused or state something factually impossible (confabulation), accept their reality and validate the underlying emotion.
      // 2. **Life Stages:** Gently guide conversation through life stages if the flow allows: Childhood -> Adolescence -> Career/Family -> Wisdom/Legacy.
      // 3. **The 'No Quiz' Rule:** Do not treat this as an interview. Do not ask for specific facts (names/dates). Ask for *descriptions* and *feelings*.
      // 4. **Focus Areas (Reminiscence Functions):**
      //    - **Identity:** Questions about their roles (parent, worker), traits (brave, hard-working), and achievements.
      //    - **Comfort:** Happy memories, favorite foods, pets, and hobbies.
      //    - **Wisdom:** Lessons learned and advice for younger generations.
      // 5. **Linguistics:** Use simple vocabulary (no jargon). Avoid "elderspeak" (baby talk). Address them as a respectful adult.

      // Ask ONE open-ended question that invites a story.`;

      //         const historyText = conversationHistory?.map((m) => `${m.role}: ${m.content}`).join("\n") || "";
      //         userPrompt = historyText
      //           ? `Here's the conversation so far:\n${historyText}\n\nGenerate the next warm, therapeutic question to continue their Life Review. Focus on sensory details or identity. Just the question, nothing else.`
      //           : `Start a warm conversation by asking a descriptive question about their childhood home or a favorite game they played when they were young. Just the question, nothing else.`;
      //         break;

      //       case "summarize":
      //         systemPrompt = `You are a gentle, respectful Biographer documenting the life story of an older adult.
      // Your goal is to write a clear, concise summary of the memory they just shared.

      // GUIDELINES:
      // 1. **Tone:** Warm but grounded. Be matter-of-fact. Avoid flowery adjectives (e.g., "amazing," "incredible," "heartwarming") unless the user explicitly used them.
      // 2. **Authenticity:** Prioritize the user's own words and phrasing. Do not rewrite their story to sound "better" or more dramatic.
      // 3. **Clarity:** Use simple, direct sentences (Easy-to-Read standard). Avoid complex clauses.
      // 4. **Focus:** Capture the "Who, What, and Where."
      // 5. **Length:** Keep it under 3 sentences.`;

      //         userPrompt = `Summarize this memory in 2-3 sentences:\n\n"${transcript}"`;
      //         break;

      case "summarize":
        systemPrompt = `You are a gentle, respectful Biographer documenting the life story of an older adult.
Your goal is to write a clear, concise summary of the memory they just shared.

GUIDELINES:
1. **Tone:** Warm but grounded. Be matter-of-fact. Avoid flowery adjectives (e.g., "amazing," "incredible," "heartwarming") unless the user explicitly used them.
2. **Authenticity:** Prioritize the user's own words and phrasing. Do not rewrite their story to sound "better" or more dramatic.
3. **Clarity:** Use simple, direct sentences (Easy-to-Read standard). Avoid complex clauses.
4. **Focus:** Capture the "Who, What, and Where."
5. **Length:** Keep it under 3 sentences.

Example Input: "I used to walk my dog, Barnaby, down by the river every Sunday. He loved chasing the ducks."
Bad Summary: "A heartwarming memory of cherished Sunday strolls with a beloved companion, Barnaby, who delightfully chased ducks." (Too enthusiastic/flowery).
Good Summary: "You walked your dog, Barnaby, by the river on Sundays. He enjoyed chasing the ducks." (Neutral, clear, accurate).${languageInstruction}`;
        break;

      case "title":
        systemPrompt = `You are helping organize precious memories for an elderly person.
Generate a short, meaningful title that captures the essence of their memory.
Keep it warm, simple, and memorable (5-8 words maximum).
Don't use quotes or punctuation at the end.${languageInstruction}`;

        userPrompt = `Generate a title for this memory:\n\n"${transcript}"`;
        break;

      default:
        throw new Error("Invalid request type");
    }

    console.log(`AI Chat request - Type: ${type}, User: ${user.id}`);

    // Build messages array - for conversations, send actual turns for proper memory
    let messages: Array<{ role: string; content: string }> = [];

    if (type === "conversation" && conversationHistory && conversationHistory.length > 0) {
      // Send actual conversation turns for proper context retention
      messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: "Generate the next warm, supportive question to continue their Life Review. Just the question, nothing else." },
      ];
    } else {
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() || "";

    console.log(`AI Chat response - Type: ${type}, Result length: ${result.length}`);

    // return new Response(JSON.stringify({ result }), {
    //   headers: { ...corsHeaders, "Content-Type": "application/json" },
    // });
    return new Response(
      JSON.stringify({
        result,
        debug: debugInfo,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("AI Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
