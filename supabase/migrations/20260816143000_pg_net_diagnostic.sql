-- pg_net : appels HTTP sortants depuis la base — utilisé pour les diagnostics
-- serveur (tester la clé IA sans qu'elle ne quitte jamais Supabase).
create extension if not exists pg_net;
