// Rete del mondo: Supabase Realtime (Presence per chi c'è, Broadcast per movimenti e reazioni).
// - Presence: solo lo stato (nome già pronto, Guardiano scelto, luogo). Mai le coordinate.
// - Broadcast: posizione a frequenza limitata, reazioni (emoji) e frasi già pronte, identificate da un codice.
// - NIENTE testo libero: chi riceve accetta solo nomi e frasi che esistono già nelle liste del mondo.
// - Accesso anonimo invisibile (sessione per scheda, in sessionStorage). Nessuna email, nessun dato personale.
// - Se qualcosa non va: canale pubblico di ripiego, poi modalità individuale.
import { SUPABASE_URL, SUPABASE_KEY, CHANNEL_PRIVATE, CHANNEL_PUBLIC, NET, AVATARS, EMOTES, FRASI, WORLD, ZONES, isNome } from './config.js?v=202611191110';
import { clamp, randomId } from './util.js?v=202611191110';

const AV = new Map(AVATARS.map(a => [a.id, a]));
const SAY_IDS = new Set([...EMOTES.map(e => e.id), ...FRASI.map(f => f.id)]);
const ZONE_IDS = new Set(Object.keys(ZONES));

export function createNet(h) {
  const myId = randomId(10);          // ID di sessione univoco (per scheda)
  let sb = null, ch = null, mode = 'off', userId = null;
  let meta = null, joinedOnce = false, retry = 0, retryTimer = null, closing = false;
  let peers = new Map();              // id -> meta validata
  const rate = new Map();             // id -> { t, n } per limitare i messaggi in arrivo
  let last = { x: 0, z: 0, r: 0, a: 0, sent: 0, sx: 99, sz: 99, sr: 99, sa: 0 };
  let sbPromise = null, lastSay = 0;
  function client() {
    sbPromise ||= import('../supabase.min.js?v=202611191110').then(({ createClient }) => (sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { storage: window.sessionStorage, storageKey: 'luminos-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 20 }, heartbeatIntervalMs: 20000 },
    })));
    return sbPromise;
  }

  const status = (s, msg) => { mode = s; h.onStatus?.(s, msg); };

  function validMeta(m) {
    if (!m || typeof m !== 'object' || !AV.has(m.a) || !isNome(m.n)) return null;
    return { nick: m.n, av: m.a, col: AV.get(m.a).col, zona: ZONE_IDS.has(m.z) ? m.z : 'piazza' };
  }

  function allow(id) {
    const now = performance.now(); let r = rate.get(id);
    if (!r || now - r.t > 1000) { r = { t: now, n: 0 }; rate.set(id, r); }
    return ++r.n <= NET.maxMsgPerSec;
  }

  function onSync() {
    const st = ch.presenceState();
    const next = new Map();
    for (const [key, list] of Object.entries(st)) {
      if (key === myId || typeof key !== 'string' || key.length > 16) continue;
      if (next.size >= NET.maxOthers) break;
      const m = validMeta(list[list.length - 1]);
      if (m) next.set(key, m);
    }
    for (const [id, m] of next) {
      const old = peers.get(id);
      if (!old) h.onPeerJoin?.(id, m, joinedOnce);
      else if (old.nick !== m.nick || old.av !== m.av || old.zona !== m.zona) h.onPeerUpdate?.(id, m);
    }
    for (const [id, m] of peers) if (!next.has(id)) h.onPeerLeave?.(id, m);
    peers = next; joinedOnce = true;
    h.onCount?.(peers.size + 1);
  }

  function onPos({ payload: p }) {
    if (!p || typeof p.i !== 'string' || !peers.has(p.i) || !allow(p.i)) return;
    const x = +p.x, z = +p.z, r = +p.r;
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(r)) return;
    h.onPos?.(p.i, clamp(x, WORLD.x0, WORLD.x1), clamp(z, WORLD.z0, WORLD.z1), Math.atan2(Math.sin(r), Math.cos(r)));
  }
  function onSay({ payload: p }) {
    if (!p || typeof p.i !== 'string' || !peers.has(p.i) || !SAY_IDS.has(p.e) || !allow(p.i)) return;
    h.onSay?.(p.i, p.e, typeof p.t === 'string' && p.t.length <= 16 ? p.t : null);
  }

  function scheduleRetry() {
    if (closing || retryTimer) return;
    const wait = Math.min(30000, 2000 * 2 ** retry++);
    status('retry', `Connessione persa: riprovo tra ${Math.round(wait / 1000)} s.`);
    retryTimer = setTimeout(() => { retryTimer = null; connect(); }, wait);
  }

  async function openChannel(priv) {
    if (ch) { try { await sb.removeChannel(ch); } catch (e) {} ch = null; }
    peers.forEach((m, id) => h.onPeerLeave?.(id, m, true)); peers = new Map(); joinedOnce = false;
    const c = sb.channel(priv ? CHANNEL_PRIVATE : CHANNEL_PUBLIC, { config: { private: priv, presence: { key: myId }, broadcast: { self: false, ack: false } } });
    c.on('presence', { event: 'sync' }, onSync)
     .on('broadcast', { event: 'pos' }, onPos)
     .on('broadcast', { event: 'say' }, onSay);
    ch = c;
    return new Promise(resolve => {
      let done = false, up = false;
      const t = setTimeout(() => { if (!done) { done = true; resolve(false); } }, 12000);
      c.subscribe(async (s) => {
        if (c !== ch) return;
        if (s === 'SUBSCRIBED') {
          retry = 0; up = true;
          try { await c.track(meta); } catch (e) {}
          if (!done) { done = true; clearTimeout(t); resolve(true); }
          status(priv ? 'online' : 'online-pubblico');
          sendPos(last.x, last.z, last.r, true);
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
          if (!done) { done = true; clearTimeout(t); resolve(false); }
          else if (up && !closing) { up = false; scheduleRetry(); }
        }
      });
    });
  }

  async function connect() {
    if (!SUPABASE_URL || !SUPABASE_KEY) { status('solo', 'Anteprima: per ora esplori Luminos da solo. Gli altri visitatori arriveranno presto.'); return; }
    status('connecting', 'Mi collego agli altri Guardiani…');
    try {
      await client();
      if (!userId) {
        let { data } = await sb.auth.getSession();
        if (!data.session) {
          const r = await sb.auth.signInAnonymously();
          if (!r.error) data = { session: r.data.session };
        }
        userId = data.session?.user?.id || null;
        if (data.session) await sb.realtime.setAuth(data.session.access_token);
      }
      if (userId && await openChannel(true)) return;
      if (await openChannel(false)) return;
      status('solo', 'Il multiplayer non è disponibile in questo momento: stai esplorando Luminos da solo.');
      if (ch) { try { await sb.removeChannel(ch); } catch (e) {} ch = null; }
      retryTimer = setTimeout(() => { retryTimer = null; connect(); }, 30000);
    } catch (e) {
      status('solo', 'Il multiplayer non è disponibile: stai esplorando Luminos da solo.');
      retryTimer = setTimeout(() => { retryTimer = null; connect(); }, 30000);
    }
  }

  function sendPos(x, z, r, force = false) {
    last.x = x; last.z = z; last.r = r;
    if (!ch || !(mode === 'online' || mode === 'online-pubblico')) return;
    const now = performance.now();
    if (now - last.sent < 1000 / NET.sendHz) return;
    const moved = Math.abs(x - last.sx) + Math.abs(z - last.sz) + Math.abs(r - last.sr) > 0.015;
    if (!force && !moved && now - last.sent < NET.heartbeatMs) return;
    last.sent = now; last.sx = x; last.sz = z; last.sr = r;
    ch.send({ type: 'broadcast', event: 'pos', payload: { i: myId, x: +x.toFixed(2), z: +z.toFixed(2), r: +r.toFixed(2) } });
  }
  setInterval(() => sendPos(last.x, last.z, last.r), NET.heartbeatMs);

  const toMeta = m => ({ n: isNome(m.nick) ? m.nick : 'Onda Gentile', a: AV.has(m.av) ? m.av : 'marco', z: ZONE_IDS.has(m.zona) ? m.zona : 'molo' });

  return {
    myId,
    get mode() { return mode; },
    get peers() { return peers; },
    start(m) { meta = toMeta(m); connect(); },
    async updateMe(m) {
      meta = toMeta({ nick: m.nick ?? meta.n, av: m.av ?? meta.a, zona: m.zona ?? meta.z });
      if (ch && mode.startsWith('online')) try { await ch.track(meta); } catch (e) {}
    },
    sendPos,
    // reazione o frase pronta; target = id di un visitatore (per "saluta qualcuno")
    say(id, target) {
      if (!SAY_IDS.has(id)) return false;
      const now = performance.now(); if (now - lastSay < 1200) return false; lastSay = now;
      if (ch && mode.startsWith('online')) ch.send({ type: 'broadcast', event: 'say', payload: target ? { i: myId, e: id, t: target } : { i: myId, e: id } });
      return true;
    },
    async close() { closing = true; if (ch) try { await ch.untrack(); await sb.removeChannel(ch); } catch (e) {} },
  };
}
