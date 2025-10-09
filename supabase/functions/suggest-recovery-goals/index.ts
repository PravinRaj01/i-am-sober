import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Goal {
  title: string;
  completed: boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userPrompt } = await req.json();
    
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
      .select("addiction_type, sobriety_start_date")
      .eq("id", user.id)
      .single();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Fetching user context...");

    const { data: existingGoals } = await supabase
      .from("goals")
      .select("title, completed")
      .eq("user_id", user.id);

    const { data: recentCheckIns } = await supabase
      .from("check_ins")
      .select("mood, urge_intensity")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const daysSober = Math.floor(
      (new Date().getTime() - new Date(profile.sobriety_start_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const completedGoals = (existingGoals as Goal[])?.filter(g => g.completed).map(g => g.title).join(", ") || "None";
    const activeGoals = (existingGoals as Goal[])?.filter(g => !g.completed).map(g => g.title).join(", ") || "None";
    const recentMoods = recentCheckIns?.map(c => `Mood: ${c.mood}, Urge: ${c.urge_intensity}/10`).join('; ') || "None";

    // Add randomness with timestamp to ensure variety
    const randomSeed = Date.now();
    const userContext = userPrompt ? `\nUser's interests/focus: ${userPrompt}` : "";

    const prompt = `You are a recovery coach. Generate 3 UNIQUE, personalized recovery goals. Use this random seed for variety: ${randomSeed}

Context:
- Days sober: ${daysSober} from ${profile.addiction_type || "addiction"}
- Completed goals: ${completedGoals}
- Active goals: ${activeGoals}
- Recent check-ins: ${recentMoods}${userContext}

Requirements:
- Create NEW goals different from existing ones
- Make them practical and achievable
- Vary the difficulty and timeframes
- If user provided interests, incorporate them

Return ONLY a valid JSON array inside a JSON markdown block:
\`\`\`json
[
  {"title": "Goal title (max 60 chars)", "description": "Brief description", "target_days": 7},
  {"title": "Another goal", "description": "Description", "target_days": 14},
  {"title": "Third goal", "description": "Description", "target_days": 30}
]
\`\`\``;

    console.log("Calling Lovable AI Gateway...");
    const aiResponse = await fetch(
      `https://ai.gateway.lovable.dev/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.9,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const suggestionsText = aiData.choices[0].message.content.trim();
    
    // Ensure the response is valid JSON before parsing
    let suggestions;
    try {
      // The model might return a markdown block, so we need to extract the JSON
      const jsonMatch = suggestionsText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        suggestions = JSON.parse(jsonMatch[1]);
      } else {
        suggestions = JSON.parse(suggestionsText);
      }
    } catch (e) {
      console.error("Failed to parse suggestions:", suggestionsText);
      throw new Error("AI returned an invalid response format.");
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Error in suggest-recovery-goals:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
