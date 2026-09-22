# What the assistant actually costs

Written because "how much overhead per user will this cost, and how do I cap it"
is the question that decides whether the assistant ships free, ships paid, or
ships at all.

All figures are Anthropic list prices as of September 2026, per million tokens.

| Model | Input | Output |
|---|---|---|
| Claude Opus 5 | $5.00 | $25.00 |
| Claude Sonnet 5 | $3.00 | $15.00 |
| Claude Haiku 4.5 | $1.00 | $5.00 |

## The shape of one question

A realistic Helyx question, broken into its parts:

| Part | Tokens | Notes |
|---|---|---|
| System prompt | ~400 | Identical every time, so it caches |
| User profile | ~200 | Onboarding answers as JSON |
| Compound context | ~1,000 | The 2–3 compounds relevant to the question |
| The question | ~40 | |
| The answer | ~400 | Short answers are a product decision *and* a cost decision |

Cached input reads at roughly one tenth of the input price, which is why the
system prompt is marked `cache_control` in `supabase/functions/ask/index.ts` —
and why it must stay byte-identical between requests. Interpolating a timestamp
or the user's name into it silently drops the cache and you pay full price
without any error to tell you.

## Cost per question

| Model | Per question |
|---|---|
| Opus 5 | **$0.0164** (1.6¢) |
| Sonnet 5 | **$0.0098** (1.0¢) |
| Haiku 4.5 | **$0.0033** (0.3¢) |

Output dominates. On Opus 5, the 400-token answer is $0.010 of the $0.016 —
roughly 60% of the bill. **Shortening answers is the single most effective cost
lever you have**, and it improves the product at the same time.

## Cost per user per month

At the credit limits currently in the Edge Function (free: 20/month, Core: 300/month),
assuming a user spends their full allowance:

| Model | Free user (20) | Core user (300) |
|---|---|---|
| Opus 5 | $0.33 | **$4.92** |
| Sonnet 5 | $0.20 | $2.94 |
| Haiku 4.5 | $0.07 | $0.99 |

**The Core row is the one that matters.** At 300 questions on Opus 5, a single
member costs $4.92/month in AI alone. Against a $15/month subscription that is
33% of revenue before Supabase, Apple's 15–30% cut, or anything else. Against
a $10/month subscription it is closer to half.

Two ways out, and they compose: lower the Core allowance, or move the assistant
to a cheaper model. 300 questions/month is 10 per day, which almost nobody will
actually use — but the cap has to be priced as though they will, because the
ones who do are exactly the ones who will.

## At scale

10,000 free users averaging 8 questions/month (most people never approach a cap):

| Model | Monthly |
|---|---|
| Opus 5 | $1,312 |
| Sonnet 5 | $784 |
| Haiku 4.5 | $264 |

## Which model

The code currently calls **Claude Opus 5**. That is the most capable option and
the right default for correctness on a topic where a wrong answer about a drug
interaction is a real harm.

Whether it stays there is a product call, not a technical one, and it is worth
making deliberately:

- **Opus 5** — best reasoning. Right if the assistant is a headline Core feature
  people pay for.
- **Sonnet 5** — ~40% cheaper, close to Opus on most tasks. The sensible middle.
- **Haiku 4.5** — 5× cheaper than Opus. Genuinely fine for "what is the half-life
  of caffeine", genuinely not fine for "is it safe to stack these four things".

A realistic answer is **both**: route simple factual lookups to Haiku and
reasoning-heavy safety questions to Opus. That needs a classifier step, so it is
an optimisation for after launch, not before.

## Controls that exist, and the one that does not

Built:

- **Server-side only.** The app never holds an API key. Every request goes
  through the Edge Function, which is the only place a limit can actually be
  enforced — a client-side cap is a suggestion.
- **Auth required.** Unauthenticated requests are rejected before the model is
  called. An open AI endpoint gets found and drained.
- **Prompt caching** on the system prompt.
- **`max_tokens: 1024`**, a hard ceiling on the most expensive part of the request.
- **Usage logging** to an `ai_usage` table, so per-user spend is visible from
  day one rather than first appearing on an invoice.

Not built:

- **The credit counter itself.** `used` is hard-coded to `0` in the Edge
  Function. The table needs a migration, and the reset window — calendar month,
  rolling 30 days, or billing anniversary — is a product decision. Until this is
  finished, **the allowance is not enforced.** This is the first thing to close
  before any public launch.
