import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const NEGATIVE_PATTERNS = [
  /\b(stupid|idiot|loser|failure|worthless|pathetic)\b/gi,
  /\b(kill yourself|kys|die|hate you)\b/gi,
  /\b(f[u\*]ck|sh[i\*]t|damn|hell)\b/gi,
  /\b(useless|hopeless|waste)\b/gi,
];

const SPAM_PATTERNS = [
  /(.)\1{5,}/g, // Repeated characters
  /https?:\/\//gi, // URLs
  /\b(buy|sell|click|subscribe|follow me)\b/gi,
];

function moderateContent(text: string): { isAppropriate: boolean; reason?: string } {
  if (!text || text.trim().length === 0) {
    return { isAppropriate: false, reason: 'Content cannot be empty' };
  }

  // Check for excessive negativity
  for (const pattern of NEGATIVE_PATTERNS) {
    if (pattern.test(text)) {
      return { 
        isAppropriate: false, 
        reason: 'Content contains inappropriate language. Please keep messages supportive and constructive.' 
      };
    }
  }

  // Check for spam
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return { 
        isAppropriate: false, 
        reason: 'Content appears to be spam. Please share genuine recovery experiences.' 
      };
    }
  }

  // Check for all caps (potential shouting)
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.7 && text.length > 20) {
    return { 
      isAppropriate: false, 
      reason: 'Please avoid using excessive capital letters.' 
    };
  }

  return { isAppropriate: true };
}

Deno.serve(async (req) => {
  try {
    const { content, type = 'milestone' } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const moderation = moderateContent(content);

    if (!moderation.isAppropriate) {
      return new Response(
        JSON.stringify({ 
          appropriate: false, 
          reason: moderation.reason 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ appropriate: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Content moderation error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
