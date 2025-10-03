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

    // Get user's profile and existing goals
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

    const { data: existingGoals } = await supabase
      .from("goals")
      .select("title, completed")
      .eq("user_id", user.id);

    const daysSober = Math.floor(
      (new Date().getTime() - new Date(profile.sobriety_start_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const prompt = `Suggest 3 recovery goals for someone ${daysSober} days into recovery from ${profile.addiction_type || "addiction"}. Format: "Goal: [title]". Keep each under 50 characters.`;

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
            max_length: 200,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to generate suggestions");
    }

    const result = await response.json();
    
    // Fallback suggestions
    const suggestions = [
      {
        title: "Complete 30 days of sobriety",
        description: "Stay strong for one full month",
        target_days: 30,
      },
      {
        title: "Start a daily journaling habit",
        description: "Reflect on your journey every day",
        target_days: 7,
      },
      {
        title: "Connect with a support group",
        description: "Find community and shared experiences",
        target_days: 14,
      },
    ];
    
    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in suggest-recovery-goals:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
