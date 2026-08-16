-- Configuration de l'assistant IA (DEP-010) — une seule ligne « default ».
-- La clé d'API du fournisseur est stockée ici et JAMAIS exposée au client :
-- RLS activée sans aucune politique => seul le service role (fonctions serveur)
-- peut lire ou écrire. L'écran admin passe par l'Edge Function `assistant`,
-- authentifiée par jeton de modérateur (empreinte SHA-256).
create table if not exists public.assistant_config (
  id text primary key default 'default' check (id = 'default'),
  api_key text not null,
  model text not null default 'kimi-latest',
  base_url text not null default 'https://api.moonshot.ai/v1',
  updated_at timestamptz not null default now()
);

alter table public.assistant_config enable row level security;
