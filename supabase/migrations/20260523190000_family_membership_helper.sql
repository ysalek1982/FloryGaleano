-- Use a security-definer membership helper inside family policies to avoid family_users RLS recursion.

create or replace function public.has_family_membership(family_uuid uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_users fu
    where fu.family_id = family_uuid
      and fu.profile_id = auth.uid()
      and fu.role = any(allowed_roles)
  )
$$;

drop policy if exists families_select on public.families;
drop policy if exists families_update on public.families;

create policy families_select on public.families for select using (
  public.is_super_admin()
  or owner_id = auth.uid()
  or chef_id = auth.uid()
  or public.has_family_membership(id, array['chef','family_admin','viewer'])
);

create policy families_update on public.families for update using (
  public.is_super_admin()
  or owner_id = auth.uid()
  or chef_id = auth.uid()
  or public.has_family_membership(id, array['chef','family_admin'])
) with check (
  public.is_super_admin()
  or owner_id = auth.uid()
  or chef_id = auth.uid()
  or public.has_family_membership(id, array['chef','family_admin'])
);
