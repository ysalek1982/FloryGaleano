-- Correct the profile role guard so client sessions cannot self-promote through
-- a SECURITY DEFINER current_user shortcut, and repair Spanish category text.

create or replace function public.prevent_profile_role_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    if coalesce(auth.role(), '') = 'service_role'
      or session_user in ('postgres', 'supabase_admin')
      or public.is_super_admin()
    then
      return new;
    end if;
    raise exception 'Profile role changes require administrator privileges';
  end if;
  return new;
end;
$$;

update public.food_categories set
  name_es = case code
    when 'proteins' then U&'Prote\00EDnas'
    when 'seafood' then 'Mariscos y pescados'
    when 'vegetables' then 'Verduras y vegetales'
    when 'fruits' then 'Frutas'
    when 'grains_starches' then 'Cereales y almidones'
    when 'gluten_free_bases' then 'Bases sin gluten'
    when 'legumes' then 'Legumbres'
    when 'dairy_alternatives' then U&'L\00E1cteos y alternativas'
    when 'fats_oils' then 'Grasas y aceites'
    when 'nuts_seeds' then 'Frutos secos y semillas'
    when 'herbs_spices' then 'Hierbas y especias'
    when 'sauces_condiments' then 'Salsas y condimentos'
    when 'beverages' then 'Bebidas'
    when 'bakery' then U&'Panader\00EDa'
    when 'snacks' then 'Snacks / meriendas'
    when 'processed_packaged' then 'Procesados y empacados'
    when 'sweeteners' then 'Endulzantes'
    when 'other' then 'Otros'
    else name_es
  end,
  aliases_es = case code
    when 'proteins' then array[U&'prote\00EDna',U&'prote\00EDnas','carne','pollo','pavo']
    when 'seafood' then array['pescado',U&'salm\00F3n','salmon','mariscos']
    when 'grains_starches' then array['cereal','cereales','arroz',U&'almid\00F3n','almidon','papa']
    when 'dairy_alternatives' then array[U&'l\00E1cteo','lacteo','leche','queso','yogur','alternativa']
    when 'nuts_seeds' then array['frutos secos','nueces','semillas','almendras',U&'s\00E9samo','sesamo']
    else aliases_es
  end,
  updated_at = now()
where code in (
  'proteins',
  'seafood',
  'vegetables',
  'fruits',
  'grains_starches',
  'gluten_free_bases',
  'legumes',
  'dairy_alternatives',
  'fats_oils',
  'nuts_seeds',
  'herbs_spices',
  'sauces_condiments',
  'beverages',
  'bakery',
  'snacks',
  'processed_packaged',
  'sweeteners',
  'other'
);
