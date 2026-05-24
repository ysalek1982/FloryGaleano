-- User-level Gemini BYOK settings and predefined food categories.

create table if not exists public.user_ai_settings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'gemini',
  model text not null default 'gemini-2.5-flash',
  is_enabled boolean not null default false,
  key_storage_method text not null default 'encrypted',
  vault_secret_id uuid,
  encrypted_key text,
  key_iv text,
  key_last4 text,
  key_status text not null default 'not_configured' check (key_status in ('not_configured','valid','invalid','test_failed','deleted')),
  last_tested_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, provider)
);

create table if not exists public.food_categories (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  parent_code text,
  name_en text not null,
  name_es text not null,
  description_en text,
  description_es text,
  icon text,
  color text,
  aliases_en text[] not null default '{}',
  aliases_es text[] not null default '{}',
  usda_category_hints text[] not null default '{}',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ingredients add column if not exists category_id uuid references public.food_categories(id) on delete set null;

create index if not exists user_ai_settings_profile_provider_idx on public.user_ai_settings(profile_id, provider);
create index if not exists food_categories_code_idx on public.food_categories(code);
create index if not exists food_categories_active_sort_idx on public.food_categories(is_active, sort_order);
create index if not exists ingredients_category_id_idx on public.ingredients(category_id);

drop trigger if exists user_ai_settings_updated_at on public.user_ai_settings;
create trigger user_ai_settings_updated_at before update on public.user_ai_settings for each row execute function public.set_updated_at();

drop trigger if exists food_categories_updated_at on public.food_categories;
create trigger food_categories_updated_at before update on public.food_categories for each row execute function public.set_updated_at();

alter table public.user_ai_settings enable row level security;
alter table public.food_categories enable row level security;

revoke all on public.user_ai_settings from anon, authenticated;
grant all on public.user_ai_settings to service_role;

grant select on public.food_categories to anon, authenticated;
grant all on public.food_categories to service_role;

drop policy if exists food_categories_select on public.food_categories;
drop policy if exists food_categories_manage on public.food_categories;
create policy food_categories_select on public.food_categories for select using (is_active or public.is_super_admin());
create policy food_categories_manage on public.food_categories for all using (public.is_super_admin()) with check (public.is_super_admin());

insert into public.food_categories (
  code,
  name_en,
  name_es,
  aliases_en,
  aliases_es,
  usda_category_hints,
  icon,
  color,
  sort_order
) values
  ('proteins', 'Proteins', 'Proteínas', array['meat','beef','chicken','turkey','poultry','protein'], array['proteina','proteínas','carne','pollo','pavo'], array['meat','poultry','protein foods'], 'drumstick', '#0f766e', 10),
  ('seafood', 'Seafood', 'Mariscos y pescados', array['fish','salmon','shellfish','seafood'], array['pescado','salmón','salmon','mariscos'], array['seafood','finfish and shellfish products'], 'fish', '#0284c7', 20),
  ('vegetables', 'Vegetables', 'Verduras y vegetales', array['vegetable','veggie','greens','tomato','cucumber'], array['verdura','verduras','vegetal','vegetales','tomate','pepino'], array['vegetables and vegetable products'], 'carrot', '#16a34a', 30),
  ('fruits', 'Fruits', 'Frutas', array['fruit','berries','banana','apple','mango'], array['fruta','frutas','bayas','banano','banana','manzana','mango'], array['fruits and fruit juices'], 'apple', '#dc2626', 40),
  ('grains_starches', 'Grains & Starches', 'Cereales y almidones', array['grain','rice','starch','potato','cereal'], array['cereal','cereales','arroz','almidón','almidon','papa'], array['cereal grains and pasta'], 'wheat', '#ca8a04', 50),
  ('gluten_free_bases', 'Gluten-Free Bases', 'Bases sin gluten', array['gluten free','gluten-free','gf flour','cassava','tapioca'], array['sin gluten','harina sin gluten','yuca','tapioca'], array['gluten free'], 'shield-check', '#65a30d', 60),
  ('legumes', 'Legumes', 'Legumbres', array['legume','lentil','beans','chickpea'], array['legumbre','legumbres','lenteja','frijol','garbanzo'], array['legumes and legume products'], 'sprout', '#15803d', 70),
  ('dairy_alternatives', 'Dairy & Alternatives', 'Lácteos y alternativas', array['dairy','milk','cheese','yogurt','alternative'], array['lácteo','lacteo','leche','queso','yogur','alternativa'], array['dairy and egg products'], 'milk', '#7c3aed', 80),
  ('fats_oils', 'Fats & Oils', 'Grasas y aceites', array['fat','oil','olive oil','sunflower oil'], array['grasa','aceite','aceite de oliva','aceite de girasol'], array['fats and oils'], 'droplet', '#f59e0b', 90),
  ('nuts_seeds', 'Nuts & Seeds', 'Frutos secos y semillas', array['nuts','seeds','almonds','sesame','sunflower seeds'], array['frutos secos','nueces','semillas','almendras','sésamo','sesamo'], array['nut and seed products'], 'nut', '#92400e', 100),
  ('herbs_spices', 'Herbs & Spices', 'Hierbas y especias', array['herb','spice','seasoning'], array['hierba','hierbas','especia','especias','condimento'], array['spices and herbs'], 'leaf', '#4d7c0f', 110),
  ('sauces_condiments', 'Sauces & Condiments', 'Salsas y condimentos', array['sauce','condiment','tahini','tomato sauce','spread'], array['salsa','salsas','condimento','tahini','aderezo'], array['soups sauces and gravies'], 'jar', '#ea580c', 120),
  ('beverages', 'Beverages', 'Bebidas', array['beverage','drink','juice'], array['bebida','bebidas','jugo'], array['beverages'], 'cup-soda', '#0891b2', 130),
  ('bakery', 'Bakery', 'Panadería', array['bakery','bread','muffin','baked'], array['panadería','panaderia','pan','muffin','horneado'], array['baked products'], 'croissant', '#b45309', 140),
  ('snacks', 'Snacks', 'Snacks / meriendas', array['snack','lunchbox','treat'], array['snack','snacks','merienda','meriendas'], array['snacks'], 'cookie', '#db2777', 150),
  ('processed_packaged', 'Processed & Packaged', 'Procesados y empacados', array['processed','packaged','pepperoni'], array['procesado','procesados','empacado','empacados','pepperoni'], array['sausages and luncheon meats'], 'package', '#64748b', 160),
  ('sweeteners', 'Sweeteners', 'Endulzantes', array['sweetener','sugar','honey','syrup'], array['endulzante','azúcar','azucar','miel','jarabe'], array['sweets'], 'candy', '#e11d48', 170),
  ('other', 'Other', 'Otros', array['other','miscellaneous','unknown'], array['otro','otros','misceláneo','miscelaneo','desconocido'], array[]::text[], 'circle', '#78716c', 999)
on conflict (code) do update set
  name_en = excluded.name_en,
  name_es = excluded.name_es,
  aliases_en = excluded.aliases_en,
  aliases_es = excluded.aliases_es,
  usda_category_hints = excluded.usda_category_hints,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

update public.ingredients i
set category_id = fc.id
from public.food_categories fc
where i.category_id is null
  and lower(coalesce(i.category, '')) in (lower(fc.code), lower(fc.name_en), lower(fc.name_es));

update public.ingredients i
set category_id = fc.id
from public.food_categories fc
where i.category_id is null
  and fc.code = case
    when lower(i.name) similar to '%(beef|turkey|chicken|pepperoni|burger)%' then 'proteins'
    when lower(i.name) similar to '%(salmon|fish|lobster|oyster|shrimp)%' then 'seafood'
    when lower(i.name) similar to '%(tomato|cucumber|vegetable|sweet potato)%' then 'vegetables'
    when lower(i.name) similar to '%(banana|apple|strawberry|blueberry|mango|fruit)%' then 'fruits'
    when lower(i.name) similar to '%(rice|wheat|barley|rye|potato)%' then 'grains_starches'
    when lower(i.name) similar to '%(gluten-free|gluten free|gf flour)%' then 'gluten_free_bases'
    when lower(i.name) similar to '%(lentil|bean|chickpea)%' then 'legumes'
    when lower(i.name) similar to '%(oil|lecithin|fat)%' then 'fats_oils'
    when lower(i.name) similar to '%(almond|sesame|seed|sunflower)%' then 'nuts_seeds'
    when lower(i.name) similar to '%(sauce|tahini|condiment)%' then 'sauces_condiments'
    when lower(i.name) similar to '%(flour|bread|muffin|bakery)%' then 'bakery'
    else 'other'
  end;
