-- Jetons de modération — l'écran /moderation s'authentifie par jeton.
-- Seule l'EMPREINTE SHA-256 vit en base : le jeton en clair n'est ni stocké
-- ni committé. Aucune politique RLS anon : la table est invisible du
-- navigateur ; seule l'Edge Function (clé serveur) la lit.
create table public.moderation_tokens (
  id uuid primary key default gen_random_uuid(),
  token_sha256 text not null unique,
  label text not null,
  active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.moderation_tokens enable row level security;
-- (aucune policy : ni lecture ni écriture par la clé navigateur)

-- L'insertion du premier jeton se fait hors dépôt (empreinte seulement).
