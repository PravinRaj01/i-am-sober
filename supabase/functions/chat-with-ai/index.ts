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

// Define AI Agent Tools - Now includes WRITE actions for agentic behavior
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
  },
  // NEW AGENTIC WRITE TOOLS
  {
    type: "function",
    function: {
      name: "create_goal",
      description: "Create a new recovery goal for the user. Use this when the user asks to set a goal, wants to track something, or mentions a new goal they want to achieve.",
      parameters: {
        type: "object",
        properties: {
          title: { 
            type: "string",
            description: "The goal title (e.g., 'Exercise 3 times a week', 'Attend AA meeting')"
          },
          description: {
            type: "string",
            description: "Optional description with more details about the goal"
          },
          target_days: {
            type: "number",
            description: "Number of days to achieve this goal (optional)"
          }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_check_in",
      description: "Log a mood check-in for the user. Use this when the user shares how they're feeling, their mood, or their urge level.",
      parameters: {
        type: "object",
        properties: {
          mood: { 
            type: "string",
            enum: ["great", "good", "okay", "struggling", "crisis"],
            description: "The user's current mood"
          },
          urge_intensity: {
            type: "number",
            description: "Urge intensity from 0-10 (0 = no urge, 10 = extreme urge)"
          },
          notes: {
            type: "string",
            description: "Notes about the check-in, context, or what triggered the mood"
          }
        },
        required: ["mood"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_journal_entry",
      description: "Create a journal entry for the user. Use this when the user wants to journal, write down thoughts, or reflect on something.",
      parameters: {
        type: "object",
        properties: {
          title: { 
            type: "string",
            description: "Title for the journal entry"
          },
          content: {
            type: "string",
            description: "The journal content - capture what the user shared"
          }
        },
        required: ["content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "complete_goal",
      description: "Mark a goal as completed. Use this when the user says they've achieved or completed a specific goal.",
      parameters: {
        type: "object",
        properties: {
          goal_title: { 
            type: "string",
            description: "The title of the goal to mark as complete (will fuzzy match)"
          }
        },
        required: ["goal_title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "log_coping_activity",
      description: "Log that the user used a coping activity. Use this when the user mentions they did a coping activity or used a strategy.",
      parameters: {
        type: "object",
        properties: {
          activity_name: { 
            type: "string",
            description: "Name of the coping activity (e.g., 'Deep breathing', 'Went for a walk')"
          },
          category: {
            type: "string",
            enum: ["breathing", "physical", "mindfulness", "social", "creative", "other"],
            description: "Category of the activity"
          },
          helpful: {
            type: "boolean",
            description: "Whether the activity was helpful"
          }
        },
        required: ["activity_name", "category"]
      }
    }
  }
];

// Execute tool calls
async function executeTool(supabase: any, userId: string, toolName: string, args: any): Promise<any> {
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
    
    // NEW AGENTIC WRITE TOOLS
    case "create_goal": {
      const startDate = new Date();
      const endDate = args.target_days 
        ? new Date(Date.now() + args.target_days * 24 * 60 * 60 * 1000)
        : null;
      
      const { data, error } = await supabase
        .from("goals")
        .insert({
          user_id: userId,
          title: args.title,
          description: args.description || null,
          target_days: args.target_days || null,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate ? endDate.toISOString().split('T')[0] : null,
          progress: 0,
          completed: false
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating goal:", error);
        return { success: false, error: error.message };
      }
      
      return { 
        success: true, 
        message: `Goal "${args.title}" has been created!`,
        goal: data
      };
    }
    
    case "create_check_in": {
      const { data, error } = await supabase
        .from("check_ins")
        .insert({
          user_id: userId,
          mood: args.mood,
          urge_intensity: args.urge_intensity || null,
          notes: args.notes || null
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating check-in:", error);
        return { success: false, error: error.message };
      }
      
      // Update profile streak
      await supabase
        .from("profiles")
        .update({ 
          last_check_in: new Date().toISOString(),
          current_streak: supabase.rpc ? undefined : 1 // Will be handled by trigger if exists
        })
        .eq("id", userId);
      
      return { 
        success: true, 
        message: `Check-in logged! Mood: ${args.mood}${args.urge_intensity ? `, Urge: ${args.urge_intensity}/10` : ''}`,
        check_in: data
      };
    }
    
    case "create_journal_entry": {
      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          user_id: userId,
          title: args.title || `Journal - ${new Date().toLocaleDateString()}`,
          content: args.content
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating journal entry:", error);
        return { success: false, error: error.message };
      }
      
      return { 
        success: true, 
        message: "Journal entry saved!",
        entry: data
      };
    }
    
    case "complete_goal": {
      // Find goal by fuzzy title match
      const { data: goals } = await supabase
        .from("goals")
        .select("id, title")
        .eq("user_id", userId)
        .eq("completed", false);
      
      if (!goals || goals.length === 0) {
        return { success: false, message: "No active goals found." };
      }
      
      // Simple fuzzy match - find goal with most word overlap
      const targetWords = args.goal_title.toLowerCase().split(/\s+/);
      let bestMatch = goals[0];
      let bestScore = 0;
      
      for (const goal of goals) {
        const goalWords = goal.title.toLowerCase().split(/\s+/);
        const overlap = targetWords.filter((w: string) => goalWords.some((gw: string) => gw.includes(w) || w.includes(gw))).length;
        if (overlap > bestScore) {
          bestScore = overlap;
          bestMatch = goal;
        }
      }
      
      const { error } = await supabase
        .from("goals")
        .update({ completed: true, progress: 100 })
        .eq("id", bestMatch.id);
      
      if (error) {
        console.error("Error completing goal:", error);
        return { success: false, error: error.message };
      }
      
      return { 
        success: true, 
        message: `🎉 Goal "${bestMatch.title}" marked as complete! Great job!`
      };
    }
    
    case "log_coping_activity": {
      // Check if activity already exists
      const { data: existing } = await supabase
        .from("coping_activities")
        .select("id, times_used")
        .eq("user_id", userId)
        .eq("activity_name", args.activity_name)
        .single();
      
      if (existing) {
        // Update existing
        await supabase
          .from("coping_activities")
          .update({ 
            times_used: (existing.times_used || 0) + 1,
            helpful: args.helpful !== undefined ? args.helpful : true
          })
          .eq("id", existing.id);
        
        return { 
          success: true, 
          message: `Logged "${args.activity_name}" - you've used this ${(existing.times_used || 0) + 1} times!`
        };
      } else {
        // Create new
        const { error } = await supabase
          .from("coping_activities")
          .insert({
            user_id: userId,
            activity_name: args.activity_name,
            category: args.category,
            helpful: args.helpful !== undefined ? args.helpful : true,
            times_used: 1
          });
        
        if (error) {
          console.error("Error logging coping activity:", error);
          return { success: false, error: error.message };
        }
        
        return { 
          success: true, 
          message: `Great! "${args.activity_name}" has been logged as a coping activity.`
        };
      }
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
    
    const sanitizedMessage = sanitizeInput(message, 2000);
    if (!sanitizedMessage) {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const sanitizedHistory = (conversationHistory || []).map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: sanitizeInput(msg.content, 2000)
    })).slice(-10);

    const { data: profile } = await supabase
      .from("profiles")
      .select("pseudonym, addiction_type, sobriety_start_date, level")
      .eq("id", user.id)
      .single();

    const daysSober = profile?.sobriety_start_date
      ? Math.floor((Date.now() - new Date(profile.sobriety_start_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Check if user is giving specific actionable details
    const hasSpecificGoalDetails = /(?:goal|track|set).*(?:for|to|called|named|:)\s*["']?[\w\s]+["']?|(?:^|\s)(?:\d+\s*(?:days?|weeks?|hours?|minutes?)|exercise|meditate|read|walk|run|swim|attend|call|journal)/i.test(sanitizedMessage);
    const hasSpecificMoodDetails = /(?:feeling|mood|i'?m|i am)\s+(?:great|good|okay|ok|bad|terrible|struggling|crisis|sad|happy|anxious|stressed|angry)/i.test(sanitizedMessage);
    const isExplicitActionRequest = /(?:create|set|make|add|log|record|save|track)\s+(?:a\s+)?(?:goal|check-?in|journal|entry|mood)/i.test(sanitizedMessage);
    
    // Only enable write tools if user provides specific details or explicitly requests action
    const enableWriteTools = hasSpecificGoalDetails || hasSpecificMoodDetails || isExplicitActionRequest;

    const systemPrompt = `You are an empathetic AI Recovery Coach for a sobriety app. You help users in their recovery journey with compassion and evidence-based support.

USER CONTEXT:
- Name: ${profile?.pseudonym || "Friend"}
- Recovery from: ${profile?.addiction_type || "addiction"}
- Days sober: ${daysSober}
- Level: ${profile?.level || 1}

YOUR ROLE: Be a supportive companion first, action-taker second.

CONVERSATION RULES (CRITICAL - FOLLOW THESE EXACTLY):
1. LISTEN and RESPOND to what the user actually said
2. Have a natural conversation - ask follow-up questions
3. DO NOT assume what the user wants - ASK them
4. If user says "I want to create a goal" - ASK "What goal would you like to set?" 
5. If user says "I'm feeling X" - RESPOND with empathy, don't auto-log unless asked
6. Only use action tools when user provides SPECIFIC details AND confirms they want action

WHEN TO USE TOOLS:
- READ tools: Use freely to understand user's context
- WRITE tools: ONLY when user provides COMPLETE details like:
  - "Create a goal to exercise 3 times a week for 2 weeks" ✓
  - "Log my mood as good" ✓
  - "I want to create a goal" ✗ (ask what goal first!)
  - "I'm feeling stressed" ✗ (respond with empathy, ask if they want to log)

RESPONSE FORMAT:
- Be warm, supportive, conversational
- Keep responses under 100 words
- Ask ONE follow-up question to understand their needs
- Don't announce tool usage - just do it naturally if appropriate

SAFETY: If crisis/self-harm mentioned, immediately share: 988 (Crisis Lifeline), Text HOME to 741741`;

    // Filter tools based on context
    const activeTools = enableWriteTools ? agentTools : agentTools.filter(t => 
      !["create_goal", "create_check_in", "create_journal_entry", "complete_goal", "log_coping_activity"].includes(t.function.name)
    );

    const messages = [
      { role: "system", content: systemPrompt },
      ...sanitizedHistory,
      { role: "user", content: sanitizedMessage }
    ];

    // Use Groq API
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not configured");
    }

    console.log("Calling Groq API with agent tools");

    let aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        tools: activeTools.length > 0 ? activeTools : undefined,
        tool_choice: enableWriteTools ? "auto" : "none",
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("Groq API error:", aiResponse.status, errorText);
      throw new Error("Failed to get AI response");
    }

    let responseData = await aiResponse.json();
    let assistantMessage = responseData.choices[0].message;
    
    // Handle tool calls (ReAct loop)
    let iterations = 0;
    const maxIterations = 5;
    let allToolResults: any[] = [];
    
    while (assistantMessage.tool_calls && iterations < maxIterations) {
      iterations++;
      console.log(`Processing tool calls (iteration ${iterations})`);
      
      const toolResults: any[] = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs = {};
        
        // Safely parse tool arguments with error handling
        try {
          toolArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch (parseError) {
          console.error(`Failed to parse tool arguments for ${toolName}:`, toolCall.function.arguments);
          // Skip this malformed tool call
          continue;
        }
        
        console.log(`Executing tool: ${toolName}`, toolArgs);
        toolsCalled.push(toolName);
        
        const result = await executeTool(supabase, user.id, toolName, toolArgs);
        allToolResults.push({ tool: toolName, result });
        
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
      
      // Only continue if we have tool results
      if (toolResults.length === 0) {
        break;
      }
      
      const updatedMessages = [
        ...messages,
        assistantMessage,
        ...toolResults
      ];
      
      aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: updatedMessages,
          tools: activeTools.length > 0 ? activeTools : undefined,
          tool_choice: "auto",
        }),
      });
      
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("Groq API error in tool loop:", aiResponse.status, errorText);
        // If tool loop fails, use what we have
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
        tool_results: allToolResults,
        response_summary: finalContent.substring(0, 200),
        response_time_ms: responseTimeMs,
        model_used: "llama-3.3-70b-versatile",
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
