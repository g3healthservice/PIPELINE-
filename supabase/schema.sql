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
  -- Nulo de proposito: projeto cadastrado direto na aba Implantacao (contrato
  -- antigo, adesao a ata, projeto herdado) nao tem oportunidade de origem.
  -- Com "not null" aqui, o cadastro manual era recusado pelo banco.
  --
  -- O "unique" continua e e o que protege a regra central: a mesma
  -- oportunidade nao vira dois projetos. Em Postgres, unique permite varios
  -- nulos, entao ele nao limita a quantidade de projetos manuais.
  source_opportunity_id text unique references public.opportunities(id) on delete cascade,
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

-- MIGRACAO PARA A BASE QUE JA ESTA NO AR
--
-- Os create table acima so valem para uma base nova; eles nao alteram a base
-- existente. A base que o piloto usa hoje foi criada com
-- source_opportunity_id NOT NULL, e por isso recusa todo projeto cadastrado
-- manualmente. Rode esta linha uma vez no SQL Editor do Supabase:
--
--   alter table public.implementations alter column source_opportunity_id drop not null;
--
-- Enquanto ela nao for executada, o botao "+ Novo projeto" salva na tela e
-- perde tudo no primeiro save.
