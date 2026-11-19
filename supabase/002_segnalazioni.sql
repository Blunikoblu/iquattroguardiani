-- Segnalazioni anonime dal mondo di Luminos (applicata il 19/11/2026 come migrazione "luminos_segnalazioni").
-- Si può solo scrivere: nome di Luminos del giocatore segnalato, motivo da un elenco, luogo. Nessun dato personale.
-- Si leggono dal pannello di Supabase (Table editor → segnalazioni). Massimo 5 all'ora per sessione anonima.
create table public.segnalazioni (
  id bigint generated always as identity primary key,
  creata timestamptz not null default now(),
  autore uuid not null default auth.uid(),
  segnalato text not null check (char_length(segnalato) between 3 and 40 and segnalato ~ '^[A-Za-zàèéìòù]+ [A-Za-zàèéìòù]+$'),
  motivo text not null check (motivo in ('gesti','disturbo','nome','altro')),
  zona text check (zona is null or char_length(zona) <= 20)
);
alter table public.segnalazioni enable row level security;
create policy "luminos: segnalare" on public.segnalazioni for insert to authenticated with check (autore = (select auth.uid()));
revoke all on public.segnalazioni from anon;
grant insert (segnalato, motivo, zona) on public.segnalazioni to authenticated;
create or replace function public.segnalazioni_limite() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.segnalazioni where autore = new.autore and creata > now() - interval '1 hour') >= 5 then raise exception 'troppe segnalazioni'; end if;
  return new;
end $$;
revoke execute on function public.segnalazioni_limite() from public, anon, authenticated;
create trigger segnalazioni_limite before insert on public.segnalazioni for each row execute function public.segnalazioni_limite();
