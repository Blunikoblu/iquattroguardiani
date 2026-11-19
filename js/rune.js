// Caccia alle rune: sedici rune nascoste nei luoghi del mondo.
// tipo 'vista' = basta trovarla; 'giulia' = segni consumati, li legge solo Giulia (potere o tocco);
// 'sophia' = invisibile finché la luce di Sophia non la rivela (per un minuto, per tutti quelli vicini).
// I segni sono le rune inventate per il mondo (vento, roccia, acqua, luce), non testo del libro.
const LX = 400, GX = 200, CZ = -12.5, GXL = LX + 39, GZ = 2.2, AX = LX + 39, AZ = -30;
export const RUNE_CACCIA = [
  { id: 'r-m1', segno: 'vento', tipo: 'vista', x: 11.3, y: 1.1, z: 18.85, ry: Math.PI, luogo: 'Marechiaro, sul muro in fondo alla banchina', nome: 'Runa del vento', indizio: 'A Marechiaro, dove la banchina finisce verso levante.' },
  { id: 'r-m2', segno: 'roccia', tipo: 'giulia', x: -1.25, y: 0.6, z: 9.1, ry: -Math.PI / 2, luogo: 'Marechiaro, su un palo del molo', nome: 'Runa della roccia', indizio: 'Segni consumati su un palo del molo. Servono gli occhi di Giulia.' },
  { id: 'r-m3', segno: 'luce', tipo: 'sophia', x: -6.2, y: 0.9, z: 18.9, ry: Math.PI, luogo: 'Marechiaro, sotto la finestra del forno', nome: 'Runa della luce', indizio: 'Vicino al forno c\'è qualcosa che si vede solo con la luce di Sophia.' },
  { id: 'r-m4', segno: 'acqua', tipo: 'vista', x: -17.6, y: 0.45, z: 13.1, ry: 0, luogo: 'Gli scogli di ponente', nome: 'Runa dell\'acqua', indizio: 'Sugli scogli di ponente, dove i tursiopi portano chi li segue.' },
  { id: 'r-g1', segno: 'vento', tipo: 'vista', x: 196.4, y: 0.7, z: 21.2, ry: Math.PI, luogo: 'La Grotta dei Sussurri, sullo scoglio dell\'approdo', nome: 'Runa dell\'approdo', indizio: 'Dove si lega la barca, prima di entrare nella grotta.' },
  { id: 'r-g2', segno: 'luce', tipo: 'sophia', x: 198.75, y: 1.3, z: 7.6, ry: Math.PI / 2, luogo: 'La Grotta dei Sussurri, nel tunnel', nome: 'Runa del tunnel', indizio: 'Nel tunnel, sulla parete opposta alle rune azzurre. Serve luce.' },
  { id: 'r-g3', segno: 'roccia', tipo: 'giulia', x: GX - 9.2, y: 0.5, z: CZ + 8.3, ry: 0.8, luogo: 'La caverna di sale', nome: 'Runa della caverna', indizio: 'Tra i cristalli della caverna, segni che solo Giulia sa leggere.' },
  { id: 'r-g4', segno: 'acqua', tipo: 'vista', x: 245, y: 1.0, z: -19.4, ry: 0, luogo: 'La sala dietro la porta', nome: 'Runa della sala', indizio: 'Dietro una porta che non si vede.' },
  { id: 'r-l1', segno: 'roccia', tipo: 'giulia', x: LX + 9.4, y: 0.5, z: 6.6, ry: Math.PI, luogo: 'La spiaggia di sale', nome: 'Runa del sale', indizio: 'Sulla spiaggia di sale, una roccia ha segni più vecchi delle altre.' },
  { id: 'r-l2', segno: 'luce', tipo: 'sophia', x: GXL + 4, y: 0.4, z: GZ - 6.2, ry: 0, luogo: 'I Giardini Sospesi', nome: 'Runa dei Giardini', indizio: 'Nei Giardini Sospesi, tra i fiori, nascosta alla luce del giorno.' },
  { id: 'r-l3', segno: 'vento', tipo: 'vista', x: AX - 3, y: 0.5, z: AZ + 6.6, ry: 0, luogo: 'Il Giardino dell\'Equilibrio', nome: 'Runa dell\'Equilibrio', indizio: 'Nel giardino senza fiori.' },
  { id: 'r-l4', segno: 'acqua', tipo: 'vista', x: LX, y: 1.2, z: -37.2, ry: 0, luogo: 'Il ponte sospeso, sull\'ultima piattaforma', nome: 'Runa del ponte sospeso', indizio: 'In fondo al ponte sospeso, per chi arriva fino all\'ultimo salto.' },
  { id: 'r-v', segno: 'vento', tipo: 'sophia', x: 606, y: 1.2, z: -8, ry: 0, luogo: 'La Selva di Maestrale', nome: 'Runa della Selva', indizio: 'Nella Selva di Maestrale, sul tronco più vecchio. Serve luce.' },
  { id: 'r-z', segno: 'roccia', tipo: 'giulia', x: 693, y: 1.0, z: -9, ry: 0, luogo: 'Il Monte Zavorra', nome: 'Runa del Monte', indizio: 'Sulle rocce del Monte Zavorra, tra le venature dorate.' },
  { id: 'r-r', segno: 'acqua', tipo: 'vista', x: 812, y: 0.6, z: -9, ry: 0, luogo: 'La Risacca, sull\'isola oltre la corrente', nome: 'Runa della Risacca', indizio: 'Oltre la corrente della Risacca.' },
  { id: 'r-s', segno: 'luce', tipo: 'sophia', x: 900, y: 1.0, z: -10, ry: 0, luogo: 'Solaria, nella piazza', nome: 'Runa di Solaria', indizio: 'Nella piazza di Solaria. Di giorno è troppo luminosa per vederla.' },
];
