# Architecture

Written for the developer taking this over. It explains the decisions that are
not obvious from reading the code, and is honest about what is unfinished.

## One codebase, two targets

React Native via Expo, with Expo Router. The same components render to iOS,
Android, and — through `react-native-web` — to helyx.us. There is no second
frontend to keep in sync.

```
app/                      Expo Router. File path = URL path.
  _layout.tsx             Root stack + providers
  index.tsx               helyx.us landing page (web) / redirect to tabs (native)
  (tabs)/                 /today · /catalog · /ask · /core
  compound/[slug].tsx     The SEO surface. 200+ of these are why the site exists.
  onboarding.tsx
  +html.tsx               Web-only HTML shell. Smart banners live here.
src/
  schema/                 The content contract. No React, no Supabase imports.
  data/                   Read layer. The publish gate is applied here.
  state/                  Profile store (AsyncStorage; swap for Supabase later)
  lib/                    Supabase client, env
  components/             Shared UI primitives
content/                  Compound + interaction source files
supabase/
  migrations/             SQL schema + row-level security
  functions/ask/          The assistant endpoint (holds the API key)
scripts/validate-content  CI gate for the schema rules
docs/
```

### Landing page vs app

`/` is a marketing page with email capture; the app lives at `/today` and the
other tab routes. On native, `app/index.tsx` returns a `<Redirect>` to the tabs
immediately — someone who already installed the app does not need to be sold on
it.

This split exists because the catalog is currently empty. Every compound is a
draft, so a visitor landing on the app shell would see nothing. Once there is
real content, making the app the site's front door is a matter of changing that
redirect; the routes are already in place and indexable.

The landing page renders the logo with a raw `<img>` rather than React Native's
`Image`, because react-native-web applies an image source as a background style
via JavaScript — the logo would be absent from the server-rendered HTML and pop
in after hydration. The `Platform.OS !== 'web'` guard above it means the raw DOM
element is never reached on native.

### The web build

`app.json` sets `web.output: "static"`, so `npx expo export --platform web`
pre-renders each route to a real HTML file. For compound pages,
`generateStaticParams` in `app/compound/[slug].tsx` enumerates published slugs
at build time — that is what makes 200+ catalog pages indexable rather than
client-rendered.

Each compound page emits both halves of the provenance rule: prose for the
reader, and JSON-LD `schema.org/Drug` structured data for search engines.

### Smart banners

`app/+html.tsx` is web-only, which makes it the right home for them:

- **iOS** — `<meta name="apple-itunes-app">`. Safari renders this natively and
  deep-links into the app if installed. Only emitted when
  `EXPO_PUBLIC_IOS_APP_ID` is set; a banner pointing at a nonexistent app is
  worse than no banner.
- **Android** — no native equivalent exists, so there is a small inline script.
  It shows only on Android, and **remembers dismissal in `localStorage`.** A
  banner someone already declined that keeps reappearing is the fastest way to
  make them stop visiting the site.

## Data: files are the source of truth

Compounds live in `content/` as TypeScript, not in the database. Three reasons:

1. Browsing works with no network and no backend.
2. The web build needs the data at build time to pre-render pages.
3. A new developer clones the repo and sees real screens without provisioning
   anything.

Postgres is a **queryable copy**, populated by a sync script. Do not hand-edit
rows — the next sync overwrites them.

The split by security posture:

| Data | Where | Who can read it |
|---|---|---|
| Compounds, interactions | Files → Postgres mirror | Anyone, but **only `status = 'published'`** |
| Profiles, notes, protocols | Postgres only | Only the owner, enforced by RLS |

Every content table has row-level security restricting reads to published rows,
and every user table has an owner-only policy with no client-reachable admin
override.

## The schema is the centre of this project

`src/schema/` deliberately imports no React, no React Native, and no Supabase.
It is pure data definition, so it can be lifted into a shared package, run
inside a CI validator, or backed by a CMS without touching the app.

Read `docs/SCHEMA.md`. The short version: every fact is stored twice — prose for
humans, a structured value for engines — and the rules about citations and
review are enforced by `npm run validate:content`, not by anyone's memory.

## Safety is a filter, never a ranking penalty

In `src/data/suggest.ts`, exclusions run *before* scoring and are absolute. A
user who says they compete in tested sport can never be shown a banned compound,
no matter how well it matches their goals. This distinction is the whole design:
a high enough score must never be able to outvote a safety answer.

Suggestions also always carry a `because` array. A recommendation the user
cannot interrogate is a black box, and on this subject a black box is not
acceptable.

## Deployment

helyx.us is hosted on **Cloudflare Pages**, which builds from this repository on
every push to `main`.

Cloudflare was chosen over GitHub Pages because the domain's DNS and CDN already
terminate there, and because GitHub Pages offers no control over response
headers — `public/_headers` (security headers, immutable caching on
fingerprinted assets, revalidation on HTML) has no GitHub Pages equivalent.
Per-branch preview deployments come free, which matters once more than one
person is working on this.

**GitHub Pages is deliberately disabled.** Two hosts claiming the same custom
domain is what made the site serve stale content for a day: a Cloudflare Pages
custom-domain binding silently overrides the DNS record pointing at GitHub, so
requests never reached GitHub at all while every diagnostic said DNS was
correct. Do not re-enable it.

### Cloudflare Pages settings

| Setting | Value |
|---|---|
| Build command | `npm run build:web` |
| Output directory | `dist` |
| Node version | from `.node-version` (20) |
| Environment variable | `EXPO_PUBLIC_SITE_URL=https://helyx.us` |
| Environment variable | `EXPO_PUBLIC_IOS_APP_ID` — set once the app is registered |

`npm run build:web` runs `npm run check` first, so a failing typecheck or a
compound that violates the publishing rules aborts the deploy rather than
shipping.

### What runs where

- **Cloudflare Pages** — builds and serves helyx.us.
- **GitHub Actions (`ci.yml`)** — typechecks, validates content, and builds on
  every push and pull request. It does not deploy. Its job is to fail on a PR,
  before a merge triggers a real deploy.

### Build steps that live in the repo, not in host config

`scripts/post-export.mjs` runs after the Expo export and copies
`+not-found.html` to `404.html`, which is the filename both hosts actually serve
for unresolved paths. It is a script rather than a line of YAML so the build
behaves the same on a laptop, in CI, and on Cloudflare — a step that exists only
in one host's config stops happening the moment you change hosts.

## Commands

```
npm start                  Dev server (press i / a / w)
npm run web                Web only
npm run export:web         Static site → dist/
npm run build:web          check + export:web (what Cloudflare Pages runs)
npm run typecheck
npm run validate:content   Schema + publishing rules
npm run check              Both
```

## What is not built

Listed so nothing here is mistaken for finished.

- **Auth.** The Supabase client is configured and the tables and policies exist,
  but there are no sign-in screens. The profile store is local-only; `src/state/profile.tsx`
  is the seam — swap its AsyncStorage calls for Supabase and every consumer keeps working.
- **Billing.** `tier` is hard-coded to `'free'`. The processor choice
  (RevenueCat vs Stripe vs native IAP) has app-store compliance consequences and
  should be made by whoever owns it.
- **The AI credit counter.** `used` is hard-coded to `0` in the Edge Function,
  so **the allowance is not actually enforced.** Close this before any public
  launch. See `docs/AI-COSTS.md`.
- **The content sync script.** Files → Postgres is described but not written.
- **Catalog virtualisation.** `catalog.tsx` renders a plain list. At 200+
  entries it needs a `FlatList`. Not done yet because the list is currently two
  items and premature virtualisation would obscure the structure.
- **Push notifications.** Nothing yet. The product notes call for ≤2/day, sent
  at the user's own usual open time rather than a global optimum.
- **The community feed.** Tables not designed. Waitlist table exists.
- **Design.** Deliberately minimal — layout and structure only. `src/theme.ts`
  is a token file specifically so it can be replaced in one place.
- **Tests.** None. The content validator is the only automated check.
