-- Supabase schema for work-order mobile flow.
-- Run in Supabase SQL editor as authenticated project owner.

create extension if not exists pgcrypto;

create table if not exists public.work_orders (
    id uuid primary key default gen_random_uuid(),
    wo_no text not null unique,
    customer_site_name text,
    site_address text,
    work_order_type_eng text,
    priority_id integer,
    sla_end_at timestamptz,
    started_at timestamptz,
    finished_at timestamptz,
    is_open boolean not null default true,
    source_payload jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.work_order_events (
    id uuid primary key default gen_random_uuid(),
    work_order_id uuid not null references public.work_orders(id) on delete cascade,
    event_type text not null,
    note_text text,
    transcript_text text,
    metadata jsonb,
    created_by uuid references auth.users(id),
    created_at timestamptz not null default now()
);

create table if not exists public.work_order_photos (
    id uuid primary key default gen_random_uuid(),
    work_order_id uuid not null references public.work_orders(id) on delete cascade,
    event_id uuid references public.work_order_events(id) on delete set null,
    storage_bucket text not null,
    storage_path text not null,
    mime_type text,
    file_size_bytes bigint,
    caption_text text,
    created_by uuid references auth.users(id),
    created_at timestamptz not null default now()
);

create index if not exists idx_work_orders_is_open on public.work_orders (is_open, priority_id, sla_end_at);
create index if not exists idx_work_order_events_work_order_id on public.work_order_events (work_order_id, created_at desc);
create index if not exists idx_work_order_photos_work_order_id on public.work_order_photos (work_order_id, created_at desc);

alter table public.work_orders enable row level security;
alter table public.work_order_events enable row level security;
alter table public.work_order_photos enable row level security;

drop policy if exists "authenticated read work orders" on public.work_orders;
create policy "authenticated read work orders"
    on public.work_orders for select
    to authenticated
    using (true);

drop policy if exists "authenticated read events" on public.work_order_events;
create policy "authenticated read events"
    on public.work_order_events for select
    to authenticated
    using (true);

drop policy if exists "authenticated insert events" on public.work_order_events;
create policy "authenticated insert events"
    on public.work_order_events for insert
    to authenticated
    with check (auth.uid() = created_by);

drop policy if exists "authenticated read photos" on public.work_order_photos;
create policy "authenticated read photos"
    on public.work_order_photos for select
    to authenticated
    using (true);

drop policy if exists "authenticated insert photos" on public.work_order_photos;
create policy "authenticated insert photos"
    on public.work_order_photos for insert
    to authenticated
    with check (auth.uid() = created_by);

insert into storage.buckets (id, name, public)
values ('work-order-photos', 'work-order-photos', false)
on conflict (id) do nothing;

drop policy if exists "authenticated upload work order photos" on storage.objects;
create policy "authenticated upload work order photos"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'work-order-photos');

drop policy if exists "authenticated view work order photos" on storage.objects;
create policy "authenticated view work order photos"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'work-order-photos');
