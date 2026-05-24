-- Smart Family Meals initial schema.
-- Order is intentional: tables first, then trigger/helper functions, then RLS, policies and indexes.

create extension if not exists pgcrypto;

-- Base tables

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'chef' check (role in ('super_admin','chef','family_admin','viewer')),
  preferred_language text not null default 'en' check (preferred_language in ('en','es')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  address text,
  notes text,
  owner_id uuid references public.profiles(id) on delete set null,
  chef_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_users (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('chef','family_admin','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, profile_id)
);

create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  nickname text,
  birth_date date,
  age_years numeric,
  gender text,
  height_cm numeric,
  weight_kg numeric,
  activity_level text check (activity_level in ('low','moderate','high','athlete')),
  portion_factor numeric not null default 1.0,
  daily_calorie_target numeric,
  daily_protein_target_g numeric,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.allergies (
  id uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  allergen_name text not null,
  normalized_allergen_name text not null,
  severity text check (severity in ('mild','moderate','severe','anaphylaxis')),
  reaction_notes text,
  avoid_traces boolean not null default false,
  cross_contact_risk boolean not null default true,
  emergency_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dietary_restrictions (
  id uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  restriction_type text,
  description text,
  is_medical boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.food_preferences (
  id uuid primary key default gen_random_uuid(),
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  preference_type text check (preference_type in ('likes','dislikes','avoid','favorite')),
  item_name text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  family_id uuid references public.families(id) on delete cascade,
  scope text not null default 'owner' check (scope in ('global','owner','family')),
  name text not null,
  normalized_name text not null,
  category text,
  default_unit text not null default 'g',
  calories_per_100g numeric not null default 0,
  protein_g_per_100g numeric not null default 0,
  carbs_g_per_100g numeric not null default 0,
  fat_g_per_100g numeric not null default 0,
  fiber_g_per_100g numeric not null default 0,
  sugar_g_per_100g numeric not null default 0,
  sodium_mg_per_100g numeric not null default 0,
  calcium_mg_per_100g numeric,
  iron_mg_per_100g numeric,
  contains_gluten boolean not null default false,
  contains_dairy boolean not null default false,
  contains_egg boolean not null default false,
  contains_fish boolean not null default false,
  contains_shellfish boolean not null default false,
  contains_tree_nuts boolean not null default false,
  contains_peanuts boolean not null default false,
  contains_sesame boolean not null default false,
  contains_soy boolean not null default false,
  allergen_tags text[] not null default '{}',
  may_contain_tags text[] not null default '{}',
  allowed_exceptions text[] not null default '{}',
  blocked_derivatives text[] not null default '{}',
  source text not null default 'manual',
  external_source_id text,
  cost_per_unit numeric,
  package_size numeric,
  package_unit text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  family_id uuid references public.families(id) on delete set null,
  scope text not null default 'owner' check (scope in ('global','owner','family')),
  name text not null,
  description text,
  category text,
  cuisine_type text,
  main_protein text,
  meal_style text,
  prep_time_minutes int not null default 0,
  cook_time_minutes int not null default 0,
  servings numeric not null default 1 check (servings > 0),
  serving_size_g numeric,
  instructions text,
  reheating_instructions text,
  chef_notes text,
  is_freezer_friendly boolean not null default false,
  is_school_friendly boolean not null default false,
  is_gluten_free boolean not null default false,
  visible_melted_cheese boolean not null default false,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  image_url text,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id),
  quantity_g numeric not null check (quantity_g > 0),
  display_quantity text,
  is_optional boolean not null default false,
  preparation_note text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.recipe_nutrition_cache (
  recipe_id uuid primary key references public.recipes(id) on delete cascade,
  total_weight_g numeric,
  total_calories numeric,
  total_protein_g numeric,
  total_carbs_g numeric,
  total_fat_g numeric,
  total_fiber_g numeric,
  total_sugar_g numeric,
  total_sodium_mg numeric,
  calories_per_serving numeric,
  protein_g_per_serving numeric,
  carbs_g_per_serving numeric,
  fat_g_per_serving numeric,
  calculated_at timestamptz not null default now()
);

create table public.menu_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text,
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft','planned','approved','completed')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_plan_items (
  id uuid primary key default gen_random_uuid(),
  menu_plan_id uuid not null references public.menu_plans(id) on delete cascade,
  family_member_id uuid references public.family_members(id),
  recipe_id uuid references public.recipes(id),
  planned_date date not null,
  meal_time text check (meal_time in ('breakfast','school_lunch','lunch','snack','sport_snack','dinner','evening_snack')),
  servings numeric not null default 1,
  portion_factor numeric not null default 1,
  planned_grams numeric,
  calories numeric,
  protein_g numeric,
  allergy_status text check (allergy_status in ('safe','review_needed','blocked')),
  variety_status text check (variety_status in ('allowed','warning','blocked')),
  notes text,
  override_reason text,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pantry_inventory (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id),
  quantity_available numeric not null default 0,
  unit text not null default 'g',
  min_quantity_alert numeric not null default 0,
  expiration_date date,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.freezer_inventory (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  recipe_id uuid references public.recipes(id),
  prepared_date date,
  expiration_date date,
  portions_available numeric not null default 0,
  grams_per_portion numeric,
  reheating_instructions text,
  storage_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  menu_plan_id uuid references public.menu_plans(id),
  name text,
  status text not null default 'draft' check (status in ('draft','active','purchased')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists(id) on delete cascade,
  ingredient_id uuid references public.ingredients(id),
  required_quantity numeric,
  available_quantity numeric not null default 0,
  missing_quantity numeric,
  unit text not null default 'g',
  is_checked boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  family_member_id uuid references public.family_members(id),
  type text,
  severity text check (severity in ('info','warning','critical')),
  title text,
  message text,
  related_table text,
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  gemini_enabled boolean not null default false,
  ai_model text not null default 'gemini-2.5-flash',
  default_variety_days int not null default 21,
  default_units text not null default 'metric',
  default_language text not null default 'en',
  theme text not null default 'light',
  nutrition_low_threshold_pct numeric not null default 0.85,
  allergy_strictness text not null default 'strict' check (allergy_strictness in ('standard','strict')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated_at trigger function and triggers

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger families_updated_at before update on public.families for each row execute function public.set_updated_at();
create trigger family_users_updated_at before update on public.family_users for each row execute function public.set_updated_at();
create trigger family_members_updated_at before update on public.family_members for each row execute function public.set_updated_at();
create trigger allergies_updated_at before update on public.allergies for each row execute function public.set_updated_at();
create trigger ingredients_updated_at before update on public.ingredients for each row execute function public.set_updated_at();
create trigger recipes_updated_at before update on public.recipes for each row execute function public.set_updated_at();
create trigger menu_plans_updated_at before update on public.menu_plans for each row execute function public.set_updated_at();
create trigger menu_plan_items_updated_at before update on public.menu_plan_items for each row execute function public.set_updated_at();
create trigger pantry_inventory_updated_at before update on public.pantry_inventory for each row execute function public.set_updated_at();
create trigger freezer_inventory_updated_at before update on public.freezer_inventory for each row execute function public.set_updated_at();
create trigger shopping_lists_updated_at before update on public.shopping_lists for each row execute function public.set_updated_at();
create trigger app_settings_updated_at before update on public.app_settings for each row execute function public.set_updated_at();

-- Security helper functions. All referenced tables already exist above.

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'super_admin', false)
$$;

create or replace function public.is_family_chef(family_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.families f
    where f.id = family_uuid
      and (f.owner_id = auth.uid() or f.chef_id = auth.uid())
  )
  or exists (
    select 1
    from public.family_users fu
    where fu.family_id = family_uuid
      and fu.profile_id = auth.uid()
      and fu.role = 'chef'
  )
$$;

create or replace function public.is_family_admin(family_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.families f
    where f.id = family_uuid
      and f.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.family_users fu
    where fu.family_id = family_uuid
      and fu.profile_id = auth.uid()
      and fu.role = 'family_admin'
  )
$$;

create or replace function public.can_access_family(family_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_super_admin()
    or public.is_family_chef(family_uuid)
    or public.is_family_admin(family_uuid)
    or exists (
      select 1
      from public.family_users fu
      where fu.family_id = family_uuid
        and fu.profile_id = auth.uid()
        and fu.role in ('chef','family_admin','viewer')
    )
    or exists (
      select 1
      from public.family_members fm
      where fm.family_id = family_uuid
        and fm.profile_id = auth.uid()
    ),
    false
  )
$$;

create or replace function public.can_write_family(family_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_super_admin()
    or public.is_family_chef(family_uuid)
    or public.is_family_admin(family_uuid),
    false
  )
$$;

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
    case
      when new.raw_user_meta_data ->> 'role' in ('super_admin','chef','family_admin','viewer')
        then new.raw_user_meta_data ->> 'role'
      else 'chef'
    end,
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_users enable row level security;
alter table public.family_members enable row level security;
alter table public.allergies enable row level security;
alter table public.dietary_restrictions enable row level security;
alter table public.food_preferences enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_nutrition_cache enable row level security;
alter table public.menu_plans enable row level security;
alter table public.menu_plan_items enable row level security;
alter table public.pantry_inventory enable row level security;
alter table public.freezer_inventory enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.alerts enable row level security;
alter table public.app_settings enable row level security;

-- RLS policies. All referenced helper functions already exist above.

create policy profiles_select on public.profiles for select using (public.is_super_admin() or id = auth.uid());
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update using (public.is_super_admin() or id = auth.uid()) with check (public.is_super_admin() or id = auth.uid());

create policy families_select on public.families for select using (public.can_access_family(id));
create policy families_insert on public.families for insert with check (public.is_super_admin() or owner_id = auth.uid() or chef_id = auth.uid());
create policy families_update on public.families for update using (public.can_write_family(id)) with check (public.can_write_family(id));
create policy families_delete on public.families for delete using (public.is_super_admin() or owner_id = auth.uid());

create policy family_users_access on public.family_users for all using (public.can_access_family(family_id)) with check (public.can_write_family(family_id));

create policy family_members_access on public.family_members for all using (public.can_access_family(family_id)) with check (public.can_write_family(family_id) or profile_id = auth.uid());

create policy allergies_access on public.allergies for all using (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_access_family(fm.family_id))
) with check (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_write_family(fm.family_id))
);

create policy dietary_restrictions_access on public.dietary_restrictions for all using (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_access_family(fm.family_id))
) with check (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_write_family(fm.family_id))
);

create policy food_preferences_access on public.food_preferences for all using (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_access_family(fm.family_id))
) with check (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_write_family(fm.family_id))
);

create policy ingredients_access on public.ingredients for all using (
  scope = 'global'
  or public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_access_family(family_id))
) with check (
  public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_write_family(family_id))
);

create policy recipes_access on public.recipes for all using (
  scope = 'global'
  or public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_access_family(family_id))
) with check (
  public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_write_family(family_id))
);

create policy recipe_ingredients_access on public.recipe_ingredients for all using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (r.scope = 'global' or public.is_super_admin() or r.owner_id = auth.uid() or (r.family_id is not null and public.can_access_family(r.family_id)))
  )
) with check (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (public.is_super_admin() or r.owner_id = auth.uid() or (r.family_id is not null and public.can_write_family(r.family_id)))
  )
);

create policy recipe_nutrition_cache_access on public.recipe_nutrition_cache for all using (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (r.scope = 'global' or public.is_super_admin() or r.owner_id = auth.uid() or (r.family_id is not null and public.can_access_family(r.family_id)))
  )
) with check (
  exists (
    select 1
    from public.recipes r
    where r.id = recipe_id
      and (public.is_super_admin() or r.owner_id = auth.uid() or (r.family_id is not null and public.can_write_family(r.family_id)))
  )
);

create policy menu_plans_access on public.menu_plans for all using (public.can_access_family(family_id)) with check (public.can_write_family(family_id));

create policy menu_plan_items_access on public.menu_plan_items for all using (
  exists (select 1 from public.menu_plans mp where mp.id = menu_plan_id and public.can_access_family(mp.family_id))
) with check (
  exists (select 1 from public.menu_plans mp where mp.id = menu_plan_id and public.can_write_family(mp.family_id))
);

create policy pantry_inventory_access on public.pantry_inventory for all using (public.can_access_family(family_id)) with check (public.can_write_family(family_id));
create policy freezer_inventory_access on public.freezer_inventory for all using (public.can_access_family(family_id)) with check (public.can_write_family(family_id));
create policy shopping_lists_access on public.shopping_lists for all using (public.can_access_family(family_id)) with check (public.can_write_family(family_id));

create policy shopping_list_items_access on public.shopping_list_items for all using (
  exists (select 1 from public.shopping_lists sl where sl.id = shopping_list_id and public.can_access_family(sl.family_id))
) with check (
  exists (select 1 from public.shopping_lists sl where sl.id = shopping_list_id and public.can_write_family(sl.family_id))
);

create policy alerts_access on public.alerts for all using (public.can_access_family(family_id)) with check (public.can_write_family(family_id));
create policy app_settings_access on public.app_settings for all using (public.is_super_admin() or owner_id = auth.uid()) with check (public.is_super_admin() or owner_id = auth.uid());

-- Indexes

create index profiles_role_idx on public.profiles(role);
create index families_owner_id_idx on public.families(owner_id);
create index families_chef_id_idx on public.families(chef_id);
create index family_users_family_id_idx on public.family_users(family_id);
create index family_users_profile_id_idx on public.family_users(profile_id);
create index family_members_family_id_idx on public.family_members(family_id);
create index family_members_profile_id_idx on public.family_members(profile_id);
create index allergies_family_member_id_idx on public.allergies(family_member_id);
create index dietary_restrictions_family_member_id_idx on public.dietary_restrictions(family_member_id);
create index food_preferences_family_member_id_idx on public.food_preferences(family_member_id);
create index ingredients_owner_id_idx on public.ingredients(owner_id);
create index ingredients_family_id_idx on public.ingredients(family_id);
create index ingredients_scope_idx on public.ingredients(scope);
create index recipes_owner_id_idx on public.recipes(owner_id);
create index recipes_family_id_idx on public.recipes(family_id);
create index recipes_scope_idx on public.recipes(scope);
create index recipe_ingredients_recipe_id_idx on public.recipe_ingredients(recipe_id);
create index recipe_ingredients_ingredient_id_idx on public.recipe_ingredients(ingredient_id);
create index menu_plans_family_id_idx on public.menu_plans(family_id);
create index menu_plan_items_plan_id_idx on public.menu_plan_items(menu_plan_id);
create index menu_plan_items_recipe_id_idx on public.menu_plan_items(recipe_id);
create index pantry_inventory_family_id_idx on public.pantry_inventory(family_id);
create index freezer_inventory_family_id_idx on public.freezer_inventory(family_id);
create index shopping_lists_family_id_idx on public.shopping_lists(family_id);
create index shopping_list_items_shopping_list_id_idx on public.shopping_list_items(shopping_list_id);
create index alerts_family_id_idx on public.alerts(family_id);
