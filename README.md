# Luminos · il mondo de «I quattro Guardiani e il regno perduto della Luce»

Sito pubblico (GitHub Pages) per far conoscere il libro di **Nicola Gobbini** prima dell'uscita:
un piccolo mondo in 3D da esplorare dal browser, anche dal telefono.

**Indirizzo:** https://blunikoblu.github.io/iquattroguardiani/

## Cosa c'è
- **Marechiaro**: il molo, Tonino, la barca di Marco, la gara al molo.
- **La Grotta dei Sussurri**: le rune azzurre, il lago di cristallo, l'isola delle quattro pietre, l'arco di luce.
- **Luminos**: la spiaggia di sale sotto due soli, i ponti di luce, i Giardini Sospesi, il Giardino dell'Equilibrio,
  la porta del palazzo, il belvedere con i quattro cammini (si aprono uno alla volta prima dell'uscita).
- Taccuino dei segreti (salvato solo nel browser di chi visita).

Solo contenuti fino al capitolo 5 del libro. Nessuna anticipazione oltre.

## Sicuro anche per i bambini
- Nessuna registrazione, nessuna email, nessun dato personale.
- **Nessuna chat**: ci si saluta solo con emoji e frasi già pronte; i nomi nel mondo sono estratti a caso da un elenco.
- Multiplayer con Supabase Realtime e accesso anonimo temporaneo: le posizioni non vengono salvate.

## Aggiornare
- Data di uscita, modulo di iscrizione, social e aperture dei cammini: `data.json`.
- Dopo ogni modifica al codice: `sh tools/versione.sh` (aggiorna la versione degli script per i browser).

Progetto separato dalla sfida Real Automata: account, repository e costi sono tutti suoi.

## Dal 19/11/2026: poteri, diario, attività, quattro cammini
- `js/powers.js` — i poteri delle pietre (tasto F o pulsante colorato). I luoghi registrano dei "punti" (`spot`) su cui il potere agisce.
- `js/diario.js` — il taccuino: segreti, luoghi, rune, creature, oggetti, distintivi, mappa, prossimo indizio. Solo localStorage.
- `js/attivita.js` — abitanti, creature, caccia alle rune (`js/rune.js`), gara condivisa, cristalli della marea, ponte sospeso, eco della grotta, porta invisibile, tursiopi.
- `js/luoghi.js` — Selva di Maestrale, Monte Zavorra, Risacca, Solaria (senza trama). Si aprono secondo `data.json → aperture`.
- `js/testi.js` — testi nuovi: `gioco` (attivi) e `storia` (spenti finché non approvati).
- Rete: oltre a `pos` e `say`, l'evento `act` con tipi validati (`pw`, `gara`, `mc`, `df`, `st?`, `st`). Chi arriva chiede lo stato (`st?`) e chi c'è risponde.
- Sicurezza: nascondi un Guardiano o tutti, spegni reazioni e inviti, segnala (tabella anonima `segnalazioni`, vedi `supabase/002_segnalazioni.sql`), esci subito.
- QR code del libro: usare l'indirizzo `https://blunikoblu.github.io/iquattroguardiani/?da=libro`. Parole segrete del libro: in `data.json → parole` vanno le impronte SHA-256 di `luminos:<parola>` (minuscole, senza accenti).
