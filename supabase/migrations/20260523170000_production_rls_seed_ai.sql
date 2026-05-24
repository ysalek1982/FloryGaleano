-- Production hardening for Smart Family Meals:
-- role-aware family membership, scoped catalogs, auth profile bootstrap, and per-user demo seed RPC.

alter table public.family_members add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.ingredients add column if not exists family_id uuid references public.families(id) on delete cascade;
alter table public.ingredients add column if not exists scope text not null default 'owner' check (scope in ('global','owner','family'));
alter table public.recipes add column if not exists scope text not null default 'owner' check (scope in ('global','owner','family'));
alter table public.recipes add column if not exists ai_generated boolean not null default false;
alter table public.recipes add column if not exists reheating_instructions text;
alter table public.recipes add column if not exists chef_notes text;
alter table public.menu_plan_items add column if not exists ai_generated boolean not null default false;
alter table public.app_settings alter column ai_model set default 'gemini-2.5-flash';
alter table public.app_settings add column if not exists theme text not null default 'light';
alter table public.app_settings add column if not exists nutrition_low_threshold_pct numeric not null default 0.85;
alter table public.app_settings add column if not exists allergy_strictness text not null default 'strict' check (allergy_strictness in ('standard','strict'));

create table if not exists public.family_users (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('chef','family_admin','viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, profile_id)
);

create index if not exists family_users_family_id_idx on public.family_users(family_id);
create index if not exists family_users_profile_id_idx on public.family_users(profile_id);
create index if not exists family_members_profile_id_idx on public.family_members(profile_id);
create index if not exists ingredients_family_id_idx on public.ingredients(family_id);
create index if not exists ingredients_scope_idx on public.ingredients(scope);
create index if not exists recipes_scope_idx on public.recipes(scope);

drop trigger if exists family_users_updated_at on public.family_users;
create trigger family_users_updated_at before update on public.family_users for each row execute function public.set_updated_at();

alter table public.family_users enable row level security;

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
      and (f.chef_id = auth.uid() or f.owner_id = auth.uid())
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists family_users_access on public.family_users;
drop policy if exists family_users_select on public.family_users;
drop policy if exists family_users_insert on public.family_users;
drop policy if exists family_users_update on public.family_users;
drop policy if exists family_users_delete on public.family_users;
create policy family_users_select on public.family_users for select using (public.can_access_family(family_id));
create policy family_users_insert on public.family_users for insert with check (public.can_write_family(family_id));
create policy family_users_update on public.family_users for update using (public.can_write_family(family_id)) with check (public.can_write_family(family_id));
create policy family_users_delete on public.family_users for delete using (public.can_write_family(family_id));

drop policy if exists families_select on public.families;
drop policy if exists families_insert on public.families;
drop policy if exists families_update on public.families;
drop policy if exists families_delete on public.families;
create policy families_select on public.families for select using (public.can_access_family(id));
create policy families_insert on public.families for insert with check (public.is_super_admin() or owner_id = auth.uid() or chef_id = auth.uid());
create policy families_update on public.families for update using (public.can_write_family(id)) with check (public.can_write_family(id));
create policy families_delete on public.families for delete using (public.is_super_admin() or owner_id = auth.uid());

drop policy if exists family_members_access on public.family_members;
create policy family_members_select on public.family_members for select using (public.can_access_family(family_id));
create policy family_members_insert on public.family_members for insert with check (public.can_write_family(family_id));
create policy family_members_update on public.family_members for update using (public.can_write_family(family_id) or profile_id = auth.uid()) with check (public.can_write_family(family_id) or profile_id = auth.uid());
create policy family_members_delete on public.family_members for delete using (public.can_write_family(family_id));

drop policy if exists allergies_access on public.allergies;
create policy allergies_select on public.allergies for select using (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_access_family(fm.family_id))
);
create policy allergies_insert on public.allergies for insert with check (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_write_family(fm.family_id))
);
create policy allergies_update on public.allergies for update using (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_write_family(fm.family_id))
) with check (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_write_family(fm.family_id))
);
create policy allergies_delete on public.allergies for delete using (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_write_family(fm.family_id))
);

drop policy if exists dietary_restrictions_access on public.dietary_restrictions;
create policy dietary_restrictions_select on public.dietary_restrictions for select using (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_access_family(fm.family_id))
);
create policy dietary_restrictions_write on public.dietary_restrictions for all using (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_write_family(fm.family_id))
) with check (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_write_family(fm.family_id))
);

drop policy if exists food_preferences_access on public.food_preferences;
create policy food_preferences_select on public.food_preferences for select using (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_access_family(fm.family_id))
);
create policy food_preferences_write on public.food_preferences for all using (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_write_family(fm.family_id))
) with check (
  exists (select 1 from public.family_members fm where fm.id = family_member_id and public.can_write_family(fm.family_id))
);

drop policy if exists ingredients_access on public.ingredients;
create policy ingredients_select on public.ingredients for select using (
  scope = 'global'
  or public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_access_family(family_id))
);
create policy ingredients_insert on public.ingredients for insert with check (
  public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_write_family(family_id))
);
create policy ingredients_update on public.ingredients for update using (
  public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_write_family(family_id))
) with check (
  public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_write_family(family_id))
);
create policy ingredients_delete on public.ingredients for delete using (
  public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_write_family(family_id))
);

drop policy if exists recipes_access on public.recipes;
create policy recipes_select on public.recipes for select using (
  scope = 'global'
  or public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_access_family(family_id))
);
create policy recipes_insert on public.recipes for insert with check (
  public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_write_family(family_id))
);
create policy recipes_update on public.recipes for update using (
  public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_write_family(family_id))
) with check (
  public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_write_family(family_id))
);
create policy recipes_delete on public.recipes for delete using (
  public.is_super_admin()
  or owner_id = auth.uid()
  or (family_id is not null and public.can_write_family(family_id))
);

drop policy if exists recipe_ingredients_access on public.recipe_ingredients;
create policy recipe_ingredients_select on public.recipe_ingredients for select using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (r.scope = 'global' or public.is_super_admin() or r.owner_id = auth.uid() or (r.family_id is not null and public.can_access_family(r.family_id)))
  )
);
create policy recipe_ingredients_write on public.recipe_ingredients for all using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (public.is_super_admin() or r.owner_id = auth.uid() or (r.family_id is not null and public.can_write_family(r.family_id)))
  )
) with check (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (public.is_super_admin() or r.owner_id = auth.uid() or (r.family_id is not null and public.can_write_family(r.family_id)))
  )
);

drop policy if exists recipe_nutrition_cache_access on public.recipe_nutrition_cache;
create policy recipe_nutrition_cache_select on public.recipe_nutrition_cache for select using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (r.scope = 'global' or public.is_super_admin() or r.owner_id = auth.uid() or (r.family_id is not null and public.can_access_family(r.family_id)))
  )
);
create policy recipe_nutrition_cache_write on public.recipe_nutrition_cache for all using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (public.is_super_admin() or r.owner_id = auth.uid() or (r.family_id is not null and public.can_write_family(r.family_id)))
  )
) with check (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (public.is_super_admin() or r.owner_id = auth.uid() or (r.family_id is not null and public.can_write_family(r.family_id)))
  )
);

drop policy if exists menu_plans_access on public.menu_plans;
create policy menu_plans_select on public.menu_plans for select using (public.can_access_family(family_id));
create policy menu_plans_insert on public.menu_plans for insert with check (public.can_write_family(family_id));
create policy menu_plans_update on public.menu_plans for update using (public.can_write_family(family_id)) with check (public.can_write_family(family_id));
create policy menu_plans_delete on public.menu_plans for delete using (public.can_write_family(family_id));

drop policy if exists menu_plan_items_access on public.menu_plan_items;
create policy menu_plan_items_select on public.menu_plan_items for select using (
  exists (select 1 from public.menu_plans mp where mp.id = menu_plan_id and public.can_access_family(mp.family_id))
);
create policy menu_plan_items_write on public.menu_plan_items for all using (
  exists (select 1 from public.menu_plans mp where mp.id = menu_plan_id and public.can_write_family(mp.family_id))
) with check (
  exists (select 1 from public.menu_plans mp where mp.id = menu_plan_id and public.can_write_family(mp.family_id))
);

drop policy if exists pantry_inventory_access on public.pantry_inventory;
create policy pantry_inventory_select on public.pantry_inventory for select using (public.can_access_family(family_id));
create policy pantry_inventory_write on public.pantry_inventory for all using (public.can_write_family(family_id)) with check (public.can_write_family(family_id));

drop policy if exists freezer_inventory_access on public.freezer_inventory;
create policy freezer_inventory_select on public.freezer_inventory for select using (public.can_access_family(family_id));
create policy freezer_inventory_write on public.freezer_inventory for all using (public.can_write_family(family_id)) with check (public.can_write_family(family_id));

drop policy if exists shopping_lists_access on public.shopping_lists;
create policy shopping_lists_select on public.shopping_lists for select using (public.can_access_family(family_id));
create policy shopping_lists_write on public.shopping_lists for all using (public.can_write_family(family_id)) with check (public.can_write_family(family_id));

drop policy if exists shopping_list_items_access on public.shopping_list_items;
create policy shopping_list_items_select on public.shopping_list_items for select using (
  exists (select 1 from public.shopping_lists sl where sl.id = shopping_list_id and public.can_access_family(sl.family_id))
);
create policy shopping_list_items_write on public.shopping_list_items for all using (
  exists (select 1 from public.shopping_lists sl where sl.id = shopping_list_id and public.can_write_family(sl.family_id))
) with check (
  exists (select 1 from public.shopping_lists sl where sl.id = shopping_list_id and public.can_write_family(sl.family_id))
);

drop policy if exists alerts_access on public.alerts;
create policy alerts_select on public.alerts for select using (public.can_access_family(family_id));
create policy alerts_write on public.alerts for all using (public.can_write_family(family_id)) with check (public.can_write_family(family_id));

drop policy if exists app_settings_access on public.app_settings;
create policy app_settings_select on public.app_settings for select using (public.is_super_admin() or owner_id = auth.uid());
create policy app_settings_write on public.app_settings for all using (public.is_super_admin() or owner_id = auth.uid()) with check (public.is_super_admin() or owner_id = auth.uid());

create or replace function public.seed_demo_workspace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_family uuid;
  v_soren uuid;
  v_flor uuid;
  v_galeano uuid;
  v_plan uuid;
  v_shop uuid;
  ing_beef uuid; ing_turkey uuid; ing_chicken uuid; ing_salmon uuid; ing_rice uuid; ing_sweet_potato uuid;
  ing_tomato uuid; ing_tomato_sauce uuid; ing_pepperoni uuid; ing_gf_flour uuid; ing_almonds uuid; ing_olive_oil uuid;
  ing_sunflower_oil uuid; ing_sunflower_lecithin uuid; ing_sesame uuid; ing_tahini uuid; ing_wheat uuid; ing_barley uuid; ing_rye uuid;
  ing_red_lentils uuid; ing_generic_lentils uuid; ing_banana uuid; ing_apple uuid; ing_strawberry uuid; ing_blueberry uuid; ing_mango uuid; ing_cucumber uuid;
  rec_pizza uuid; rec_beef_bowl uuid; rec_turkey uuid; rec_chicken uuid; rec_salmon uuid; rec_muffins uuid; rec_fruit uuid; rec_bread uuid; rec_burger uuid; rec_tacos uuid;
  rec_wheat_pasta uuid; rec_hummus uuid; rec_wheat_sandwich uuid; rec_sesame_salad uuid; rec_lentil_soup uuid;
begin
  if v_user is null then
    raise exception 'seed_demo_workspace requires an authenticated user';
  end if;

  insert into public.profiles (id, full_name, email, role, preferred_language)
  values (v_user, coalesce(auth.jwt() ->> 'email', 'Smart Family Meals User'), coalesce(auth.jwt() ->> 'email', ''), 'chef', 'en')
  on conflict (id) do nothing;

  select id into v_family from public.families where owner_id = v_user and name = 'Galeano Family' limit 1;
  if v_family is not null then
    return jsonb_build_object('family_id', v_family, 'created', false);
  end if;

  insert into public.families (name, description, primary_contact_name, primary_contact_email, notes, owner_id, chef_id)
  values ('Galeano Family', 'Development seed family for allergy-aware meal planning.', 'Flor Galeano', 'flor@example.com', 'Seeded by Smart Family Meals.', v_user, v_user)
  returning id into v_family;

  insert into public.family_users (family_id, profile_id, role)
  values (v_family, v_user, 'chef')
  on conflict (family_id, profile_id) do update set role = excluded.role;

  insert into public.family_members (family_id, full_name, nickname, age_years, activity_level, portion_factor, daily_calorie_target, daily_protein_target_g, notes)
  values (v_family, 'Soren Galeano', 'Soren', 9, 'high', 1.3, 2200, 70, 'No visible melted cheese. Allows grated parmesan.')
  returning id into v_soren;
  insert into public.family_members (family_id, full_name, nickname, age_years, activity_level, portion_factor, daily_calorie_target, daily_protein_target_g, notes)
  values (v_family, 'Flor Galeano', 'Flor', 38, 'moderate', 1, 1900, 72, 'Prefers varied proteins.')
  returning id into v_flor;
  insert into public.family_members (family_id, full_name, nickname, age_years, activity_level, portion_factor, daily_calorie_target, daily_protein_target_g, notes)
  values (v_family, 'Galeano', 'Galeano', 41, 'moderate', 1.1, 2300, 90, 'Prefers hearty lunch and dinner portions.')
  returning id into v_galeano;

  insert into public.allergies (family_member_id, allergen_name, normalized_allergen_name, severity, avoid_traces, cross_contact_risk, reaction_notes)
  values
    (v_soren, 'gluten', 'gluten', 'severe', true, true, 'Block wheat, rye, barley, trigo, centeno and cebada.'),
    (v_soren, 'tree nuts', 'tree nuts', 'severe', true, true, 'Tree nuts blocked except almonds.'),
    (v_soren, 'sesame', 'sesame', 'anaphylaxis', true, true, 'Sesame and tahini blocked in all forms.'),
    (v_soren, 'tahini', 'tahini', 'anaphylaxis', true, true, 'Tahini blocked.'),
    (v_soren, 'sunflower seeds', 'sunflower seeds', 'severe', true, true, 'Sunflower oil and sunflower lecithin allowed.'),
    (v_soren, 'sunflower butter', 'sunflower butter', 'severe', true, true, 'Blocked derivative.'),
    (v_soren, 'sunflower flour', 'sunflower flour', 'severe', true, true, 'Blocked derivative.'),
    (v_soren, 'lentils', 'lentils', 'moderate', false, true, 'Generic lentils require review; red, green, brown and black lentils are allowed.');

  insert into public.food_preferences (family_member_id, preference_type, item_name, notes)
  values
    (v_soren, 'dislikes', 'visible melted cheese', 'Allows grated parmesan.'),
    (v_soren, 'likes', 'beef', 'Preferred protein.'),
    (v_soren, 'likes', 'smoked salmon', 'Preferred protein.'),
    (v_soren, 'likes', 'lobster', 'Preferred seafood.'),
    (v_soren, 'likes', 'oysters', 'Preferred seafood.'),
    (v_soren, 'likes', 'chicken', 'Preferred protein.'),
    (v_soren, 'likes', 'ground turkey', 'Preferred protein.'),
    (v_soren, 'favorite', 'pizza without cheese, tomato sauce and pepperoni', 'Must be gluten-free.'),
    (v_soren, 'likes', 'colorful fruits', 'Rotate fruit colors.');

  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, fiber_g_per_100g, sugar_g_per_100g, sodium_mg_per_100g, calcium_mg_per_100g, iron_mg_per_100g, contains_gluten, contains_tree_nuts, contains_sesame, contains_fish, allergen_tags, allowed_exceptions)
  values
    (v_user, v_family, 'family', 'Beef', 'beef', 'protein', 250, 26, 0, 15, 0, 0, 72, 18, 2.6, false, false, false, false, '{}', '{}') returning id into ing_beef;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, fat_g_per_100g, sodium_mg_per_100g) values (v_user, v_family, 'family', 'Ground turkey', 'ground turkey', 'protein', 189, 27, 8, 75) returning id into ing_turkey;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, fat_g_per_100g, sodium_mg_per_100g) values (v_user, v_family, 'family', 'Chicken', 'chicken', 'protein', 165, 31, 3.6, 74) returning id into ing_chicken;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, fat_g_per_100g, sodium_mg_per_100g, contains_fish, allergen_tags) values (v_user, v_family, 'family', 'Smoked salmon', 'smoked salmon', 'protein', 117, 18, 4.3, 672, true, '{fish}') returning id into ing_salmon;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g) values (v_user, v_family, 'family', 'Rice', 'rice', 'grain', 130, 2.7, 28, 0.3) returning id into ing_rice;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fiber_g_per_100g, sugar_g_per_100g) values (v_user, v_family, 'family', 'Sweet potato', 'sweet potato', 'vegetable', 86, 1.6, 20, 3, 4.2) returning id into ing_sweet_potato;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fiber_g_per_100g, sugar_g_per_100g) values (v_user, v_family, 'family', 'Tomato', 'tomato', 'vegetable', 18, 0.9, 3.9, 1.2, 2.6) returning id into ing_tomato;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, sodium_mg_per_100g) values (v_user, v_family, 'family', 'Tomato sauce', 'tomato sauce', 'sauce', 29, 1.3, 6, 400) returning id into ing_tomato_sauce;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, fat_g_per_100g, sodium_mg_per_100g) values (v_user, v_family, 'family', 'Pepperoni', 'pepperoni', 'protein', 494, 23, 44, 1761) returning id into ing_pepperoni;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fiber_g_per_100g) values (v_user, v_family, 'family', 'Gluten-free flour', 'gluten free flour', 'baking', 360, 5, 78, 3) returning id into ing_gf_flour;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, contains_tree_nuts, allergen_tags, allowed_exceptions) values (v_user, v_family, 'family', 'Almonds', 'almonds', 'nuts', 579, 21, 22, 50, true, '{tree nuts}', '{almond,almonds}') returning id into ing_almonds;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, fat_g_per_100g) values (v_user, v_family, 'family', 'Olive oil', 'olive oil', 'oil', 884, 100) returning id into ing_olive_oil;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, fat_g_per_100g, allowed_exceptions) values (v_user, v_family, 'family', 'Sunflower oil', 'sunflower oil', 'oil', 884, 100, '{sunflower oil}') returning id into ing_sunflower_oil;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, fat_g_per_100g, allowed_exceptions) values (v_user, v_family, 'family', 'Sunflower lecithin', 'sunflower lecithin', 'additive', 763, 100, '{sunflower lecithin}') returning id into ing_sunflower_lecithin;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, contains_sesame, allergen_tags) values (v_user, v_family, 'family', 'Sesame', 'sesame', 'seed', 573, 18, 23, 50, true, '{sesame}') returning id into ing_sesame;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, contains_sesame, allergen_tags) values (v_user, v_family, 'family', 'Tahini', 'tahini', 'spread', 595, 17, 21, 54, true, '{sesame,tahini}') returning id into ing_tahini;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fiber_g_per_100g, contains_gluten, allergen_tags) values (v_user, v_family, 'family', 'Wheat', 'wheat', 'grain', 340, 13, 72, 10, true, '{gluten,wheat}') returning id into ing_wheat;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fiber_g_per_100g, contains_gluten, allergen_tags) values (v_user, v_family, 'family', 'Barley', 'barley', 'grain', 354, 12, 73, 17, true, '{gluten,barley}') returning id into ing_barley;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fiber_g_per_100g, contains_gluten, allergen_tags) values (v_user, v_family, 'family', 'Rye', 'rye', 'grain', 338, 10, 76, 15, true, '{gluten,rye}') returning id into ing_rye;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fiber_g_per_100g) values (v_user, v_family, 'family', 'Red lentils', 'red lentils', 'legume', 116, 9, 20, 8) returning id into ing_red_lentils;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fiber_g_per_100g, allergen_tags) values (v_user, v_family, 'family', 'Generic lentils', 'generic lentils', 'legume', 116, 9, 20, 8, '{lentils}') returning id into ing_generic_lentils;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fiber_g_per_100g, sugar_g_per_100g) values (v_user, v_family, 'family', 'Banana', 'banana', 'fruit', 89, 1.1, 23, 2.6, 12) returning id into ing_banana;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, carbs_g_per_100g, fiber_g_per_100g, sugar_g_per_100g) values (v_user, v_family, 'family', 'Apple', 'apple', 'fruit', 52, 14, 2.4, 10) returning id into ing_apple;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, carbs_g_per_100g, fiber_g_per_100g, sugar_g_per_100g) values (v_user, v_family, 'family', 'Strawberry', 'strawberry', 'fruit', 32, 7.7, 2, 4.9) returning id into ing_strawberry;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, carbs_g_per_100g, fiber_g_per_100g, sugar_g_per_100g) values (v_user, v_family, 'family', 'Blueberry', 'blueberry', 'fruit', 57, 14, 2.4, 10) returning id into ing_blueberry;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, carbs_g_per_100g, fiber_g_per_100g, sugar_g_per_100g) values (v_user, v_family, 'family', 'Mango', 'mango', 'fruit', 60, 15, 1.6, 14) returning id into ing_mango;
  insert into public.ingredients (owner_id, family_id, scope, name, normalized_name, category, calories_per_100g, carbs_g_per_100g, fiber_g_per_100g, sugar_g_per_100g) values (v_user, v_family, 'family', 'Cucumber', 'cucumber', 'vegetable', 15, 3.6, 0.5, 1.7) returning id into ing_cucumber;

  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_freezer_friendly, is_school_friendly, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Gluten-Free Cheese-Free Pepperoni Pizza', 'dinner', 'pepperoni', 'comfort', 4, 300, 'Prepare gluten-free dough, tomato sauce and pepperoni without visible cheese.', false, true, true, 'active') returning id into rec_pizza;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_freezer_friendly, is_school_friendly, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Beef Rice Bowl with Vegetables', 'lunch', 'beef', 'bowl', 4, 320, 'Cook beef, rice and vegetables. Portion by diner factors.', true, true, true, 'active') returning id into rec_beef_bowl;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_freezer_friendly, is_school_friendly, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Ground Turkey Meatballs with Tomato Sauce', 'dinner', 'ground turkey', 'batch', 4, 280, 'Cook turkey meatballs with rice binder and tomato sauce.', true, false, true, 'active') returning id into rec_turkey;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_freezer_friendly, is_school_friendly, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Roasted Chicken with Sweet Potatoes', 'dinner', 'chicken', 'sheet-pan', 4, 330, 'Roast chicken with sweet potatoes and olive oil.', true, false, true, 'active') returning id into rec_chicken;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_freezer_friendly, is_school_friendly, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Smoked Salmon Rice Bowl with Cucumber', 'lunch', 'smoked salmon', 'bowl', 4, 280, 'Assemble smoked salmon, rice and cucumber.', false, true, true, 'active') returning id into rec_salmon;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_freezer_friendly, is_school_friendly, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Gluten-Free Banana Muffins', 'snack', 'none', 'baked snack', 8, 90, 'Bake banana muffins with gluten-free flour.', true, true, true, 'active') returning id into rec_muffins;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_school_friendly, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Rainbow Fruit Skewers', 'snack', 'none', 'fresh snack', 4, 180, 'Assemble colorful fruit skewers.', true, true, 'active') returning id into rec_fruit;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_freezer_friendly, is_school_friendly, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Gluten-Free Lunchbox Bread', 'school_lunch', 'none', 'bread', 8, 80, 'Bake and slice gluten-free bread.', true, true, true, 'active') returning id into rec_bread;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Beef Burger with Gluten-Free Bun', 'dinner', 'beef', 'grill', 4, 320, 'Prepare beef burgers with gluten-free buns.', true, 'active') returning id into rec_burger;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_school_friendly, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Gluten-Free Tortilla Tacos', 'dinner', 'beef', 'tacos', 4, 280, 'Prepare gluten-free tacos.', true, true, 'active') returning id into rec_tacos;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Regular Wheat Pasta with Sauce', 'dinner', 'none', 'pasta', 4, 300, 'Cook wheat pasta with tomato sauce.', false, 'active') returning id into rec_wheat_pasta;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Hummus with Tahini', 'snack', 'chickpea', 'dip', 4, 100, 'Blend hummus with tahini.', true, 'active') returning id into rec_hummus;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Wheat Bread Sandwich', 'school_lunch', 'turkey', 'sandwich', 4, 220, 'Assemble sandwich on wheat bread.', false, 'active') returning id into rec_wheat_sandwich;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Sesame Seed Salad', 'lunch', 'none', 'salad', 4, 220, 'Prepare salad with sesame seeds.', true, 'active') returning id into rec_sesame_salad;
  insert into public.recipes (owner_id, family_id, scope, name, category, main_protein, meal_style, servings, serving_size_g, instructions, is_freezer_friendly, is_gluten_free, status)
  values (v_user, v_family, 'family', 'Generic Lentil Soup', 'lunch', 'lentils', 'soup', 4, 320, 'Cook generic lentil soup.', true, true, 'draft') returning id into rec_lentil_soup;

  insert into public.recipe_ingredients (recipe_id, ingredient_id, quantity_g, display_quantity)
  values
    (rec_pizza, ing_gf_flour, 360, '360 g'), (rec_pizza, ing_tomato_sauce, 240, '240 g'), (rec_pizza, ing_pepperoni, 140, '140 g'), (rec_pizza, ing_olive_oil, 28, '28 g'),
    (rec_beef_bowl, ing_beef, 520, '520 g'), (rec_beef_bowl, ing_rice, 360, '360 g'), (rec_beef_bowl, ing_tomato, 260, '260 g'),
    (rec_turkey, ing_turkey, 800, '800 g'), (rec_turkey, ing_rice, 400, '400 g'), (rec_turkey, ing_tomato_sauce, 300, '300 g'), (rec_turkey, ing_olive_oil, 40, '40 g'),
    (rec_chicken, ing_chicken, 720, '720 g'), (rec_chicken, ing_sweet_potato, 520, '520 g'), (rec_chicken, ing_olive_oil, 32, '32 g'),
    (rec_salmon, ing_salmon, 360, '360 g'), (rec_salmon, ing_rice, 420, '420 g'), (rec_salmon, ing_cucumber, 240, '240 g'),
    (rec_muffins, ing_banana, 320, '320 g'), (rec_muffins, ing_gf_flour, 260, '260 g'), (rec_muffins, ing_olive_oil, 36, '36 g'),
    (rec_fruit, ing_strawberry, 220, '220 g'), (rec_fruit, ing_blueberry, 160, '160 g'), (rec_fruit, ing_mango, 220, '220 g'), (rec_fruit, ing_apple, 180, '180 g'),
    (rec_bread, ing_gf_flour, 500, '500 g'), (rec_bread, ing_olive_oil, 40, '40 g'),
    (rec_burger, ing_beef, 600, '600 g'), (rec_burger, ing_gf_flour, 260, '260 g'),
    (rec_tacos, ing_beef, 420, '420 g'), (rec_tacos, ing_tomato, 180, '180 g'),
    (rec_wheat_pasta, ing_wheat, 400, '400 g'), (rec_wheat_pasta, ing_tomato_sauce, 260, '260 g'),
    (rec_hummus, ing_tahini, 90, '90 g'), (rec_hummus, ing_olive_oil, 24, '24 g'),
    (rec_wheat_sandwich, ing_wheat, 240, '240 g'),
    (rec_sesame_salad, ing_sesame, 35, '35 g'), (rec_sesame_salad, ing_cucumber, 220, '220 g'),
    (rec_lentil_soup, ing_generic_lentils, 300, '300 g'), (rec_lentil_soup, ing_tomato, 160, '160 g');

  insert into public.menu_plans (family_id, name, start_date, end_date, status, created_by)
  values (v_family, 'Galeano Family Weekly Plan', current_date, current_date + 6, 'planned', v_user)
  returning id into v_plan;
  insert into public.menu_plan_items (menu_plan_id, recipe_id, planned_date, meal_time, servings, portion_factor, planned_grams, calories, protein_g, allergy_status, variety_status)
  values
    (v_plan, rec_turkey, current_date, 'dinner', 1, 1, 320, 520, 38, 'safe', 'allowed'),
    (v_plan, rec_salmon, current_date + 1, 'lunch', 1, 1, 280, 420, 28, 'safe', 'allowed'),
    (v_plan, rec_pizza, current_date - 10, 'dinner', 1, 1, 300, 600, 22, 'safe', 'allowed');

  insert into public.pantry_inventory (family_id, ingredient_id, quantity_available, unit, min_quantity_alert, expiration_date, location)
  values
    (v_family, ing_turkey, 300, 'g', 600, current_date + 4, 'fridge'),
    (v_family, ing_rice, 1000, 'g', 500, current_date + 160, 'pantry'),
    (v_family, ing_tomato_sauce, 120, 'g', 300, current_date + 45, 'pantry'),
    (v_family, ing_olive_oil, 600, 'g', 200, current_date + 300, 'pantry'),
    (v_family, ing_salmon, 200, 'g', 250, current_date + 3, 'fridge'),
    (v_family, ing_cucumber, 80, 'g', 150, current_date + 5, 'fridge'),
    (v_family, ing_gf_flour, 700, 'g', 500, current_date + 120, 'pantry');

  insert into public.freezer_inventory (family_id, recipe_id, prepared_date, expiration_date, portions_available, grams_per_portion, reheating_instructions, storage_notes)
  values
    (v_family, rec_beef_bowl, current_date - 8, current_date + 6, 3, 310, 'Reheat covered with a splash of water.', 'Label as gluten-free.'),
    (v_family, rec_chicken, current_date - 5, current_date + 18, 6, 330, 'Oven or microwave until hot.', 'Pair with fresh fruit for lunch.');

  insert into public.shopping_lists (family_id, menu_plan_id, name, status)
  values (v_family, v_plan, 'Weekly Kitchen Purchase', 'active')
  returning id into v_shop;
  insert into public.shopping_list_items (shopping_list_id, ingredient_id, required_quantity, available_quantity, missing_quantity, unit)
  values
    (v_shop, ing_turkey, 800, 300, 500, 'g'),
    (v_shop, ing_tomato_sauce, 300, 120, 180, 'g');

  insert into public.app_settings (owner_id, gemini_enabled, ai_model, default_variety_days, default_units, default_language)
  values (v_user, false, 'gemini-2.5-flash', 21, 'metric', 'en')
  on conflict do nothing;

  return jsonb_build_object('family_id', v_family, 'created', true);
end;
$$;

grant execute on function public.seed_demo_workspace() to authenticated;
