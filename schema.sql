-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)

-- Table: registrants
create table if not exists registrants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  contact text not null,
  occupation text not null,
  reference text,
  tshirt_color text not null check (tshirt_color in ('yellow', 'blue-black', 'red', 'white')),
  tshirt_size text not null default 'medium' check (tshirt_size in ('small', 'medium', 'large', 'xl', 'xxl', 'xxxl')),
  amount_due numeric not null default 100,
  amount_paid numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table registrants enable row level security;

alter table registrants add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table registrants add column if not exists reference text;
alter table registrants add column if not exists tshirt_size text not null default 'medium';
alter table registrants add column if not exists amount_due numeric not null default 100;
alter table registrants drop constraint if exists registrants_tshirt_size_check;
alter table registrants add constraint registrants_tshirt_size_check
  check (tshirt_size in ('small', 'medium', 'large', 'xl', 'xxl', 'xxxl'));
alter table registrants drop constraint if exists registrants_amount_due_check;

create or replace function public.set_registration_amount_due()
returns trigger
language plpgsql
as $$
begin
  new.amount_due := case
    when lower(trim(coalesce(new.reference, ''))) = 'invitee' then 50
    else 100
  end;
  return new;
end;
$$;

drop trigger if exists set_registration_amount_due on public.registrants;
create trigger set_registration_amount_due
  before insert or update on public.registrants
  for each row execute procedure public.set_registration_amount_due();

update registrants
set amount_due = case when lower(trim(coalesce(reference, ''))) = 'invitee' then 50 else 100 end;
alter table registrants add constraint registrants_amount_due_check
  check (amount_due = case when lower(trim(coalesce(reference, ''))) = 'invitee' then 50 else 100 end);

create unique index if not exists one_registration_per_user
  on registrants (user_id) where user_id is not null;

-- Table: program_settings (single row holding the program fee)
create table if not exists program_settings (
  id integer primary key,
  fee numeric not null default 100
);

insert into program_settings (id, fee) values (1, 100)
  on conflict (id) do nothing;
update program_settings set fee = 100 where id = 1 and fee = 50;

alter table program_settings enable row level security;

-- Role profiles. New auth accounts start as staff; promote trusted accounts to admin explicitly.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  phone_verified boolean not null default false,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists phone_verified boolean not null default false;

insert into profiles (id)
  select id from auth.users
  on conflict (id) do nothing;

update profiles p
set full_name = coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name'),
    phone = coalesce(p.phone, u.raw_user_meta_data ->> 'phone'),
    phone_verified = coalesce(u.phone_confirmed_at is not null, false)
from auth.users u
where p.id = u.id
  and (
    p.full_name is null
    or p.phone is null
    or (u.phone_confirmed_at is not null and p.phone_verified = false)
  );

drop policy if exists "Users can read their own profile" on profiles;
create policy "Users can read their own profile"
  on profiles for select
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, phone_verified)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
    new.phone_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.sync_profile_phone_verification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set phone = coalesce(new.phone, phone),
      phone_verified = new.phone_confirmed_at is not null
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_updated on auth.users;
create trigger on_auth_user_phone_updated
  after update of phone, phone_confirmed_at on auth.users
  for each row execute procedure public.sync_profile_phone_verification();

-- Replace the original authenticated-only policies with role-aware policies.
drop policy if exists "Authenticated admins can read registrants" on registrants;
drop policy if exists "Authenticated admins can insert registrants" on registrants;
drop policy if exists "Authenticated admins can update registrants" on registrants;
drop policy if exists "Authenticated admins can delete registrants" on registrants;
drop policy if exists "Admins can read registrants" on registrants;
drop policy if exists "Admins can insert registrants" on registrants;
drop policy if exists "Admins can update registrants" on registrants;
drop policy if exists "Admins can delete registrants" on registrants;
drop policy if exists "Users can read their own registrant record" on registrants;
drop policy if exists "Users can create their own registration" on registrants;

create policy "Admins can read registrants"
  on registrants for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Users can read their own registrant record"
  on registrants for select
  using (user_id = auth.uid());

create policy "Admins can insert registrants"
  on registrants for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Users can create their own registration"
  on registrants for insert
  with check (
    amount_paid = 0
    and user_id = auth.uid()
    and exists (
      select 1
      from profiles
      where id = auth.uid()
        and role = 'user'
        and phone_verified = true
    )
  );

create policy "Admins can update registrants"
  on registrants for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can delete registrants"
  on registrants for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Authenticated admins can read settings" on program_settings;
drop policy if exists "Authenticated admins can update settings" on program_settings;
drop policy if exists "Admins can read settings" on program_settings;
drop policy if exists "Admins can update settings" on program_settings;
create policy "Admins can read settings"
  on program_settings for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update settings"
  on program_settings for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Staff can query this view without receiving payment amounts or admin-only controls.
drop view if exists registrants_user_view;
create view registrants_user_view
  with (security_invoker = true) as
  select id, user_id, name, contact, occupation, reference, tshirt_color, tshirt_size, amount_due, created_at
  from registrants;
revoke all on registrants_user_view from public;
grant select on registrants_user_view to authenticated;

create or replace function public.get_registration_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from public.registrants;
$$;

revoke all on function public.get_registration_count() from public;
grant execute on function public.get_registration_count() to authenticated;

create or replace function public.has_my_registration()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.registrants
    where user_id = auth.uid()
  );
$$;

revoke all on function public.has_my_registration() from public;
grant execute on function public.has_my_registration() to authenticated;
