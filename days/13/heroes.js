// Die drei Helden der Schneeball-Arena (selbst erfunden).
export const HEROES = [
  {
    key: 'flocke', name: 'Flocke', tag: 'Flink und wendig', superName: 'Blitz-Sprint', superText: 'Sprint mit Schneewirbel',
    speed: 160, hp: 2600, r: 14, reload: 0.8, range: 280, ballSpeed: 600, superCost: 2400, coat: '#8ecae6', stats: [3, 1, 2],
    want: 0.62, superRange: 230,
  },
  {
    key: 'brummer', name: 'Brummer', tag: 'Starker Eisbär', superName: 'Bodenstampfer', superText: 'Druckwelle rundherum',
    speed: 114, hp: 4400, r: 18, reload: 1.2, range: 185, ballSpeed: 470, superCost: 3300, coat: '#f3efe6', stats: [1, 3, 1],
    want: 0.5, superRange: 135,
  },
  {
    key: 'zapfen', name: 'Zapfen', tag: 'Eiszapfen-Scharfschütze', superName: 'Riesen-Schneeball', superText: 'Rollt durch Büsche und Eis',
    speed: 128, hp: 2300, r: 14, reload: 1.45, range: 460, ballSpeed: 720, superCost: 2100, coat: '#5e9bd6', stats: [2, 1, 3],
    want: 0.75, superRange: 520,
  },
];
export const STAT_NAMES = ['Tempo', 'Ausdauer', 'Reichweite'];
