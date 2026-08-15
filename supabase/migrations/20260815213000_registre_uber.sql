-- Registre I4 — Uber : inscrit pour mémoire, JAMAIS publié.
-- Uber a cessé ses activités en Côte d'Ivoire le 25/09/2025 (CDC v1.0 §2,
-- sources publiques). L'afficher comme option de comparaison serait une
-- donnée inventée ; il reste au registre pour tracer l'historique du marché.
insert into public.operators
  (id, label, mode, agrement_status, status_verified_at, status_source, status_verified_by, published)
values
  ('uber', 'Uber', 'VTC', 'INCONNU', '2026-08-01',
   'A cessé ses activités en CI le 25/09/2025 — CDC v1.0 §2, sources publiques août 2026',
   'reprise CDC', false);
