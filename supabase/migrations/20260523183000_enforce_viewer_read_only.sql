-- Enforce viewer read-only behavior for family creation and owner-scoped catalogs.

create or replace function public.can_write_owned_catalog(owner_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or (public.current_user_role() = 'chef' and owner_uuid = auth.uid())
$$;

drop policy if exists families_insert on public.families;
drop policy if exists families_delete on public.families;
create policy families_insert on public.families for insert with check (
  public.is_super_admin()
  or (public.current_user_role() = 'chef' and (owner_id = auth.uid() or chef_id = auth.uid()))
);
create policy families_delete on public.families for delete using (
  public.is_super_admin()
  or (public.current_user_role() in ('chef','family_admin') and owner_id = auth.uid())
);

drop policy if exists ingredients_insert on public.ingredients;
drop policy if exists ingredients_update on public.ingredients;
drop policy if exists ingredients_delete on public.ingredients;
create policy ingredients_insert on public.ingredients for insert with check (
  (scope = 'global' and public.is_super_admin())
  or (scope = 'owner' and public.can_write_owned_catalog(owner_id))
  or (scope = 'family' and family_id is not null and public.can_write_family(family_id))
);
create policy ingredients_update on public.ingredients for update using (
  (scope = 'global' and public.is_super_admin())
  or (scope = 'owner' and public.can_write_owned_catalog(owner_id))
  or (scope = 'family' and family_id is not null and public.can_write_family(family_id))
) with check (
  (scope = 'global' and public.is_super_admin())
  or (scope = 'owner' and public.can_write_owned_catalog(owner_id))
  or (scope = 'family' and family_id is not null and public.can_write_family(family_id))
);
create policy ingredients_delete on public.ingredients for delete using (
  (scope = 'global' and public.is_super_admin())
  or (scope = 'owner' and public.can_write_owned_catalog(owner_id))
  or (scope = 'family' and family_id is not null and public.can_write_family(family_id))
);

drop policy if exists recipes_insert on public.recipes;
drop policy if exists recipes_update on public.recipes;
drop policy if exists recipes_delete on public.recipes;
create policy recipes_insert on public.recipes for insert with check (
  (scope = 'global' and public.is_super_admin())
  or (scope = 'owner' and public.can_write_owned_catalog(owner_id))
  or (scope = 'family' and family_id is not null and public.can_write_family(family_id))
);
create policy recipes_update on public.recipes for update using (
  (scope = 'global' and public.is_super_admin())
  or (scope = 'owner' and public.can_write_owned_catalog(owner_id))
  or (scope = 'family' and family_id is not null and public.can_write_family(family_id))
) with check (
  (scope = 'global' and public.is_super_admin())
  or (scope = 'owner' and public.can_write_owned_catalog(owner_id))
  or (scope = 'family' and family_id is not null and public.can_write_family(family_id))
);
create policy recipes_delete on public.recipes for delete using (
  (scope = 'global' and public.is_super_admin())
  or (scope = 'owner' and public.can_write_owned_catalog(owner_id))
  or (scope = 'family' and family_id is not null and public.can_write_family(family_id))
);

drop policy if exists recipe_ingredients_write on public.recipe_ingredients;
create policy recipe_ingredients_write on public.recipe_ingredients for all using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (
        public.is_super_admin()
        or (r.scope = 'owner' and public.can_write_owned_catalog(r.owner_id))
        or (r.scope = 'family' and r.family_id is not null and public.can_write_family(r.family_id))
      )
  )
) with check (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (
        public.is_super_admin()
        or (r.scope = 'owner' and public.can_write_owned_catalog(r.owner_id))
        or (r.scope = 'family' and r.family_id is not null and public.can_write_family(r.family_id))
      )
  )
);

drop policy if exists recipe_nutrition_cache_write on public.recipe_nutrition_cache;
create policy recipe_nutrition_cache_write on public.recipe_nutrition_cache for all using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (
        public.is_super_admin()
        or (r.scope = 'owner' and public.can_write_owned_catalog(r.owner_id))
        or (r.scope = 'family' and r.family_id is not null and public.can_write_family(r.family_id))
      )
  )
) with check (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and (
        public.is_super_admin()
        or (r.scope = 'owner' and public.can_write_owned_catalog(r.owner_id))
        or (r.scope = 'family' and r.family_id is not null and public.can_write_family(r.family_id))
      )
  )
);
