-- Helyx user tables.
--
-- Completely separate security posture from content: content is world-readable,
-- everything here is readable only by the account that owns it. Every table
-- carries the same owner-only policy, with no exceptions and no admin override
-- reachable from the client.
--
-- Identity comes from Supabase Auth (auth.users). We never store passwords.

create type membership_tier as enum ('free', 'core');

-- ----------------------------------------------------------------- profiles

create table profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  display_name       text,
  tier               membership_tier not null default 'free',
  tier_expires_at    timestamptz,

  -- Free onboarding. Short by design: it personalises the home page
  -- immediately rather than qualifying a buyer.
  onboarding         jsonb,
  onboarding_done_at timestamptz,

  -- Core onboarding. Deeper, and further trains the assistant.
  core_profile       jsonb,
  core_done_at       timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- A row is created automatically the moment an account is created, so the app
-- never has to handle a logged-in user with no profile.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- -------------------------------------------------------------------- notes

-- A user's private notes on a compound. Never leaves their account.
create table compound_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  compound   text not null references compounds (slug) on delete cascade,
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, compound)
);

create index compound_notes_user_idx on compound_notes (user_id);

-- ---------------------------------------------------------------- protocols

-- A generated, personalised stack. Relational rather than nested so individual
-- items can be reordered, toggled, and checked against the interaction table.
create table protocols (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null default 'My protocol',
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table protocol_items (
  id          uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references protocols (id) on delete cascade,
  compound    text not null references compounds (slug) on delete cascade,
  dose        numeric,
  dose_unit   text,
  timing      text,
  position    integer not null default 0,
  unique (protocol_id, compound)
);

create index protocols_user_idx        on protocols (user_id);
create index protocol_items_proto_idx  on protocol_items (protocol_id);

-- ----------------------------------------------------------------- waitlist

-- Core community waitlist. Insert-only from the client: anyone may add an
-- address, nobody may read the list back.
create table waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  source     text not null default 'web',
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------- RLS

alter table profiles       enable row level security;
alter table compound_notes enable row level security;
alter table protocols      enable row level security;
alter table protocol_items enable row level security;
alter table waitlist       enable row level security;

create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "own notes" on compound_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own protocols" on protocols
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Protocol items inherit ownership through their parent protocol.
create policy "own protocol items" on protocol_items
  for all using (
    exists (select 1 from protocols p where p.id = protocol_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from protocols p where p.id = protocol_id and p.user_id = auth.uid())
  );

-- Anyone may join the waitlist. Nobody may read it from the client.
create policy "anyone may join waitlist" on waitlist for insert with check (true);
