/**
 * Hand-made pixel art as inline SVG. Each sprite is a list of rows;
 * every non-'.' character is a pixel whose colour comes from `palette`
 * (CSS colours or variables). Default colour is currentColor.
 */
type Palette = Record<string, string>;

export function pixelSvg(rows: string[], palette: Palette = {}, label?: string): string {
  const w = Math.max(...rows.map((r) => r.length));
  const hgt = rows.length;
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      if (ch === '.') {
        x++;
        continue;
      }
      let run = 1;
      while (row[x + run] === ch) run++;
      const fill = palette[ch] ?? 'currentColor';
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${fill}"/>`;
      x += run;
    }
  });
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="px" viewBox="0 0 ${w} ${hgt}" width="${w}" height="${hgt}" shape-rendering="crispEdges" ${a11y}>${rects}</svg>`;
}

const ARROW_UP = ['...#...', '..###..', '.#####.', '#######', '..###..', '..###..', '..###..'];

export const ICONS = {
  arrowUp: (label?: string) => pixelSvg(ARROW_UP, {}, label),
  arrowDown: (label?: string) => pixelSvg([...ARROW_UP].reverse(), {}, label),
  check: () => pixelSvg(['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....']),
  tilde: () => pixelSvg(['.##...#', '#..#..#', '#...##.']),
  cursor: () => pixelSvg(['#...', '##..', '###.', '####', '###.', '##..', '#...']),
  cursorDown: () => pixelSvg(['#######', '.#####.', '..###..', '...#...']),
  close: () => pixelSvg(['##...##', '.##.##.', '..###..', '.##.##.', '##...##']),
  speakerOn: () =>
    pixelSvg([
      '....#.....#',
      '...##..#..#',
      '#####...#.#',
      '#####.#.#.#',
      '#####.#.#.#',
      '#####...#.#',
      '...##..#..#',
      '....#.....#',
    ]),
  speakerOff: () =>
    pixelSvg([
      '....#......',
      '...##......',
      '#####.#...#',
      '#####..#.#.',
      '#####...#..',
      '#####..#.#.',
      '...##.#...#',
      '....#......',
    ]),
  chart: () => pixelSvg(['.....##', '..##.##', '..##.##', '#.##.##', '#.##.##', '#######']),
  help: () => pixelSvg(['.###.', '#...#', '...#.', '..#..', '..#..', '.....', '..#..']),
  link: () =>
    pixelSvg(['...####', '..#...#', '.#..#.#', '#..#..#', '#.#..#.', '#...#..', '####...']),
  copy: () =>
    pixelSvg(['..#####', '..#...#', '####..#', '#.#####', '#...#..', '#...#..', '#####..']),
  chat: () =>
    pixelSvg(['#######', '#.....#', '#.#.#.#', '#.....#', '#######', '.##....', '.#.....']),
  camera: () => pixelSvg(['.##....', '#######', '#..#..#', '#.#.#.#', '#..#..#', '#######']),
  mail: () => pixelSvg(['#######', '##...##', '#.#.#.#', '#..#..#', '#.....#', '#######']),
  share: () =>
    pixelSvg(['...#...', '..###..', '.#.#.#.', '...#...', '#..#..#', '#.....#', '#######']),
  palette: () => pixelSvg(['.#####.', '#.#.#.#', '#######', '#.#####', '##.####', '.#####.']),
};

/** Procedural 16x16 basketball: orange disc, dark outline and seams. */
export function basketballSvg(size = 16): string {
  const rows: string[] = [];
  const c = (size - 1) / 2;
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d > r - 0.2) row += '.';
      else if (d > r - 1.4) row += 'k';
      else if (Math.abs(x - c) < 0.6 || Math.abs(y - c) < 0.6) row += 'k';
      else if (Math.abs(Math.hypot(x + size * 0.18, y - c) - size * 0.58) < 0.55) row += 'k';
      else if (Math.abs(Math.hypot(x - size * 1.12, y - c) - size * 0.58) < 0.55) row += 'k';
      else if (x < c - 2 && y < c - 2 && Math.hypot(x - c + 3, y - c + 3) < 2.5) row += 'h';
      else row += 'o';
    }
    rows.push(row);
  }
  return pixelSvg(rows, { k: 'var(--ball-ink)', o: 'var(--ball)', h: 'var(--ball-hi)' });
}

/** Tiny 7x7 ball for the remaining-guesses row. */
export function miniBallSvg(): string {
  return pixelSvg(['..kkk..', '.kokok.', 'kookook', 'kkkkkkk', 'kookook', '.kokok.', '..kkk..'], {
    k: 'var(--ball-ink)',
    o: 'var(--ball)',
  });
}

/** 16x16 silhouette used when a headshot cannot be loaded. */
export function silhouetteSvg(label = 'No photo available'): string {
  return pixelSvg(
    [
      '................',
      '......####......',
      '.....######.....',
      '.....######.....',
      '.....######.....',
      '......####......',
      '.......##.......',
      '....########....',
      '...##########...',
      '..############..',
      '..############..',
      '..##.######.##..',
      '..##.######.##..',
      '..##.######.##..',
      '.....######.....',
      '................',
    ],
    {},
    label,
  );
}
