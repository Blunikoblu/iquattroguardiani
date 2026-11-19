// Testi nuovi del mondo (non presi dal libro).
// tipo 'gioco': indicazioni neutre di gioco, pubblicate subito.
// tipo 'storia': frasi su personaggi, luoghi o storia. Restano spente (ok: false) finché Nicola non le approva;
// al loro posto compare il testo di gioco "riserva". L'elenco da approvare è in ufficio/testi/da-approvare.md.
export const TESTI = {
  // abitanti di Marechiaro (personaggi nuovi, non del libro)
  'pescatore-1': { tipo: 'storia', ok: true, testo: 'Le reti si rammendano al mattino, quando il sole non scotta ancora. Tonino lo fa da sempre, anche a mezzogiorno.' },
  'pescatore-2': { tipo: 'storia', ok: true, testo: 'Dicono che i tursiopi seguano solo chi sa ascoltare il mare.' },
  'pescatore-g': { tipo: 'gioco', ok: true, testo: 'Vai in fondo al molo e usa la tua pietra: forse qualcuno risponde dal mare.' },
  'bambina-1': { tipo: 'storia', ok: true, testo: 'Il mio gatto dorme sempre sulla banchina. Se lo svegli piano, ti segue per un po\'.' },
  'bambina-g': { tipo: 'gioco', ok: true, testo: 'Ci sono gatti che dormono al sole sulla banchina. Prova ad avvicinarti.' },
  'fornaia-1': { tipo: 'storia', ok: true, testo: 'Il primo pane esce alle sei. A Marechiaro lo sanno anche i gabbiani.' },
  'fornaia-g': { tipo: 'gioco', ok: true, testo: 'Dalla fontana parte la gara fino al palo in fondo al molo. Se ci sono altri Guardiani, potete correre insieme.' },
  // Luminos
  'guida-luce-1': { tipo: 'storia', ok: true, testo: 'Le isole di pietra bianca sono legate da ponti di luce. Qualcuno, lassù, ha imparato a saltare da una all\'altra.' },
  'guida-luce-g': { tipo: 'gioco', ok: true, testo: 'A sud della spiaggia comincia il ponte sospeso: piattaforme, salti e punti di controllo. Salta con la barra spaziatrice o con il pulsante ⤒.' },
  // poteri
  'potere-marco': { tipo: 'gioco', ok: true, testo: 'Marco usa il Flusso: l\'acqua vicina si muove e certi meccanismi d\'acqua si attivano.' },
  'potere-sophia': { tipo: 'gioco', ok: true, testo: 'Sophia usa la Luce: illumina i simboli nascosti e risveglia i cristalli.' },
  'potere-giulia': { tipo: 'gioco', ok: true, testo: 'Giulia usa la Memoria: legge le rune e, leggendole, vede momenti del passato.' },
  'potere-luca': { tipo: 'gioco', ok: true, testo: 'Luca usa la Natura: chiama gli animali vicini e parla con piante e alberi.' },
  'potere-nulla': { tipo: 'gioco', ok: true, testo: 'La pietra brilla, ma qui non succede niente. Prova vicino all\'acqua, alle rune, ai cristalli o agli animali.' },
  // reazioni dei personaggi (storia) con la riserva neutra
  'gatto-luca': { tipo: 'storia', ok: true, testo: '🐈 Il gatto apre un occhio, ti guarda e si stiracchia. Con Luca i gatti non scappano mai.' },
  'gatto-g': { tipo: 'gioco', ok: true, testo: '🐈 Il gatto apre un occhio e lo richiude. Al sole si sta troppo bene.' },
  'farfalle-luca': { tipo: 'storia', ok: true, testo: '🦋 Una farfalla si posa sulla mano di Luca. Poi un\'altra. Poi riprendono a volare.' },
  'farfalle-g': { tipo: 'gioco', ok: true, testo: '🦋 Le farfalle ti girano intorno e tornano tra i fiori.' },
  'lupo-luca': { tipo: 'storia', ok: true, testo: '🐺 Il lupo annusa la mano di Luca, poi si siede accanto a lui. Le sue foglie frusciano nel vento.' },
  'lupo-g': { tipo: 'gioco', ok: true, testo: '🐺 Il lupo ti guarda a lungo, poi abbassa la testa e torna a sdraiarsi tra le foglie.' },
  'monte-giulia': { tipo: 'storia', ok: true, testo: '🪨 Giulia legge la runa spezzata. Per un attimo vede chi l\'aveva incisa, tanto tempo fa, e la runa torna intera.' },
  'monte-g': { tipo: 'gioco', ok: true, testo: '🪨 La runa spezzata torna intera e si accende d\'oro.' },
  'tunnel-giulia': { tipo: 'storia', ok: true, testo: '📓 Giulia copia le rune sul taccuino e si accorge di una cosa: vanno lette da destra a sinistra.' },
  'tunnel-g': { tipo: 'gioco', ok: true, testo: '📓 Indizio: le rune del tunnel si leggono da destra a sinistra. Le ultime quattro sono come le pietre intorno al lago.' },
  'conchiglia-1': { tipo: 'storia', ok: true, testo: '🐚 È leggera e tiepida. Se la avvicini all\'orecchio, non si sente il mare: si sente il silenzio della grotta.' },
  'conchiglia-g': { tipo: 'gioco', ok: true, testo: '🐚 La conchiglia di cristallo è nel tuo taccuino.' },
  // i quattro luoghi (senza trama)
  'selva-1': { tipo: 'storia', ok: true, testo: 'Nella Selva di Maestrale il vento non smette mai. Gli alberi più vecchi si piegano tutti dalla stessa parte.' },
  'monte-1': { tipo: 'storia', ok: true, testo: 'Le rocce del Monte Zavorra sono scure, ma attraversate da venature dorate. Se le tocchi, sono fredde.' },
  'risacca-1': { tipo: 'storia', ok: true, testo: 'L\'acqua della Risacca brilla e scorre in tutte le direzioni: di lato, all\'indietro, perfino verso il cielo.' },
  'solaria-1': { tipo: 'storia', ok: true, testo: 'Solaria ha torri dorate e cupole di sale. Di giorno è così luminosa che le ombre sembrano disegnate.' },
};
// testo da mostrare: quello di storia se approvato, altrimenti la riserva di gioco (o niente)
export function testo(id, riserva) {
  const t = TESTI[id];
  if (t && (t.tipo === 'gioco' || t.ok)) return t.testo;
  if (riserva && TESTI[riserva]) return TESTI[riserva].testo;
  return null;
}
