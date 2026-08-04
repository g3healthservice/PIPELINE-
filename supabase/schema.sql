create table solutions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  created_at timestamptz not null default now()
);

create table municipalities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state char(2) not null,
  created_at timestamptz not null default now(),
  unique (name, state)
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  municipality_id uuid not null references municipalities(id),
  solution_id uuid not null references solutions(id),
  owner text not null,
  stage text not null check (stage in ('mapped','qualified','diagnosis','proposal','negotiation','contracted')),
  estimated_value numeric(14,2) not null default 0,
  next_action text,
  next_action_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table implementations (
  id uuid primary key default gen_random_uuid(),
  source_opportunity_id uuid not null unique references opportunities(id),
  owner text not null,
  stage text not null check (stage in ('kickoff','diagnosis','configuration','training','pilot','operation','expansion')),
  next_milestone text,
  risks text,
  municipal_dependencies text,
  created_at timestamptz not null default now()
);

insert into solutions (name, category) values
  ('Raio-X Captação SUS', 'Captação SUS'),
  ('Monitor de Judicialização', 'Judicialização'),
  ('PWG — Esteira do Medicamento', 'Judicialização'),
  ('RosalindTest', 'Rastreio'),
  ('Linda LifeTech', 'Rastreio'),
  ('PinkPapa', 'Rastreio'),
  ('Radar de Editais', 'Engenharia'),
  ('Brain27', 'Unidades móveis');
