-- Couleur de marque des opérateurs — pour l'affichage nominatif descriptif.
-- En base comme le reste du registre I4 : le code ne connaît ni nom ni couleur.
alter table public.operators add column brand_color text;

update public.operators set brand_color = '#FC3F1D' where id = 'yango';   -- rouge Yango
update public.operators set brand_color = '#F52D56' where id = 'heetch';  -- rose Heetch
-- indrive / uber : non publiés, pas de couleur nécessaire.
