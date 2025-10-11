import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize user input to prevent prompt injection
function sanitizeInput(input: string, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') return '';
  
  // Limit length
  let sanitized = input.slice(0, maxLength).trim();
  
  // Remove system prompt injection attempts
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
    })).slice(-10); // Keep only last 10 messages

    // Fetch user context
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(7);

    const { data: goals } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id);

    const { data: journals } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Calculate sobriety days
    const daysSober = profile?.sobriety_start_date
      ? Math.floor((Date.now() - new Date(profile.sobriety_start_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Build context for AI
    const contextInfo = `User: ${profile?.pseudonym || "Anonymous"}
Recovery: ${daysSober} days sober from ${profile?.addiction_type || "addiction"}
Recent activity: ${checkIns?.length || 0} check-ins this week, ${goals?.filter((g: any) => !g.completed).length || 0} active goals
Latest journal: ${journals?.[0]?.content.substring(0, 100) || "No recent entries"}...`;

    // Build messages array for Lovable AI
    const messages = [
      {
        role: "system",
        content: `You are a compassionate AI recovery coach helping someone in recovery.

${contextInfo}

Provide empathetic, supportive guidance. Keep responses under 150 words. Focus on encouragement and practical advice. If discussing crisis, mention hotline 988.`
      },
      ...sanitizedHistory,
      { role: "user", content: sanitizedMessage }
    ];

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Calling Lovable AI Gateway");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
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

    // Stream the response directly
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Error in chat-with-ai:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
