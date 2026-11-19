// Interfaccia: intro, HUD, pannelli, notifiche, impostazioni, modalità elenco.
// Tutto il testo variabile passa da textContent (tramite h()).
import { AVATARS, EMOTES, FRASI, nomeCasuale, isNome } from './config.js?v=202611191240';
import { h } from './util.js?v=202611191240';

const $ = id => document.getElementById(id);

export function createUI() {
  const panel = $('panel'), card = $('card'), toasts = $('toasts');
  let lastFocus = null, onClose = null;

  function openPanel(nodes, opts = {}) {
    lastFocus = document.activeElement;
    const close = h('button', { class: 'close', type: 'button', 'aria-label': 'Chiudi', onclick: closePanel }, 'Chiudi ✕');
    card.replaceChildren(close, ...[].concat(nodes).filter(Boolean));
    card.setAttribute('aria-label', opts.label || 'Pannello');
    panel.hidden = false; onClose = opts.onClose || null;
    requestAnimationFrame(() => (card.querySelector('[autofocus]') || close).focus());
  }
  function closePanel() {
    if (panel.hidden) return;
    panel.hidden = true; card.replaceChildren();
    onClose?.(); onClose = null;
    lastFocus?.focus?.();
  }
  panel.addEventListener('pointerdown', e => { if (e.target === panel) closePanel(); });
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); closePanel(); }
    if (e.key === 'Tab') { // focus intrappolato nel pannello
      const f = [...card.querySelectorAll('button,a[href],input,textarea,select')].filter(x => !x.disabled);
      if (!f.length) return; const first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    }
  });

  function toast(text, kind = '') {
    const t = h('div', { class: 'toast ' + kind, role: 'status' }, text);
    toasts.append(t);
    while (toasts.children.length > 4) toasts.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 4200);
  }

  function setStatus(mode, msg) {
    const el = $('netStatus'), dot = $('netDot');
    dot.className = 'dot ' + (mode === 'online' || mode === 'online-pubblico' ? 'on' : mode === 'solo' ? 'off' : 'wait');
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function setCount(n) {
    $('countN').textContent = String(n);
    $('countBtn').setAttribute('aria-label', n === 1 ? 'Sei l\'unico Guardiano a Luminos. Mostra chi è online' : `${n} Guardiani a Luminos. Mostra chi è online`);
  }

  // Schermata iniziale: intro → Guardiano e nome già pronto → entrata.
  function intro(prefs, previewFactory) {
    return new Promise(resolve => {
      const s1 = $('intro1'), s2 = $('intro2');
      let choice = { nick: isNome(prefs.nick) ? prefs.nick : nomeCasuale(), av: AVATARS.some(a => a.id === prefs.av) ? prefs.av : 'marco' }, preview = null;
      const desc = $('avDesc');
      const showDesc = () => { const a = AVATARS.find(x => x.id === choice.av); desc.replaceChildren(h('b', { style: `color:${a.col}` }, a.nome), ` · la pietra ${a.pietra} · il suo dono è ${a.dono}`); };
      $('go1').onclick = () => {
        s1.hidden = true; s2.hidden = false;
        try { preview = previewFactory($('avPreview')); preview.set(choice.av, AVATARS.find(a => a.id === choice.av).col); } catch (e) {}
        $('intro2').querySelector('.go').focus();
      };
      const nameEl = $('nomeMondo');
      const setName = n => { choice.nick = n; nameEl.textContent = n; };
      setName(choice.nick);
      $('rerollNome').onclick = () => setName(nomeCasuale());
      const avBox = $('avChoices');
      const avBtns = AVATARS.map(a => h('button', { type: 'button', class: 'chip guard', style: `--c:${a.col}`, 'aria-pressed': String(a.id === choice.av), 'data-id': a.id, onclick: e => {
        choice.av = a.id; avBtns.forEach(b => b.setAttribute('aria-pressed', String(b === e.currentTarget))); preview?.set(a.id, a.col); showDesc();
      } }, h('i', { 'aria-hidden': 'true' }), a.nome));
      avBox.replaceChildren(...avBtns); showDesc();
      $('intro2').onsubmit = e => {
        e.preventDefault();
        preview?.stop();
        $('intro').hidden = true;
        resolve(choice);
      };
    });
  }

  // 👋 ha il suo pulsante; le altre reazioni e le frasi pronte stanno nel vassoio che si apre con 💬
  function emoteBar(onSay) {
    const bar = $('emotes'), more = $('moreBtn');
    const touch = matchMedia('(pointer: coarse)').matches;
    bar.replaceChildren(
      h('div', { class: 'emo' }, ...EMOTES.filter(e => e.id !== 'wave').map(e => h('button', { type: 'button', title: `${e.label} (${e.key})`, 'aria-label': e.label,
        onclick: () => { onSay(e.id); if (touch) toggleTray(false); } }, e.glyph))),
      h('div', { class: 'frasi' }, ...FRASI.map(f => h('button', { type: 'button', onclick: () => { onSay(f.id); toggleTray(false); } }, f.testo))));
    $('waveBtn').onclick = () => onSay('wave');
    more.onclick = () => toggleTray(bar.hidden);
  }
  function toggleTray(open) { $('emotes').hidden = !open; $('moreBtn').setAttribute('aria-expanded', String(open)); }

  return { openPanel, closePanel, get panelOpen() { return !panel.hidden; }, toast, setStatus, setCount, intro, emoteBar };
}
