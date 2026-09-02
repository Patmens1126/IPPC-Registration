-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)

-- Table: registrants
create table if not exists registrants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  occupation text not null,
  tshirt_color text not null check (tshirt_color in ('yellow', 'blue-black', 'red', 'white')),
  amount_paid numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table registrants enable row level security;

create policy "Authenticated admins can read registrants"
  on registrants for select
  using (auth.role() = 'authenticated');

create policy "Authenticated admins can insert registrants"
  on registrants for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated admins can update registrants"
  on registrants for update
  using (auth.role() = 'authenticated');

create policy "Authenticated admins can delete registrants"
  on registrants for delete
  using (auth.role() = 'authenticated');

-- Table: program_settings (single row holding the program fee)
create table if not exists program_settings (
  id integer primary key,
  fee numeric not null default 150
);

insert into program_settings (id, fee) values (1, 150)
  on conflict (id) do nothing;

alter table program_settings enable row level security;

create policy "Authenticated admins can read settings"
  on program_settings for select
  using (auth.role() = 'authenticated');

create policy "Authenticated admins can update settings"
  on program_settings for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
