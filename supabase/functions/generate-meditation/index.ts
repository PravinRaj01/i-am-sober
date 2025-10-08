import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, duration } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const durationMinutes = Math.floor(duration / 60);
    const prompt = `Create a calming, guided meditation script for "${title}".
    
    Description: ${description}
    The meditation should be approximately ${durationMinutes} minutes long.
    
    The script should be ready to be read aloud by a text-to-speech engine.
    Do NOT include any headers, titles, or meta-instructions like "(Opening Music...)" or "**Introduction**".
    The script should flow as a single piece of spoken text.
    Indicate pauses in speech with [pause].
    
    The script should have three parts:
    1. A brief, welcoming introduction.
    2. The main meditation practice, focusing on recovery, self-compassion, and managing cravings. Include breathing instructions and mindfulness cues.
    3. A gentle closing.
    
    Use a calm, soothing, and compassionate tone.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a compassionate meditation guide specializing in addiction recovery and emotional wellbeing. Create calming, supportive guided meditations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const meditationScript = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ script: meditationScript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating meditation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});