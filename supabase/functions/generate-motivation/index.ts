import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize user input to prevent prompt injection (though this function doesn't accept direct user input in prompt)
function sanitizeInput(input: string, maxLength: number = 100): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.slice(0, maxLength).trim();
  
  const dangerousPatterns = [
    /system:/gi,
    /assistant:/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
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

  const startTime = Date.now();
  console.log(`[generate-motivation] Request started at ${new Date().toISOString()}`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      console.error("[generate-motivation] Unauthorized request");
      throw new Error("Unauthorized");
    }

    console.log(`[generate-motivation] User: ${user.id}`);

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("addiction_type, sobriety_start_date")
      .eq("id", user.id)
      .single();

    // Calculate days sober
    const daysSober = Math.floor(
      (new Date().getTime() - new Date(profile?.sobriety_start_date || new Date()).getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(`[generate-motivation] Days sober: ${daysSober}, addiction: ${profile?.addiction_type}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("[generate-motivation] LOVABLE_API_KEY not configured");
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const prompt = `Generate a short, inspiring motivational message for someone in recovery from ${profile?.addiction_type || "addiction"}. They are ${daysSober} days into their journey. Keep it under 100 characters, positive, and encouraging.`;

    console.log("[generate-motivation] Calling Lovable AI Gateway...");

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 100,
        }),
      });

      const responseTime = Date.now() - startTime;
      console.log(`[generate-motivation] API response in ${responseTime}ms, status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[generate-motivation] API error:`, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits depleted. Please add credits." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`[generate-motivation] Raw AI response:`, JSON.stringify(data));
      
      let message = "Every day is a victory. Keep moving forward!";
      
      if (data.choices?.[0]?.message?.content) {
        let generated = data.choices[0].message.content.trim();
        
        // Remove quotes if present
        generated = generated.replace(/^["']|["']$/g, '');
        
        // If the message is already a good length, use it
        if (generated.length > 20 && generated.length < 200) {
          message = generated;
          // Ensure it ends with punctuation
          if (!/[.!?]$/.test(message)) {
            message += '.';
          }
        } else {
          // Try to extract first sentence
          const firstSentence = generated.split(/[.!?]/)[0];
          if (firstSentence && firstSentence.length > 20) {
            message = firstSentence + '.';
          }
        }
      }

      console.log(`[generate-motivation] Success! Generated: "${message}"`);
      
      return new Response(
        JSON.stringify({ message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("[generate-motivation] AI API error:", error);
      
      // Return fallback message
      const fallbackMessages = [
        "Every day sober is a victory. You're stronger than you know!",
        `${daysSober} days of courage and determination. Keep going!`,
        "Your journey matters. One day at a time, you're building a better future.",
        "Recovery is progress, not perfection. You're doing great!",
      ];
      
      return new Response(
        JSON.stringify({ 
          message: fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("[generate-motivation] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
