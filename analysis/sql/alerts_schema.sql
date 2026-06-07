-- Supabase schema for persisted alerts, reactions, and checklist support.
-- Run in Supabase SQL editor as authenticated project owner.

create extension if not exists pgcrypto;

create table if not exists public.alerts (
    id uuid primary key default gen_random_uuid(),
    building_name text not null,
    alert_type text not null,
    alert_title text not null,
    alert_window text,
    alert_score integer,
    status text not null default 'new',
    reaction_note text,
    linked_work_order_id uuid references public.work_orders(id) on delete set null,
    dismissed_by uuid references auth.users(id),
    dismissed_at timestamptz,
    metadata jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint alerts_status_check check (status in ('new', 'dismissed', 'actioned', 'resolved'))
);

create table if not exists public.alert_reactions (
    id uuid primary key default gen_random_uuid(),
    alert_id uuid not null references public.alerts(id) on delete cascade,
    reaction_type text not null,
    note_text text,
    work_order_id uuid references public.work_orders(id) on delete set null,
    created_by uuid references auth.users(id),
    created_at timestamptz not null default now()
);

create table if not exists public.work_order_checklist_templates (
    id uuid primary key default gen_random_uuid(),
    work_order_type_eng text not null,
    item_text text not null,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.work_order_checklist_items (
    id uuid primary key default gen_random_uuid(),
    work_order_id uuid not null references public.work_orders(id) on delete cascade,
    item_text text not null,
    is_done boolean not null default false,
    sort_order integer not null default 0,
    source text not null default 'template',
    created_by uuid references auth.users(id),
    created_at timestamptz not null default now(),
    constraint work_order_checklist_items_source_check check (source in ('template', 'manual', 'ai'))
);

create index if not exists idx_alerts_status_created_at on public.alerts (status, created_at desc);
create index if not exists idx_alerts_linked_work_order_id on public.alerts (linked_work_order_id);
create index if not exists idx_alert_reactions_alert_id_created_at on public.alert_reactions (alert_id, created_at desc);
create index if not exists idx_checklist_items_work_order_id_sort on public.work_order_checklist_items (work_order_id, sort_order);

alter table public.alerts enable row level security;
alter table public.alert_reactions enable row level security;
alter table public.work_order_checklist_templates enable row level security;
alter table public.work_order_checklist_items enable row level security;

drop policy if exists "authenticated read alerts" on public.alerts;
create policy "authenticated read alerts"
    on public.alerts for select
    to authenticated
    using (true);

drop policy if exists "authenticated insert alerts" on public.alerts;
create policy "authenticated insert alerts"
    on public.alerts for insert
    to authenticated
    with check (true);

drop policy if exists "authenticated update alerts" on public.alerts;
create policy "authenticated update alerts"
    on public.alerts for update
    to authenticated
    using (true)
    with check (true);

drop policy if exists "authenticated read alert reactions" on public.alert_reactions;
create policy "authenticated read alert reactions"
    on public.alert_reactions for select
    to authenticated
    using (true);

drop policy if exists "authenticated insert alert reactions" on public.alert_reactions;
create policy "authenticated insert alert reactions"
    on public.alert_reactions for insert
    to authenticated
    with check (auth.uid() = created_by);

drop policy if exists "authenticated read checklist templates" on public.work_order_checklist_templates;
create policy "authenticated read checklist templates"
    on public.work_order_checklist_templates for select
    to authenticated
    using (true);

drop policy if exists "authenticated read checklist items" on public.work_order_checklist_items;
create policy "authenticated read checklist items"
    on public.work_order_checklist_items for select
    to authenticated
    using (true);

drop policy if exists "authenticated insert checklist items" on public.work_order_checklist_items;
create policy "authenticated insert checklist items"
    on public.work_order_checklist_items for insert
    to authenticated
    with check (auth.uid() = created_by);

drop policy if exists "authenticated update checklist items" on public.work_order_checklist_items;
create policy "authenticated update checklist items"
    on public.work_order_checklist_items for update
    to authenticated
    using (true)
    with check (true);
