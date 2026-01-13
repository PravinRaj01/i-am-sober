import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize user input to prevent prompt injection
function sanitizeInput(input: string, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.slice(0, maxLength).trim();
  
  const dangerousPatterns = [
    /system:/gi,
    /assistant:/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<s>/gi,
    /<\/s>/gi,
  ];
  
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  return sanitized;
}

// Define AI Agent Tools
const agentTools = [
  {
    type: "function",
    function: {
      name: "get_user_progress",
      description: "Get user's sobriety progress including days sober, current streak, level, XP, and longest streak",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recent_moods",
      description: "Get user's recent check-in data including mood, urge intensity, and notes from the last 7 days",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_active_goals",
      description: "Get user's current active goals and their progress",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_coping_activity",
      description: "Suggest a specific coping activity based on current stress level or emotional state",
      parameters: {
        type: "object",
        properties: {
          stress_level: { 
            type: "string", 
            enum: ["low", "medium", "high", "crisis"],
            description: "The user's current stress level based on conversation context"
          }
        },
        required: ["stress_level"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recent_journal_entries",
      description: "Get user's recent journal entries to understand their emotional patterns",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_biometric_data",
      description: "Get user's recent biometric data from wearables including heart rate, sleep, steps, and stress levels",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "log_intervention",
      description: "Log when the AI proactively helped the user for observability tracking",
      parameters: {
        type: "object",
        properties: {
          intervention_type: { 
            type: "string",
            description: "Type of intervention provided (e.g., 'crisis_support', 'mood_check', 'coping_suggestion')"
          },
          was_helpful: {
            type: "boolean",
            description: "Whether the intervention seemed helpful based on user response"
          }
        },
        required: ["intervention_type"]
      }
    }
  }
];

// Execute tool calls
async function executeTool(supabase: any, userId: string, toolName: string, args: any): Promise<any> {
  const startTime = Date.now();
  
  switch (toolName) {
    case "get_user_progress": {
      const { data: profile } = await supabase
        .from("profiles")
        .select("sobriety_start_date, current_streak, longest_streak, level, xp, points, addiction_type")
        .eq("id", userId)
        .single();
      
      const daysSober = profile?.sobriety_start_date
        ? Math.floor((Date.now() - new Date(profile.sobriety_start_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      return {
        days_sober: daysSober,
        current_streak: profile?.current_streak || 0,
        longest_streak: profile?.longest_streak || 0,
        level: profile?.level || 1,
        xp: profile?.xp || 0,
        points: profile?.points || 0,
        addiction_type: profile?.addiction_type || "addiction"
      };
    }
    
    case "get_recent_moods": {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: checkIns } = await supabase
        .from("check_ins")
        .select("mood, urge_intensity, notes, created_at")
        .eq("user_id", userId)
        .gte("created_at", weekAgo.toISOString())
        .order("created_at", { ascending: false });
      
      const moodSummary = (checkIns || []).reduce((acc: any, ci: any) => {
        acc[ci.mood] = (acc[ci.mood] || 0) + 1;
        return acc;
      }, {});
      
      const avgUrge = checkIns?.length 
        ? (checkIns.reduce((sum: number, ci: any) => sum + (ci.urge_intensity || 0), 0) / checkIns.length).toFixed(1)
        : 0;
      
      return {
        total_check_ins: checkIns?.length || 0,
        mood_distribution: moodSummary,
        average_urge_intensity: avgUrge,
        recent_notes: checkIns?.slice(0, 3).map((ci: any) => ci.notes).filter(Boolean),
        trend: checkIns?.length >= 2 
          ? (checkIns[0]?.urge_intensity < checkIns[checkIns.length - 1]?.urge_intensity ? "improving" : "needs_attention")
          : "insufficient_data"
      };
    }
    
    case "get_active_goals": {
      const { data: goals } = await supabase
        .from("goals")
        .select("title, description, progress, completed, target_days, start_date, end_date")
        .eq("user_id", userId)
        .eq("completed", false);
      
      return {
        active_goals: goals?.length || 0,
        goals: goals?.map((g: any) => ({
          title: g.title,
          description: g.description,
          progress: g.progress || 0,
          target_days: g.target_days,
          days_remaining: g.end_date 
            ? Math.max(0, Math.floor((new Date(g.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null
        })) || []
      };
    }
    
    case "suggest_coping_activity": {
      const stressLevel = args.stress_level || "medium";
      
      // Get user's past coping activities that were helpful
      const { data: pastActivities } = await supabase
        .from("coping_activities")
        .select("activity_name, category, helpful, times_used")
        .eq("user_id", userId)
        .eq("helpful", true)
        .order("times_used", { ascending: false })
        .limit(5);
      
      const suggestions: Record<string, string[]> = {
        low: [
          "Take a 10-minute mindful walk outside",
          "Practice gratitude journaling - write 3 things you're thankful for",
          "Do some light stretching or yoga",
          "Call a friend or family member"
        ],
        medium: [
          "Try the 4-7-8 breathing technique for 5 minutes",
          "Use the guided meditation in the app",
          "Write in your journal about how you're feeling",
          "Go for a jog or do 20 minutes of exercise"
        ],
        high: [
          "Use the HALT technique - check if you're Hungry, Angry, Lonely, or Tired",
          "Call your sponsor or support person immediately",
          "Do the 5-4-3-2-1 grounding exercise",
          "Remove yourself from triggering situations"
        ],
        crisis: [
          "🆘 If you're in crisis, please call 988 (Suicide & Crisis Lifeline)",
          "Reach out to your emergency contact right now",
          "Go to a safe place with someone you trust",
          "Remember: this moment will pass, and you are stronger than this urge"
        ]
      };
      
      return {
        stress_level: stressLevel,
        suggestions: suggestions[stressLevel] || suggestions.medium,
        past_helpful_activities: pastActivities?.map((a: any) => a.activity_name) || [],
        crisis_resources: stressLevel === "crisis" ? {
          hotline: "988",
          text_line: "Text HOME to 741741",
          website: "https://988lifeline.org"
        } : null
      };
    }
    
    case "get_recent_journal_entries": {
      const { data: journals } = await supabase
        .from("journal_entries")
        .select("title, content, sentiment, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);
      
      return {
        recent_entries: journals?.map((j: any) => ({
          title: j.title,
          excerpt: j.content?.substring(0, 200) + "...",
          sentiment: j.sentiment,
          date: j.created_at
        })) || [],
        total_entries: journals?.length || 0
      };
    }
    
    case "get_biometric_data": {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: biometrics } = await supabase
        .from("biometric_logs")
        .select("heart_rate, sleep_hours, steps, stress_level, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", weekAgo.toISOString())
        .order("logged_at", { ascending: false });
      
      if (!biometrics?.length) {
        return { has_data: false, message: "No biometric data available. Consider connecting a wearable device." };
      }
      
      const avgSleep = biometrics.reduce((sum: number, b: any) => sum + (b.sleep_hours || 0), 0) / biometrics.length;
      const avgSteps = biometrics.reduce((sum: number, b: any) => sum + (b.steps || 0), 0) / biometrics.length;
      const avgStress = biometrics.reduce((sum: number, b: any) => sum + (b.stress_level || 0), 0) / biometrics.length;
      
      return {
        has_data: true,
        average_sleep_hours: avgSleep.toFixed(1),
        average_steps: Math.round(avgSteps),
        average_stress_level: avgStress.toFixed(1),
        latest: biometrics[0],
        insights: avgSleep < 6 
          ? "Sleep quality seems low. Poor sleep can increase vulnerability to cravings."
          : avgStress > 7 
            ? "Stress levels are elevated. Consider incorporating stress-reduction activities."
            : "Biometrics look stable. Keep up the healthy habits!"
      };
    }
    
    case "log_intervention": {
      await supabase
        .from("ai_observability_logs")
        .insert({
          user_id: userId,
          function_name: "chat-with-ai",
          intervention_triggered: true,
          intervention_type: args.intervention_type,
          user_feedback: args.was_helpful ? "helpful" : "not_helpful",
          created_at: new Date().toISOString()
        });
      
      return { logged: true, intervention_type: args.intervention_type };
    }
    
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let toolsCalled: string[] = [];

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

    const { message, conversationHistory } = await req.json();
    
    // Sanitize user input
    const sanitizedMessage = sanitizeInput(message, 2000);
    if (!sanitizedMessage) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Sanitize conversation history
    const sanitizedHistory = (conversationHistory || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: sanitizeInput(msg.content, 2000)
    })).slice(-10);

    // Fetch user context for system prompt
    const { data: profile } = await supabase
      .from("profiles")
      .select("pseudonym, addiction_type, sobriety_start_date, level")
      .eq("id", user.id)
      .single();

    const daysSober = profile?.sobriety_start_date
      ? Math.floor((Date.now() - new Date(profile.sobriety_start_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Build system prompt for AI Agent
    const systemPrompt = `You are an empathetic AI Recovery Coach for a sobriety app. You help users in their recovery journey with compassion and evidence-based support.

USER CONTEXT:
- Name: ${profile?.pseudonym || "Friend"}
- Recovery from: ${profile?.addiction_type || "addiction"}
- Days sober: ${daysSober}
- Level: ${profile?.level || 1}

YOUR CAPABILITIES (use tools when helpful):
- get_user_progress: Check their sobriety stats and achievements
- get_recent_moods: Analyze their recent emotional patterns
- get_active_goals: Review their recovery goals
- suggest_coping_activity: Recommend personalized coping strategies
- get_recent_journal_entries: Understand their recent reflections
- get_biometric_data: Check wearable health data if available
- log_intervention: Track when you provide significant support

GUIDELINES:
1. Be warm, supportive, and non-judgmental
2. Use tools to personalize your responses with real user data
3. Celebrate progress, no matter how small
4. If user mentions crisis/self-harm, IMMEDIATELY provide 988 hotline
5. Keep responses concise but meaningful (under 200 words)
6. Never provide medical advice - encourage professional help when needed
7. Use the user's name to create connection

SAFETY: If the user expresses suicidal thoughts or immediate danger, prioritize crisis resources:
- Crisis Lifeline: 988
- Crisis Text: Text HOME to 741741`;

    // Build messages array
    const messages = [
      { role: "system", content: systemPrompt },
      ...sanitizedHistory,
      { role: "user", content: sanitizedMessage }
    ];

    // Call Lovable AI Gateway with tools
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Calling Lovable AI Gateway with agent tools");

    // First call - may include tool calls
    let aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: agentTools,
        tool_choice: "auto",
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("Failed to get AI response");
    }

    let responseData = await aiResponse.json();
    let assistantMessage = responseData.choices[0].message;
    
    // Handle tool calls (ReAct loop)
    let iterations = 0;
    const maxIterations = 5;
    
    while (assistantMessage.tool_calls && iterations < maxIterations) {
      iterations++;
      console.log(`Processing tool calls (iteration ${iterations})`);
      
      const toolResults: any[] = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        
        console.log(`Executing tool: ${toolName}`, toolArgs);
        toolsCalled.push(toolName);
        
        const result = await executeTool(supabase, user.id, toolName, toolArgs);
        
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
      
      // Continue conversation with tool results
      const updatedMessages = [
        ...messages,
        assistantMessage,
        ...toolResults
      ];
      
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: updatedMessages,
          tools: agentTools,
          tool_choice: "auto",
        }),
      });
      
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI gateway error in tool loop:", aiResponse.status, errorText);
        break;
      }
      
      responseData = await aiResponse.json();
      assistantMessage = responseData.choices[0].message;
    }
    
    const finalContent = assistantMessage.content || "I'm here to support you. How can I help?";
    const responseTimeMs = Date.now() - startTime;
    
    // Log observability data
    try {
      await supabase.from("ai_observability_logs").insert({
        user_id: user.id,
        function_name: "chat-with-ai",
        input_summary: sanitizedMessage.substring(0, 100),
        tools_called: toolsCalled,
        response_summary: finalContent.substring(0, 200),
        response_time_ms: responseTimeMs,
        model_used: "google/gemini-3-flash-preview",
        intervention_triggered: toolsCalled.includes("log_intervention"),
      });
    } catch (logError) {
      console.error("Failed to log observability data:", logError);
    }

    console.log(`Response generated in ${responseTimeMs}ms, tools used: ${toolsCalled.join(", ") || "none"}`);

    return new Response(
      JSON.stringify({ 
        response: finalContent,
        tools_used: toolsCalled,
        response_time_ms: responseTimeMs
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in chat-with-ai:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
