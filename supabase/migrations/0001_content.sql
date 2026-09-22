-- Helyx content tables.
--
-- Shape follows the content model directly: each compound is a nested document
-- (jsonb), with the fields any engine filters on lifted out into real columns
-- so they can be indexed. Interactions and protocols are relational, because
-- they describe relationships between compounds rather than properties of one.
--
-- Files in /content are the source of truth. This database is a queryable copy,
-- populated by `npm run sync:content`. Do not hand-edit rows -- an edit here is
-- overwritten by the next sync.

create extension if not exists pg_trgm;

create type publish_status as enum ('draft', 'in_review', 'published', 'retired');
create type interaction_risk as enum ('synergistic', 'neutral', 'caution', 'avoid', 'contraindicated');
create type data_provenance as enum ('hand-authored', 'pathway-overlap', 'regulatory-import');

-- ---------------------------------------------------------------- compounds

create table compounds (
  slug             text primary key,
  name             text not null,

  -- The full validated compound, exactly as it appears in /content.
  document         jsonb not null,

  -- Lifted out of the document for indexing. The app filters on these columns;
  -- it never digs through jsonb to answer a filter query.
  status           publish_status not null default 'draft',
  categories       text[] not null default '{}',
  goals            text[] not null default '{}',
  risk_category    text not null default 'unknown',
  research_status  text not null default 'preliminary',

  -- Every alternate name and known misspelling, concatenated, so a user finds
  -- the compound no matter what they type.
  search_terms     text not null default '',

  last_reviewed_at date,
  last_updated_at  date not null default current_date,
  created_at       timestamptz not null default now()
);

create index compounds_status_idx     on compounds (status);
create index compounds_categories_idx on compounds using gin (categories);
create index compounds_goals_idx      on compounds using gin (goals);
create index compounds_search_idx     on compounds using gin (search_terms gin_trgm_ops);

-- ------------------------------------------------------------- interactions

-- Stored once per pair, canonically ordered (compound_a < compound_b), so a
-- lookup never depends on argument order and a pair cannot be double-entered.
create table interactions (
  compound_a       text not null references compounds (slug) on delete cascade,
  compound_b       text not null references compounds (slug) on delete cascade,
  risk             interaction_risk not null,
  note             text not null,

  -- 'hand-authored' pairs are written deliberately. 'pathway-overlap' pairs are
  -- inferred from shared mechanism, are lower confidence, and are always
  -- labelled as inferred in the UI.
  provenance       data_provenance not null default 'hand-authored',
  shared_pathways  text[] not null default '{}',
  sources          jsonb not null default '[]',

  status           publish_status not null default 'draft',
  last_reviewed_at date,
  last_updated_at  date not null default current_date,

  primary key (compound_a, compound_b),
  constraint interactions_ordered check (compound_a < compound_b),

  -- The dangerous end of the scale may never rest on inference alone. This
  -- mirrors the rule in the TypeScript schema; enforced in both places because
  -- a bad row reaching a user is the failure mode that actually hurts someone.
  constraint interactions_severe_must_be_authored check (
    risk not in ('avoid', 'contraindicated')
    or provenance <> 'pathway-overlap'
  )
);

create index interactions_a_idx    on interactions (compound_a);
create index interactions_b_idx    on interactions (compound_b);
create index interactions_risk_idx on interactions (risk);

-- Look up every interaction for one compound without caring about ordering.
create view compound_interactions as
  select compound_a as subject, compound_b as other, risk, note, provenance, status from interactions
  union all
  select compound_b as subject, compound_a as other, risk, note, provenance, status from interactions;

-- --------------------------------------------------------------------- RLS
--
-- Content is world-readable, but ONLY where status = 'published'. This is the
-- structural guarantee behind "unreviewed content cannot leak to the public
-- page": a draft is not hidden by the UI, it is unreachable by the client.
--
-- Writes are closed to everyone. The sync job uses the service role key, which
-- bypasses RLS and must never ship in the app bundle.

alter table compounds    enable row level security;
alter table interactions enable row level security;

create policy "published compounds are public"
  on compounds for select
  using (status = 'published');

create policy "published interactions are public"
  on interactions for select
  using (status = 'published');
