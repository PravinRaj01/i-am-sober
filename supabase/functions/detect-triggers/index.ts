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

    const { text } = await req.json();

    // Get user's HF token
    const { data: profile } = await supabase
      .from("profiles")
      .select("huggingface_token")
      .eq("id", user.id)
      .single();

    if (!profile?.huggingface_token) {
      return new Response(
        JSON.stringify({ error: "Hugging Face token not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Hugging Face zero-shot classification
    const response = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${profile.huggingface_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            candidate_labels: ["stress", "anger", "sadness", "temptation", "loneliness", "boredom"],
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("HF API error:", error);
      throw new Error("Failed to detect triggers");
    }

    const result = await response.json();
    
    // Get top trigger if score > 0.5
    const topTrigger = result.scores[0] > 0.5 ? result.labels[0] : null;
    
    return new Response(
      JSON.stringify({ 
        trigger: topTrigger,
        confidence: result.scores[0],
        allLabels: result.labels,
        allScores: result.scores,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in detect-triggers:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
