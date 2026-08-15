-- ============================================================================
-- OPÉRATEURS ET STATUT D'AGRÉMENT — invariant I4 (CDC §5)
-- « Aucun agrément en dur. Il vit en base, daté, sourcé, avec auteur de
-- vérification. » L'application ne connaît AUCUN nom d'opérateur dans son
-- code : elle lit cette table, qui ne publie que ce qui est vérifié.
--
-- Règle CDC §4 : InDrive est INTERNAL_ONLY (non agréé, sous menace de
-- sanction ARTI) — publication conditionnée à une vérification écrite
-- ARTI/DGTTC. Il est donc semé avec published = false.
-- ============================================================================

create table public.operators (
  id text primary key,
  label text not null,
  mode text not null check (mode in ('VTC', 'TAXI', 'WORO', 'GBAKA')),
  agrement_status text not null check (agrement_status in ('AGREE', 'NON_AGREE', 'INCONNU')),
  status_verified_at date,
  status_source text,
  status_verified_by text,
  -- Interrupteur de publication : rien ne s'affiche sans décision explicite.
  published boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.operators is
  'Opérateurs et statut d''agrément (invariant I4) : daté, sourcé, avec auteur. published=false = INTERNAL_ONLY.';

alter table public.operators enable row level security;

-- La clé navigateur ne voit que les opérateurs explicitement publiés.
create policy "lecture_des_publies"
  on public.operators
  for select
  to anon
  using (published = true);

-- Semis initial — sources publiques consolidées par le CDC v1.0 §2 (août 2026).
insert into public.operators
  (id, label, mode, agrement_status, status_verified_at, status_source, status_verified_by, published)
values
  ('yango',  'Yango',  'VTC', 'AGREE',     '2026-08-01', 'CDC v1.0 §2 — plateformes agréées, sources publiques août 2026', 'reprise CDC', true),
  ('heetch', 'Heetch', 'VTC', 'AGREE',     '2026-08-01', 'CDC v1.0 §2 — plateformes agréées, sources publiques août 2026', 'reprise CDC', true),
  ('indrive','InDrive','VTC', 'NON_AGREE', '2026-08-01', 'CDC v1.0 §2/§4 — non agréé, sous menace de sanction ARTI',        'reprise CDC', false);
