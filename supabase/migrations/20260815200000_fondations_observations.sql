-- ============================================================================
-- FONDATIONS MOBILIS — première migration (DEP-006 levée le 15 août 2026)
-- Périmètre volontairement minimal : le chemin critique est DEP-004 (relevés
-- terrain). Cette migration crée le réceptacle des observations de prix,
-- anonyme par conception, avec modération (CDC §M4).
-- Les grilles tarifaires versionnées (basis/sourceRef) et les statuts
-- d'agrément (invariant I4) viendront par migrations dédiées.
-- ============================================================================

-- Géographie (exigence DEP-006 : PostGIS disponible dès la fondation).
create extension if not exists postgis;

-- ----------------------------------------------------------------------------
-- Observations de prix (relevés terrain + contributions de l'application).
-- ANONYME PAR CONCEPTION : aucune colonne d'identité, de téléphone ou
-- d'appareil. Une origine et une destination de COMMUNE (granularité grossière,
-- 21 valeurs) ne constituent pas un trajet individuel traçable.
-- ----------------------------------------------------------------------------
create table public.fare_observations (
  id uuid primary key default gen_random_uuid(),
  observed_at timestamptz not null default now(),
  from_commune text not null,
  to_commune text not null,
  mode text not null check (mode in ('VTC', 'TAXI', 'WORO', 'GBAKA')),
  -- Bornes larges : le filtrage fin (aberrations) est un traitement de
  -- modération, pas une contrainte de base (CDC M4 : détection d'aberrations).
  price_xof integer not null check (price_xof between 100 and 100000),
  rush_hour boolean,
  comment text check (char_length(comment) <= 280),
  source text not null default 'app' check (source in ('app', 'import')),
  -- Toute observation naît en attente : rien n'est publié sans modération.
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  constraint communes_distinctes check (from_commune <> to_commune)
);

comment on table public.fare_observations is
  'Prix réellement payés (relevés terrain DEP-004 et contributions M4). Anonyme par conception ; modéré avant publication.';

-- ----------------------------------------------------------------------------
-- RLS : la clé publishable (navigateur) ne peut QUE déposer une observation
-- en attente, et lire les observations approuvées. La modération passe par
-- une clé serveur (jamais côté client).
-- ----------------------------------------------------------------------------
alter table public.fare_observations enable row level security;

create policy "depot_anonyme_en_attente"
  on public.fare_observations
  for insert
  to anon
  with check (source = 'app' and status = 'PENDING');

create policy "lecture_des_approuvees"
  on public.fare_observations
  for select
  to anon
  using (status = 'APPROVED');

-- Anti-abus (CDC M4) : la limitation de débit fine viendra par Edge Function ;
-- en attendant, aucune lecture des dépôts en attente n'est possible côté
-- client, ce qui retire tout intérêt à l'énumération.
