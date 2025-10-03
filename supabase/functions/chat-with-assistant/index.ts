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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { messages } = await req.json();

    // Fetch user context
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: journalEntries } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: goals } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id);

    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(7);

    const daysSober = Math.floor(
      (new Date().getTime() - new Date(profile.sobriety_start_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    const activeGoals = goals?.filter(g => !g.completed).length || 0;
    const completedGoals = goals?.filter(g => g.completed).length || 0;
    const recentMood = checkIns?.[0]?.mood || "unknown";

    const systemPrompt = `You are a compassionate AI recovery assistant for ${profile.pseudonym || "the user"}.

USER CONTEXT:
- Addiction Type: ${profile.addiction_type || "not specified"}
- Days Sober: ${daysSober}
- Sobriety Start: ${new Date(profile.sobriety_start_date).toLocaleDateString()}

RECOVERY DATA:
- Journal Entries: ${journalEntries?.length || 0} recent entries
- Goals: ${activeGoals} active, ${completedGoals} completed
- Recent Check-ins: ${checkIns?.length || 0} in last 7 days
- Latest Mood: ${recentMood}

${journalEntries && journalEntries.length > 0 ? `
RECENT JOURNAL ENTRIES:
${journalEntries.map(e => `- ${new Date(e.created_at).toLocaleDateString()}: ${e.content.substring(0, 100)}...`).join('\n')}
` : ''}

${goals && goals.length > 0 ? `
GOALS:
${goals.map(g => `- ${g.title} (${g.completed ? 'completed' : 'active'})`).join('\n')}
` : ''}

You can:
1. Analyze their journal for emotional patterns
2. Review their progress and celebrate milestones
3. Provide encouragement and personalized coping strategies
4. Answer questions about their recovery data
5. Suggest next steps and goals

Be warm, supportive, empathetic, and never judgmental. Use their actual data to provide personalized insights. Keep responses concise and actionable.`;

    console.log("Calling Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error("AI Gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error: any) {
    console.error("chat-with-assistant error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
