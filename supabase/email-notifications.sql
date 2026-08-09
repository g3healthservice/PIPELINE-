create extension if not exists pg_net;

create table if not exists public.opportunity_notification_log (
  id bigint generated always as identity primary key,
  opportunity_id text not null references public.opportunities(id) on delete cascade,
  event_type text not null check (event_type in ('created', 'updated')),
  status text not null check (status in ('sent', 'failed')),
  resend_email_id text,
  error_message text,
  created_at timestamptz not null default now()
);

alter table public.opportunity_notification_log enable row level security;
revoke all on public.opportunity_notification_log from anon;

create or replace function public.notify_opportunity()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  function_url text;
  notification_secret text;
begin
  if tg_op = 'UPDATE' and old is not distinct from new then return new; end if;

  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'opportunity_notification_url';
  select decrypted_secret into notification_secret
  from vault.decrypted_secrets
  where name = 'opportunity_notification_secret';
  if function_url is null or notification_secret is null then return new; end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', notification_secret
    ),
    body := jsonb_build_object('type', tg_op, 'record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists opportunity_email_notification on public.opportunities;
create trigger opportunity_email_notification
after insert or update on public.opportunities
for each row
execute function public.notify_opportunity();
