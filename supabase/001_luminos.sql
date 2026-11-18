-- Luminos · mondo del libro "I quattro Guardiani e il regno perduto della Luce"
-- Progetto Supabase: iquattroguardiani-luminos (kobvgkeycowxidavqxtj, eu-central-1, piano gratuito)
-- Applicato come migrazione "luminos_v1_realtime".
-- Nessuna tabella: niente chat, niente bacheca, nessun dato salvato.
drop policy if exists "luminos: ricevere" on realtime.messages;
create policy "luminos: ricevere"
  on realtime.messages for select
  to authenticated
  using ((select realtime.topic()) = 'luminos-v1'
         and realtime.messages.extension in ('broadcast', 'presence'));

drop policy if exists "luminos: inviare" on realtime.messages;
create policy "luminos: inviare"
  on realtime.messages for insert
  to authenticated
  with check ((select realtime.topic()) = 'luminos-v1'
              and realtime.messages.extension in ('broadcast', 'presence'));
