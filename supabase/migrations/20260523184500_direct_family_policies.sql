-- Avoid same-table helper lookups in family RLS policies so INSERT ... RETURNING works for newly created families.

drop policy if exists families_select on public.families;
drop policy if exists families_update on public.families;
drop policy if exists families_delete on public.families;

create policy families_select on public.families for select using (
  public.is_super_admin()
  or owner_id = auth.uid()
  or chef_id = auth.uid()
  or exists (
    select 1
    from public.family_users fu
    where fu.family_id = id
      and fu.profile_id = auth.uid()
      and fu.role in ('chef','family_admin','viewer')
  )
);

create policy families_update on public.families for update using (
  public.is_super_admin()
  or owner_id = auth.uid()
  or chef_id = auth.uid()
  or exists (
    select 1
    from public.family_users fu
    where fu.family_id = id
      and fu.profile_id = auth.uid()
      and fu.role in ('chef','family_admin')
  )
) with check (
  public.is_super_admin()
  or owner_id = auth.uid()
  or chef_id = auth.uid()
  or exists (
    select 1
    from public.family_users fu
    where fu.family_id = id
      and fu.profile_id = auth.uid()
      and fu.role in ('chef','family_admin')
  )
);

create policy families_delete on public.families for delete using (
  public.is_super_admin()
  or (public.current_user_role() in ('chef','family_admin') and owner_id = auth.uid())
);
