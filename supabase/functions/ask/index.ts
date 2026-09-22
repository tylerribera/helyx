/**
 * The assistant endpoint. Deploy with:
 *   supabase functions deploy ask
 *   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 *
 * Why this exists as a server function rather than a call from the app:
 * an API key shipped in a React Native bundle or a web page is extractable by
 * anyone who downloads it, and a leaked key is billed to you until you notice.
 * The key lives here and never leaves the server.
 *
 * STATUS: skeleton. The auth check, credit accounting, and model call are all
 * laid out, but this has not been deployed or load-tested. See docs/AI-COSTS.md
 * for the cost model behind the credit limits.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@^0.70.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.109.0';

/**
 * Monthly question allowance per tier. The cap exists so a single user cannot
 * run up an unbounded bill -- see docs/AI-COSTS.md for the per-question maths
 * these numbers come from.
 */
const MONTHLY_CREDITS: Record<string, number> = {
  free: 20,
  core: 300,
};

const SYSTEM_PROMPT = `You are the Helyx assistant. You help people understand nootropic compounds.

Rules that are not negotiable:
- You are not a doctor and this is not medical advice. Say so when it matters, briefly, without a disclaimer on every sentence.
- Never recommend a dose as if it were a prescription. Describe the ranges reported in research and say what they came from.
- If you do not know, say so. Do not invent a study, a number, or a mechanism.
- Ground answers in the compound data provided in context. If the answer is not in it, say the catalog does not cover it yet.
- Respect the user's stated exclusions absolutely. If they compete in tested sport, never suggest a banned compound. If they opted out of gray-market compounds, never raise one.

Keep answers short and concrete. Lead with the answer, then the reasoning.`;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'POST only' }, 405);
  }

  // Identify the caller from their Supabase session. An unauthenticated
  // request must never reach the model -- that is an open, billable endpoint.
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'unauthorized' }, 401);

  const userId = userData.user.id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier, onboarding, core_profile')
    .eq('id', userId)
    .single();

  const tier = profile?.tier ?? 'free';
  const allowance = MONTHLY_CREDITS[tier] ?? MONTHLY_CREDITS.free;

  // TODO: count this month's questions from an ai_usage table and reject when
  // the user is over allowance. Deliberately left unimplemented -- the table
  // belongs in a migration, and the reset window (calendar month vs rolling 30
  // days vs billing anniversary) is a product decision, not a technical one.
  const used = 0;
  if (used >= allowance) {
    return json({ error: 'monthly_limit_reached', allowance, used }, 429);
  }

  const { question, compoundContext } = await req.json();
  if (typeof question !== 'string' || question.trim().length === 0) {
    return json({ error: 'question required' }, 400);
  }

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

  const response = await anthropic.messages.create({
    model: 'claude-opus-5',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        // The system prompt is identical on every request, so caching it drops
        // its cost to roughly a tenth. Keep it byte-stable: interpolating a
        // timestamp or the user's name in here silently kills the cache.
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              `User profile: ${JSON.stringify(profile?.onboarding ?? {})}`,
              profile?.core_profile ? `Core profile: ${JSON.stringify(profile.core_profile)}` : '',
              compoundContext ? `Relevant compounds:\n${compoundContext}` : '',
              `\nQuestion: ${question}`,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
      },
    ],
  });

  // Record what this cost so per-user spend is observable from day one.
  // Without this, the first signal that something is wrong is the invoice.
  await supabase.from('ai_usage').insert({
    user_id: userId,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    cache_read_tokens: response.usage.cache_read_input_tokens ?? 0,
    model: response.model,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return json({ answer: text, remaining: allowance - used - 1 });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
