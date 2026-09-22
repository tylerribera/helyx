# Helyx

Brain health education. A sourced catalog of nootropic compounds, a personalised
home page, and — for members — a protocol built around goals rather than hype.

One React Native codebase serves the iOS app, the Android app, and helyx.us.

## Run it

```bash
npm install
npm start          # then press i (iOS), a (Android), or w (web)
```

No environment setup is needed to browse. The catalog reads from bundled files,
so a fresh clone shows real screens with no backend.

To enable accounts and user data, copy `.env.example` to `.env` and fill in your
Supabase project URL and anon key.

## Commands

| Command | What it does |
|---|---|
| `npm start` | Dev server |
| `npm run web` | Web only |
| `npm run export:web` | Static site → `dist/` |
| `npm run typecheck` | TypeScript |
| `npm run validate:content` | Schema + publishing rules |
| `npm run check` | Both of the above |

## Where things are

| Path | |
|---|---|
| `app/` | Screens. File path = URL path. |
| `src/schema/` | **The content contract.** Start here. |
| `src/data/` | Read layer — the publish gate lives here |
| `content/` | Compound and interaction source files |
| `supabase/` | Migrations, RLS policies, the assistant function |
| `docs/` | Architecture, schema, AI costs |

## Read these

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how it fits together, and a
  frank list of what is not built yet.
- **[docs/SCHEMA.md](docs/SCHEMA.md)** — read before authoring any compound.
- **[docs/AI-COSTS.md](docs/AI-COSTS.md)** — what the assistant costs per user
  and how spending is capped.

## Two things to know before changing anything

**Never import from `content/` in a component.** Go through `src/data/catalog.ts`,
which is where the draft/published gate is applied. Bypassing it is how
unreviewed content reaches a user.

**A compound's `slug` is permanent.** It is the public URL. Changing one breaks
every inbound link and the page's search ranking.

## Status

Pre-development foundation. The schema, data model, security policies, routing,
and web export are real and working. Auth, billing, and the AI credit counter
are scaffolded but incomplete — `docs/ARCHITECTURE.md` lists exactly what is
missing. The UI is deliberately plain; `src/theme.ts` exists so it can be
replaced in one file.

The two compounds in `content/` are rough drafts written as layout fixtures.
Their citations are placeholders, and they are marked `draft` so the publish
gate keeps them out of public views.
