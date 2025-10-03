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

    // Get user's profile and HF token
    const { data: profile } = await supabase
      .from("profiles")
      .select("huggingface_token, addiction_type, sobriety_start_date")
      .eq("id", user.id)
      .single();

    if (!profile?.huggingface_token) {
      return new Response(
        JSON.stringify({ error: "Hugging Face token not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate days sober
    const daysSober = Math.floor(
      (new Date().getTime() - new Date(profile.sobriety_start_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const prompt = `Generate a short, inspiring motivational message for someone in recovery from ${profile.addiction_type || "addiction"}. They are ${daysSober} days into their journey. Keep it under 100 characters, positive, and encouraging.`;

    // Call Hugging Face API
    const response = await fetch(
      "https://api-inference.huggingface.co/models/distilgpt2",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${profile.huggingface_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 100,
            temperature: 0.8,
            top_p: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("HF API error:", error);
      throw new Error("Failed to generate motivation");
    }

    const result = await response.json();
    const message = result[0]?.generated_text || "Every day is a victory. Keep moving forward!";
    
    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in generate-motivation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
