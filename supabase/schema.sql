create table public.opportunities (
  id text primary key,
  municipality text not null,
  state text not null,
  solution text not null,
  owner text not null,
  stage text not null check (stage in ('mapped','qualified','diagnosis','proposal','negotiation','contracted')),
  value numeric(14,2) not null default 0,
  next_action text not null default '',
  due date,
  notes text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.implementations (
  id text primary key,
  source_opportunity_id text not null unique references public.opportunities(id) on delete cascade,
  municipality text not null,
  state text not null,
  solution text not null,
  owner text not null,
  stage text not null check (stage in ('kickoff','diagnosis','configuration','training','pilot','operation','expansion')),
  next_milestone text not null default '',
  risks text not null default '',
  dependencies text not null default '',
  created_at timestamptz not null default now()
);

alter table public.opportunities enable row level security;
alter table public.implementations enable row level security;
create policy "pilot public access" on public.opportunities for all to anon using (true) with check (true);
create policy "pilot public access" on public.implementations for all to anon using (true) with check (true);
