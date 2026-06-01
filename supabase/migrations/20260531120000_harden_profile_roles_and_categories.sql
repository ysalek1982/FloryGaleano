-- Harden profile role assignment and repair Spanish category seed text.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    new.email,
    'chef',
    case
      when new.raw_user_meta_data ->> 'preferred_language' in ('en','es')
        then new.raw_user_meta_data ->> 'preferred_language'
      else 'en'
    end
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_profile_role_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role then
    if current_user in ('service_role', 'postgres', 'supabase_admin') or public.is_super_admin() then
      return new;
    end if;
    raise exception 'Profile role changes require administrator privileges';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_client_update on public.profiles;
create trigger prevent_profile_role_client_update
  before update of role on public.profiles
  for each row execute function public.prevent_profile_role_client_update();

update public.food_categories set
  name_es = case code
    when 'proteins' then 'Proteínas'
    when 'seafood' then 'Mariscos y pescados'
    when 'vegetables' then 'Verduras y vegetales'
    when 'fruits' then 'Frutas'
    when 'grains_starches' then 'Cereales y almidones'
    when 'gluten_free_bases' then 'Bases sin gluten'
    when 'legumes' then 'Legumbres'
    when 'dairy_alternatives' then 'Lácteos y alternativas'
    when 'fats_oils' then 'Grasas y aceites'
    when 'nuts_seeds' then 'Frutos secos y semillas'
    when 'herbs_spices' then 'Hierbas y especias'
    when 'sauces_condiments' then 'Salsas y condimentos'
    when 'beverages' then 'Bebidas'
    when 'bakery' then 'Panadería'
    when 'snacks' then 'Snacks / meriendas'
    when 'processed_packaged' then 'Procesados y empacados'
    when 'sweeteners' then 'Endulzantes'
    when 'other' then 'Otros'
    else name_es
  end,
  aliases_es = case code
    when 'proteins' then array['proteína','proteínas','carne','pollo','pavo']
    when 'seafood' then array['pescado','salmón','salmon','mariscos']
    when 'grains_starches' then array['cereal','cereales','arroz','almidón','almidon','papa']
    when 'dairy_alternatives' then array['lácteo','lacteo','leche','queso','yogur','alternativa']
    when 'nuts_seeds' then array['frutos secos','nueces','semillas','almendras','sésamo','sesamo']
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
