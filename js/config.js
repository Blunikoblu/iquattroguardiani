// Configurazione pubblica del mondo di Luminos. Qui ci sono SOLO valori pubblici:
// la chiave "publishable" di Supabase è fatta per stare nel browser.
// Mai inserire qui la service_role key o altre chiavi segrete.
// Progetto Supabase dedicato al libro (diverso da quello di Real Automata).
// Finché è vuoto, il mondo funziona in modalità individuale.
export const SUPABASE_URL = 'https://kobvgkeycowxidavqxtj.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_En3IOVqGUQKHsIeVDULF-Q_CYFthaP2';

export const CHANNEL_PRIVATE = 'luminos-v1';         // richiede sessione anonima + RLS
export const CHANNEL_PUBLIC = 'luminos-pubblico-v1'; // ripiego se l'accesso anonimo non è attivo

export const NET = {
  sendHz: 10,            // massimo invii di movimento al secondo
  heartbeatMs: 3000,     // invio anche da fermi, per non "sparire"
  staleMs: 12000,        // avatar senza notizie da 12 s: rimosso
  maxOthers: 40,         // avatar remoti mostrati al massimo
  maxMsgPerSec: 20,      // oltre questo, i messaggi di un mittente vengono ignorati
};

// Limiti dell'intero mondo (per validare le posizioni che arrivano dalla rete).
export const WORLD = { x0: -40, x1: 460, z0: -45, z1: 30 };

// I personaggi: i quattro Guardiani. Ogni visitatore ne sceglie uno (anche più visitatori lo stesso).
// col = colore della pietra, come nel libro: blu, bianca, marrone, verde.
export const AVATARS = [
  { id: 'marco', nome: 'Marco', dono: 'il Flusso', pietra: 'blu', col: '#3f8cff' },
  { id: 'sophia', nome: 'Sophia', dono: 'la Luce', pietra: 'bianca', col: '#f2f4ff' },
  { id: 'giulia', nome: 'Giulia', dono: 'la Memoria', pietra: 'marrone', col: '#c07a3a' },
  { id: 'luca', nome: 'Luca', dono: 'la Natura', pietra: 'verde', col: '#5fd06e' },
];

// Nomi nel mondo: solo combinazioni di parole già pronte (niente testo libero, niente dati personali).
export const NOMI = {
  a: ['Gabbiano', 'Corrente', 'Lanterna', 'Conchiglia', 'Gufo', 'Scintilla', 'Onda', 'Piuma', 'Roccia', 'Faro', 'Vento', 'Stella', 'Delfino', 'Riccio', 'Brezza', 'Cristallo'],
  b: ['Gentile', 'Curioso', 'Coraggioso', 'Lucente', 'Silenzioso', 'Veloce', 'Paziente', 'Allegro', 'Saggio', 'Sognatore', 'Attento', 'Leale'],
};
export const isNome = n => typeof n === 'string' && (() => { const p = n.split(' '); return p.length === 2 && NOMI.a.includes(p[0]) && NOMI.b.includes(p[1]); })();
export const nomeCasuale = () => NOMI.a[Math.floor(Math.random() * NOMI.a.length)] + ' ' + NOMI.b[Math.floor(Math.random() * NOMI.b.length)];

// Reazioni (emoji) e frasi già pronte: l'unico modo di "parlare" con gli altri. Nessuna chat libera.
export const EMOTES = [
  { id: 'wave', label: 'Saluta', glyph: '👋', key: '1', anim: 'wave' },
  { id: 'wow', label: 'Wow', glyph: '😮', key: '2', anim: 'hop' },
  { id: 'heart', label: 'Cuore', glyph: '💛', key: '3', anim: 'hop' },
  { id: 'laugh', label: 'Ridi', glyph: '😄', key: '4', anim: 'laugh' },
  { id: 'star', label: 'Luce', glyph: '✨', key: '5', anim: 'party' },
];
export const FRASI = [
  { id: 'f1', testo: 'Ciao, Guardiano!' },
  { id: 'f2', testo: 'Seguimi!' },
  { id: 'f3', testo: 'Da questa parte!' },
  { id: 'f4', testo: 'Ho trovato un segreto!' },
  { id: 'f5', testo: 'Buona marea!' },
  { id: 'f6', testo: 'Che posto magnifico.' },
  { id: 'f7', testo: 'Aspettami!' },
  { id: 'f8', testo: 'Grazie!' },
];

// I luoghi del mondo (nomi mostrati quando ci entri).
export const ZONES = {
  marechiaro: { nome: 'Marechiaro', regione: 'M' },
  grotta: { nome: 'La Grotta dei Sussurri', regione: 'G' },
  lago: { nome: 'Il lago di cristallo', regione: 'G' },
  spiaggia: { nome: 'La spiaggia di sale', regione: 'L' },
  ponte: { nome: 'Il ponte di luce', regione: 'L' },
  giardini: { nome: 'I Giardini Sospesi', regione: 'L' },
  arena: { nome: "Il Giardino dell'Equilibrio", regione: 'L' },
  belvedere: { nome: 'Il belvedere dei quattro cammini', regione: 'L' },
};
