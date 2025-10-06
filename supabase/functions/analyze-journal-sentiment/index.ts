import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { text, entryId } = await req.json();

    // Get user's Gemini API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Analyzing sentiment for entry:", entryId);

    const prompt = `Analyze the sentiment of this text and respond with ONLY a JSON object in this exact format: {"label": "positive" or "negative" or "neutral", "score": number between 0 and 1}. Text: "${text}"`;

    const response = await fetch(
      `https://ai.gateway.lovable.dev/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: prompt }],
          max_tokens: 50,
          temperature: 0.1,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Lovable AI API error:", error);
      throw new Error("Failed to analyze sentiment");
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content.trim();
    
    // Extract JSON from markdown if present
    const jsonMatch = generatedText.match(/```json\n([\s\S]*?)\n```/);
    let sentiment;
    if (jsonMatch && jsonMatch[1]) {
      sentiment = JSON.parse(jsonMatch[1]);
    } else {
      sentiment = JSON.parse(generatedText);
    }

    // Update journal entry with sentiment
    if (entryId) {
      const { error: updateError } = await supabase
        .from("journal_entries")
        .update({ sentiment })
        .eq("id", entryId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Error updating journal entry:", updateError);
      }
    }
    
    return new Response(
      JSON.stringify({ sentiment }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in analyze-journal-sentiment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
