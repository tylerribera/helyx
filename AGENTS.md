# Working in this repo

## Expo SDK 57 has changed

Read the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before
writing Expo code. Two changes that will bite you if you work from memory:

- **Do not import from `@react-navigation/*`.** SDK 56+ removed support for it
  in application code. Everything comes from `expo-router`.
- `generateStaticParams` is how dynamic routes get pre-rendered for the web
  build. Without it a compound page ships as a client-rendered shell with no SEO.

## Rules specific to this project

**Never import from `content/` inside a component.** Read through
`src/data/catalog.ts`. That module applies the draft/published gate; bypassing
it is how unreviewed content reaches a user.

**A compound's `slug` is permanent.** It is the public URL. Changing one breaks
every inbound link and the page's search ranking.

**Safety exclusions are filters, not ranking penalties.** In
`src/data/suggest.ts`, exclusions run before scoring and are absolute. Never
convert one into a score adjustment — a high enough score must not be able to
outvote a user's safety answer.

**`src/schema/` imports no React, no React Native, and no Supabase.** Keep it
that way. It is pure data definition so it can run in CI, move into a shared
package, or sit behind a CMS without touching the app.

**Do not weaken the publish gate to make content pass.** If
`npm run validate:content` rejects something, fix the content. The rules
(≥4 qualifying sources, every claim cited, human sign-off, all four
jurisdictions) are the product, not an obstacle to it.

## Before committing

```
npm run check     # typecheck + content validation
```

For anything touching the web build, also run `npm run export:web` — static
rendering fails in ways a typecheck will not catch.

## Content

Read `docs/SCHEMA.md` before authoring or editing a compound. The two entries
currently in `content/` are rough drafts with placeholder citations, kept as
layout fixtures.
